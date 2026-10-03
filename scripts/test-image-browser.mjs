import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  await page.goto(process.env.IMAGE_TEST_URL || 'http://localhost:3000');
  const results = await page.evaluate(async () => {
    const {compressImage} = await import('/src/lib/imageCompression.ts');
    const {processImage,inspectImage} = await import('/src/lib/imageProcessing.ts');
    const NativeWorker=globalThis.Worker;
    const workerEvents={started:0,completed:0,succeeded:0,failed:0,terminated:0};
    globalThis.Worker=class extends NativeWorker {
      constructor(...args){super(...args);workerEvents.started++;this.addEventListener('message',event=>{workerEvents.completed++;if(event.data?.result)workerEvents.succeeded++;});this.addEventListener('error',()=>workerEvents.failed++);}
      terminate(){workerEvents.terminated++;super.terminate();}
    };
    const canvas = document.createElement('canvas');
    const make = async (w,h,type='image/png') => {
      canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
      ctx.fillStyle='red';ctx.fillRect(0,0,w/2,h);ctx.fillStyle='blue';ctx.fillRect(w/2,0,w/2,h);
      return await new Promise(resolve=>canvas.toBlob(resolve,type,0.9));
    };
    const expectError = async (blob,code) => {
      try {await compressImage(blob);throw new Error('Accepted invalid input');}
      catch(e) {if(e.code!==code) throw e;}
    };
    await expectError(new Blob(['heic'],{type:'image/heic'}),'UNSUPPORTED_FORMAT');
    await expectError(new Blob([new Uint8Array(20*1024*1024)],{type:'image/jpeg'}),'INPUT_TOO_LARGE');
    await expectError(new Blob(['text'],{type:'text/plain'}),'UNSUPPORTED_FORMAT');
    await expectError(new Blob(['text'],{type:'image/png'}),'INVALID_IMAGE');
    await expectError(await make(16,16),'TOO_SMALL');
    for(const type of ['image/gif','image/svg+xml','image/avif']) await expectError(new Blob(['x'],{type}),'UNSUPPORTED_FORMAT');
    const phone=await make(4000,3000,'image/jpeg');
    const worker=await compressImage(phone),main=await processImage(phone);
    if(workerEvents.succeeded<1) throw new Error('No successful worker response: '+JSON.stringify(workerEvents));
    globalThis.Worker=undefined;
    const fallback=await compressImage(phone);globalThis.Worker=NativeWorker;
    if(fallback.width!==1280 || fallback.height!==960) throw new Error('Worker-disabled fallback failed');
    if(worker.width!==1280 || worker.height!==960 || main.width!==1280 || worker.blob.size>204800) throw new Error('Resize/cap failed');
    const portrait=await compressImage(await make(800,2400));
    if(portrait.width!==427 || portrait.height!==1280) throw new Error('Portrait resize failed');
    const small=await make(64,64);const original=await processImage(small);
    if(original.blob.size>small.size) throw new Error('Original size fallback failed');
    // Inject EXIF orientation 6 into a real JPEG, so the browser must rotate clockwise.
    const jpg=new Uint8Array(await (await make(160,80,'image/jpeg')).arrayBuffer());
    const exif=new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
    const rotated=new Blob([jpg.slice(0,2),exif,jpg.slice(2)],{type:'image/jpeg'});
    const header=await inspectImage(rotated),orientation=await compressImage(rotated);
    if(header.width!==80 || header.height!==160 || orientation.width!==80 || orientation.height!==160) throw new Error('EXIF dimensions failed');
    const bitmap=await createImageBitmap(orientation.blob);canvas.width=80;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
    const top=ctx.getImageData(40,20,1,1).data,bottom=ctx.getImageData(40,140,1,1).data;
    if(top[0]<180 || bottom[2]<180) throw new Error('EXIF pixels rotated incorrectly');
    // Force unsupported WebP encoder, then a null encoder.
    const native=HTMLCanvasElement.prototype.toBlob;
    try {
      HTMLCanvasElement.prototype.toBlob=function(callback,type,q) {return native.call(this,callback,type==='image/webp'?'image/png':type,q);};
      const jpegFallback=await processImage(phone);if(jpegFallback.mimeType!=='image/jpeg') throw new Error('JPEG fallback failed');
      const qualities=[];
      HTMLCanvasElement.prototype.toBlob=function(callback,type,q) {qualities.push(q);callback(new Blob([new Uint8Array(q===0.6?190000:250000)],{type}));};
      const stepped=await processImage(phone);
      if(qualities.join(',')!=='0.8,0.7,0.6' || stepped.blob.size!==190000) throw new Error('Quality floor retry failed');
      HTMLCanvasElement.prototype.toBlob=function(callback,type) {callback(new Blob([new Uint8Array(250000)],{type}));};
      try {await processImage(phone);throw new Error('Accepted oversize output');} catch(e) {if(e.code!=='OUTPUT_TOO_LARGE') throw e;}
      HTMLCanvasElement.prototype.toBlob=function(callback) {callback(null);};
      try {await processImage(phone);throw new Error('Accepted null encoder');} catch(e) {if(e.code!=='ENCODE_FAILED') throw e;}
    } finally {HTMLCanvasElement.prototype.toBlob=native;}
    return {worker:worker.mimeType,workerEvents,phoneBytes:worker.compressedSize,portrait:[portrait.width,portrait.height],exif:'dimensions and pixels correct',fallback:'JPEG and null encoder checked'};
  });
  assert.equal(results.worker,'image/webp');
  console.log('Browser image checks passed:',results);
} finally {await browser.close();}

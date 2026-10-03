export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 200 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export type ImageStep = 'validate' | 'read' | 'decode' | 'resize/canvas' | 'encode' | 'upload';
export type ImageErrorCode = 'UNSUPPORTED_FORMAT' | 'INPUT_TOO_LARGE' | 'INVALID_IMAGE' | 'TOO_SMALL' | 'TOO_MANY_PIXELS' | 'DECODE_FAILED' | 'CANVAS_FAILED' | 'ENCODE_FAILED' | 'OUTPUT_TOO_LARGE' | 'UPLOAD_FAILED';
export class ImageProcessingError extends Error {
  constructor(public code: ImageErrorCode, message: string, public step: ImageStep, public details: Record<string, unknown> = {}, public cause?: unknown) { super(message); }
}
export interface CompressionResult {
  blob: Blob; originalSize: number; compressedSize: number; width: number; height: number;
  mimeType: string; usedOriginal: boolean;
}
export function validateImageInput(file: Blob) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new ImageProcessingError('UNSUPPORTED_FORMAT', 'Unsupported format. Use JPG, PNG, or WebP.', 'validate');
  if (file.size > MAX_INPUT_BYTES) throw new ImageProcessingError('INPUT_TOO_LARGE', 'Image is too large (max 10MB).', 'validate');
  if (!file.size) throw new ImageProcessingError('INVALID_IMAGE', 'This image is empty. Choose another file.', 'validate');
}
// Header validation precedes decoding to bound allocations. EXIF swaps oriented dimensions.
export async function inspectImage(file: Blob): Promise<{width:number;height:number}> {
  validateImageInput(file);
  let bytes: Uint8Array;
  try {bytes = new Uint8Array(await file.arrayBuffer());}
  catch(cause) {throw new ImageProcessingError('INVALID_IMAGE','Cannot read this file. Select it again.','read',{},cause);}
  const v = new DataView(bytes.buffer);
  const ascii = (p:number,n:number) => String.fromCharCode(...bytes.slice(p,p+n));
  let width=0,height=0,actual='';
  if(bytes.length>=24 && v.getUint32(0)===0x89504e47 && ascii(1,3)==='PNG') {
    actual='image/png';width=v.getUint32(16);height=v.getUint32(20);
    for(let p=8;p+12<=bytes.length;) {
      if(ascii(p+4,4)==='acTL') throw new ImageProcessingError('UNSUPPORTED_FORMAT','Animated images are not supported. Use a still image.','validate');
      p+=v.getUint32(p)+12;
    }
  } else if(bytes.length>=30 && ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP') {
    actual='image/webp'; const kind=ascii(12,4);
    if(kind==='VP8X') {
      if(bytes[20]&2) throw new ImageProcessingError('UNSUPPORTED_FORMAT','Animated images are not supported. Use a still image.','validate');
      width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);
    } else if(kind==='VP8 ' && bytes[23]===0x9d && bytes[24]===1 && bytes[25]===0x2a) {
      width=v.getUint16(26,true)&0x3fff;height=v.getUint16(28,true)&0x3fff;
    } else if(kind==='VP8L' && bytes[20]===0x2f) {
      width=1+bytes[21]+((bytes[22]&63)<<8);height=1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&15)<<10);
    }
  } else if(bytes.length>=4 && bytes[0]===255 && bytes[1]===216) {
    actual='image/jpeg';let rotated=false;
    for(let p=2;p+4<=bytes.length;) {
      if(bytes[p++]!==255) break;
      const marker=bytes[p++];if(marker===0xda || marker===0xd9) break;
      const length=v.getUint16(p);if(length<2 || p+length>bytes.length) break;
      if(marker===0xe1 && ascii(p+2,6)==='Exif\0\0') {
        try {
          const t=p+8,little=ascii(t,2)==='II',dir=t+v.getUint32(t+4,little);
          for(let i=0;i<v.getUint16(dir,little);i++) {
            const entry=dir+2+i*12;
            if(v.getUint16(entry,little)===0x112) rotated=v.getUint16(entry+8,little)>=5;
          }
        } catch { /* Browser decoder handles malformed EXIF. */ }
      }
      if([0xc0,0xc1,0xc2].includes(marker) && length>=7) {height=v.getUint16(p+3);width=v.getUint16(p+5);}
      p+=length;
    }
    if(rotated) [width,height]=[height,width];
  }
  const details={width,height};
  if(actual!==file.type || !width || !height) throw new ImageProcessingError('INVALID_IMAGE','This file is not a valid JPG, PNG, or WebP image. Check its format.','read',details);
  if(Math.min(width,height)<64) throw new ImageProcessingError('TOO_SMALL','Image is too small. Both dimensions must be at least 64px.','validate',details);
  if(width*height>32_000_000) throw new ImageProcessingError('TOO_MANY_PIXELS','Image resolution is too large (max 32 megapixels). Export a smaller image.','validate',details);
  return details;
}
export async function processImage(file:Blob,offscreen=false):Promise<CompressionResult> {
  const source=await inspectImage(file),scale=Math.min(1,1280/Math.max(source.width,source.height));
  const width=Math.max(1,Math.round(source.width*scale)),height=Math.max(1,Math.round(source.height*scale));
  let bitmap:ImageBitmap|undefined,canvas:HTMLCanvasElement|OffscreenCanvas|undefined,step:ImageStep='decode';
  try {
    bitmap=await createImageBitmap(file,{imageOrientation:'from-image',resizeWidth:width,resizeHeight:height,resizeQuality:'high'});
    step='resize/canvas';canvas=offscreen?new OffscreenCanvas(width,height):document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d') as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;
    if(!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(bitmap,0,0,width,height);bitmap.close();bitmap=undefined;step='encode';
    const encode=(type:string,quality:number):Promise<Blob|null> => typeof OffscreenCanvas!=='undefined' && canvas instanceof OffscreenCanvas
      ? canvas.convertToBlob({type,quality}) : new Promise(resolve=>(canvas as HTMLCanvasElement).toBlob(resolve,type,quality));
    let blob:Blob|null=null;
    for(const quality of [0.8,0.7,0.6]) {
      try {blob=await encode('image/webp',quality);} catch {blob=null;}
      if(!blob || blob.type!=='image/webp') {
        ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
        blob=await encode('image/jpeg',quality);if(blob?.type!=='image/jpeg') blob=null;
      }
      if(!blob) throw new ImageProcessingError('ENCODE_FAILED','Your browser could not encode this image. Try another browser or image.',step,source);
      if(blob.size<=MAX_UPLOAD_BYTES) break;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const usedOriginal=scale===1 && file.size<blob!.size && file.size<=MAX_UPLOAD_BYTES;
    if(usedOriginal) blob=file;
    if(blob!.size>MAX_UPLOAD_BYTES) throw new ImageProcessingError('OUTPUT_TOO_LARGE','Image is still too detailed (max 200KB after compression). Try a simpler or smaller image.','encode',source);
    return {blob:blob!,originalSize:file.size,compressedSize:blob!.size,width,height,mimeType:blob!.type,usedOriginal};
  } catch(cause) {
    if(cause instanceof ImageProcessingError) throw cause;
    throw new ImageProcessingError(step==='decode'?'DECODE_FAILED':step==='encode'?'ENCODE_FAILED':'CANVAS_FAILED',step==='decode'?'Cannot decode this image. Export it as JPG, PNG, or WebP and try again.':'Could not process this image. Try a smaller image or another browser.',step,source,cause);
  } finally {bitmap?.close();if(canvas) {canvas.width=0;canvas.height=0;}}
}

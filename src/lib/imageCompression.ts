import {supabase,isSupabaseConfigured,supabaseAnonKey} from './supabase';
import {processImage,validateImageInput,inspectImage,ImageProcessingError,MAX_UPLOAD_BYTES,type CompressionResult} from './imageProcessing';
export * from './imageProcessing';
export const SCREENSHOT_BUCKET='project-screenshots';
export function formatFileSize(bytes:number):string {
  return bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`;
}
export async function blobToDataUrl(blob:Blob):Promise<string> {
  if(typeof FileReader==='undefined') return `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new ImageProcessingError('INVALID_IMAGE','Cannot read the preview. Select the file again.','read',{},reader.error));reader.onabort=()=>reject(new ImageProcessingError('INVALID_IMAGE','Preview reading was interrupted. Select the image again.','read'));reader.readAsDataURL(blob);
  });
}
export function logImageError(error:unknown,file?:Blob) {
  const e=error as ImageProcessingError;
  console.error('Project image failed',{code:e.code,step:e.step,type:file?.type,size:file?.size,...e.details,error,cause:e.cause});
}
export async function compressImage(file:Blob):Promise<CompressionResult> {
  try {
    validateImageInput(file);
    if(typeof Worker!=='undefined' && typeof OffscreenCanvas!=='undefined' && typeof OffscreenCanvas.prototype.convertToBlob==='function') {
      let worker:Worker|undefined;
      try {worker=new Worker(new URL('./imageCompression.worker.ts',import.meta.url),{type:'module'});} catch { /* Main thread fallback. */ }
      if(worker) {
        try {
          return await new Promise<CompressionResult>((resolve,reject)=>{
            const timer=setTimeout(()=>reject(new Error('Image worker timed out')),30000);
            worker!.onmessage=({data})=>{clearTimeout(timer);data.error?reject(new ImageProcessingError(data.error.code,data.error.message,data.error.step,data.error.details,data.error.cause)):resolve(data.result);};
            worker!.onerror=e=>{clearTimeout(timer);reject(e);};worker!.postMessage(file);
          });
        } catch(error) {if(error instanceof ImageProcessingError && !['CANVAS_FAILED','DECODE_FAILED'].includes(error.code)) throw error;}
        finally {worker.terminate();}
      }
    }
    return await processImage(file);
  } catch(error) {logImageError(error,file);throw error;}
}
export const compressScreenshot=compressImage;
export async function uploadProjectScreenshot(file:Blob,userId:string,projectId:string,onProgress?:(percent:number)=>void):Promise<{url:string;compressedSize:number;originalSize:number}> {
  const dimensions = await inspectImage(file);
  if (Math.max(dimensions.width, dimensions.height) > 1280) throw new ImageProcessingError('OUTPUT_TOO_LARGE','Compress the image before uploading (max 1280px).','upload',dimensions);
  if(file.size>MAX_UPLOAD_BYTES) throw new ImageProcessingError('OUTPUT_TOO_LARGE','Upload is too large (max 200KB).','upload');
  onProgress?.(0);
  if(!isSupabaseConfigured || !supabase) {
    const url=await blobToDataUrl(file);onProgress?.(100);return {url,compressedSize:file.size,originalSize:file.size};
  }
  const path=`${userId}/${projectId}/cover`;
  try {
    const {data:{session}}=await supabase.auth.getSession();if(!session) throw new ImageProcessingError('UPLOAD_FAILED','Your sign-in expired. Sign in again, then retry uploading.','upload');
    const endpoint=new URL(supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path).data.publicUrl);
    endpoint.pathname=endpoint.pathname.replace('/object/public/','/object/');
    await new Promise<void>((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('POST',endpoint.href);
      xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);xhr.setRequestHeader('apikey',supabaseAnonKey);
      xhr.setRequestHeader('x-upsert','true');xhr.setRequestHeader('Content-Type',file.type);xhr.setRequestHeader('Cache-Control','max-age=31536000, immutable');xhr.timeout=60000;
      xhr.upload.onprogress=e=>{if(e.lengthComputable) onProgress?.(Math.min(99,Math.round(e.loaded/e.total*100)));};
      xhr.onload=()=>{
        if(xhr.status>=200 && xhr.status<300) {resolve();return;}
        let response:{code?:string;message?:string;error?:string;statusCode?:string}={};
        try {response=JSON.parse(xhr.responseText);} catch { /* Non-JSON responses retain HTTP status. */ }
        const status=Number(response.statusCode)||xhr.status;
        const message=response.code==='NoSuchBucket' || /bucket.*not found/i.test(response.message||response.error||'')
          ? 'Image storage is not set up yet. Ask the site owner to apply the latest Supabase migrations, then retry.'
          : status===401 ? 'Your sign-in expired. Sign in again, then retry uploading.'
          : status===403 || /row.level security/i.test(response.message||response.error||'') ? 'Image upload was denied. Ask the site owner to check Supabase storage policies, then retry.'
          : status===413 ? 'Upload is too large (max 200KB). Select a smaller image.'
          : 'Upload failed. Check your connection and sign-in, then retry.';
        reject(new ImageProcessingError('UPLOAD_FAILED',message,'upload',{...dimensions,status:xhr.status,storageCode:response.code,storageMessage:response.message||response.error}));
      };
      xhr.onerror=()=>reject(new Error('Network error'));xhr.ontimeout=()=>reject(new Error('Upload timed out'));xhr.send(file);
    });
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
    onProgress?.(100);return {url:`${supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path).data.publicUrl}?v=${hash}`,compressedSize:file.size,originalSize:file.size};
  } catch(cause) {
    const error=cause instanceof ImageProcessingError ? cause : new ImageProcessingError('UPLOAD_FAILED','Upload failed. Check your connection and sign-in, then retry.','upload',dimensions,cause);logImageError(error,file);throw error;
  }
}
export async function deleteProjectScreenshot(userId:string,projectId:string,oldUrl?:string|null) {
  if(!supabase || !isSupabaseConfigured) return;
  const paths=[`${userId}/${projectId}/cover`];
  if(oldUrl) {
    try {
      const url=new URL(oldUrl),base=new URL(supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl('').data.publicUrl),prefix=`/storage/v1/object/public/${SCREENSHOT_BUCKET}/`;
      if(url.origin===base.origin && url.pathname.startsWith(prefix)) {
        const oldPath=decodeURIComponent(url.pathname.slice(prefix.length));if(oldPath.startsWith(`${userId}/`) && !paths.includes(oldPath)) paths.push(oldPath);
      }
    } catch { /* Local/GitHub images have no stored object. */ }
  }
  const {error}=await supabase.storage.from(SCREENSHOT_BUCKET).remove(paths);
  if(error) throw new ImageProcessingError('UPLOAD_FAILED','Could not delete the old preview. Please retry.','upload',{},error);
}

export async function deleteLegacyProjectScreenshot(userId: string, projectId: string, oldUrl?: string | null) {
  if (!oldUrl || !supabase || !isSupabaseConfigured) return;
  const base = new URL(supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl('').data.publicUrl);
  let url: URL; try { url = new URL(oldUrl); } catch { return; }
  const prefix = `/storage/v1/object/public/${SCREENSHOT_BUCKET}/`;
  if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return;
  const path = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!path.startsWith(`${userId}/`) || path === `${userId}/${projectId}/cover`) return;
  const {error} = await supabase.storage.from(SCREENSHOT_BUCKET).remove([path]);
  if (error) throw new ImageProcessingError('UPLOAD_FAILED','Preview saved, but old image cleanup failed. Retry saving.','upload',{},error);
}

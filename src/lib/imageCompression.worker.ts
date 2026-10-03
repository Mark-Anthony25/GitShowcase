import {processImage,ImageProcessingError} from './imageProcessing';
const scope=globalThis as unknown as {onmessage:(event:MessageEvent<Blob>)=>void;postMessage:(data:unknown)=>void};
scope.onmessage=async ({data})=>{
  try {scope.postMessage({result:await processImage(data,true)});}
  catch(error) {const e=error as ImageProcessingError;scope.postMessage({error:{code:e.code,message:e.message,step:e.step,details:e.details,cause:String(e.cause??error)}});}
};

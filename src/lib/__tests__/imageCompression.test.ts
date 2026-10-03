import assert from 'node:assert/strict';
import { compressScreenshot, formatFileSize } from '../imageCompression';
await assert.rejects(() => compressScreenshot(new Blob(['heic'], {type:'image/heic'})), (e: any) => e.code === 'UNSUPPORTED_FORMAT');
await assert.rejects(() => compressScreenshot(new Blob([new Uint8Array(20 * 1024 * 1024)], {type:'image/jpeg'})), (e: any) => e.code === 'INPUT_TOO_LARGE');
await assert.rejects(() => compressScreenshot(new Blob(['not png'], {type:'image/png'})), (e: any) => e.code === 'INVALID_IMAGE');

assert.equal(formatFileSize(500),'500 B');
assert.equal(formatFileSize(51200),'50.0 KB');
assert.equal(formatFileSize(2621440),'2.50 MB');
await assert.rejects(() => compressScreenshot(new Blob(['text'],{type:'text/plain'})),(e: any)=>e.code==='UNSUPPORTED_FORMAT');
console.log('Image input rejection and size formatting tests passed');

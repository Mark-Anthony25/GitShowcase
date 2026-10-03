import { formatFileSize, compressScreenshot, uploadProjectScreenshot } from '../imageCompression';
import assert from 'node:assert';

async function runTests() {
  console.log('Running Image Compression & Upload Unit Tests...');

  // Test 1: formatFileSize formatting
  assert.strictEqual(formatFileSize(500), '500 B');
  assert.strictEqual(formatFileSize(51200), '50.0 KB');
  assert.strictEqual(formatFileSize(1048576 * 2.5), '2.50 MB');
  console.log('✓ Test 1: formatFileSize properly formats sizes');

  // Test 2: Compression non-browser graceful fallback
  const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
  const result = await compressScreenshot(mockBlob);
  assert.ok(result.blob, 'Blob exists');
  assert.ok(result.compressedSize > 0, 'Compressed size tracked');
  console.log('✓ Test 2: compressScreenshot falls back gracefully in headless environment');

  // Test 3: uploadProjectScreenshot creates valid URL/DataURL and compresses
  const uploadResult = await uploadProjectScreenshot(mockBlob, 'user-123', 'owner/awesome-project');
  assert.ok(uploadResult.url, 'Returned image URL exists');
  assert.ok(uploadResult.compressedSize > 0, 'Tracked compressed size');
  console.log('✓ Test 3: uploadProjectScreenshot completes and returns URL');

  console.log('All image compression tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Image compression test failed:', err);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { normalizeContactLink } from '../contactLink';

assert.equal(normalizeContactLink(''), null);
assert.equal(normalizeContactLink(' user@example.com '), 'mailto:user@example.com');
assert.equal(normalizeContactLink('mailto:user@example.com'), 'mailto:user@example.com');
assert.equal(normalizeContactLink('mailto:user@example.com?subject=Collaboration'), 'mailto:user@example.com?subject=Collaboration');
assert.equal(normalizeContactLink('linkedin.com/in/creator'), 'https://linkedin.com/in/creator');
assert.equal(normalizeContactLink('https://social.example/creator'), 'https://social.example/creator');
for (const input of ['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', 'not a link', 'mailto:invalid', 'https://', 'https://user:password@example.com', 'https://example.com\n/path']) {
  assert.throws(() => normalizeContactLink(input), /valid/);
}
console.log('Contact link validation passed');

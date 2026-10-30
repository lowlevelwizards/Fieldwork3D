import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampHtml, stampDist } from '../scripts/stamp-pages.mjs';

test('Pages HTML checks the current release without trusting a cached response', () => {
  const output = stampHtml('<html><head></head><body>Game</body></html>', 'abc-123');
  assert.match(output, /name="fieldwork-build" content="abc-123"/);
  assert.match(output, /fieldwork-build\.json/);
  assert.match(output, /cache: "no-store"/);
  assert.match(output, /searchParams\.set\("build", latest\.id\)/);
  assert.match(output, /target\.searchParams\.get\("build"\) === latest\.id/);
  assert.match(output, /<body>Game<\/body>/);
  assert.throws(() => stampHtml('<body>Missing head</body>', 'abc'), /Missing HTML head/);
});

test('Every HTML entrypoint shares the same release stamp and JSON endpoint', () => {
  const dist = mkdtempSync(join(tmpdir(), 'fieldwork-pages-'));
  try {
    writeFileSync(join(dist, 'index.html'), '<html><head></head><body>Game</body></html>');
    writeFileSync(join(dist, 'operator-lab.html'), '<html><head></head><body>Lab</body></html>');
    writeFileSync(join(dist, 'asset.js'), 'unchanged');
    assert.equal(stampDist(dist, 'release-456'), 2);
    assert.match(readFileSync(join(dist, 'index.html'), 'utf8'), /release-456/);
    assert.match(readFileSync(join(dist, 'operator-lab.html'), 'utf8'), /release-456/);
    assert.equal(readFileSync(join(dist, 'asset.js'), 'utf8'), 'unchanged');
    assert.deepEqual(JSON.parse(readFileSync(join(dist, 'fieldwork-build.json'), 'utf8')), { id: 'release-456' });
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

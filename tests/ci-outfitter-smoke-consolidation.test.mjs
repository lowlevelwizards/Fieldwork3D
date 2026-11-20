import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('legacy mobile outfit smoke statuses share one canonical browser setup',()=>{
 const action=read('.github/actions/outfitter-mobile-smoke/action.yml');
 assert.match(action,/using: composite/);
 assert.match(action,/npx playwright install --with-deps chromium/);
 assert.match(action,/node scripts\/smoke-loadout-bench-r1\.mjs/);
 for(const file of ['loadout-ux-r1-critical.yml',
   'visual-armory-v1-critical.yml','visual-armory-v2-critical.yml']){
  const workflow=read('.github/workflows/'+file);
  assert.match(workflow,/uses: \.\/\.github\/actions\/outfitter-mobile-smoke/);
  assert.match(workflow,/\.github\/actions\/outfitter-mobile-smoke\/action\.yml/);
  assert.doesNotMatch(workflow,/npx playwright install --with-deps chromium/);
  assert.match(workflow,/npm run check/);
 }
 for(const file of ['smoke-loadout-ux-r1.mjs',
  'smoke-visual-armory-v1.mjs','smoke-visual-armory-v2.mjs'])
  assert.match(read('scripts/'+file),/import '\.\/smoke-loadout-bench-r1\.mjs'/);
});

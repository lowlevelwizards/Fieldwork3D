import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('F5.2 the real mobile WebGL acceptance captures all three game views',()=>{
 const workflow=source('.github/workflows/operator-studio-smoke.yml');
 assert.match(workflow,/F5 visual foundation — mobile Studio, Arsenal and Breach captures/);
 for(const path of ['scripts/smoke-rendering-r718-parity.mjs',
  'scripts/smoke-arsenal-lighting-r714.mjs',
  'scripts/smoke-rendering-r718-breach.mjs']){
  assert.match(workflow,new RegExp(path.replace(/\./g,'\\.')));
  assert.match(source(path),/FW_F5_CAPTURE/);
 }
 assert.match(workflow,/visual-foundation-f5-mobile-reference/);
 assert.match(workflow,/test -s visual-foundation-f5-captures\/breach-graphic.png/);
});

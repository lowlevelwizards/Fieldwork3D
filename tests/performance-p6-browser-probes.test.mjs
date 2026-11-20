import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The Advanced details in Quick Play nests other details/summary elements.
// A descendant locator('summary') is ambiguous in strict Playwright mode.
const probes=["e6-9-cold-cpu-browser","e6-10-preflight-browser","e6-14-live-first-browser","e6-12-post-ready-browser","e6-8-cold-renderer-browser","e6-11-device-benchmark-browser","e6-17-main-pass-browser","e6-15-scene-phase-browser","e6-18-main-pass-browser","e6-20-main-pass-browser","e6-21-main-pass-browser","e6-16-shadow-submit-browser","e6-19-transparent-role-browser"];
test('P6.D browser probes open only the immediate Quick Play Advanced summary',()=>{
 for(const name of probes){
  const source=readFileSync(new URL('../scripts/verification/'+name+'.mjs',
   import.meta.url),'utf8');
  assert.ok(source.includes("details.fw-quick-config-advanced"),name);
  assert.ok(!source.includes("advanced.locator('summary').click()"),
   name+': nested summary strict-mode failure');
  assert.ok(source.includes("advanced.locator(':scope > summary').click()"),
   name+': exact direct child selector');
  assert.ok(source.includes('Seed, blank for random'),
   name+': deterministic benchmark seed must stay reachable');
 }
});

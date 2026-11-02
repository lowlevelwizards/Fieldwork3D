import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/smoke-operator-lab.mjs',import.meta.url),'utf8');

test('operator lab separates camera controls and diagnostic controls',()=>{
 assert.match(html,/data-lab-tab="view"[^>]*>CAMERA<\/button>/);
 assert.match(html,/data-lab-tab="diagnostics"[^>]*>DIAGNOSTICS<\/button>/);
 const view=html.match(/<div class="row" data-lab-group="view">([\s\S]*?)<\/div>/)?.[1];
 const diagnostic=html.match(/<div class="row" data-lab-group="diagnostics">([\s\S]*?)<\/div>/)?.[1];
 assert.ok(view&&diagnostic);
 assert.match(view,/id="resetCamera"/);
 assert.doesNotMatch(view,/id="diagnosticLayer"/);
 assert.match(diagnostic,/id="diagnosticLayer"/);
 assert.match(diagnostic,/id="visualStats"/);
 assert.match(html,/data-lab-active="diagnostics"/);
});
test('one persistent preview transport remains reachable across categories',()=>{
 for(const id of ['playPause','timeline','timestamp']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1);
 }
 const transport=html.match(/<div class="row lab-transport"[^>]*>([\s\S]*?)<\/div>/)?.[1];
 assert.ok(transport);
 assert.match(transport,/id="timeline"/);
 for(const section of ['appearance','motion','ready','actions','playback','view','diagnostics']){
  assert.ok(html.includes('main[data-lab-active="'+section+'"]>[data-lab-group]:not([data-lab-group="'+section+'"]):not([data-lab-group="transport"])'));
 }
 assert.match(html,/id="labCategoryHint"/);
 assert.match(html,/ArrowLeft.*ArrowRight.*Home.*End/);
});
test('mobile smoke opens hidden motion tab before selecting its track',()=>{
 assert.ok(smoke.indexOf("page.locator('[data-lab-tab=\"motion\"]').click()")<
  smoke.indexOf("page.locator('[data-pose=\"strafe-stop\"]').click()"));
 assert.match(smoke,/shared timeline disappeared after category change/);
 assert.match(smoke,/\['Chromium',chromium\],\['WebKit',webkit\]/);
});

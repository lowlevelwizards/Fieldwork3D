import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
const audit=readFileSync(new URL('../scripts/capture-breach.mjs',import.meta.url),'utf8');

test('settings has its own reachable 44px close affordance',()=>{
 assert.match(html,/<section id="siteSettings"[^>]*role="region"/);
 assert.match(html,/<button id="closeSiteSettings" type="button" aria-label="Close mission settings and return to the map">/);
 assert.match(css,/\.site-settings #closeSiteSettings\{min-height:44px/);
 assert.match(main,/closeSiteSettingsButton\.addEventListener\('click',\(\)=>closeMissionSettings\(\)\)/);
});
test('choosing a camera view or fit returns to map, focus and aria state',()=>{
 assert.match(main,/function closeMissionSettings\(returnFocus=true\)/);
 assert.match(main,/collapseTacticalSheets\(null\)/);
 assert.match(main,/if\(returnFocus\)ui\.moreOrders\.focus\(\)/);
 assert.match(main,/if\(opening\)closeSiteSettingsButton\.focus\(\)/);
 assert.match(main,/function chooseCameraView\(mode:ViewMode\)\{/);
 for(const mode of ['iso','top','plan2d'])
  assert.ok(main.includes("()=>chooseCameraView('"+mode+"')"));
 assert.match(main,/ui\.cameraFit\.addEventListener\('click',\(\)=>\{[\s\S]*?closeMissionSettings\(\)/);
});
test('mobile smoke navigates actual visible settings controls',()=>{
 assert.match(audit,/async function openSettings\(page\)\{/);
 assert.match(audit,/if\(!await page\.locator\('#siteSettingsToggle'\)\.isVisible\(\)/);
 assert.match(audit,/await page\.locator\('#closeSiteSettings'\)\.isVisible\(\)/);
 assert.match(audit,/async function chooseCamera\(page,view\)/);
 assert.match(audit,/await chooseCamera\(phone,'#viewTop'\)/);
 assert.match(audit,/await chooseCamera\(phone,'#view2d'\)/);
 assert.match(audit,/await chooseCamera\(phone,'#viewIso'\)/);
 assert.match(audit,/await page\.locator\('#siteSettings'\)\.isVisible\(\)/);
});

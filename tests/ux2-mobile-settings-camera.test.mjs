import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
const sheetCss=readFileSync(new URL('../src/ui/ux-r1-sheets.css',import.meta.url),'utf8');
const audit=readFileSync(new URL('../scripts/capture-breach.mjs',import.meta.url),'utf8');

test('header settings replaces the old overflow menu; dock pairs back and redo',()=>{
 const header=html.match(/<header class="top">([\\s\\S]*?)<\\/header>/)?.[1]??'';
 const dock=html.match(/<div class="actions">([\\s\\S]*?)<\\/div>/)?.[1]??'';
 const legacy=html.match(/<section id="advancedOrders"([\\s\\S]*?)<\\/section>/)?.[0]??'';
 assert.ok(header.includes('id="siteSettingsToggle"'));
 assert.ok(dock.includes('id="back"')&&dock.includes('id="redo"'));
 assert.ok(!dock.includes('id="moreOrders"'));
 assert.match(legacy,/hidden aria-hidden="true"/);
 assert.ok(!legacy.includes('id="siteSettingsToggle"'));
 assert.ok(!legacy.includes('id="redo"'));
 assert.match(main,/ui\\.redo\\.addEventListener\\('click'/);
 assert.doesNotMatch(main,/ui\\.moreOrders/);
 assert.match(css,/#advancedOrders\\[hidden\\]\\{display:none!important\\}/);
});

test('settings has its own reachable 44px close affordance',()=>{
 assert.match(html,/<section id="siteSettings"[^>]*role="dialog" aria-modal="true"/);
 assert.match(html,/<button id="closeSiteSettings" type="button" aria-label="Close mission options and return to the map">/);
 assert.match(css,/\.site-settings #closeSiteSettings\{min-height:44px/);
 assert.match(sheetCss,/\.site-settings-tabs button\{min-width:0;min-height:48px/);
 assert.match(main,/closeSiteSettingsButton\.addEventListener\('click',\(\)=>\{\s*closeMissionSettings\(\)/);
});
test('choosing a camera view or fit returns to map, focus and aria state',()=>{
 assert.match(main,/function closeMissionSettings\(returnFocus=true\)/);
 assert.match(main,/collapseTacticalSheets\(null\)/);
 assert.match(main,/if\(returnFocus\)ui\.siteSettingsToggle\.focus\(\)/);
 assert.match(main,/if\(opening\)tacticalSheetNavigation\.focusFirst\(\)/);
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

test('new Mission tabs explicitly separate future-site changes from camera settings',()=>{
 assert.match(html,/data-site-tab="mission"/);
 assert.match(html,/data-site-tab="environment"/);
 assert.match(html,/data-site-tab="preferences"/);
 assert.match(audit,/locator\('\[data-site-tab="environment"\]'\)\.click\(\)/);
 assert.match(audit,/locator\('\[data-site-tab="preferences"\]'\)\.click\(\)/);
});

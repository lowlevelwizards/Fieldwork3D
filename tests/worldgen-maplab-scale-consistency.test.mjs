import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Map Lab exposes current physical scale profiles and forwards the selected scale',()=>{
 const html=file('map-lab.html'),code=file('src/map-lab-main.ts');
 for(const [value,label] of [
  ['small','Small · essential facilities'],
  ['medium','Medium · specialized rooms'],
  ['large','Large · extended program'],
  ['standard','Legacy compact'],
  ['expanded','Legacy expanded']]){
  assert.ok(html.includes('<option value="'+value+'">'+label+'</option>'),
    'scale option: '+value);
 }
 assert.doesNotMatch(html,/Compact \(3–4\)|Expanded \(6\+\)/);
 assert.match(code,/const siteScale=\(\):SiteScale=>scaleInput.value as SiteScale/);
 assert.match(code,/const candidate=generateSite\(\(starting\+step\)>>>0,/);
 assert.match(code,/session=newSession\(0,chosen.seed,'floor-plan',/);
 assert.match(code,/siteScale\(\)/);
 assert.match(code,/scaleInput.addEventListener\('change'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Map Lab presents only the current scale choices and forwards them to the worker',()=>{
 const html=file('map-lab.html'),code=file('src/map-lab-main.ts');
 const worker=file('src/map-lab-worker.ts');
 for(const label of ['Small','Medium','Large','Random']){
  const value=label.toLowerCase();
  assert.ok(html.includes('<option value="'+value+'">'+label+'</option>'),
   'scale option: '+value);
 }
 assert.doesNotMatch(html,/Legacy compact|Legacy expanded|value="standard"|value="expanded"/);
 assert.match(code,/const siteScale=\(\):LabScale=>scaleInput.value as LabScale/);
 assert.match(code,/const request:GeneratorRequest=\{id,seed,archetype,scale:choice\}/);
 assert.match(code,/worker.postMessage\(request\)/);
 assert.match(worker,/resolveLabScale\(req.scale,seed\)/);
 assert.match(code,/session=newSession\(0,site.seed,'floor-plan',site.scale,undefined,site\)/);
 assert.match(code,/generateButton.addEventListener\('click',\(\)=>generate\(\)\)/);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
test('Map Lab reveals condition A/B and actual furniture headings',()=>{
 for(const id of ['condition','conditionClean','conditionDecay','facing'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(js.includes('item.orientation'));
 assert.ok(js.includes('stage.project({x:marker.p.x+v.x*25'));
 assert.ok(js.includes("'&condition='+selectedCondition"));
 assert.ok(js.includes("selectCondition(100)"));
});

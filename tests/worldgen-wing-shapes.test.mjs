import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assessArchitecture} from '../src/worldgen/architecture-quality.ts';
test('standard and expanded buildings use varied setbacks and irregular zones',()=>{
 let notched=0;const forms=new Set();
 for(let seed=1;seed<=64;seed++){
  const site=generateSite(seed);
  assert.deepEqual(site,generateSite(seed));
  const q=assessArchitecture(site);
  assert.deepEqual(q.errors,[]);
  forms.add(site.planFamily?.replace(' / compact',''));
  if(q.nonrectangularZones>0||
    site.planFamily?.includes('setback')||
    site.planFamily?.includes('notched')||
    site.planFamily?.includes('courtyard'))notched++;
 }
 assert.ok(forms.size>=8);
 assert.ok(notched>=6,'genuinely varied multi-cell interiors are expected');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {doorBlocksSightRay,doorBlocksSegment} from '../src/breach-core.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('chain-link fencing is a physical high fence, not an opaque monolithic wall',()=>{
 const spec=propDefinition('chain-link-fence');
 assert.ok(spec&&spec.height>=32&&spec.depth<=6);
 const gate={id:'G',a:{x:0,y:0},b:{x:48,y:0},style:'mesh-gate',open:false,openedAt:-1};
 const ray={a:{x:24,y:-16},b:{x:24,y:16}};
 assert.equal(doorBlocksSightRay([gate],ray),false);
 assert.equal(doorBlocksSegment(gate,ray),true);
});
test('security yards may generate a linked gate and two matching fence sections',()=>{
 let groups=0;
 for(let seed=1;seed<=75;seed++){
  const site=generateSite(seed);
  const gate=site.doors.find(d=>d.id==='PROPERTY-GATE');
  if(!gate)continue;
  groups++;
  assert.equal(gate.style,'mesh-gate');
  assert.equal(site.cover.filter(c=>c.fixture==='chain-link-fence').length,2);
 }
 assert.ok(groups>0,'eligible industrial sites should generate fenced service yards');
});

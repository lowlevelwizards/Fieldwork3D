import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeEdgeCandidates} from '../src/worldgen/landscape-edge-program.ts';
const garden={id:'rear-property',kind:'garden',x:210,y:240,w:260,h:106};
test('functional landscaping chooses bounded asymmetrical property edge positions',()=>{
 const a=landscapeEdgeCandidates(garden,31);
 assert.ok(a.length>=1&&a.length<=3);
 assert.deepEqual(a,landscapeEdgeCandidates(garden,31));
 assert.notDeepEqual(a,landscapeEdgeCandidates(garden,32));
 for(const p of a){
  assert.ok(p.x>=garden.x-garden.w/2&&p.x<=garden.x+garden.w/2);
  assert.ok(p.y>=garden.y-garden.h/2&&p.y<=garden.y+garden.h/2);
  assert.ok(['shrub-round','planter','tree-scrub','shrub-tall','picnic-table'].includes(p.fixture));
 }
});
test('no arbitrary landscaping in service loading aisles, driveways or cramped courts',()=>{
 for(const kind of ['service','driveway'])assert.deepEqual(
  landscapeEdgeCandidates({...garden,kind},7),[]);
 assert.deepEqual(landscapeEdgeCandidates({...garden,w:50},7),[]);
});
test('parking has at most one edge planter and no trees or seating',()=>{
 const out=landscapeEdgeCandidates({...garden,kind:'parking'},44);
 assert.ok(out.length<=1);
 assert.ok(out.every(x=>x.fixture==='planter'));
});

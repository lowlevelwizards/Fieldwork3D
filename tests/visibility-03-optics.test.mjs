import test from 'node:test';
import assert from 'node:assert/strict';
import {doorBlocksSightRay} from '../src/breach-core.ts';
import {coverBlocksOpticalSight,opticalBlockerSegments}
 from '../src/breach-optical-occlusion.ts';
import {lightBeamBlockers} from '../src/equipment-weapon-light-beam.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
const door=(style)=>({id:'d',a:{x:25,y:0},b:{x:25,y:30},style,
 open:false,openedAt:-1});
test('VIS-03 transparent doors agree in sight, fog and beam',()=>{
 const ray={a:{x:0,y:9},b:{x:50,y:9}};
 for(const style of ['glazed','mesh-gate','screen','french']){
  const d=door(style);
  assert.equal(doorBlocksSightRay([d],ray),false);
  assert.equal(opticalBlockerSegments([], [d],[]).length,0);
  assert.equal(lightBeamBlockers([],[d]).length,0);
 }
 const opaque=door('wood');
 assert.equal(doorBlocksSightRay([opaque],ray),true);
 assert.equal(opticalBlockerSegments([], [opaque],[]).length,1);
 assert.equal(lightBeamBlockers([],[opaque]).length,1);
});
test('VIS-03 cover filters are consistent',()=>{
 const o={x:50,y:0,w:18,h:18,low:false};
 for(const fixture of ['glass-barrier','chain-link-fence','iron-fence','mesh-gate']){
  assert.equal(coverBlocksOpticalSight({...o,fixture}),false);
  assert.equal(opticalBlockerSegments([],[],[{...o,fixture}]).length,0);
 }
 assert.equal(coverBlocksOpticalSight({...o,low:true}),false);
 assert.equal(coverBlocksOpticalSight({...o,low:true},true),true);
 assert.equal(opticalBlockerSegments([],[],[o]).length,4);
});
test('VIS-03 polygon permits sight through glazed door',()=>{
 const from={x:0,y:10},heading=0;
 const clear=visionPolygon(from,heading,90,[],[door('glazed')],false,[]);
 const solid=visionPolygon(from,heading,90,[],[door('wood')],false,[]);
 const forward=(poly)=>poly.slice(1).reduce((best,p)=>
   Math.abs(p.y-from.y)<Math.abs(best.y-from.y)?p:best);
 assert.ok(forward(clear).x>80);
 assert.ok(forward(solid).x<30);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {lightBeamFootprint,lightRayDistance,lightBeamBlockers,
 LIGHT_BEAM_RANGE,LIGHT_BEAM_SAMPLES} from '../src/equipment-weapon-light-beam.ts';
const origin={x:30,y:60},wall={a:{x:75,y:0},b:{x:75,y:120}};
test('21.03 beams stop at walls and keep fixed geometry budgets',()=>{
 const points=lightBeamFootprint(origin,0,[wall]);
 assert.equal(points.length,LIGHT_BEAM_SAMPLES+1);
 assert.deepEqual(points[0],origin);
 for(const p of points.slice(1)){assert.ok(p.x<=75.00001);assert.ok(p.x>=origin.x)}
 assert.ok(lightRayDistance(origin,0,LIGHT_BEAM_RANGE,[wall])>44.99);
 assert.ok(lightRayDistance(origin,0,LIGHT_BEAM_RANGE,[])===LIGHT_BEAM_RANGE);
});
test('21.03 opaque doors block and glazed doors transmit flashlight',()=>{
 const door={id:'d',a:{x:75,y:30},b:{x:75,y:90},open:false,
  openedAt:0,kind:'hinged',style:'wood'};
 const solid=lightBeamBlockers([],[door]);
 const glazing=lightBeamBlockers([],[{...door,style:'glazed'}]);
 assert.ok(lightRayDistance(origin,0,155,solid)<50);
 assert.equal(lightRayDistance(origin,0,155,glazing),155);
});
test('21.03 tall cover blocks, low cover leaves beam unblocked',()=>{
 const solid={id:'s',x:75,y:60,w:20,h:32,low:false};
 const short={...solid,low:true};
 assert.ok(lightRayDistance(origin,0,155,lightBeamBlockers([],[],[solid]))<45);
 assert.equal(lightRayDistance(origin,0,155,lightBeamBlockers([],[],[short])),155);
});
test('21.03 near-parallel and behind intersections never produce NaN',()=>{
 const lines=[{a:{x:-1,y:0},b:{x:-1,y:80}},
  {a:{x:0,y:100},b:{x:70,y:100}}];
 for(let a=-Math.PI;a<=Math.PI;a+=.13){
  const d=lightRayDistance(origin,a,155,lines);
  assert.ok(Number.isFinite(d)&&d>.01&&d<=155);
 }
});

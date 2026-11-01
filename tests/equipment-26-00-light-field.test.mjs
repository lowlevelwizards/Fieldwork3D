import test from 'node:test';import assert from 'node:assert/strict';
import {illuminationAt,buildIlluminationBlockers,sampleIlluminationGrid}
 from '../src/equipment-light-field.ts';
const p={x:10,y:30},source={id:'s',p:{x:0,y:30},range:80,intensity:1};
test('26.00 light reaches unblocked near surfaces but not beyond an opaque wall',()=>{
 const wall={a:{x:6,y:0},b:{x:6,y:80}};
 assert.ok(illuminationAt(p,[source],[],0)>.5);
 assert.equal(illuminationAt(p,[source],[wall],0),0);
 assert.equal(illuminationAt(p,[source],[wall],.15),.15);
});
test('26.00 light cone is directional and remains distinct from fog-of-war',()=>{
 const on={...source,heading:0,halfAngle:.3};
 assert.ok(illuminationAt(p,[on],[],0)>.5);
 assert.equal(illuminationAt({x:0,y:60},[on],[],0),0);
 assert.equal(illuminationAt(p,[{...on,enabled:false}],[],0),0);
 assert.ok(illuminationAt(p,[on],[],.9)<=1);
});
test('26.00 closed opaque door occludes; glazed door admits illumination',()=>{
 const door={id:'d',a:{x:5,y:0},b:{x:5,y:80},open:false,style:'wood'};
 const solid=buildIlluminationBlockers([], [door],[]);
 const glass=buildIlluminationBlockers([], [{...door,style:'glazed'}],[]);
 assert.equal(illuminationAt(p,[source],solid,0),0);
 assert.ok(illuminationAt(p,[source],glass,0)>.5);
});
test('26.00 sampling clamps huge grids and produces repeatable values',()=>{
 const input={origin:{x:0,y:0},columns:300,rows:300,step:16,
  sources:[source],blockers:[],ambient:.17};
 const a=sampleIlluminationGrid(input),b=sampleIlluminationGrid(input);
 assert.equal(a.length,96*96);
 assert.deepEqual(a,b);
 assert.ok(a.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {orientFurnishings} from '../src/worldgen/prop-orientation.ts';
import {inspectCounterAccess,counterApproachFor}
 from '../src/worldgen/service-counter-access.ts';

const room={id:'R',kind:'room',purpose:'reception',x:0,y:0,w:200,h:160};
const site={rooms:[room],doors:[],openings:[]};
test('counter near a wall turns to preserve real customer and staff access',()=>{
 const counter={fixture:'reception-desk',x:95,y:37,w:56,h:24,low:true};
 const result=orientFurnishings(site,[counter]);
 assert.ok([1,3].includes(result[0].orientation));
 const [access]=inspectCounterAccess({...site,cover:result});
 assert.equal(access.customerClear,true);
 assert.equal(access.staffClear,true);
 assert.deepEqual(result,orientFurnishings(site,[counter]));
});
test('the placement solver uses the exact same access points as the diagnostic',()=>{
 const counter={fixture:'transaction-counter',x:93,y:64,w:52,h:25,orientation:0};
 const occupied={fixture:'crate',x:93,y:34,w:20,h:20};
 const siteWith={...site,cover:[counter,occupied]};
 const direct=counterApproachFor(room,counter,siteWith.cover,siteWith);
 const fromAudit=inspectCounterAccess(siteWith)[0];
 assert.deepEqual(direct,fromAudit);
 assert.equal(direct.staffClear,false);
 assert.equal(direct.customerClear,true);
});
test('blocked sites report the obstruction instead of fabricating clear counter sides',()=>{
 const counter={fixture:'parts-counter',x:95,y:62,w:56,h:24};
 const cover=[counter,
  {fixture:'rack',x:95,y:25,w:60,h:25},
  {fixture:'rack',x:95,y:97,w:60,h:25},
  {fixture:'rack',x:57,y:62,w:25,h:50},
  {fixture:'rack',x:133,y:62,w:25,h:50}];
 const oriented=orientFurnishings({...site,rooms:[{...room,purpose:'parts'}]},cover);
 const access=inspectCounterAccess({...site,cover:oriented})[0];
 assert.ok(!access.customerClear||!access.staffClear);
 assert.equal(oriented.length,cover.length);
});

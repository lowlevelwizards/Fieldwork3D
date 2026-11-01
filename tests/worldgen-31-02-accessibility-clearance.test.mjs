import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAccessibilityClearance,ACCESSIBLE_ROUTE_WIDTH,
 ACCESSIBLE_DOOR_WIDTH,TURNING_DIAMETER}
 from '../src/worldgen/accessibility-clearance.ts';
const r={id:'R1',kind:'room',purpose:'waiting',x:0,y:0,w:100,h:100,tone:0};
test('reference distances follow canonical game metres',()=>{
 assert.ok(ACCESSIBLE_ROUTE_WIDTH>18&&ACCESSIBLE_ROUTE_WIDTH<19);
 assert.ok(ACCESSIBLE_DOOR_WIDTH>16&&ACCESSIBLE_DOOR_WIDTH<17);
 assert.ok(TURNING_DIAMETER>30&&TURNING_DIAMETER<31);
});
test('turning-reference warnings use final physical obstacle geometry',()=>{
 const clear=assessAccessibilityClearance({rooms:[r],cover:[],doors:[]});
 assert.ok(!clear.issues.some(i=>i.kind==='no-turning-area'));
 const blocked=assessAccessibilityClearance({rooms:[r],cover:[
  {x:50,y:50,w:100,h:100,fixture:'rack'}],doors:[]});
 assert.ok(blocked.issues.some(i=>i.kind==='no-turning-area'));
});
test('narrow doors are flagged while real wide openings are not',()=>{
 const small={id:'D',a:{x:0,y:44},b:{x:0,y:56}};
 const wide={id:'D2',a:{x:0,y:25},b:{x:0,y:73}};
 const site={rooms:[r],cover:[],doors:[small,wide]};
 const report=assessAccessibilityClearance(site);
 assert.deepEqual(report.issues.filter(i=>i.kind==='narrow-opening').map(i=>i.id),['D']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {incidentalCloseWouldBlockTeammate}
 from '../src/breach-door-pressure-arbitration.ts';
const door={id:'INTERIOR',a:{x:100,y:100},b:{x:140,y:100},open:true};
const actor={id:'rook',side:'blue',health:100,p:{x:140,y:86},
 plan:[{kind:'move',p:{x:150,y:80}}],nav:[],blockedTime:0};
const peer=(goal,extra={})=>({...actor,id:'moss',p:{x:120,y:82},
 plan:[{kind:'move',p:goal}],nav:[],...extra});
test('same-side active teammate crossing retains leaf open',()=>{
 assert.equal(incidentalCloseWouldBlockTeammate(
  [actor,peer({x:120,y:125})],actor,door),true);
});
test('idle, dead, distant and opposing teammates do not lock the leaf',()=>{
 assert.equal(incidentalCloseWouldBlockTeammate([actor],actor,door),false);
 assert.equal(incidentalCloseWouldBlockTeammate([actor,peer({x:120,y:80})],actor,door),false);
 assert.equal(incidentalCloseWouldBlockTeammate([actor,peer({x:120,y:125},{health:0})],actor,door),false);
 assert.equal(incidentalCloseWouldBlockTeammate([actor,peer({x:120,y:125},{side:'red'})],actor,door),false);
 assert.equal(incidentalCloseWouldBlockTeammate([actor,peer({x:120,y:125},{plan:[]})],actor,door),false);
});
test('actual motor navigation destination wins over stale authored endpoint',()=>{
 const navigating=peer({x:120,y:80},{nav:[{x:120,y:125}]});
 assert.equal(incidentalCloseWouldBlockTeammate(
  [actor,navigating],actor,door),true);
});

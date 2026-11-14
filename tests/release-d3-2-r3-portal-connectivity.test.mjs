import test from 'node:test';
import assert from 'node:assert/strict';
import {probeD32SampledConnectivity,captureD32PortalConnectivity}
 from '../src/breach-d3-portal-connectivity-evidence.ts';
const pt=(x,y)=>({x,y});
const bounds={minX:0,minY:0,maxX:96,maxY:96};
const world={
 bounds,passable:(p,r=8)=>p.x>=r&&p.x<=96-r&&p.y>=r&&p.y<=96-r
};
test('D3.2 R3: sampled physical and static topology agree on clear floor',()=>{
 const evidence=captureD32PortalConnectivity(pt(24,48),pt(72,48),[],world);
 assert.equal(evidence.resolution,4);
 assert.equal(evidence.physical.connected,true);
 assert.equal(evidence.staticOnly.connected,true);
 assert.equal(evidence.physical.exhausted,true);
 assert.ok(evidence.physical.startAnchors>0);
 assert.ok(evidence.physical.routeSteps>0);
});
test('D3.2 R3: solid leaf separates static-connected space from physical route',()=>{
 const leaf={id:'SPLIT',a:pt(48,0),b:pt(48,96),open:false,
  openedAt:-1,kind:'hinged',hinge:'a',swing:-1,openFraction:0};
 const evidence=captureD32PortalConnectivity(pt(24,48),pt(72,48),
  [leaf],world);
 assert.equal(evidence.staticOnly.connected,true);
 assert.equal(evidence.physical.connected,false);
 assert.equal(evidence.physical.exhausted,true);
});
test('D3.2 R3: visit limit reports inconclusive rather than disconnected',()=>{
 const leaf={id:'SPLIT',a:pt(48,0),b:pt(48,96),open:false,
  openedAt:-1,kind:'hinged',hinge:'a',swing:-1,openFraction:0};
 const evidence=probeD32SampledConnectivity(pt(24,48),pt(72,48),
  [leaf],world,4,true,2);
 assert.equal(evidence.connected,false);
 assert.equal(evidence.exhausted,false);
 assert.equal(evidence.visited,2);
});
test('D3.2 R3: a blocked start is never granted a phantom connector',()=>{
 const blockedWorld={...world,passable:(p,r=8)=>
  world.passable(p,r)&&!(p.x>=22&&p.x<=28&&p.y>=43&&p.y<=53)};
 assert.equal(probeD32SampledConnectivity(pt(24,48),pt(72,48),
  [],blockedWorld).connected,false);
});

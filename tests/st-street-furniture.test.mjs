import test from 'node:test';
import assert from 'node:assert/strict';
import {planStreetFurniture} from '../src/worldgen/street-furniture.ts';
import {proposeStreetInfrastructure,streetConflicts} from '../src/worldgen/street-infrastructure.ts';
test('contextual street hardware stays physical, bounded and off pedestrian/public access',()=>{
 for(const entrySide of ['south','north','east','west']){
  const axis=entrySide==='south'||entrySide==='north'?'x':'y',sign=entrySide==='south'||entrySide==='east'?1:-1;
  const entrance=axis==='x'?{x:450,y:450+sign*100}:{x:450+sign*100,y:450};
  const site={seed:7,entrySide,archetype:'retail',bounds:{minX:0,minY:0,maxX:900,maxY:900},rooms:[{x:350,y:350,w:200,h:200}],doors:[],entrance,spawn:[entrance],enemies:[],objective:{x:450,y:450},extract:entrance,cover:[]};
  const p=proposeStreetInfrastructure(site,'commercial',130);
  const center=(entrance[axis==='x'?'y':'x']+p.privateEdge)/2;
  const front={id:'arrival-forecourt',kind:'parking',x:axis==='x'?450:center,y:axis==='x'?center:450,w:axis==='x'?700:Math.abs(p.privateEdge-entrance.x),h:axis==='x'?Math.abs(p.privateEdge-entrance.y):700};
  const s={...site,streetInfrastructure:p,exteriorZones:[front]};
  const fixtures=planStreetFurniture(s);
  assert.ok(fixtures.length>0,entrySide);
  assert.ok(fixtures.length<=6);
  if(fixtures.some(c=>c.fixture==='street-power-box'))assert.ok(fixtures.some(c=>c.fixture==='street-lamp'));
  assert.deepEqual(fixtures,planStreetFurniture(s));
  assert.deepEqual(streetConflicts({...s,cover:fixtures},p),[]);
  assert.ok(fixtures.every(c=>c.w>0&&c.h>0));
  assert.deepEqual(planStreetFurniture(site),[]);
 }
});

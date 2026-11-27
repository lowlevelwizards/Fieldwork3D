import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {l1BaselineSite,L1_BASELINE_MODES}
 from '../scripts/audit-l1-lighting-baseline.mjs';
import {newSession} from '../src/breach-game.ts';
import {siteLightingTopology,planSiteLighting}
 from '../src/equipment-site-lighting.ts';
import {setSiteCircuitPower,setSiteFixtureSwitch,setSessionLightingMode}
 from '../src/equipment-site-power.ts';
import {fixtureLightingVisuals,FIXTURE_POOL_RAYS,FIXTURE_VISUAL_CAP,
 fixtureVisualColor} from '../src/equipment-lighting-visuals.ts';
import {lightRayDistance} from '../src/equipment-weapon-light-beam.ts';
import {windowCoveringSightSegments,setSessionWindowCovering} from '../src/breach-window-covering-optics.ts';
import {buildIlluminationBlockers} from '../src/equipment-light-field.ts';

const make=(mode='night',site=l1BaselineSite())=>{
 const s=newSession(0,undefined,'floor-plan','small','hold',site);
 setSessionLightingMode(s,mode);return s;
};
test('L1.3 all historical presets draw the authoritative active fixtures',()=>{
 for(const mode of L1_BASELINE_MODES){
  const s=make(mode),v=fixtureLightingVisuals(s);
  const active=planSiteLighting(s.site,mode,s.sitePower);
  assert.deepEqual(v.fixtures.filter(f=>f.intensity>0).map(f=>f.id),
   active.fixtures.map(f=>f.id));
  assert.equal(v.fixtures.length,siteLightingTopology(s.site).length);
  assert.equal(v.activeCount,active.fixtures.length);
  assert.ok(v.fixtures.every(f=>f.intensity===0||
   f.footprint.length===FIXTURE_POOL_RAYS+1));
 }
});
test('L1.3 breaker and switch changes immediately rebuild same-tick visuals',()=>{
 const s=make('night'),first=fixtureLightingVisuals(s);
 assert.equal(fixtureLightingVisuals(s),first,'cached scene evidence');
 // Fixed site lights are static: do not rebuild buffers just because
 // the game clock advanced into a new visual-acquisition bucket.
 s.seconds+=.3;
 assert.equal(fixtureLightingVisuals(s),first);
 const before=first.fixtures.find(f=>f.status==='mains');
 assert.ok(before);
 const topology=siteLightingTopology(s.site).find(f=>f.id===before.id);
 assert.equal(setSiteCircuitPower(s,topology.mainCircuit,false),true);
 const cut=fixtureLightingVisuals(s);
 assert.notEqual(cut,first);
 assert.equal(cut.fixtures.find(f=>f.id===before.id).status,'off');
 assert.ok(cut.activeCount<first.activeCount);
 assert.equal(setSiteCircuitPower(s,topology.mainCircuit,true),true);
 const restored=fixtureLightingVisuals(s);
 assert.equal(restored.fixtures.find(f=>f.id===before.id).status,'mains');
 assert.equal(setSiteFixtureSwitch(s,before.id,false),true);
 assert.equal(fixtureLightingVisuals(s).fixtures.find(f=>f.id===before.id).status,'off');
 assert.equal(setSiteFixtureSwitch(s,before.id,true),true);
 assert.equal(fixtureLightingVisuals(s).fixtures.find(f=>f.id===before.id).status,'mains');
});
test('L1.3 emergency supply has distinct fixture state and muted palette',()=>{
 const s=make('blackout'),visuals=fixtureLightingVisuals(s);
 assert.ok(visuals.fixtures.some(f=>f.status==='backup'));
 assert.ok(visuals.fixtures.some(f=>f.status==='off'));
 const backup=visuals.fixtures.find(f=>f.status==='backup');
 assert.equal(fixtureVisualColor(backup),0xc58e65);
 assert.equal(setSiteCircuitPower(s,'backup:emergency',false),true);
 const dark=fixtureLightingVisuals(s);
 assert.equal(dark.activeCount,0);
 assert.ok(dark.fixtures.every(f=>f.intensity===0));
});
test('L1.3 power never adds discovery, room intel or simulation mutations',()=>{
 const s=make(),initialRevision=s.objectRevision;
 const seen=s.seenGround.size,rooms=s.intel.rooms.size,seconds=s.seconds;
 fixtureLightingVisuals(s);fixtureLightingVisuals(s);
 assert.equal(s.objectRevision,initialRevision);
 assert.equal(s.seenGround.size,seen);
 assert.equal(s.intel.rooms.size,rooms);
 assert.equal(s.seconds,seconds);
});
test('L1.3 pool rays stop at the same opaque optical blockers as light math',()=>{
 const s=make(),v=fixtureLightingVisuals(s);
 const blockers=buildIlluminationBlockers(s.site.walls,s.doors,s.coverState,windowCoveringSightSegments(s));
 for(const f of v.fixtures.filter(f=>f.intensity>0)){
  for(let i=0;i<FIXTURE_POOL_RAYS;i++){
   const angle=i*Math.PI*2/FIXTURE_POOL_RAYS;
   const distance=lightRayDistance(f.p,angle,f.range,blockers);
   const end=f.footprint[i+1];
   assert.ok(Math.abs(Math.hypot(end.x-f.p.x,end.y-f.p.y)-distance)<1e-7);
  }
 }
 const closed=s.doors.find(d=>d.kind!=='sliding'&&d.kind!=='shutter');
 if(closed){
  const before=fixtureLightingVisuals(s);
  closed.openFraction=1;closed.open=true;
  const after=fixtureLightingVisuals(s);
  assert.notEqual(after,before,'door aperture invalidates within bucket');
 }
});
test('L1.3 capped, old-map-safe, dark and failed geometry',()=>{
 const s=make(),empty={...s.site,rooms:[],wallDetails:[]};
 const blank=make('blackout',empty);
 assert.deepEqual(fixtureLightingVisuals(blank).fixtures,[]);
 const many={...s.site,rooms:Array.from({length:56},(_,i)=>({
  ...s.site.rooms[i%s.site.rooms.length],id:'many:'+i,
  x:40+i*22,y:40+i*11
 }))};
 assert.ok(fixtureLightingVisuals(make('day',many)).fixtures.length<=FIXTURE_VISUAL_CAP);
 const failed={...s.site,condition:'neglected'};
 const f=fixtureLightingVisuals(make('day',failed));
 assert.ok(f.fixtures.some(x=>x.status==='failed'));
 assert.ok(f.fixtures.filter(x=>x.status==='failed')
  .every(x=>x.footprint.length===1));
});
test('L1.3 both view renderers consume the shared visual module and preserve fog',()=>{
 const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const shared=src('equipment-lighting-visuals.ts');
 const flat=src('breach-2d-world-renderer.ts');
 const iso=src('rendering/breach-site-light-presenter.ts');
 const stage=src('breach-3d.ts');
 assert.match(shared,/buildIlluminationBlockers\(site\.walls,s\.doors,s\.coverState,windowCoveringSightSegments\(s\)\)/);
 assert.match(flat,/fixtureLightingVisuals\(state\)/);
 assert.match(iso,/fixtureLightingVisuals\(s\)/);
 assert.match(iso,/presentDecor\(/);
 assert.match(flat,/world2D\.renderFixtureLighting2D\(\)/);
 // V12 surface marks are drawn after architecture, before the same fog pass.
 assert.match(flat,/world2D\.architecture\(\);world2D\.renderSurfaceMarks\(\);fog2D\.renderFog\(\)/);
 assert.match(stage,/this\.fixtureLights\.reset\(\)/);
 assert.match(stage,/this\.fixtureLights\.update\(s,omniscient,personalDisclosure/);
 assert.doesNotMatch(iso,/SpotLight|castShadow\s*=\s*true/);
});

test('WC3 fixture footprints update within the same tick on covering changes',()=>{
 const s=make('night'),first=fixtureLightingVisuals(s);
 const source=first.fixtures.find(f=>f.intensity>0);
 assert.ok(source);
 const edge={id:'WC3-probe',x:source.p.x+10,y:source.p.y,width:30,vertical:true,sillHeight:0,headHeight:50,open:false,shattered:false,integrity:1,operable:false};
 s.windows.push(edge);s.objectRevision++;
 const open=fixtureLightingVisuals(s);
 assert.equal(setSessionWindowCovering(s,edge.id,{family:'curtain',side:1,opening:0,palette:'linen'}),true);
 const shut=fixtureLightingVisuals(s);
 assert.notStrictEqual(shut,open);
 const blockers=buildIlluminationBlockers(s.site.walls,s.doors,s.coverState,windowCoveringSightSegments(s));
 const fixture=shut.fixtures.find(f=>f.id===source.id);
 for(let i=0;i<FIXTURE_POOL_RAYS;i++){
  const end=fixture.footprint[i+1];
  assert.ok(Math.abs(Math.hypot(end.x-fixture.p.x,end.y-fixture.p.y)-lightRayDistance(fixture.p,i*Math.PI*2/FIXTURE_POOL_RAYS,fixture.range,blockers))<1e-7);
 }
 assert.ok(Math.hypot(fixture.footprint[1].x-fixture.p.x,fixture.footprint[1].y-fixture.p.y)<=10.001);
});

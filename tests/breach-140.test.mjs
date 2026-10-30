import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,WALLS,COVER} from '../src/breach-core.ts';
import {initialIntel,INTEL_MODES,observeIntel,doorKnown,wallKnown,
 coverKnown,intelSnapshot,intelRestore,routeWithIntel,intelFogLevel}
 from '../src/breach-intel.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('140: three modes grant distinct briefing knowledge on identical site',()=>{
 const site=generateSite(81921);
 activateSite(site);
 const doors=site.doors;
 const b=initialIntel('true-blind',site,doors);
 const e=initialIntel('exterior-known',site,doors);
 const f=initialIntel('floor-plan',site,doors);
 assert.deepEqual([...INTEL_MODES],['true-blind','exterior-known','floor-plan']);
 assert.equal(b.walls.size,0);assert.equal(b.cover.size,0);
 assert.ok(e.walls.size>0&&e.walls.size<=WALLS.length);
 assert.equal(f.walls.size,WALLS.length);
 assert.equal(f.doors.size,doors.length);
 assert.equal(f.cover.size,0,'floor plan must not reveal interior furniture');
 assert.equal(intelFogLevel(b,site,site.objective,false,false),2);
 assert.equal(intelFogLevel(f,site,site.objective,false,false),1);
 assert.equal(intelFogLevel(e,site,{x:10,y:20},false,false),1);
 activateSite(null);
});
test('140: observation changes world knowledge but not physical facts',()=>{
 const site=generateSite(112233),s=newSession(0,site.seed,'true-blind');
 const before=s.intel.walls.size,physical=COVER.length;
 observeIntel(s.intel,site,s.doors,()=>true);
 assert.equal(s.intel.walls.size,WALLS.length);
 assert.equal(s.intel.cover.size,physical);
 assert.ok(s.intel.walls.size>=before);
 assert.ok(s.doors.every(d=>doorKnown(s.intel,d.id)));
 assert.ok(s.intel.walls.size>0&&wallKnown(s.intel,0));
 if(COVER.length)assert.ok(coverKnown(s.intel,0));
 const copied=intelRestore(intelSnapshot(s.intel));
 assert.deepEqual(intelSnapshot(copied),intelSnapshot(s.intel));
});
test('140: replay restores discoveries and selected intelligence rules',()=>{
 const s=newSession(0,43521,'exterior-known'),a=team(s)[0];
 const f=snapshot(s);
 const orig=JSON.stringify(f.intel);
 s.intel.walls.clear();s.intel.mode='true-blind';
 applyReplayFrame(s,f);
 assert.equal(JSON.stringify(intelSnapshot(s.intel)),orig);
 assert.equal(s.intel.mode,'exterior-known');
 assert.ok(routeWithIntel(s.intel,a.p,a.p).length>0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverRoomEssentials} from '../src/worldgen/room-essential-recovery.ts';
import {fixtureServiceClear,requiresServiceApproach}
 from '../src/worldgen/fixture-service-clearance.ts';
import {measureSiteCompleteness} from '../src/worldgen/site-completeness.ts';
import {assessRoomContracts} from '../src/worldgen/room-contracts.ts';

const makeSite=(purpose,w,h)=>({
 rooms:[{id:'R',zoneId:'R',kind:'room',purpose,x:0,y:0,w,h}],
 doors:[],openings:[],cover:[],spawn:[],enemies:[],
 objective:{x:-500,y:-500},extract:{x:-500,y:-500},units:[]
});
test('essential control panel needs an actual operating face, not just body space',()=>{
 const ample=makeSite('control',160,135);
 const restored=recoverRoomEssentials(ample,[]);
 assert.equal(restored.issues.length,0);
 assert.equal(assessRoomContracts({...ample,cover:restored.cover})[0].complete,true);
 const panel=restored.cover.find(x=>x.fixture==='control-panel');
 assert.ok(panel);
 const oriented=panel.orientation%2?{...panel,w:panel.h,h:panel.w}:panel;
 assert.equal(fixtureServiceClear(ample.rooms[0],oriented,[oriented]),true);
 assert.deepEqual(restored,recoverRoomEssentials(ample,[]));
 const tiny=makeSite('control',52,49);
 const impossible=recoverRoomEssentials(tiny,[]);
 assert.ok(impossible.issues.some(i=>i.fixture.includes('control-panel')));
 assert.ok(!impossible.cover.some(x=>x.fixture==='control-panel'));
});
test('inaccessible mandatory equipment loses candidate ranking even if present',()=>{
 const input=makeSite('restroom',200,170);
 const toilet={x:50,y:27,w:30,h:24,fixture:'toilet',orientation:0};
 const sink={x:115,y:27,w:30,h:24,fixture:'sink',orientation:0};
 const reachable=measureSiteCompleteness({...input,cover:[toilet,sink]});
 const crate={x:50,y:55,w:30,h:24,fixture:'crate'};
 const blocked=measureSiteCompleteness({...input,cover:[toilet,sink,crate]});
 assert.equal(reachable.blockedWorkingFaces,0);
 assert.equal(reachable.score,0);
 assert.equal(blocked.blockedWorkingFaces,1);
 assert.ok(blocked.score>reachable.score);
 assert.equal(requiresServiceApproach('toilet'),true);
 assert.equal(requiresServiceApproach('bed'),false);
});

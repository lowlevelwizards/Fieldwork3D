import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession, stepSession, toggling, planMove, undoPlan, redoPlan, isSeen} from '../../src/breach-game.ts';
import {activateSite, COVER, passable} from '../../src/breach-core.ts';
import {initialIntel, routeWithIntel} from '../../src/breach-intel.ts';
import {DisplayRouteCache} from '../../src/breach-route-cache.ts';
import {snapshot, applyReplayFrame, MissionRecorder} from '../../src/breach-replay.ts';
import {captureReplayArchive, replayArchiveIsValid} from '../../src/breach-replay-archive.ts';
import {issueWeaponPreset} from '../../src/breach-weapon-issue.ts';
import {newCampaign, readCampaign} from '../../src/campaign-state.ts';
import {emptySite, withTacticalWorld} from '../helpers/tactical-world.mjs';

test.afterEach(() => activateSite(null));

test('planning cannot advance simulation time, ammunition or actor positions', () => {
  const s = newSession(), before = snapshot(s);
  stepSession(s, 1 / 60);
  assert.deepEqual(snapshot(s), before);
});

test('fixed inputs produce the same authoritative outcomes on successive runs', () => {
  const simulate = () => {
    const s = newSession();
    planMove(s, 'rook', {x:260,y:650});
    toggling(s);
    for(let i=0;i<120;i++) stepSession(s,1/60);
    return snapshot(s);
  };
  assert.deepEqual(simulate(), simulate());
});

test('editing navigation cannot rewrite authored plans; undo and redo restore orders', () => {
  const s = newSession();
  planMove(s, 'rook', {x:260,y:650});
  const a = s.operators.find(a=>a.id==='rook');
  assert.ok(a.plan.length);
  const authored = structuredClone(a.plan);
  a.nav.push({x:999,y:999});
  assert.deepEqual(a.plan, authored);
  undoPlan(s,a.id);assert.equal(a.plan.length,0);
  redoPlan(s,a.id);assert.deepEqual(JSON.parse(JSON.stringify(a.plan)),authored);
});

test('an undiscovered opponent is not disclosed by its existence in the world', () => {
  const s = newSession(), opponent = s.operators.find(a=>a.side==='red');
  opponent.p={x:10000,y:10000};
  assert.equal(isSeen(s,opponent),false);
});

test('fixtures restore both authored site identity and moved live geometry', () => {
  const original=emptySite({cover:[{x:90,y:90,w:25,h:25,fixture:'crate'}]});
  activateSite(original);COVER.splice(0,1,{...COVER[0],x:130});
  withTacticalWorld(emptySite(),()=>assert.equal(passable({x:130,y:90}),true));
  assert.equal(COVER[0].x,130);
  assert.equal(passable({x:130,y:90}),false);
});

test('same-count geometry changes invalidate displayed routes', () => {
  const site=emptySite({cover:[{x:150,y:200,w:35,h:35,fixture:'crate'}]});
  withTacticalWorld(site,()=>{
    const intel=initialIntel('full-view',site,[]),cache=new DisplayRouteCache();
    const from={x:48,y:96},to={x:250,y:96};
    const first=cache.get(from,to,intel,true);
    COVER.splice(0,COVER.length,{...COVER[0],y:96});
    const next=cache.get(from,to,intel,true);
    assert.notDeepEqual(next.points,first.points);
    assert.deepEqual(next.points,routeWithIntel(intel,from,to));
  });
});

test('replay retains modular weapon parts and owns its captured configuration', () => {
  const live=newSession(),a=live.operators[0];
  a.weaponConfiguration=issueWeaponPreset('ar-m4a1').weaponConfiguration;
  const expected=structuredClone(a.weaponConfiguration),frame=snapshot(live);
  a.weaponConfiguration.build.parts.stock='arbitrary-live-edit';
  const playback=newSession();applyReplayFrame(playback,frame);
  assert.deepEqual(playback.operators[0].weaponConfiguration,expected);
  playback.operators[0].weaponConfiguration.build.parts.stock='arbitrary-playback-edit';
  assert.deepEqual(frame.actors[0].weaponConfiguration,expected);
});

test('campaign decoder preserves supported saves and rejects impossible operator state', () => {
  const valid=newCampaign(123);
  assert.deepEqual(readCampaign(JSON.stringify(valid)),valid);
  for(const [key,value] of [['magazine',-100],['recoveryDays',-999],['status','invented'],['weapon','invented']]) {
    const bad=structuredClone(valid);bad.operators[0][key]=value;
    assert.equal(readCampaign(JSON.stringify(bad)),null,`${key} must be validated`);
  }
});

test('replay archive validation rejects corrupt nested actors, doors and geometry', () => {
  const s=newSession(0,23),rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.1;rec.capture(s,true);
  const valid=captureReplayArchive(rec,'verification-film',1);
  assert.equal(replayArchiveIsValid(valid),true);
  for(const corrupt of [
    a=>a.manifest.site={},a=>a.frames[0].actors[0]=null,
    a=>a.frames[0].doors[0]=null,a=>a.frames[0].actors[0].p.x=NaN,
  ]) {
    const bad=structuredClone(valid);corrupt(bad);
    assert.equal(replayArchiveIsValid(bad),false);
  }
});

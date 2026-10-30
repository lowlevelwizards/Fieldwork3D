import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {constrainFoot,needsRecoveryStep} from '../src/breach-gait.ts';
import {GRIPS,clampReach,handlingPose} from '../src/breach-weapon-pose.ts';
import {BALLISTICS,readyMode,dispersion,rayHitsActor,shotYaw,
  recoverWeapon,approachAngle} from '../src/breach-ballistics.ts';
import {newSession,team} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable} from '../src/breach-core.ts';
import {doorReachable,handlePoint} from '../src/breach-door.ts';

test('114: a left and right foot stay in separate support envelopes',()=>{
  const hip={x:50,y:50};
  const l=constrainFoot({x:80,y:65},hip,0,-1);
  const r=constrainFoot({x:80,y:35},hip,0,1);
  assert.equal(l.outOfBounds,true);
  assert.equal(r.outOfBounds,true);
  assert.ok(l.position.y<=hip.y-3.5);
  assert.ok(r.position.y>=hip.y+3.5);
  assert.ok(needsRecoveryStep(l,true));
  assert.equal(needsRecoveryStep(l,false),false);
  const normal=constrainFoot({x:52,y:45},hip,0,-1);
  assert.equal(normal.outOfBounds,false);
});
test('114: support envelope remains under rotated pelvis',()=>{
  for(const yaw of [-2.9,-1.3,0,1.1,2.9]){
    const p=constrainFoot({x:130,y:80},{x:100,y:100},yaw,-1);
    assert.ok(Number.isFinite(p.position.x));
    assert.ok(Math.hypot(p.position.x-100,p.position.y-100)<14);
  }
});
test('115: procedural doors have narrower physical apertures and valid walkable sides',()=>{
  for(let seed=11;seed<=50;seed++){
    const site=generateSite(seed);
    activateSite(site);
    assert.ok(site.doors.length>0);
    for(const door of site.doors){
      const length=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
      assert.equal(length,48);
      const h=handlePoint(door);
      assert.ok(doorReachable({x:h.x+2,y:h.y+20},door));
      assert.ok(passable(site.spawn[0]));
    }
  }
  activateSite(null);
});
test('115: physical arm reach is capped even for a distant door target',()=>{
  const a=new THREE.Vector3(0,4,7),b=new THREE.Vector3(80,20,0);
  const c=clampReach(a,b,19.2);
  assert.ok(Math.abs(c.distanceTo(a)-19.2)<.00001);
  const near=new THREE.Vector3(8,4,7);
  assert.deepEqual(clampReach(a,near,19.2).toArray(),near.toArray());
});
test('116: shoulder-anchored weapons declare distinct physical grip dimensions',()=>{
  assert.deepEqual(Object.keys(GRIPS).sort(),['carbine','rifle','shotgun','smg']);
  assert.ok(GRIPS.rifle.lengthScale>GRIPS.smg.lengthScale);
  assert.equal(handlingPose({aim:0,moving:.8,obstruction:false,
    friendlyNear:false}),'low');
  assert.equal(handlingPose({aim:1,moving:0,obstruction:false,
    friendlyNear:false}),'ads');
  assert.equal(handlingPose({aim:.5,moving:0,obstruction:true,
    friendlyNear:false}),'short');
});
test('118: point fire is fast in close quarters while long range requires ADS',()=>{
  assert.equal(readyMode(40,.4,'carbine'),'point');
  assert.equal(readyMode(200,.4,'carbine'),null);
  assert.equal(readyMode(200,.98,'rifle'),'ads');
  const point=dispersion('carbine','point',1,false,0,0,0);
  const ads=dispersion('carbine','ads',1,false,0,0,0);
  assert.ok(point>ads);
  assert.ok(dispersion('carbine','ads',.2,true,.7,2,.5)>ads);
});
test('118: deterministic muzzle rays decide physical intersection',()=>{
  assert.ok(rayHitsActor({x:0,y:0},0,{x:120,y:0},9));
  assert.equal(rayHitsActor({x:0,y:0},.3,{x:120,y:0},9),false);
  assert.equal(shotYaw(.3,.12,.5,.5),.3);
  assert.ok(approachAngle(0,Math.PI,0.1)<=.11);
  assert.ok(BALLISTICS.shotgun.recoilKick>BALLISTICS.carbine.recoilKick);
});
test('118: recoil decays, stability improves when composed',()=>{
  const p=BALLISTICS.carbine;
  const a=recoverWeapon(.55,.2,.5,p,false);
  assert.ok(a.recoil<.55);
  assert.ok(a.stability>.2);
  const b=recoverWeapon(.55,.6,.5,p,true);
  assert.ok(b.stability<.6);
});
test('118: authoritative weapon state is retained in replay',()=>{
  const s=newSession(0,212);
  const a=team(s)[0];
  a.weaponYaw=1.13;a.recoil=.4;a.stability=.28;a.fireMode='point';
  a.lastShotAt=1.4;a.burstCount=3;
  const rec=new MissionRecorder();rec.capture(s,true);
  const f=rec.at(0);
  assert.ok(f);
  const replay=newSession(0,212);
  applyReplayFrame(replay,f);
  assert.equal(replay.operators[0].weaponYaw,1.13);
  assert.equal(replay.operators[0].recoil,.4);
  assert.equal(replay.operators[0].fireMode,'point');
  activateSite(null);
});
test('117: UI separates tactical actions and site settings; no always-on casualties',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  for(const id of ['siteSettings','siteSettingsToggle','replayExtra','replayMore'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.doesNotMatch(main,/fillText\('× DOWN'/);
  assert.doesNotMatch(main,/fillText\(shot\.down\?'DOWN':'HIT'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planCasingFlight,sampleCasingFlight,casingLanding,casingSeed} from '../src/breach-casing-trajectory.ts';
import {casingAt,CASING_LIMIT} from '../src/breach-effects.ts';
import {casingPort} from '../src/breach-casing-sockets.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {initialWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {newSession,team} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {emitSpentCasing} from '../src/breach-casing-emission.ts';
import {createCasingGeometry,casingVisualProfile} from '../src/rendering/breach-casing-art.ts';
import {BreachCombatEffectsPresenter} from '../src/rendering/breach-combat-effects-presenter.ts';

const origin={x:100,y:28,z:100},yaw=0;
test('V20 independently mixed deterministic trajectories scatter a stationary burst',()=>{
 const occupied=[],flights=[];
 for(let i=0;i<64;i++){
  const flight=planCasingFlight(i,origin,yaw,undefined,occupied);
  assert.deepEqual(flight,planCasingFlight(i,origin,yaw,undefined,occupied));
  occupied.push(casingLanding(flight));flights.push(flight);
  assert.ok(Object.isFrozen(flight)&&Object.isFrozen(flight.legs));
 }
 const unique=new Set(occupied.map(p=>Math.round(p.x)+':'+Math.round(p.z)));
 assert.ok(unique.size>=50,'stationary burst must spread: '+unique.size);
 assert.ok(Math.max(...occupied.map(p=>p.z))-Math.min(...occupied.map(p=>p.z))>15);
 assert.notEqual(casingSeed(12,0),casingSeed(12,1));
 const flight=flights[0],mid=sampleCasingFlight(flight,.25);
 assert.equal(mid.settled,false);
 assert.deepEqual(sampleCasingFlight(flight,4),sampleCasingFlight(flight,100));
 assert.equal(sampleCasingFlight(flight,4).tiltZ,Math.PI/2);
});
test('V20 bounded wall reflection retains near-side contact without frame queries',()=>{
 let queries=0;
 const trace=(a,b)=>{queries++;return a.z<110&&b.z>=110?(110-a.z)/(b.z-a.z):1;};
 const f=planCasingFlight(7,origin,0,trace);
 assert.ok(queries<=14);
 for(let t=0;t<3;t+=.025)assert.ok(sampleCasingFlight(f,t).z<=110.001);
 const prior=queries;sampleCasingFlight(f,100);assert.equal(queries,prior);
});
test('V20 family receiver sockets follow the shared pose; only requested at ignition',()=>{
 for(const preset of FAMILY_PRESETS){
  const config={...initialWeaponConfiguration(preset.weapon),build:{family:preset.family,parts:{...preset.parts}}};
  const input={x:100,z:120,heading:0,weaponYaw:0,weapon:preset.weapon,weaponConfiguration:config,aim:.98,velocity:0,recoil:0};
  const ordinary=muzzleAtShot(input),sample=muzzleAtShot({...input,sampleEjection:true});
  assert.equal(ordinary.ejection,undefined);
  assert.ok(sample.ejection,preset.id);
  assert.ok(Math.hypot(sample.ejection.x-sample.x,sample.ejection.z-sample.z)>5,preset.id);
  assert.deepEqual({...sample,ejection:undefined},{...ordinary,ejection:undefined});
  assert.ok(casingPort(preset.weapon,config).z>0);
  const crouch=muzzleAtShot({...input,posture:'crouch',sampleEjection:true});
  assert.ok(crouch.ejection.y<sample.ejection.y,preset.id);
 }
 const pistol=muzzleAtShot({x:100,z:120,heading:0,weaponYaw:0,weapon:'carbine',secondaryWeapon:'glock-g19x',aim:.98,velocity:0,recoil:0,sampleEjection:true});
 assert.ok(pistol.ejection&&pistol.ejection.z>pistol.z);
});
test('V20 shot records retain immutable resolved trajectory through snapshot/seek',()=>{
 const s=newSession(),a=team(s)[0],m={...origin,yaw:0,pitch:0,ejection:origin};
 const c=emitSpentCasing(s,a,1,m);
 assert.equal(c.id,1);assert.deepEqual(c.flight.legs[0].from,origin);
 const expected=casingAt(c,10),frame=snapshot(s);
 s.casings=[];applyReplayFrame(s,frame);
 assert.deepEqual(casingAt(s.casings[0],10),expected);
 for(let i=2;i<110;i++)emitSpentCasing(s,a,i,m);
 assert.equal(s.casings.length,CASING_LIMIT);
 const legacy={id:12,at:0,weapon:'carbine',side:'blue',x:40,y:20,z:12,heading:.8};
 assert.equal(casingAt(legacy,3).y,.82);
});
test('V20 mesh triangles decrease and one batch stops all settled writes',()=>{
 const g=createCasingGeometry(),old=new THREE.CylinderGeometry(.75,.75,3.1,6);
 assert.ok(g.index.count<old.index.count);g.dispose();old.dispose();
 for(const weapon of ['carbine','rifle','smg','shotgun']){
  const p=casingVisualProfile({weapon});assert.ok(p.width>0&&p.length>0);
 }
 const root=new THREE.Group(),presenter=new BreachCombatEffectsPresenter(root,[],false);
 const casings=Array.from({length:96},(_,id)=>({id,at:0,weapon:'carbine',side:'blue',...origin,heading:0,flight:planCasingFlight(id,origin,0)}));
 const session={seconds:4,casings,dropped:[],grenades:[],flashBursts:[]};
 presenter.update(session,true,false,()=>true);
 assert.equal(presenter.stats().casings,96);
 const writes=presenter.resourceStats().matrixWrites;
 session.seconds=5;presenter.update(session,true,false,()=>true);
 assert.equal(presenter.resourceStats().matrixWrites,writes);
 session.seconds=.1;presenter.update(session,true,false,()=>true);
 assert.ok(presenter.resourceStats().matrixWrites>writes);
 presenter.update(session,true,true,()=>true);assert.equal(presenter.stats().casings,0);
 presenter.update(session,false,false,()=>false);assert.equal(presenter.stats().casings,0);
 assert.equal(root.children.filter(x=>x.isInstancedMesh).length,1);
});

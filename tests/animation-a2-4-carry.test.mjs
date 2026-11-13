import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCarry} from '../src/breach-carry-policy.ts';
import {handlingPose,fitWeaponPose,weaponGrips,liveShortStockPose}
 from '../src/breach-weapon-pose.ts';
import {HANDLING_PROFILES} from '../src/breach-handling-profiles.ts';
import {stockPocket} from '../src/breach-anatomy.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
const facts=(extra={})=>({aim:0,moving:0,obstruction:false,
 friendlyNear:false,weapon:'carbine',...extra});
const input=(extra={})=>({x:90,z:70,heading:0,weaponYaw:0,
 weapon:'carbine',aim:0,velocity:0,recoil:0,
 posture:'stand',...extra});

test('A2.4 named pose reason/trigger table is ordered and replay-pure',()=>{
 const cases=[
  [{intent:'hold'},'ready','watch'],
  [{intent:'look'},'ready','watch'],
  [{intent:'pie'},'ready','watch'],
  [{intent:'move',moving:.75},'low','moving'],
  [{intent:'run',moving:1,aim:1},'low','hands-busy'],
  [{intent:'reload',aim:1},'low','hands-busy'],
  [{intent:'treat',aim:1},'low','hands-busy'],
  [{intent:'door'},'ready','door-entry'],
  [{intent:'entry'},'ready','door-entry'],
  [{intent:'stack',friendlyNear:true},'high','threshold-stack'],
  [{intent:'door',friendlyNear:true},'high','threshold-stack'],
  [{intent:'entry',friendlyNear:true},'high','threshold-stack'],
  [{intent:'stack',friendlyNear:true,friendlyAhead:true},
    'low','friendly-courtesy'],
  [{intent:'move',friendlyAhead:true},'low','friendly-courtesy'],
  [{intent:'engage',aim:.45,threatRange:15},'point','close-contact'],
  [{intent:'engage',aim:.95,threatRange:200},'ads','aim'],
  [{intent:'squeeze',aim:1},'short','squeeze'],
  [{obstruction:true,aim:1},'short','hard-clearance']
 ];
 for(const [f,handling,reason] of cases){
  const p=facts(f),before=JSON.stringify(p);
  const c=chooseCarry(p);
  assert.equal(c.handling,handling,JSON.stringify(f));
  assert.equal(c.reason,reason,JSON.stringify(f));
  assert.deepEqual(chooseCarry(p),c);
  assert.equal(JSON.stringify(p),before);
 }
 assert.equal(handlingPose(facts({intent:'stack',friendlyNear:true,
  previous:'ready',heldFor:.01})), 'high',
  'direct threshold handling must not be hidden by passive hysteresis');
});

test('A2.4 low/high reference profiles are genuinely different carries',()=>{
 assert.ok(HANDLING_PROFILES.low.pitch<-Math.PI/6);
 assert.ok(HANDLING_PROFILES.low.pitch>-Math.PI/4-.02);
 assert.ok(HANDLING_PROFILES.high.pitch>Math.PI/4);
 assert.ok(stockPocket('high').y<stockPocket('ready').y-2,
   'high buttstock sits in armpit, not behind cheek');
 assert.ok(stockPocket('low').y>stockPocket('high').y);
 for(const weapon of ['carbine','rifle','smg','shotgun']){
  const low=fitWeaponPose({weapon,handling:'low',yaw:0,recoil:0});
  const high=fitWeaponPose({weapon,handling:'high',yaw:0,recoil:0});
  const ready=fitWeaponPose({weapon,handling:'ready',yaw:0,recoil:0});
  assert.ok(low.rotation.z<ready.rotation.z-.20);
  assert.ok(high.rotation.z>ready.rotation.z+.50);
  assert.ok(high.stock.y<ready.stock.y-1.5);
  assert.ok([low,high,ready].every(v=>
   Number.isFinite(v.contactError)&&Number.isFinite(v.stockError)));
 }
});

test('A2.4 wall and friendly clearance resolves actual identical rigid muzzle',()=>{
 const basic=input(),m=muzzleAtShot(basic);
 const no=[],wall=x=>[{a:{x,y:0},b:{x,y:145}}];
 const cases=[
  {name:'far',walls:wall(m.x+40),friends:[]},
  {name:'approach',walls:wall(m.x+7),friends:[]},
  {name:'imminent',walls:wall(m.x-2),friends:[]},
  {name:'hard-block',walls:wall(basic.x+12),friends:[]},
  {name:'buddy-ahead',walls:[],friends:[{x:m.x-2,y:70}]},
  {name:'buddy-to-side',walls:[],friends:[{x:m.x,y:100}]}
 ];
 for(const c of cases){
  const a=weaponClearance(basic,no,no,c.walls,c.friends);
  assert.deepEqual(a,weaponClearance(basic,no,no,c.walls,c.friends),
   c.name+' non-deterministic');
  assert.ok(a.compression>=0&&a.compression<=1);
  const reconstruct=muzzleAtShot({...basic,
   carryOverride:a.carryOverride,shortFrom:a.shortFrom,
   obstruction:a.obstruction,shortCompression:a.obstruction?
     a.compression:undefined});
  assert.ok(Math.abs(a.muzzle.x-reconstruct.x)<.000001,
   c.name+' render/shot X diverged');
  assert.ok(Math.abs(a.muzzle.z-reconstruct.z)<.000001,
   c.name+' render/shot Z diverged');
  assert.ok(Math.abs(a.muzzle.pitch-reconstruct.pitch)<.000001);
  if(c.name==='far')assert.equal(a.obstruction,false);
  if(c.name==='buddy-to-side')assert.equal(a.blocked,false);
  if(c.name==='hard-block')assert.equal(a.blocked,true);
  if(c.name==='buddy-ahead')assert.ok(a.obstruction||a.carryOverride==='low');
  if(a.obstruction){
   assert.equal(a.carryOverride,'short');
   assert.equal(a.shortFrom,'low');
  }
 }
});

test('A2.4 30+ weapon families keep rigid, finite six-pose endpoints',()=>{
 const catalog=[...FAMILY_PRESETS.map(p=>({
  id:p.id,weapon:p.weapon,
  config:selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id)
 })),...['carbine','rifle','smg','shotgun'].map(w=>({
  id:'legacy-'+w,weapon:w,config:undefined}))];
 assert.ok(catalog.length>=34);
 for(const w of catalog){
  const grips=weaponGrips(w.weapon,w.config);
  const reference=liveShortStockPose(w.weapon,w.config);
  assert.ok(reference.targets.stock.every(Number.isFinite),w.id);
  for(const handling of ['low','high','ready','point','ads','short']){
   const fit=fitWeaponPose({weapon:w.weapon,configuration:w.config,
    handling,shortCompression:handling==='short'?1:undefined,
    yaw:0,recoil:0});
   assert.ok(Number.isFinite(fit.stock.x)&&
    Number.isFinite(fit.rotation.z)&&
    Number.isFinite(fit.primary.x)&&Number.isFinite(fit.support.z),
    w.id+' '+handling);
   assert.ok(fit.stockError<15,w.id+' '+handling+' stock error '+fit.stockError);
  }
  const assembly=w.config?resolveWeaponAssembly(w.config):null;
  for(const aim of [0,.55,.95]){
   const shot=muzzleAtShot(input({
    weapon:w.weapon,weaponConfiguration:w.config,aim}));
   assert.ok(Number.isFinite(shot.x)&&Number.isFinite(shot.y));
   assert.ok(Number.isFinite(shot.yaw));
   assert.ok((assembly?.muzzleX??19.5)*grips.lengthScale>0);
  }
 }
});

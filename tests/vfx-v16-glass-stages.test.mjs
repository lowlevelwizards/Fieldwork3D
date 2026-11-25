import test from 'node:test';
import assert from 'node:assert/strict';
import {glassImpactDamage} from '../src/breach-glass-damage.ts';
import {initializeWindows,damageWindow,windowPaneSegment} from '../src/breach-windows.ts';
import {segmentAttachment,windowMarkPose,doorMarkLocalPose} from '../src/breach-impact-surface.ts';
import {createShotEnvironmentCommitter} from '../src/breach-shot-environment.ts';
import {bloodMarkTint} from '../src/breach-blood-evidence.ts';
test('abstract standard attack pacing leaves two readable damaged stages',()=>{
 const [w]=initializeWindows([{id:'w',x:0,y:0,width:48,vertical:false,style:'standard',sillHeight:10,headHeight:40}]);
 const ref=segmentAttachment('window',0,'w',windowPaneSegment(w),{x:10,y:20},{x:10,y:-20},.5,19);
 for(let i=0;i<2;i++){damageWindow(w,glassImpactDamage('carbine'));assert.equal(w.shattered,false);assert.ok(windowMarkPose(ref,w));}
 damageWindow(w,glassImpactDamage('carbine'));assert.equal(w.shattered,true);assert.equal(windowMarkPose(ref,w),null);
});
test('heavy in-game class skips directly to fracture, secondary uses normal pacing',()=>{
 for(const weapon of ['rifle','shotgun']){
  const [w]=initializeWindows([{id:'w',x:0,y:0,width:40,vertical:false}]);
  damageWindow(w,glassImpactDamage(weapon));assert.equal(w.shattered,true);
  assert.equal(glassImpactDamage(weapon,true),1);
 }
});
test('door glazing stages deduplicate one shot and retain frame ownership',()=>{
 const door={id:'d',style:'glazed',a:{x:0,y:0},b:{x:48,y:0},open:false};
 const s={doors:[door],objectRevision:0,seconds:1};
 const p=createShotEnvironmentCommitter({enemies:()=>[],hear(){},battleEvent(){}});
 const hit={index:0,fraction:.5};
 const ref=segmentAttachment('door',0,'d',door,{x:20,y:10},{x:20,y:-10},.5,20,door);
 p.shatterStruckDoorGlass(s,[hit,hit],1,1);assert.equal(door.glassIntegrity,2);assert.ok(doorMarkLocalPose(ref,door));
 p.shatterStruckDoorGlass(s,[hit],1,1);assert.equal(door.glassIntegrity,1);assert.ok(doorMarkLocalPose(ref,door));
 p.shatterStruckDoorGlass(s,[hit],1,1);assert.equal(door.glassShattered,true);assert.equal(door.glassShatteredAt,1);assert.equal(doorMarkLocalPose(ref,door),null);assert.equal(door.open,false);
});
test('blood keeps muted original ground tint, darker pools',()=>{
 assert.equal(bloodMarkTint({bloodKind:'splat'}),0x763c38);
 assert.equal(bloodMarkTint({bloodKind:'pool'}),0x703b37);
});

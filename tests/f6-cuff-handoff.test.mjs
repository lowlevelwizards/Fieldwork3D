import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {readEquipmentInteraction} from '../src/breach-equipment-interaction-pose.ts';
import {presentFlexCuffHandoff} from '../src/breach-operator-field-handoff.ts';
import {visibleFlexCuffs,flexCuffSocket} from '../src/equipment-field-visuals.ts';
import {RESTRAINT_CONTACT_SECONDS} from '../src/equipment-interaction-timings.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';

const kit=()=>({...initialEquipmentLoadout('carbine'),fieldInventory:{version:1,
 stacks:[{itemId:'zip-tie',location:'pocket',quantity:1}]}});
const actor=()=>({equipment:kit(),spareMagazines:[],flashCharges:0,
 wedgeRemaining:0,restraintRemaining:1,actionTimer:.85,
 plan:[{kind:'interact',interaction:'restrain-civilian',
 objectId:'civ:person',p:{x:100,y:100}}]});
test('F6.4: only a real active RESTRAIN order samples finite physical cuff location',()=>{
 const a=actor(),before=structuredClone(a);
 const p=readEquipmentInteraction(a);
 assert.equal(p.item,'zip-tie');
 assert.equal(p.location,'pocket');
 assert.ok(p.duration>RESTRAINT_CONTACT_SECONDS);
 assert.deepEqual(a,before);
 assert.equal(readEquipmentInteraction({...a,actionTimer:0}),null);
 assert.equal(readEquipmentInteraction({...a,restraintRemaining:0}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[{
  kind:'interact',interaction:'secure-civilian',objectId:'civ:person'}]}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[{
  kind:'interact',interaction:'restrain-civilian',objectId:'bad'}]}),null);
});
test('F6.4: real cuff pair hands off from pocket and returns on failure',()=>{
 const root=new THREE.Group(),chest=new THREE.Group(),hip=new THREE.Group(),
  pack=new THREE.Group(),hand=new THREE.Group(),mesh=new THREE.Mesh();
 hip.add(mesh);
 const r={root,chest,hip,pack,arms:[{hand}],cuffMeshes:[mesh]};
 const p={equipment:kit(),restraintRemaining:1,
  equipmentInteraction:{item:'zip-tie',location:'pocket',
   duration:1.39,elapsed:1,progress:.72}};
 presentFlexCuffHandoff(r,p,true);
 assert.equal(mesh.parent,hand);
 assert.equal(r.root.userData.fieldworkHeldCuffIndex,0);
 presentFlexCuffHandoff(r,{...p,equipmentInteraction:null},false);
 assert.equal(mesh.parent,hip);
 assert.equal(mesh.visible,true);
 assert.equal(r.root.userData.fieldworkHeldCuffIndex,null);
 assert.equal(p.restraintRemaining,1);
 const socket=flexCuffSocket('pocket',0);
 assert.deepEqual(mesh.position.toArray(),[socket.x,socket.y,socket.z]);
 assert.deepEqual(visibleFlexCuffs(kit(),0),[]);
});
test('F6.4: shared civilian wears visible restraint only when truly bound',()=>{
 const c=createCivilian({id:'civ:f6',role:'visitor',
  persona:'steady',activity:'idle',position:{x:130,y:130},
  heading:0,roomId:'hall',appearanceSeed:23});
 const r=createCivilianRig(c,true);
 try{
  c.state='compliant';c.restrained=false;
  updateCivilianRig(r,c,1);
  assert.equal(r.restraintBand,undefined);
  c.restrained=true;
  updateCivilianRig(r,c,2);
  assert.ok(r.restraintBand);
  assert.equal(r.restraintBand.visible,true);
  assert.equal(r.restraintBand.parent,r.character.arms[0].hand);
  c.restrained=false;
  updateCivilianRig(r,c,1);
  assert.equal(r.restraintBand.visible,false,
   'seek backwards cannot disclose future successful restraint');
  c.restrained=true;
  updateCivilianRig(r,c,2);
  assert.equal(r.restraintBand.visible,true);
 }finally{disposeCivilianRig(r);}
});

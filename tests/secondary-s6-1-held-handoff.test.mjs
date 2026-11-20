import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialSecondaryEquipment,moveSecondaryHolster}
 from '../src/secondary-equipment.ts';
import {syncHipSecondaryVisual,presentSecondaryDraw,clearHipSecondaryVisual}
 from '../src/secondary-holster-visual.ts';

const setup=()=>{
 const root=new THREE.Group();
 const hip=new THREE.Group(),chest=new THREE.Group(),hand=new THREE.Group();
 hip.position.set(0,25,0);chest.position.set(0,26,0);
 hand.position.set(13,-5,5);
 root.add(hip,chest);chest.add(hand);
 return {root,hip,chest,hand};
};
const pistols=root=>{
 const list=[];
 root.traverse(x=>{if(x.userData.secondaryWeaponVisual)list.push(x);});
 return list;
};
const distance=(a,b)=>a.distanceTo(b);
test('S6.1: one real Glock crosses from holster to firing wrist without cloning or extra visual roots',()=>{
 const {root,hip,chest,hand}=setup();
 const kit=initialSecondaryEquipment('rook','glock-g19x');
 const mounted=syncHipSecondaryVisual(hip,kit,true,chest);
 assert.equal(pistols(root).length,1);
 const cradle=pistols(root)[0];
 const start=cradle.getWorldPosition(new THREE.Vector3());
 assert.equal(presentSecondaryDraw(hip,hand,kit,0),false);
 const initial=cradle.getWorldPosition(new THREE.Vector3());
 assert.equal(distance(start,initial),0);
 assert.equal(presentSecondaryDraw(hip,hand,kit,.5),false);
 const midway=cradle.getWorldPosition(new THREE.Vector3());
 assert.ok(distance(start,midway)>1,'pistol leaves real pelvis holster');
 assert.equal(presentSecondaryDraw(hip,hand,kit,1),true);
 const goal=hand.getWorldPosition(new THREE.Vector3());
 const finished=cradle.getWorldPosition(new THREE.Vector3());
 assert.ok(distance(goal,finished)<1e-5,
  'pistol grip pivot is anchored to actual right-hand wrist');
 assert.equal(pistols(root)[0],cradle);
 assert.equal(pistols(root).length,1,'never create a second 3D Glock');
 assert.equal(syncHipSecondaryVisual(hip,kit,true,chest),mounted,
  'unchanged loadout does not rebuild physical carry on every pose');
 assert.equal(presentSecondaryDraw(hip,hand,kit,0),false);
 assert.ok(distance(start,cradle.getWorldPosition(new THREE.Vector3()))<1e-5,
  'reversed or replay-seeked draw exactly restores stowed attachment');
 clearHipSecondaryVisual(hip);
 assert.equal(pistols(root).length,0);
 assert.equal(hip.children.length,0);
});
test('S6.1: missing kit, no belt and left-hand holster swaps never strand a duplicate Glock',()=>{
 const {root,hip,chest,hand}=setup();
 const kit=initialSecondaryEquipment('rook','glock-g26');
 assert.equal(presentSecondaryDraw(hip,hand,kit,1),false);
 syncHipSecondaryVisual(hip,kit,true,chest);
 presentSecondaryDraw(hip,hand,kit,.72);
 const left=moveSecondaryHolster(kit,'belt-left');
 const newMount=syncHipSecondaryVisual(hip,left,true,chest);
 assert.equal(newMount.userData.secondaryHolsterSide,'belt-left');
 assert.equal(pistols(root).length,1,'old carried mesh disposed with old holster');
 assert.equal(presentSecondaryDraw(hip,hand,left,1),true);
 assert.equal(syncHipSecondaryVisual(hip,left,false,chest),null);
 assert.equal(pistols(root).length,0);
 assert.equal(presentSecondaryDraw(hip,hand,left,1),false);
});
test('S6.1: non-operational operators never carry a live visible pistol in their firing hand',()=>{
 const {root,hip,chest,hand}=setup();
 const kit=initialSecondaryEquipment('rook','glock-g19-gen5-mos');
 syncHipSecondaryVisual(hip,kit,true,chest);
 const cradle=pistols(root)[0];
 const stowed=cradle.getWorldPosition(new THREE.Vector3());
 assert.equal(presentSecondaryDraw(hip,hand,kit,1,false),false);
 assert.equal(distance(stowed,cradle.getWorldPosition(new THREE.Vector3())),0);
 assert.equal(presentSecondaryDraw(hip,hand,kit,NaN,true),false);
 assert.equal(distance(stowed,cradle.getWorldPosition(new THREE.Vector3())),0);
});

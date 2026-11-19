import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {readEquipmentInteraction}
 from '../src/breach-equipment-interaction-pose.ts';
import {presentWedgeHandoff} from '../src/breach-operator-field-handoff.ts';
import {newSession,team} from '../src/breach-game.ts';
import {initDoor} from '../src/breach-door.ts';
import {createEntryOrderHandler} from '../src/breach-order-entry.ts';
import {applyDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {initialRoster} from '../src/breach-roster.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
import {activateSite} from '../src/breach-core.ts';
import {WEDGE_PLACEMENT_SECONDS} from '../src/breach-entry-tools.ts';

function source(amount=2){
 const op=initialRoster().members[0];
 let kit=setEquipmentChoice(initialEquipmentLoadout(op.weapon),
  'utility','utility-wedge');
 kit={...kit,fieldInventory:{version:1,stacks:amount?[
  {itemId:'wedge',quantity:amount,location:'belt'}]:[]}};
 return {...op,loadout:kit};
}
function action(a,elapsed=.6){
 return Object.assign(a,{plan:[{kind:'tool',toolMethod:'wedge',
  doorId:'D',p:{x:0,y:0}}],actionTimer:elapsed});
}
test('F6.3: the existing validated wedge order exposes actual belt retrieval time',()=>{
 const a={};applyDeploymentInventory(a,source());
 const p=readEquipmentInteraction(action(a));
 assert.equal(p.item,'wedge');
 assert.equal(p.location,'belt');
 assert.ok(Math.abs(p.duration-(WEDGE_PLACEMENT_SECONDS+.12))<1e-8);
 assert.ok(p.progress>0&&p.progress<1);
 assert.equal(readEquipmentInteraction({...a,actionTimer:0}),null);
 assert.equal(readEquipmentInteraction({...a,wedgeRemaining:0}),null);
 assert.equal(readEquipmentInteraction({...a,plan:[{kind:'tool',toolMethod:'unwedge',doorId:'D'}]}),null);
});
test('F6.3: physical wedge in-hand instance is not cloned, returns on cancellation',()=>{
 const chest=new THREE.Group(),hip=new THREE.Group(),
  pack=new THREE.Group(),hand=new THREE.Group(),mesh=new THREE.Mesh();
 hip.add(mesh);
 const r={root:new THREE.Group(),chest,hip,pack,
  arms:[{hand}],wedgeMeshes:[mesh]};
 const e=source().loadout;
 const p={equipment:e,wedgeRemaining:2,
  equipmentInteraction:{item:'wedge',location:'belt',
   duration:1.22,elapsed:.8,progress:.8/1.22}};
 presentWedgeHandoff(r,p,true);
 assert.equal(mesh.parent,hand);
 assert.equal(r.root.userData.fieldworkHeldWedgeIndex,0);
 presentWedgeHandoff(r,{...p,equipmentInteraction:null},false);
 assert.equal(mesh.parent,hip);
 assert.equal(mesh.visible,true);
 assert.equal(r.root.userData.fieldworkHeldWedgeIndex,null);
 assert.equal(p.wedgeRemaining,2);
});
test('F6.3: unwedge physically returns to the remover, not a remote owner',()=>{
 const s=newSession(),[owner,remover]=team(s);
 const door=initDoor({id:'D',a:{x:200,y:250},b:{x:238,y:250},
  open:false,openedAt:-1,hinge:'a',swing:1},0);
 s.doors=[door];door.wedged=true;door.wedgeOwnerId=owner.id;
 owner.p={x:230,y:280};
 remover.p={x:231,y:272};
 applyDeploymentInventory(owner,source(1));
 applyDeploymentInventory(remover,source(0));
 const oldOwner=owner.wedgeRemaining;
 const handle=createEntryOrderHandler({notify:()=>{},approach:()=>true,
  hear:()=>{},battleEvent:()=>{}});
 const order={id:1201,kind:'tool',doorId:'D',toolMethod:'unwedge',
  p:{...remover.p}};
 remover.plan=[order];remover.actionTimer=.72;
 activateSite({walls:[],cover:[],doors:[]});
 try{
  assert.equal(handle(s,remover,order,.04),true);
  assert.equal(door.wedged,false);
  assert.equal(owner.wedgeRemaining,oldOwner,
   'original wedge owner cannot receive it remotely');
  assert.equal(remover.wedgeRemaining,1);
  assert.equal(fieldQuantity(remover.equipment.fieldInventory,'wedge'),1);
 }finally{activateSite(null);}
});

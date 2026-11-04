import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';

function pose(r,top,armor){
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',armor==='armor-bare'?'armor-none':
  armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 const w=initialWardrobe();
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment:kit,wardrobe:{...w,styles:{...w.styles,
   top,armorStyle:armor,rigStyle:'no-rig',trousers:'bdu-trousers',
   headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}},0);
}
function parts(torso,key){
 const result=[];
 torso.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData[key])result.push(o);});
 return result;
}
test('R9 flak and legacy shells replace blouse collars with their armor neckline',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const top of ['bdu-shirt','acu-shirt','combat-shirt']){
   const torso=top==='combat-shirt'?r.visualKit.newUpper.cuts[top].torso:
    r.visualKit.fieldBlouses[top].torso;
   pose(r,top,'armor-bare');
   const collars=parts(torso,'armorCollarPiece');
   assert.ok(collars.length>=3,top+' has individually controlled real collars');
   assert.ok(collars.every(x=>x.visible));
   const ids=collars.map(x=>x.uuid);
   for(const armor of ['soft-flak','plate-legacy']){
    pose(r,top,armor);
    assert.ok(collars.every(x=>!x.visible),top+'/'+armor+' no protruding cloth collar');
   }
   pose(r,top,'plate-standard');
   assert.ok(pockets.some(x=>!x.visible),
    'standard plates suppress pockets where the wider outer shell overlaps');
   pose(r,top,'armor-bare');
   assert.ok(pockets.every(x=>x.visible),
    'bare outfit restores all original sewn pockets');
   assert.deepEqual(pockets.map(x=>[x.uuid,x.position.x,x.position.y,x.scale.x]),
    original,'garment pocket geometry exactly restored');
  }
 }finally{r.dispose();}
});
test('R9 slick plate hides BDU/ACU sewn-on front pockets and restores them',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const top of ['bdu-shirt','acu-shirt']){
   const torso=r.visualKit.fieldBlouses[top].torso;
   pose(r,top,'armor-bare');
   const pockets=parts(torso,'armorCompressible');
   assert.ok(pockets.length>=8,top+' sewn pockets/flaps are separate geometry');
   const original=pockets.map(x=>[x.uuid,x.position.x,x.position.y,x.scale.x]);
   pose(r,top,'plate-slick');
   assert.ok(pockets.every(x=>!x.visible),top+' pockets fully covered by slick plates');
   pose(r,top,'plate-standard');
   assert.ok(pockets.every(x=>x.visible),'standard plates restore authored garment');
   assert.deepEqual(pockets.map(x=>[x.uuid,x.position.x,x.position.y,x.scale.x]),
    original,'garment pocket geometry exactly restored');
  }
 }finally{r.dispose();}
});

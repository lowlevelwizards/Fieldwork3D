import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {carriedMagazineGeometry} from '../src/operator-carried-magazines.ts';
import {ARSENAL_MAGAZINE_CAPACITIES} from '../src/arsenal/magazine-identities.ts';
import {registeredMagazinePouches,seatMagazineInPouch}
 from '../src/operator-magazine-pouch-fit.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';

const styles={
 'chest-placard':3,'micro-rig':2,'light-rig':4,'chicom-rig':3,
 'bandolier':4,'split-front':4,'full-chest':4,lbv:4,
 'sadf-webbing':4,'field-webbing':6,'alice-lc2':6,'m1956-lce':4
};
const waistStyles=new Set(['field-webbing','alice-lc2','m1956-lce']);
const issue=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
test('all sixteen real magazine geometries have a measurable bottom edge',()=>{
 for(const id of Object.keys(ARSENAL_MAGAZINE_CAPACITIES)){
  const geo=carriedMagazineGeometry(id);
  assert.ok(geo,id);
  geo.computeBoundingBox();
  assert.ok(geo.boundingBox instanceof THREE.Box3,id);
  assert.ok(geo.boundingBox.max.y>geo.boundingBox.min.y,id);
  const noFit=seatMagazineInPouch(geo.boundingBox,
   {x:8,y:-2,z:0,depth:.2,height:1,width:.3});
  assert.equal(noFit,null,'cannot fit '+id+' in a tiny utility pocket');
  const fits=seatMagazineInPouch(geo.boundingBox,
   {x:8,y:-2,z:0,depth:4,height:6,width:4});
  assert.ok(fits,id+' fits a real sufficiently large magazine case');
  assert.ok(Math.abs(fits.y+geo.boundingBox.min.y-(-2-3+.12))<1e-6,
   id+' anchored by lower tip, not magazine center');
  geo.dispose();
 }
});
test('every rig presents only its explicit dedicated magazine pouch inventory',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const [style,capacity] of Object.entries(styles)){
   let kit=initialEquipmentLoadout('carbine');
   kit=setEquipmentChoice(kit,'rig',
    ['chest-placard','micro-rig','light-rig','chicom-rig','bandolier']
     .includes(style)?'rig-light':'rig-full');
   const wardrobe=initialWardrobe();
   poseOperator(r,{
    x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
    lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
    aiming:false,firing:false,turning:0,deterministic:true,
    unarmedPreview:true,equipment:kit,weaponConfiguration:issue,
    magazineCarryLocations:[...Array(7).fill('rig'),'belt','pocket'],
    wardrobe:{...wardrobe,styles:{...wardrobe.styles,
     armorStyle:'plate-standard',rigStyle:style,
     top:'combat-shirt',trousers:'bdu-trousers'}}
   },0);
   const chest=r.visualKit.wardrobeGear.rig[style];
   const waist=r.visualKit.wardrobeGear.waistRig[style];
   const actualCells=registeredMagazinePouches(
    waistStyles.has(style)?waist:chest);
   assert.equal(actualCells.length,capacity,
    style+' every socket must correspond to a real magazine-only case');
   const visible=r.visualKit.magazines.rig.filter(m=>m.visible);
   if(style==='chest-placard'||style==='micro-rig'){
    const mag=r.visualKit.magazines.rig[0];
    mag.geometry.computeBoundingBox();
    console.log('MAG_POUCH_FIT_DEBUG',style,JSON.stringify({
     bbox:mag.geometry.boundingBox,cell:actualCells[0],
     fit:seatMagazineInPouch(mag.geometry.boundingBox,actualCells[0]),
     count:visible.length,rig:kit.slots.rig,part:issue.build?.parts.magazine
    }));
   }
   assert.ok(visible.length<=capacity,style+' no phantom side/second row');
   assert.ok(visible.length>0,style+' at least one real magazine fits');
   assert.ok(r.visualKit.magazines.rig.slice(capacity).every(m=>!m.visible),
    style+' cannot place magazine into utility/storage');
   for(let i=0;i<visible.length;i++){
    const mag=r.visualKit.magazines.rig[i];
    assert.ok(mag.visible,style+' valid first-fit placement');
    assert.equal(mag.parent,waistStyles.has(style)?waist:r.chest,
     style+' authentic bone/container');
    mag.geometry.computeBoundingBox();
    const cell=actualCells[i];
    const fit=seatMagazineInPouch(mag.geometry.boundingBox,cell);
    assert.ok(fit,style+' cell '+i+' accepts real magazine');
    assert.ok(Math.abs(mag.position.y+mag.geometry.boundingBox.min.y-
      (cell.y-cell.height*.5+.12))<.001,
     style+' cell '+i+' bottom seats against pouch floor');
   }
   assert.ok(r.visualKit.magazines.belt.every(m=>!m.visible),
    style+' generic belt loops cannot become magazine pouches');
   assert.ok(r.visualKit.magazines.pocket.every(m=>!m.visible),
    style+' ordinary trouser pockets cannot grow visible ammo props');
  }
 }finally{r.dispose();}
});
test('no-rig and utility-only storage never produce floating magazines',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  const w=initialWardrobe();
  const kit=setEquipmentChoice(initialEquipmentLoadout(),'rig','rig-none');
  poseOperator(r,{
   x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
   equipment:kit,weaponConfiguration:issue,
   magazineCarryLocations:['rig','rig','belt','pocket'],
   wardrobe:{...w,styles:{...w.styles,rigStyle:'no-rig'}}
  },0);
  assert.ok(Object.values(r.visualKit.magazines).flat().every(m=>!m.visible));
 }finally{r.dispose();}
});

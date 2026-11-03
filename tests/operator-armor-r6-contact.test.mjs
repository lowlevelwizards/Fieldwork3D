import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_PROPORTIONS,ARMOR_VISIBLE_STYLES}
 from '../src/operator-armor-proportions.ts';
import {armorStrapLanding,plateHalfWidthAt}
 from '../src/operator-armor-straps.ts';
import {armorSideLayout}
 from '../src/operator-armor-side-layout.ts';
import {armorContactSpan,ARMOR_FIT_TOPS,fittedArmorSurfaces,
 ARMOR_PANEL_DEPTHS} from '../src/operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {setEquipmentChoice,initialEquipmentLoadout}
 from '../src/equipment-loadouts.ts';

function pose(r,top,armor){
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',
  armor.startsWith('plate-')?'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
  injury:0,weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
  lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,armorStyle:armor,trousers:'bdu-trousers',
   rigStyle:'no-rig',headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
test('R6 local inner bag clearance is close, consistent and never inverted across 35 looks',()=>{
 for(const top of ARMOR_FIT_TOPS){
  const body=armorContactSpan(top,-3.8,4);
  for(const style of ARMOR_VISIBLE_STYLES){
   const fit=fittedArmorSurfaces(style,top,ARMOR_PROFILES[style]);
   const depth=ARMOR_PANEL_DEPTHS[style];
   const frontGap=fit.front-depth-body.front;
   const rearGap=body.back-(fit.back+depth);
   assert.ok(frontGap>=.075&&frontGap<.38,
    style+' '+top+' front contact gap '+frontGap);
   assert.ok(rearGap>=.075&&rearGap<.38,
    style+' '+top+' rear contact gap '+rearGap);
   const p=armorSideLayout(fit,ARMOR_PROPORTIONS[style]);
   const sideGap=p.centerZ-p.sideHalfThickness-p.garmentSide;
   assert.ok(sideGap>=.09&&sideGap<=.19,
    style+' '+top+' side contact gap '+sideGap);
  }
 }
});
test('R6 whole strap width attaches inside angled plate bags, including both JPC branches',()=>{
 for(const top of ARMOR_FIT_TOPS){
  for(const style of ARMOR_VISIBLE_STYLES){
   const spec=ARMOR_PROPORTIONS[style];
   const fit=fittedArmorSurfaces(style,top,ARMOR_PROFILES[style]);
   const land=armorStrapLanding(fit,spec);
   assert.ok(land.frontMargin>=.17,
    style+' '+top+' strap's outer edge misses front plate');
   assert.ok(land.rearMargin>=.17,
    style+' '+top+' strap's outer edge misses rear plate');
   assert.ok(land.frontY<=spec.top&&land.frontY>=spec.bottom);
   assert.ok(land.rearY<=spec.top&&land.rearY>=spec.bottom);
   assert.ok(land.frontZ>1.5&&land.rearZ>1.5);
   assert.ok(Math.abs(land.frontX-fit.front)<.20,
    style+' '+top+' strap terminates flush with front');
   assert.ok(plateHalfWidthAt(spec,land.frontY)>=land.frontZ+
    spec.shoulderWidth*.35);
  }
 }
});
test('R6 covered outerwear pockets compress beneath armor and restore when concealed',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ['bdu-shirt','acu-shirt','smock-jacket','gorka-jacket']){
  pose(r,top,'soft-slick');
  const root=r.visualKit.wardrobeGear.armor['soft-slick'].parent;
  const group=root.getObjectByName(
   (top==='bdu-shirt'||top==='acu-shirt'?'field-blouse:':'upper-garment:')+top);
  assert.ok(group,top+' garment group found');
  const marked=[];
  group.traverse(o=>{
   if(o instanceof THREE.Mesh&&o.userData.armorCompressible)
    marked.push(o);
  });
  assert.ok(marked.length>=2,top+' compressible pocket geometry tagged');
  assert.ok(marked.every(x=>x.visible),top+' shirt pockets visible without outer armor');
  pose(r,top,'plate-standard');
  assert.ok(marked.some(x=>!x.visible),
   top+' covered pocket geometry compressed beneath fitted carrier');
  pose(r,top,'soft-slick');
  assert.ok(marked.every(x=>x.visible),
   top+' pockets restore after armor removal');
 }
 r.dispose();
});
test('R6 35 visible armors reuse connector geometry at constant top and keep equipped authority',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  for(const style of ARMOR_VISIBLE_STYLES){
   pose(r,top,style);
   const armor=r.visualKit.wardrobeGear.armor[style];
   const connectors=armor.getObjectByName('uniform-fitted-connectors');
   assert.ok(connectors&&armor.visible,style+' '+top+' active fitting');
   const first=connectors.children.map(x=>x.uuid);
   pose(r,top,style);
   assert.deepEqual(connectors.children.map(x=>x.uuid),first);
  }
 }
 r.dispose();
});

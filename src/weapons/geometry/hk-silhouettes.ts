/** Chunky, iconic G3 roller-delayed family silhouettes, exterior game art only.
 * Never allocate meshes during the animation loop; no mechanics or ballistics here.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,type Outline,type SlotName}
 from './profile-primitives.ts';
import {HK_OLIVE_POLYMER,HK_MAG_METAL}
 from './weapon-visual-palette.ts';
import {HK_BARREL_ART} from './hk-barrel-profiles.ts';

export function addHKFamily(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,wood:THREE.Material,
 showFactoryMuzzle=true){
 const parts=build.parts,early=parts.receiver==='hk-g3-early';
 const art=HK_BARREL_ART[parts.barrel];
 if(!art)throw new Error('Unknown HK art barrel: '+parts.barrel);
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const material=(slot:SlotName,finish:'steel'|'dark'|'wood'|'olive'|'mag')=>
  finish==='steel'?steel:finish==='wood'?wood:
  finish==='olive'?HK_OLIVE_POLYMER:finish==='mag'?HK_MAG_METAL:dark;
 const p=(slot:SlotName,points:Outline,depth:number,
  finish:'steel'|'dark'|'wood'|'olive'|'mag'='steel')=>
  addOutline(root,slot,parts[slot],ids[slot]++,points,depth,material(slot,finish));
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  finish:'steel'|'dark'|'wood'|'olive'|'mag'='steel')=>
  addCuboid(root,slot,parts[slot],ids[slot]++,x,y,z,w,h,d,material(slot,finish));

 // Stamped HK receiver and connected trigger housing: deliberately no AR split.
 p('receiver',[[-6.50,-1.43],[-6.50,1.05],[-5.75,1.85],
   [3.50,1.85],[4.55,1.20],[4.55,-1.36],[3.70,-1.71],
   [-5.65,-1.71]],3.52);
 p('receiver',[[-5.80,-1.28],[-5.20,-2.45],[-3.45,-2.72],
   [-1.55,-2.67],[-.42,-2.32],[2.52,-2.48],
   [3.95,-1.48]],3.18,'dark');
 // Integrated angular magazine housing; top of magazine is buried in it.
 p('receiver',[[-.58,-2.08],[3.32,-2.08],[3.35,-3.07],
   [-.32,-3.07]],3.35);

 // Early and polymer buttstocks are both confident single solid shapes.
 const rear=early?-15.15:-15.30;
 p('stock',early?[
  [rear,1.22],[-10.85,1.22],[-6.24,.65],[-6.18,-1.46],
  [-9.22,-2.43],[-13.86,-3.32],[rear,-2.88]
 ]:[
  [rear,1.12],[-10.90,1.10],[-6.23,.68],[-6.15,-1.44],
  [-9.55,-2.30],[-14.75,-3.04],[rear,-2.85]
 ],3.12,early?'wood':'olive');
 // Rear pad is seated within the stock envelope, not protruding into camera fit.
 b('stock',rear+.21,-.90,0,.42,4.28,3.30,'dark');

 // Simple HK grip, shorter and chunkier than literal scale reference.
 p('grip',[[-4.88,-2.31],[-2.50,-2.31],[-2.15,-5.86],
   [-2.66,-6.83],[-4.40,-6.70],[-5.05,-3.40]],2.16,'dark');

 // Straight, full-power 20-round box magazine; slight rearward heel bias.
 p('magazine',[[-.22,-2.70],[3.32,-2.70],
   [3.06,-7.78],[-.66,-7.78]],2.08,'mag');
 b('magazine',1.20,-7.70,0,3.62,.25,2.20,'steel');

 // HK slim fore-end: one faceted YZ body. Never an AK upper/lower split.
 const guardMat=parts.handguard==='hk-g3-wood-vented'?wood:HK_OLIVE_POLYMER;
 const guard=addFacetedTube(root,'handguard',parts.handguard,ids.handguard++,
  art.handguardStartX,art.handguardEndX,1.55,guardMat);
 guard.position.y=-.18;guard.scale.z=1.05;
 b('handguard',4.25,-.08,0,.45,2.80,3.24,'steel');
 b('handguard',13.83,-.10,0,.40,2.72,3.06,'steel');

 // Cocking tube sits above and slightly intersects the handguard roof.
 const tube=addFacetedTube(root,'receiver',parts.receiver,ids.receiver++,
  3.45,14.10,.57,steel);
 tube.position.y=1.66;
 // Enlarged side charging handle: two embedded solids, not a floating tab.
 b('receiver',4.68,1.99,.78,1.35,.55,1.09,'steel');
 b('receiver',4.38,2.08,1.40,.70,.66,.83,'dark');

 // Bare barrel is the authoritative positive-X endpoint.
 b('barrel',(art.barrelStartX+art.muzzleX)/2,0,0,
  art.muzzleX-art.barrelStartX,1.25,1.50);
 if(showFactoryMuzzle)
  b('barrel',art.muzzleX-.55,0,0,1.10,1.58,1.86,'dark');

 // Iconic closed front hood in the YZ plane, with its foot buried in barrel.
 b('barrel',art.frontSightX,.95,0,1.07,2.00,1.68);
 const hoodGeo=new THREE.TorusGeometry(.89,.25,4,8);
 hoodGeo.rotateY(Math.PI/2);
 const hood=new THREE.Mesh(hoodGeo,steel);
 hood.position.set(art.frontSightX,2.34,0);
 hood.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 hood.castShadow=true;hood.receiveShadow=true;root.add(hood);

 // Early flip-up leaf versus distinctive chunky later rotary sight drum.
 b('receiver',-3.68,1.95,0,2.0,.53,2.45);
 if(early){
  p('receiver',[[-4.12,2.13],[-4.02,3.12],
   [-3.26,3.12],[-3.12,2.13]],1.28,'steel');
 }else{
  const g=new THREE.CylinderGeometry(.82,.82,1.28,6);
  g.rotateX(Math.PI/2);
  const mesh=new THREE.Mesh(g,steel);
  mesh.position.set(-3.58,2.62,0);
  mesh.name='family-receiver-'+parts.receiver+'-'+ids.receiver++;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
}

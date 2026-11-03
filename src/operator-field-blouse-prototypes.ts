/** Stage 3B paired historical BDU and modern ACU blouse prototypes.
 * AUTHORING SPACE: chest +X forward, +/-Z shoulders, +Y up.
 * Cosmetic geometry only. Inherit existing articulated arm meshes and all
 * Stage 2 cloth materials without modifying IK, stock, ankles or headwear.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {outwardLimbPocket} from './operator-garment-mount-frame.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {SleeveState} from './operator-wardrobe-data.ts';

export const FIELD_BLOUSE_CUTS=['bdu-shirt','acu-shirt'] as const;
export type FieldBlouseCut=typeof FIELD_BLOUSE_CUTS[number];
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
export type FieldBlousePrototype={torso:THREE.Group;upper:THREE.Group[];lower:THREE.Group[];
 cuffed:THREE.Group[];cuffedLower:THREE.Group[];rolledUpper:THREE.Group[];
 cuffMaterial:THREE.MeshStandardMaterial};
export type FieldBlousePrototypes=Record<FieldBlouseCut,FieldBlousePrototype>;
type Ring={y:number;front:number;back:number;side:number};

/** Authored measured envelopes, not new anatomy. The locked base body is
 * 10 x 12 x 14; armor and weapons continue to fit their original joints.
 * Historic BDU has longer, looser lower hem and fuller sleeve.
 * Modern ACU is still a LOOSE combat blouse, not a fitted combat shirt.
 */
export const BLOUSE_CUT_PROFILE={
 'bdu-shirt':{
  rings:[
   {y:6.15,front:5.22,back:-5.28,side:7.18},
   {y:4.5,front:5.80,back:-5.65,side:8.63},
   {y:-1.5,front:5.88,back:-5.67,side:8.18},
   {y:-7.30,front:5.83,back:-5.62,side:7.98}
  ],
  collar:'traditional-fold',pockets:'four-front',hem:'loose-untucked',
  upperRadius:[3.35,3.08],lowerRadius:[2.91,2.66]
 },
 'acu-shirt':{
  rings:[
   {y:6.12,front:5.25,back:-5.23,side:7.16},
   {y:4.4,front:5.58,back:-5.47,side:7.84},
   {y:-1.5,front:5.56,back:-5.43,side:7.28},
   {y:-5.98,front:5.42,back:-5.33,side:7.03}
  ],
  collar:'modern-fold-or-mandarin',pockets:'slanted-chest-and-upper-arm',
  hem:'tidy-straight',
  upperRadius:[3.13,2.77],lowerRadius:[2.72,2.49]
 }
} as const;

/** Low-poly cut-and-sewn torso loft. Each perimeter edge is its own fabric
 * panel, with UV length in world units, not a texture stretched to the mesh.
 * Four side faces remain joined while ring width tapers; no per-frame update.
 */
export function fieldBlouseShellGeometry(cut:FieldBlouseCut):THREE.BufferGeometry{
 const rings=BLOUSE_CUT_PROFILE[cut].rings as readonly Ring[];
 const positions:number[]=[],uvs:number[]=[];
 const surface=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,
  uWidth:number)=>{
  const triangles=[a,b,c,a,c,d];
  const width=uWidth/TILE_WORLD_SIZE;
  // UV2 is not required. Tile position is stable in garment-space.
  const yBase=rings[0].y;
  const coords:[[number,number],[number,number],[number,number],
    [number,number],[number,number],[number,number]]=[
   [0,(a.y-yBase)/TILE_WORLD_SIZE],[width,(b.y-yBase)/TILE_WORLD_SIZE],
   [width,(c.y-yBase)/TILE_WORLD_SIZE],[0,(a.y-yBase)/TILE_WORLD_SIZE],
   [width,(c.y-yBase)/TILE_WORLD_SIZE],[0,(d.y-yBase)/TILE_WORLD_SIZE]];
  for(let i=0;i<6;i++){
   const p=triangles[i];positions.push(p.x,p.y,p.z);
   uvs.push(...coords[i]);
  }
 };
 for(let i=0;i<rings.length-1;i++){
  const up=rings[i],dn=rings[i+1];
  // Front, right side, back, left side. All are exterior facing.
  const upper=[
   new THREE.Vector3(up.front,up.y,-up.side),
   new THREE.Vector3(up.front,up.y,up.side),
   new THREE.Vector3(up.back,up.y,up.side),
   new THREE.Vector3(up.back,up.y,-up.side)
  ];
  const lower=[
   new THREE.Vector3(dn.front,dn.y,-dn.side),
   new THREE.Vector3(dn.front,dn.y,dn.side),
   new THREE.Vector3(dn.back,dn.y,dn.side),
   new THREE.Vector3(dn.back,dn.y,-dn.side)
  ];
  for(let j=0;j<4;j++){
   const k=(j+1)%4;
   const a=upper[j],b=upper[k],c=lower[k],d=lower[j];
   // Standard winding outward for X+ face: a front left, b front right,
   // c low right. In chest +X front this is exterior-facing.
   surface(a,b,c,d,Math.hypot(b.x-a.x,b.z-a.z));
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 // Matching indexed formats let the existing mesh consolidation combine
 // collar, pocket, hem and shell into very few mobile draw calls.
 g.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
 g.computeVertexNormals();
 return g;
}
const group=(parent:THREE.Object3D,name:string)=>{
 const g=new THREE.Group();g.name=name;parent.add(g);g.visible=false;
 g.userData.garmentMetricLength=parent.userData.garmentMetricLength??1;
 return g;
};
function box(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,tilt=0){
 const metric=parent.userData.garmentMetricLength as number||1;
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h*metric,d,m,x,y*metric,z),m);
 mesh.position.set(x,y,z);
 if(tilt)mesh.rotation.x=tilt;
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function seamBand(parent:THREE.Group,cloth:THREE.Material,
 radius:number,y:number,height:number){
 // One inset-free rectangular fold rather than an oversize ring.
 const width=radius*2+.48,depth=width+.12;
 return box(parent,cloth,0,y,0,width,height,depth);
}
export function createFieldBlousePrototypes(chest:THREE.Group,
 arms:readonly Arm[],cloth:THREE.Material,trim:THREE.Material):FieldBlousePrototypes{
 const models={} as FieldBlousePrototypes;
 // Woven roll/cuff undersides are solid material, not a repeated
 // camouflage swatch. Their detail is the fold silhouette, not pixel noise.
 const solidCuff=new THREE.MeshStandardMaterial({
  color:0x90866d,roughness:1,metalness:0
 });
 for(const cut of FIELD_BLOUSE_CUTS){
  const historic=cut==='bdu-shirt';
  // Exaggerated primary masses remain cosmetic; shoulder sockets and IK stay fixed.
  const torso=group(chest,'field-blouse:'+cut);
  // The base torso is already a complete clothed box. Garments contribute
  // attached details only, not a second thick cuboid shell around it.
  if(historic){
   // Open conventional collar with two broad turned-down lapels.
   box(torso,cloth,-1.5,6.60,0,7.2,1.38,8.6);
   for(const sign of [-1,1]){
    box(torso,cloth,3.55,6.66,sign*3.18,3.9,1.02,3.40,
     sign*.24);
    // Four distinct BDU cargo pockets, two chest and two lower.
    for(const y of [2.1,-4.05]){
     // Four deeply bellows-shaped pockets, with the lower row slightly
     // larger. Their backs intersect the base torso; no floating panels.
     const lower=y<0,projection=lower?1.52:1.40;
     const pocket=box(torso,cloth,5.61,y,sign*3.66,projection,
      lower?3.32:3.18,lower?4.90:4.72);
     const flap=box(torso,cloth,6.32,y+(lower?1.46:1.40),sign*3.66,
      .30,.78,lower?5.05:4.92);
     for(const mesh of [pocket,flap]){
      mesh.userData.armorCompressible=true;
      mesh.userData.armorCoverY=y;
     }
    }
   }
   // Concealed button placket: visible only at close Lab zoom.
   box(torso,trim,5.08,-.20,0,.15,9.05,.40);
   box(torso,cloth,5.05,-5.88,0,.25,.48,13.9);
  }else{
   // Fold-down modern ACU collar. Earlier UCP versions may stand higher;
   // keep the low folded silhouette for the OCP reference in this pass.
   box(torso,cloth,-1.25,6.61,0,7.0,1.67,7.6);
   for(const sign of [-1,1]){
    box(torso,cloth,3.35,6.27,sign*2.6,3.60,.82,2.90,
     sign*.17);
    // Angled chest pouches and recognizable lower utility pockets.
    // Both pairs are attached to the already-clothed torso, not floating.
    const pocket=box(torso,cloth,5.61,1.20,sign*3.60,1.33,3.13,4.36,
     -sign*.23);
    const flap=box(torso,cloth,6.29,2.64,sign*3.60,.30,.76,4.51,
     -sign*.23);
    for(const mesh of [pocket,flap]){
     mesh.userData.armorCompressible=true;
     mesh.userData.armorCoverY=1.20;
    }
    // Small modern utility pockets deliberately remain flatter than BDU.
    const pocket=box(torso,cloth,5.53,-3.80,sign*3.60,1.20,2.53,4.33);
    const flap=box(torso,cloth,6.14,-2.67,sign*3.60,.27,.66,4.50);
    for(const mesh of [pocket,flap]){
     mesh.userData.armorCompressible=true;
     mesh.userData.armorCoverY=-3.80;
    }
   }
   // Hidden zipper/placket and short hem, rather than BDU four-pocket apron.
   box(torso,trim,5.10,-.14,0,.16,9.85,.35);
   box(torso,cloth,5.04,-5.78,0,.22,.42,13.60);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
  cuffed:THREE.Group[]=[],cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   // Both IK limb frames expose their external surface on local +X.
   const a=group(arm.upper,cut+':upper-sleeve:'+index);
   const b=group(arm.lower,cut+':forearm-sleeve:'+index);
   const c=group(arm.lower,cut+':cuffed-wrist:'+index);
   const short=group(arm.lower,cut+':short-cuffed-forearm:'+index);
   const rolled=group(arm.upper,cut+':rolled-upper:'+index);
   // The existing articulated upper and lower arm cuboids ARE the sleeves.
   // Extra full-length cylinder sleeves were oversized and disconnected.
   // Sleeve ends substantially above the wrist when cuffed; the original
   // lower-arm bone becomes bare skin under this shortened cloth shell.
   box(short,cloth,0,-.14,0,3.89,.77,3.97);
   // Full shoulder-to-elbow upper arm remains visible. The roll wraps its
   // distal (+Y) elbow end; the articulated lower arm is exposed skin.
   // Shorter vertically, wider/deeper across the limb at gameplay zoom.
   seamBand(rolled,solidCuff,2.43,.405,.22);
   seamBand(rolled,solidCuff,2.16,.267,.115);
   if(historic){
    const elbow=outwardLimbPocket(1.77,-.12,.37,2.56,.27);
    box(b,cloth,elbow.x,elbow.y,elbow.z,
     elbow.width,elbow.height,elbow.depth);
    seamBand(c,solidCuff,2.26,.214,.235);
    seamBand(c,solidCuff,2.05,.078,.105);
   }else{
    // A true +X bicep pocket on BOTH articulated arms. Nominal +X is
    // anatomical outside in the actual alignSegment limb basis.
    const pouch=outwardLimbPocket(2.06,.08,.51,2.87,.83);
    // Pocket exists only on normal/cuffed upper sleeves. Never add it to
    // rolledUpper: that state is a cuff-only group with no clipping cargo.
    box(a,cloth,pouch.x,pouch.y,pouch.z,
     pouch.width,pouch.height,pouch.depth);
    box(a,cloth,pouch.x+.46,pouch.y+.22,0,
     .23,.17,pouch.depth+.17);
    const elbow=outwardLimbPocket(1.80,.18,.25,2.00,.18);
    box(b,cloth,elbow.x,elbow.y,elbow.z,
     elbow.width,elbow.height,elbow.depth);
    seamBand(c,solidCuff,2.26,.214,.235);
    seamBand(c,solidCuff,2.05,.078,.105);
   }
   for(const g of [a,b,c,short,rolled])consolidateVisualGroup(g);
   upper.push(a);lower.push(b);cuffed.push(c);cuffedLower.push(short);rolledUpper.push(rolled);
  }
  consolidateVisualGroup(torso);
  models[cut]={torso,upper,lower,cuffed,cuffedLower,rolledUpper,
   cuffMaterial:solidCuff};
 }
 return models;
}
export function updateFieldBlousePrototypes(
 models:FieldBlousePrototypes,top:string,state:SleeveState='unrolled'){
 for(const cut of FIELD_BLOUSE_CUTS){
  const show=cut===top,model=models[cut];
  model.torso.visible=show;
  // Upper-sleeve pockets are hidden while rolled; the full anatomical
  // upper-arm base remains, with the roll at the elbow end instead.
  for(const g of model.upper)g.visible=show&&state!=='rolled';
  for(const g of model.lower)g.visible=show&&state==='unrolled';
  for(const g of model.cuffedLower)g.visible=show&&state==='cuffed';
  for(const g of model.cuffed)g.visible=show&&state==='cuffed';
  for(const g of model.rolledUpper)g.visible=show&&state==='rolled';
 }
}

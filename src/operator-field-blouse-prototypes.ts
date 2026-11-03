/** Stage 3B paired historical BDU and modern ACU blouse prototypes.
 * AUTHORING SPACE: chest +X forward, +/-Z shoulders, +Y up.
 * Cosmetic geometry only. Inherit existing articulated arm meshes and all
 * Stage 2 cloth materials without modifying IK, stock, ankles or headwear.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

export const FIELD_BLOUSE_CUTS=['bdu-shirt','acu-shirt'] as const;
export type FieldBlouseCut=typeof FIELD_BLOUSE_CUTS[number];
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
export type FieldBlousePrototype={torso:THREE.Group;upper:THREE.Group[];lower:THREE.Group[]};
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
   {y:6.1,front:5.20,back:-5.25,side:7.05},
   {y:4.5,front:5.65,back:-5.45,side:7.88},
   {y:-1.5,front:5.72,back:-5.48,side:7.73},
   {y:-6.72,front:5.72,back:-5.45,side:7.48}
  ],
  collar:'traditional-fold',pockets:'four-front',hem:'loose-untucked',
  upperRadius:[2.97,2.80],lowerRadius:[2.65,2.46]
 },
 'acu-shirt':{
  rings:[
   {y:6.05,front:5.23,back:-5.22,side:7.03},
   {y:4.4,front:5.47,back:-5.32,side:7.45},
   {y:-1.5,front:5.49,back:-5.38,side:7.20},
   {y:-5.70,front:5.37,back:-5.28,side:7.03}
  ],
  collar:'modern-fold-or-mandarin',pockets:'slanted-chest-and-upper-arm',
  hem:'tidy-straight',
  upperRadius:[2.84,2.56],lowerRadius:[2.52,2.35]
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
 const g=new THREE.Group();g.name=name;parent.add(g);g.visible=false;return g;
};
function box(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,tilt=0){
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);
 if(tilt)mesh.rotation.x=tilt;
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function sleeve(parent:THREE.Group,cloth:THREE.Material,
 topRadius:number,bottomRadius:number,nominalLength:number){
 // Segment bone.scale.y is actual solved IK length, so a 1.07 high
 // sleeve follows it without ever changing its foot/hand transforms.
 const g=new THREE.CylinderGeometry(topRadius,bottomRadius,1.07,8,1,false);
 const uv=g.getAttribute('uv') as THREE.BufferAttribute;
 const circumference=2*Math.PI*(topRadius+bottomRadius)*.5;
 for(let i=0;i<uv.count;i++){
  const u=uv.getX(i),v=uv.getY(i);
  uv.setXY(i,u*circumference/TILE_WORLD_SIZE,
   v*nominalLength/TILE_WORLD_SIZE);
 }
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(g,cloth);
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);
 return mesh;
}
export function createFieldBlousePrototypes(chest:THREE.Group,
 arms:readonly Arm[],cloth:THREE.Material,trim:THREE.Material):FieldBlousePrototypes{
 const models={} as FieldBlousePrototypes;
 for(const cut of FIELD_BLOUSE_CUTS){
  const historic=cut==='bdu-shirt',profile=BLOUSE_CUT_PROFILE[cut];
  const torso=group(chest,'field-blouse:'+cut);
  const shell=new THREE.Mesh(fieldBlouseShellGeometry(cut),cloth);
  shell.castShadow=true;shell.receiveShadow=true;torso.add(shell);
  if(historic){
   // Open conventional collar with two broad turned-down lapels.
   box(torso,cloth,-1.4,6.45,0,6.7,1.15,8.0);
   for(const sign of [-1,1]){
    box(torso,cloth,3.5,6.55,sign*3.0,3.5,.76,2.95,
     sign*.24);
    // Four distinct BDU cargo pockets, two chest and two lower.
    for(const y of [2.0,-3.55]){
     box(torso,cloth,5.92,y,sign*3.65,.46,2.40,4.05);
     box(torso,cloth,6.18,y+1.16,sign*3.65,.30,.62,4.48);
    }
   }
   // Concealed button placket: visible only at close Lab zoom.
   box(torso,trim,5.78,-.20,0,.11,8.55,.28);
   box(torso,cloth,5.64,-6.50,0,.24,.48,14.30);
  }else{
   // Fold-down modern ACU collar. Earlier UCP versions may stand higher;
   // keep the low folded silhouette for the OCP reference in this pass.
   box(torso,cloth,-1.25,6.35,0,6.8,1.15,7.4);
   for(const sign of [-1,1]){
    box(torso,cloth,3.25,6.14,sign*2.5,3.3,.62,2.65,
     sign*.17);
    // Diagonal chest cargo pockets, slimmer and higher than BDU.
    box(torso,cloth,5.76,1.15,sign*3.55,.36,3.05,3.80,
     -sign*.27);
    box(torso,cloth,6.01,2.60,sign*3.75,.22,.58,3.9,
     -sign*.27);
   }
   // Hidden zipper/placket and short hem, rather than BDU four-pocket apron.
   box(torso,trim,5.58,-.14,0,.11,9.80,.26);
   box(torso,cloth,5.41,-5.60,0,.24,.45,13.30);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   const a=group(arm.upper,cut+':upper-sleeve:'+index);
   const b=group(arm.lower,cut+':forearm-sleeve:'+index);
   sleeve(a,cloth,profile.upperRadius[0],profile.upperRadius[1],10.0);
   sleeve(b,cloth,profile.lowerRadius[0],profile.lowerRadius[1],9.6);
   if(historic){
    // Button-adjustable fabric cuff; no invented upper-arm cargo pocket.
    box(b,cloth,0,-.38,2.55,2.2,.115,.44);
   }else{
    // ACU upper-arm utility pocket and loop surface follow the moving bone.
    box(a,cloth,0,.13,2.81,2.35,.23,.70);
    box(a,trim,.02,.255,2.85,2.14,.055,.74);
    box(b,cloth,0,-.36,2.42,1.95,.085,.35);
   }
   consolidateVisualGroup(a);consolidateVisualGroup(b);
   upper.push(a);lower.push(b);
  }
  consolidateVisualGroup(torso);
  models[cut]={torso,upper,lower};
 }
 return models;
}
export function updateFieldBlousePrototypes(models:FieldBlousePrototypes,top:string){
 for(const cut of FIELD_BLOUSE_CUTS){
  const show=cut===top,model=models[cut];
  model.torso.visible=show;
  for(const g of [...model.upper,...model.lower])g.visible=show;
 }
}

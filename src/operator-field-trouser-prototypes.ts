/** Stage 3C — articulated, separately constructed Classic Field and Modern
 * Utility trousers. Real garment shells only; no changes to IK, hitboxes,
 * foot reach, animation geometry, weapons or the approved cloth print pixels.
 *
 * Limb meshes are normalized along local Y (-.5 at proximal joint,
 * +.5 at distal joint). alignSegment() handles physical segment lengths.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {outwardLimbPocket,outwardLimbPatch} from './operator-garment-mount-frame.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {TrouserHem} from './operator-wardrobe-data.ts';

export const FIELD_TROUSER_CUTS=['bdu-trousers','acu-trousers','gorka-trousers'] as const;
export type FieldTrouserCut=typeof FIELD_TROUSER_CUTS[number];
type Limb={upper:THREE.Mesh;lower:THREE.Mesh};
type Ring=readonly [y:number,radiusX:number,radiusZ:number];
export const FIELD_TROUSER_PROFILES={
 'bdu-trousers':{
  thigh:[[-.55,2.90,3.03],[-.31,3.25,3.42],
   [.15,3.45,3.56],[.59,3.18,3.29]] as readonly Ring[],
  unbloused:[[-.60,2.85,2.90],[-.28,2.97,3.02],
   [.24,3.00,3.05],[.48,3.07,3.12]] as readonly Ring[],
  bloused:[[-.60,2.85,2.90],[-.24,3.10,3.17],
   [.05,3.34,3.40],[.18,3.48,3.54],[.265,2.14,2.18]] as readonly Ring[],
  cuffed:[[-.60,2.85,2.90],[-.24,2.98,3.06],
   [.20,3.05,3.12],[.34,3.36,3.41],[.48,3.50,3.55]] as readonly Ring[],
  cargo:[1.19,.49,3.34] as const,flap:[.34,.20,3.54] as const,
  character:'Loose thigh, prominent box cargo pocket, fuller straight leg'
 },
 'acu-trousers':{
  thigh:[[-.55,2.74,2.82],[-.23,2.94,3.05],
   [.17,3.12,3.19],[.59,2.94,3.04]] as readonly Ring[],
  unbloused:[[-.60,2.65,2.77],[-.24,2.83,2.87],
   [.25,2.78,2.84],[.48,2.82,2.90]] as readonly Ring[],
  bloused:[[-.60,2.65,2.77],[-.22,2.92,2.99],
   [.05,3.06,3.12],[.16,3.19,3.25],[.275,1.98,2.08]] as readonly Ring[],
  cuffed:[[-.60,2.65,2.77],[-.25,2.83,2.90],
   [.21,2.87,2.93],[.35,3.21,3.27],[.48,3.29,3.34]] as readonly Ring[],
  cargo:[1.08,.48,3.22] as const,flap:[.32,.19,3.41] as const,
  character:'Cleaner tapered thigh with angled cargo flaps and calf pouch'
 },
 'gorka-trousers':{
  thigh:[[-.55,3.10,3.22],[-.31,3.43,3.54],
   [.14,3.54,3.71],[.59,3.38,3.52]] as readonly Ring[],
  unbloused:[[-.60,2.90,3.01],[-.26,3.07,3.13],
   [.20,2.97,3.12],[.48,2.98,3.08]] as readonly Ring[],
  bloused:[[-.60,2.90,3.01],[-.22,3.18,3.24],
   [.09,3.42,3.49],[.18,3.38,3.43],[.265,2.08,2.14]] as readonly Ring[],
  cuffed:[[-.60,2.90,3.01],[-.20,3.06,3.12],
   [.18,3.06,3.13],[.34,3.40,3.46],[.48,3.46,3.55]] as readonly Ring[],
  cargo:[1.26,.54,3.48] as const,flap:[.35,.20,3.65] as const,
  character:'Voluminous overtrousers with reinforced knees and gaiter hems'
 }
} as const;

export type TrouserCutPrototype={
 thigh:THREE.Group[];
 unbloused:THREE.Group[];
 bloused:THREE.Group[];
 cuffed:THREE.Group[];
 suspenders?:THREE.Group;
 /** Per-trouser-channel fold material shared by cuffed/bloused hems. */
 cuffMaterial:THREE.MeshStandardMaterial;
};
export type FieldTrouserPrototypes=Record<FieldTrouserCut,TrouserCutPrototype>;

/** Rings are in normalized (animated) bone space; camo UVs use physical
 * model units, independent of how wide the underlying leg becomes. */
export function garmentLegLoft(rings:readonly Ring[],length:number):
 THREE.BufferGeometry{
 const n=8,pos:number[]=[],uv:number[]=[];
 for(let k=0;k<rings.length-1;k++){
  const bottom=rings[k],top=rings[k+1];
  for(let j=0;j<n;j++){
   const phi=2*Math.PI*j/n,phi2=2*Math.PI*(j+1)/n;
   const p=(r:Ring,a:number)=>new THREE.Vector3(
    Math.cos(a)*r[1],r[0],Math.sin(a)*r[2]);
   const a=p(bottom,phi),b=p(top,phi),
    c=p(top,phi2),d=p(bottom,phi2);
   const tri=[a,b,c,a,c,d];
   const perimeter=Math.PI*(bottom[1]+bottom[2]+top[1]+top[2])*.5;
   const u0=j/n*perimeter/TILE_WORLD_SIZE,u1=(j+1)/n*perimeter/TILE_WORLD_SIZE;
   const v0=bottom[0]*length/TILE_WORLD_SIZE;
   const v1=top[0]*length/TILE_WORLD_SIZE;
   const st=[[u0,v0],[u0,v1],[u1,v1],[u0,v0],[u1,v1],[u1,v0]];
   for(let x=0;x<6;x++){
    pos.push(...tri[x].toArray());uv.push(...st[x]);
   }
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(Array.from({length:pos.length/3},(_,i)=>i));
 g.computeVertexNormals();
 return g;
}
const group=(parent:THREE.Object3D,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);
 // Articulated leg groups are parented beneath a normalized y=1 IK bone.
 // Its world-height belongs in fabric UVs, not in the vertex transform.
 g.userData.garmentMetricLength=parent.userData.garmentMetricLength??1;
 return g;
};
function part(g:THREE.Group,material:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,flapTilt=0){
 const metric=g.userData.garmentMetricLength as number||1;
 const mesh=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(w,h,d),w,h*metric,d,material,x,y*metric,z),material);
 mesh.position.set(x,y,z);
 if(flapTilt)mesh.rotation.x=flapTilt;
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 return mesh;
}
export function createFieldTrouserPrototypes(legs:readonly Limb[],
 cloth:THREE.Material,trim:THREE.Material,
 mountainCanvas:THREE.Material=cloth,mountainPanel:THREE.Material=trim,
 chest?:THREE.Group):FieldTrouserPrototypes{
 const results={} as FieldTrouserPrototypes;
 // Cuffs are rolled fabric, not another camouflage sample. They receive
 // the independently resolved TROUSER solid/print companion swatch in pose.
 const cuffMaterial=new THREE.MeshStandardMaterial({
  color:0x646c49,roughness:1,metalness:0,flatShading:true
 });
 for(const cut of FIELD_TROUSER_CUTS){
  const p=FIELD_TROUSER_PROFILES[cut],classic=cut==='bdu-trousers',
   gorka=cut==='gorka-trousers';
  const textile=gorka?mountainCanvas:cloth,wear=gorka?mountainPanel:cloth;
  // Base legs are already solid clothing. A single snug block adds the
  // modest extra fabric thickness and receives the original pixel UVs.
  const thighW=gorka?5.25:classic?5.03:4.91;
  const thighD=gorka?5.79:classic?5.58:5.43;
  const shinW=gorka?4.54:classic?4.39:4.28;
  const shinD=gorka?4.84:classic?4.69:4.56;
  const thigh:THREE.Group[]=[],unbloused:THREE.Group[]=[],bloused:THREE.Group[]=[],cuffed:THREE.Group[]=[];
  for(const [i,leg] of legs.entries()){
   // The exterior of each IK leg segment is local +X, independent of side.
   const upper=group(leg.upper,cut+':thigh:'+i);
   part(upper,textile,0,0,0,thighW,1.07,thighD);
   // A genuine OUTER thigh pouch: shallow thickness along local +X,
   // broad front-to-back Z panel, and a readable upright Y dimension.
   // The old ±Z placement was forward/backward relative to the actual IK.
   const [thickness,height,span]=p.cargo;
   const pocket=outwardLimbPocket(thighW/2,-.095,height,span,thickness);
   part(upper,textile,pocket.x,pocket.y,pocket.z,
    pocket.width,pocket.height,pocket.depth);
   const [fw,fh,fd]=p.flap;
   part(upper,wear,pocket.x+thickness*.59,.145,0,fw,fh,fd);
   if(!classic&&!gorka){
    const knee=outwardLimbPatch(thighW/2,.37,.22,3.60,.20);
    part(upper,cloth,knee.x,knee.y,knee.z,
     knee.width,knee.height,knee.depth);
   }else if(classic){
    const fold=outwardLimbPatch(thighW/2,-.09,.23,2.80,.13);
    part(upper,cloth,fold.x+.13,fold.y,fold.z,
     fold.width,fold.height,fold.depth);
   }else{
    const knee=outwardLimbPatch(thighW/2,.27,.43,4.73,.29);
    const wearSide=outwardLimbPatch(thighW/2,-.25,.29,3.22,.24);
    part(upper,wear,knee.x,knee.y,knee.z,
     knee.width,knee.height,knee.depth);
    part(upper,wear,wearSide.x,wearSide.y,wearSide.z,
     wearSide.width,wearSide.height,wearSide.depth);
   }
   thigh.push(upper);
   for(const hem of ['unbloused','bloused','cuffed'] as const){
    const lower=group(leg.lower,cut+':'+hem+':shin:'+i);
    // Change the actual visual length, not only the ankle band. The
    // anatomical IK bone still spans knee-to-ankle at exactly the same pose.
    const shorten=hem==='bloused'?.30:hem==='cuffed'?.26:0;
    const end=.5-shorten;
    part(lower,textile,0,-shorten*.5,0,shinW,1-shorten+.022,shinD);
    if(!classic&&!gorka){
     // ACU-family calf cargo pocket: a separate physical feature,
     // with an angled flap; older BDU trousers deliberately omit it.
     const calf=outwardLimbPocket(shinW/2,-.10,.36,2.56,.43);
     part(lower,cloth,calf.x,calf.y,calf.z,
      calf.width,calf.height,calf.depth);
     part(lower,cloth,calf.x+.28,.075,0,.17,.14,2.64);
    }
    if(gorka){
     // Strong reinforced outer knee and weather-tight ankle band.
     const patch=outwardLimbPatch(shinW/2,-.30,.39,4.82,.28);
     part(lower,wear,patch.x,patch.y,patch.z,
      patch.width,patch.height,patch.depth);
     // A single low band wraps the weather-tight gaiter; don't emit
     // offset slivers perpendicular to the leg's physical outside.
     part(lower,cuffMaterial,shinW/2+.13,.30,0,.26,.12,4.01);
    }
    // The bloused outline narrows at the boot collar; the straight hem
    // stays wider and overlaps its shaft. Both have a visible textile fold.
    // Three genuinely different hem silhouettes; bloused finishes
    // narrow just above the boot shaft, cuffed finishes stack thick.
    if(hem==='bloused'){
     // Keep the shortened trouser length/taper, but fold mass projects
     // SIDEWAYS instead of stacking tall vertical rings above the boot.
     // Blousing is bunched-up ORIGINAL trouser cloth, not a reversed cuff.
     // Preserve the exact per-trouser camo cut, seeded UV and color.
     part(lower,textile,0,end-.116,0,shinW*1.12,.19,shinD*1.12);
     part(lower,textile,0,end-.013,0,shinW*.90,.11,shinD*.90);
    }else if(hem==='cuffed'){
     part(lower,cuffMaterial,0,end-.133,0,shinW+1.27,.205,shinD+1.29);
     part(lower,cuffMaterial,0,end-.016,0,shinW+.88,.108,shinD+.91);
    }else{
     part(lower,textile,0,.44,0,shinW+.25,.17,shinD+.25);
    }
    consolidateVisualGroup(lower);
    (hem==='bloused'?bloused:hem==='cuffed'?cuffed:unbloused).push(lower);
   }
   consolidateVisualGroup(upper);
  }
  // Gorka suspenders follow the torso and the real articulated legs;
  // they do not create duplicate legs, joints or collision shapes.
  const suspenders=gorka&&chest?group(chest,'gorka-trouser-suspenders'):undefined;
  if(suspenders){
   for(const sign of [-1,1]){
    // Close, narrow braces under the outer jacket rather than thick
    // surface bars sitting on top of a Gorka coat.
    part(suspenders,textile,5.13,-.15,sign*4.18,.48,11.4,1.06);
    part(suspenders,textile,-5.13,-.15,sign*4.18,.48,11.4,1.06);
    part(suspenders,textile,0,5.62,sign*4.18,10.50,.42,1.06);
   }
   consolidateVisualGroup(suspenders);
  }
  results[cut]={thigh,bloused,unbloused,cuffed,suspenders,cuffMaterial};
 }
 return results;
}
export function updateFieldTrouserPrototypes(
 models:FieldTrouserPrototypes,trousers:string,hem:TrouserHem,
 barefoot=false,top='base-layer'){
 for(const cut of FIELD_TROUSER_CUTS){
  const model=models[cut],active=cut===trousers;
  // Braces belong to trousers but are physically concealed beneath every
  // outer blouse/jacket. Only expose them with a fitted combat shirt or
  // foundation, never draw them on top of the mountain jacket.
  // Detachable trouser braces are under ALL tops, including the combat
  // shirt; exposed only in a base-layer/undershirt diagnostic outfit.
  if(model.suspenders)model.suspenders.visible=active&&top==='base-layer';
  for(const g of model.thigh)g.visible=active;
  for(const g of model.bloused)g.visible=active&&hem==='bloused'&&!barefoot;
  for(const g of model.unbloused)
   g.visible=active&&(hem==='unbloused'||barefoot);
  for(const g of model.cuffed)g.visible=active&&hem==='cuffed'&&!barefoot;
 }
}

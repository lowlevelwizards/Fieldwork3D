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
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH} from './breach-leg-geometry.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {TrouserHem} from './operator-wardrobe-data.ts';

export const FIELD_TROUSER_CUTS=['bdu-trousers','acu-trousers'] as const;
export type FieldTrouserCut=typeof FIELD_TROUSER_CUTS[number];
type Limb={upper:THREE.Mesh;lower:THREE.Mesh};
type Ring=readonly [y:number,radiusX:number,radiusZ:number];
export const FIELD_TROUSER_PROFILES={
 'bdu-trousers':{
  thigh:[[-.52,2.90,3.03],[-.31,3.25,3.42],
   [.15,3.45,3.56],[.52,3.18,3.29]] as readonly Ring[],
  unbloused:[[-.52,2.85,2.90],[-.28,2.97,3.02],
   [.24,3.00,3.05],[.53,3.07,3.12]] as readonly Ring[],
  bloused:[[-.52,2.85,2.90],[-.23,3.05,3.10],
   [.18,3.14,3.18],[.37,2.98,3.03],[.52,2.09,2.15]] as readonly Ring[],
  cargo:[4.50,.42,1.32] as const,flap:[4.80,.11,1.55] as const,
  character:'Loose thigh, prominent box cargo pocket, fuller straight leg'
 },
 'acu-trousers':{
  thigh:[[-.52,2.74,2.82],[-.23,2.94,3.05],
   [.17,3.12,3.19],[.52,2.94,3.04]] as readonly Ring[],
  unbloused:[[-.52,2.65,2.77],[-.24,2.83,2.87],
   [.25,2.78,2.84],[.53,2.82,2.90]] as readonly Ring[],
  bloused:[[-.52,2.65,2.77],[-.22,2.88,2.93],
   [.15,2.96,3.02],[.34,2.80,2.87],[.52,2.02,2.12]] as readonly Ring[],
  cargo:[4.02,.36,1.10] as const,flap:[4.27,.12,1.40] as const,
  character:'Cleaner tapered thigh with angled cargo flaps and calf pouch'
 }
} as const;

export type TrouserCutPrototype={
 thigh:THREE.Group[];
 unbloused:THREE.Group[];
 bloused:THREE.Group[];
};
export type FieldTrouserPrototypes=Record<FieldTrouserCut,TrouserCutPrototype>;

/** Rings are in normalized (animated) bone space; camo UVs use physical
 * model units, independent of how wide the underlying leg becomes. */
export function garmentLegLoft(rings:readonly Ring[],length:number):
 THREE.BufferGeometry{
 const n=10,pos:number[]=[],uv:number[]=[];
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
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);return g;
};
function part(g:THREE.Group,material:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,flapTilt=0){
 const mesh=new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(w,h,d),w,h,d,material,x,y,z),material);
 mesh.position.set(x,y,z);
 if(flapTilt)mesh.rotation.x=flapTilt;
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 return mesh;
}
function clothShell(g:THREE.Group,material:THREE.Material,
 rings:readonly Ring[],length:number){
 const mesh=new THREE.Mesh(garmentLegLoft(rings,length),material);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
}
export function createFieldTrouserPrototypes(legs:readonly Limb[],
 cloth:THREE.Material,trim:THREE.Material):FieldTrouserPrototypes{
 const results={} as FieldTrouserPrototypes;
 for(const cut of FIELD_TROUSER_CUTS){
  const p=FIELD_TROUSER_PROFILES[cut],classic=cut==='bdu-trousers';
  const thigh:THREE.Group[]=[],unbloused:THREE.Group[]=[],bloused:THREE.Group[]=[];
  for(const [i,leg] of legs.entries()){
   const side=i===0?-1:1;
   const upper=group(leg.upper,cut+':thigh:'+i);
   clothShell(upper,cloth,p.thigh,LEG_UPPER_LENGTH);
   // Bellows cargo pockets sit on the outer thigh, not the knee pivot.
   const lateral=side*(classic?3.52:3.18);
   const [w,h,d]=p.cargo;
   part(upper,cloth,.08,-.04,lateral,w,h,d);
   const [fw,fh,fd]=p.flap;
   part(upper,cloth,.08,.19,lateral+side*.15,fw,fh,fd,
    classic?0:side*.19);
   if(!classic){
    // Modern trouser reinforced knee panel rides the LOWER segment,
    // never changes the contact or bend of the actual knee.
    part(upper,cloth,2.86,-.39,0,.20,.20,4.38);
    part(upper,trim,.11,.33,lateral+side*.19,3.8,.06,.24);
   }else{
    // Simple field trouser pocket bellows and high fold.
    part(upper,cloth,.12,-.07,lateral+side*.49,3.25,.27,.25);
   }
   thigh.push(upper);
   for(const hem of ['unbloused','bloused'] as const){
    const lower=group(leg.lower,cut+':'+hem+':shin:'+i);
    clothShell(lower,cloth,p[hem],LEG_LOWER_LENGTH);
    if(!classic){
     // ACU-family calf cargo pocket: a separate physical feature,
     // with an angled flap; older BDU trousers deliberately omit it.
     part(lower,cloth,.03,-.08,side*2.89,3.30,.27,.85);
     part(lower,cloth,.05,.055,side*3.00,3.56,.085,1.05,side*.12);
    }
    if(hem==='bloused'){
     // The gathering band is higher up on the combat boot rather than
     // stretching the trouser bone or relocating the planted shoe.
     part(lower,trim,0,.486,0,3.55,.06,3.63);
    }else{
     // Wide straight hem hides part of the boot shaft without pegging.
     part(lower,cloth,0,.497,0,5.65,.085,5.71);
    }
    consolidateVisualGroup(lower);
    (hem==='bloused'?bloused:unbloused).push(lower);
   }
   consolidateVisualGroup(upper);
  }
  results[cut]={thigh,bloused,unbloused};
 }
 return results;
}
export function updateFieldTrouserPrototypes(
 models:FieldTrouserPrototypes,trousers:string,hem:TrouserHem,
 barefoot=false){
 for(const cut of FIELD_TROUSER_CUTS){
  const model=models[cut],active=cut===trousers;
  for(const g of model.thigh)g.visible=active;
  for(const g of model.bloused)g.visible=active&&hem==='bloused'&&!barefoot;
  for(const g of model.unbloused)
   g.visible=active&&(hem==='unbloused'||barefoot);
 }
}

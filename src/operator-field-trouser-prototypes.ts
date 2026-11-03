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
  bloused:[[-.52,2.85,2.90],[-.24,3.10,3.17],
   [.05,3.34,3.40],[.18,3.48,3.54],[.265,2.14,2.18]] as readonly Ring[],
  cuffed:[[-.52,2.85,2.90],[-.24,2.98,3.06],
   [.20,3.05,3.12],[.34,3.36,3.41],[.53,3.50,3.55]] as readonly Ring[],
  cargo:[3.95,.48,1.50] as const,flap:[4.15,.16,1.70] as const,
  character:'Loose thigh, prominent box cargo pocket, fuller straight leg'
 },
 'acu-trousers':{
  thigh:[[-.52,2.74,2.82],[-.23,2.94,3.05],
   [.17,3.12,3.19],[.52,2.94,3.04]] as readonly Ring[],
  unbloused:[[-.52,2.65,2.77],[-.24,2.83,2.87],
   [.25,2.78,2.84],[.53,2.82,2.90]] as readonly Ring[],
  bloused:[[-.52,2.65,2.77],[-.22,2.92,2.99],
   [.05,3.06,3.12],[.16,3.19,3.25],[.275,1.98,2.08]] as readonly Ring[],
  cuffed:[[-.52,2.65,2.77],[-.25,2.83,2.90],
   [.21,2.87,2.93],[.35,3.21,3.27],[.53,3.29,3.34]] as readonly Ring[],
  cargo:[3.65,.42,1.28] as const,flap:[3.90,.16,1.44] as const,
  character:'Cleaner tapered thigh with angled cargo flaps and calf pouch'
 }
} as const;

export type TrouserCutPrototype={
 thigh:THREE.Group[];
 unbloused:THREE.Group[];
 bloused:THREE.Group[];
 cuffed:THREE.Group[];
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
/** Visible wrap around the hem at the correct local ankle point.
 * Ring remains cosmetic and its UV repeats the approved material pixels at
 * the same world density as the actual lower-leg garment shell. */
function hemFinishBand(g:THREE.Group,material:THREE.Material,ring:Ring){
 const rx=ring[1]+.13,rz=ring[2]+.13;
 const geometry=new THREE.CylinderGeometry(rx,rx,.105,10,1,true);
 geometry.scale(1,1,rz/rx);
 geometry.translate(0,ring[0],0);
 const uv=geometry.getAttribute('uv') as THREE.BufferAttribute;
 const averageRadius=(rx+rz)*.5;
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)*2*Math.PI*averageRadius/TILE_WORLD_SIZE,
   uv.getY(i)*.105*LEG_LOWER_LENGTH/TILE_WORLD_SIZE);
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(geometry,material);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
}
export function createFieldTrouserPrototypes(legs:readonly Limb[],
 cloth:THREE.Material,trim:THREE.Material):FieldTrouserPrototypes{
 const results={} as FieldTrouserPrototypes;
 for(const cut of FIELD_TROUSER_CUTS){
  const p=FIELD_TROUSER_PROFILES[cut],classic=cut==='bdu-trousers';
  const thigh:THREE.Group[]=[],unbloused:THREE.Group[]=[],bloused:THREE.Group[]=[],cuffed:THREE.Group[]=[];
  for(const [i,leg] of legs.entries()){
   const side=i===0?-1:1;
   const upper=group(leg.upper,cut+':thigh:'+i);
   clothShell(upper,cloth,p.thigh,LEG_UPPER_LENGTH);
   // Bellows cargo pockets sit on the outer thigh, not the knee pivot.
   // +X is forward, +/-Z is the operator's flank: outer SIDE seam.
    const lateral=side*(classic?4.35:4.02);
   const [w,h,d]=p.cargo;
   part(upper,cloth,-.62,-.06,lateral,w,h,d);
   const [fw,fh,fd]=p.flap;
   part(upper,cloth,-.62,.19,lateral+side*.12,fw,fh,fd,
    classic?0:side*.19);
   if(!classic){
    // Modern trouser reinforced knee panel rides the LOWER segment,
    // never changes the contact or bend of the actual knee.
    part(upper,cloth,2.86,-.39,0,.20,.20,4.38);
    part(upper,trim,-.62,.33,lateral+side*.19,3.65,.08,.24);
   }else{
    // Simple field trouser pocket bellows and high fold.
    part(upper,cloth,-.62,-.07,lateral+side*.56,3.35,.31,.30);
   }
   thigh.push(upper);
   for(const hem of ['unbloused','bloused','cuffed'] as const){
    const lower=group(leg.lower,cut+':'+hem+':shin:'+i);
    clothShell(lower,cloth,p[hem],LEG_LOWER_LENGTH);
    if(!classic){
     // ACU-family calf cargo pocket: a separate physical feature,
     // with an angled flap; older BDU trousers deliberately omit it.
     part(lower,cloth,-.43,-.08,side*3.51,3.06,.34,.97);
     part(lower,cloth,-.43,.055,side*3.63,3.35,.12,1.14,side*.12);
    }
    // The bloused outline narrows at the boot collar; the straight hem
    // stays wider and overlaps its shaft. Both have a visible textile fold.
    hemFinishBand(lower,cloth,p[hem][p[hem].length-1]);
    if(hem==='cuffed')
     hemFinishBand(lower,cloth,[.39,
      p.cuffed[3][1]+.22,p.cuffed[3][2]+.22]);
    consolidateVisualGroup(lower);
    (hem==='bloused'?bloused:hem==='cuffed'?cuffed:unbloused).push(lower);
   }
   consolidateVisualGroup(upper);
  }
  results[cut]={thigh,bloused,unbloused,cuffed};
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
  for(const g of model.cuffed)g.visible=active&&hem==='cuffed'&&!barefoot;
 }
}

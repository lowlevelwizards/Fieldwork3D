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
  cargo:[.52,.39,2.90] as const,flap:[.16,.095,3.02] as const,
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
  cargo:[.42,.36,2.72] as const,flap:[.15,.090,2.85] as const,
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
  cargo:[.55,.42,3.00] as const,flap:[.16,.105,3.12] as const,
  character:'Voluminous overtrousers with reinforced knees and gaiter hems'
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
 cloth:THREE.Material,trim:THREE.Material,
 mountainCanvas:THREE.Material=cloth,mountainPanel:THREE.Material=trim):FieldTrouserPrototypes{
 const results={} as FieldTrouserPrototypes;
 for(const cut of FIELD_TROUSER_CUTS){
  const p=FIELD_TROUSER_PROFILES[cut],classic=cut==='bdu-trousers',
   gorka=cut==='gorka-trousers';
  const textile=gorka?mountainCanvas:cloth,wear=gorka?mountainPanel:cloth;
  const thigh:THREE.Group[]=[],unbloused:THREE.Group[]=[],bloused:THREE.Group[]=[],cuffed:THREE.Group[]=[];
  for(const [i,leg] of legs.entries()){
   // The exterior of each IK leg segment is local +X, independent of side.
   const upper=group(leg.upper,cut+':thigh:'+i);
   clothShell(upper,textile,p.thigh,LEG_UPPER_LENGTH);
   // A genuine OUTER thigh pouch: shallow thickness along local +X,
   // broad front-to-back Z panel, and a readable upright Y dimension.
   // The old ±Z placement was forward/backward relative to the actual IK.
   const [thickness,height,span]=p.cargo;
   const pocket=outwardLimbPocket(p.thigh[2][1],-.095,height,span,thickness);
   part(upper,textile,pocket.x,pocket.y,pocket.z,
    pocket.width,pocket.height,pocket.depth);
   const [fw,fh,fd]=p.flap;
   part(upper,wear,pocket.x+thickness*.59,.145,0,fw,fh,fd);
   if(!classic&&!gorka){
    const knee=outwardLimbPatch(p.thigh.at(-1)![1],.37,.22,3.60,.20);
    part(upper,cloth,knee.x,knee.y,knee.z,
     knee.width,knee.height,knee.depth);
   }else if(classic){
    const fold=outwardLimbPatch(p.thigh[2][1],-.09,.23,2.80,.13);
    part(upper,cloth,fold.x+.13,fold.y,fold.z,
     fold.width,fold.height,fold.depth);
   }else{
    const knee=outwardLimbPatch(p.thigh.at(-1)![1],.34,.25,4.40,.22);
    const wearSide=outwardLimbPatch(p.thigh[2][1],-.28,.18,2.70,.14);
    part(upper,wear,knee.x,knee.y,knee.z,
     knee.width,knee.height,knee.depth);
    part(upper,wear,wearSide.x,wearSide.y,wearSide.z,
     wearSide.width,wearSide.height,wearSide.depth);
   }
   thigh.push(upper);
   for(const hem of ['unbloused','bloused','cuffed'] as const){
    const lower=group(leg.lower,cut+':'+hem+':shin:'+i);
    clothShell(lower,textile,p[hem],LEG_LOWER_LENGTH);
    if(!classic&&!gorka){
     // ACU-family calf cargo pocket: a separate physical feature,
     // with an angled flap; older BDU trousers deliberately omit it.
     const calf=outwardLimbPocket(p[hem][1][1],-.10,.30,2.34,.30);
     part(lower,cloth,calf.x,calf.y,calf.z,
      calf.width,calf.height,calf.depth);
     part(lower,cloth,calf.x+.19,.075,0,.12,.10,2.45);
    }
    if(gorka){
     // Strong reinforced outer knee and weather-tight ankle band.
     const patch=outwardLimbPatch(p[hem][1][1],-.35,.26,4.65,.20);
     part(lower,wear,patch.x,patch.y,patch.z,
      patch.width,patch.height,patch.depth);
     // A single low band wraps the weather-tight gaiter; don't emit
     // offset slivers perpendicular to the leg's physical outside.
     part(lower,wear,p[hem][3][1]+.16,.30,0,.20,.10,3.70);
    }
    // The bloused outline narrows at the boot collar; the straight hem
    // stays wider and overlaps its shaft. Both have a visible textile fold.
    hemFinishBand(lower,textile,p[hem][p[hem].length-1]);
    if(hem==='cuffed')
     hemFinishBand(lower,textile,[.39,
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

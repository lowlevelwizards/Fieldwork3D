/** R5.2-C EXPERIMENTAL: a true per-part, per-face UV1 self-shadow
 * atlas. Enabled ONLY by ?operatorLightingAtlas=1 in Operator Studio.
 *
 * Every semantic pouch body/flap samples its own related cuboids at
 * TEXEL resolution rather than interpolating only a handful of vertices.
 * Uses native MeshStandardMaterial.aoMap; camouflage UV0 is untouched.
 * No new geometry, draw calls, dynamic lights or gameplay render pass.
 *
 * This intentionally stays opt-in until device comparisons and duplicate
 * baked-self-shadow removal are approved.
 */
import * as THREE from 'three';
import {shadowRayBox} from './operator-baked-shadow-maps.ts';
import {crossEquipmentContactBox} from './operator-baked-gear-cast.ts';
import {GEAR_CONTACT_AO_FLOOR} from './operator-baked-gear-ao.ts';

const CELL=16,PAD=1,MAX_BYTES=8*1024*1024;
const RAYS=[
 new THREE.Vector3(.46,.88,.07).normalize(),
 new THREE.Vector3(.43,.90,.03).normalize(),
 new THREE.Vector3(.47,.88,.04).normalize()
] as const;
type StoredBox={
 min:readonly [number,number,number];
 max:readonly [number,number,number];
 partId?:string;role?:string
};
type Span={partId:string;role:string;start:number;count:number};
type PreviewMaterial=THREE.MeshStandardMaterial&{
 userData:Record<string,unknown>
};
let residentBytes=0;
export function studioAtlasResidentBytes(){return residentBytes;}
const textureBytes=(width:number,height:number)=>width*height;
const power2=(value:number)=>Math.pow(2,Math.ceil(Math.log2(Math.max(1,value))));
function faceIndex(x:number,y:number,z:number):number{
 if(Math.abs(x)>=Math.abs(y)&&Math.abs(x)>=Math.abs(z))
  return x>=0?0:1;
 if(Math.abs(y)>=Math.abs(z))return y>=0?2:3;
 return z>=0?4:5;
}
function faceNormal(face:number):THREE.Vector3{
 if(face===0)return new THREE.Vector3(1,0,0);
 if(face===1)return new THREE.Vector3(-1,0,0);
 if(face===2)return new THREE.Vector3(0,1,0);
 if(face===3)return new THREE.Vector3(0,-1,0);
 if(face===4)return new THREE.Vector3(0,0,1);
 return new THREE.Vector3(0,0,-1);
}
const ratio=(v:number,min:number,max:number)=>
 THREE.MathUtils.clamp((v-min)/Math.max(.00001,max-min),0,1);
function faceUV(p:THREE.Vector3,box:THREE.Box3,face:number):[number,number]{
 return face<2?
  [ratio(p.z,box.min.z,box.max.z),
   ratio(p.y,box.min.y,box.max.y)]:
  face<4?
  [ratio(p.x,box.min.x,box.max.x),
   ratio(p.z,box.min.z,box.max.z)]:
  [ratio(p.x,box.min.x,box.max.x),
   ratio(p.y,box.min.y,box.max.y)];
}
function facePoint(box:THREE.Box3,face:number,u:number,v:number,
 target:THREE.Vector3):THREE.Vector3{
 const x=THREE.MathUtils.lerp(box.min.x,box.max.x,u);
 const y=THREE.MathUtils.lerp(box.min.y,box.max.y,v);
 if(face<2)return target.set(face===0?box.max.x:box.min.x,y,
  THREE.MathUtils.lerp(box.min.z,box.max.z,u));
 if(face<4)return target.set(x,face===2?box.max.y:box.min.y,
  THREE.MathUtils.lerp(box.min.z,box.max.z,v));
 return target.set(x,y,face===4?box.max.z:box.min.z);
}
const sameBounds=(a:THREE.Box3,b:THREE.Box3)=>(
 a.min.distanceToSquared(b.min)+a.max.distanceToSquared(b.max)<.04
);
/** Correct ONLY duplicated self-occlusion, in an isolated Studio geometry.
 * Source masks are immutable CPU metadata collected before mesh batching.
 * Existing cross-equipment contact, indirect lighting and global gradient
 * stay in the final vertex colors. No geometric/UV/camouflage modification.
 */
export function canIsolateSelfShadow(geometry:THREE.BufferGeometry):boolean{
 const colors=geometry.getAttribute('color');
 if(!colors||colors.itemSize!==3||
    !(colors.array instanceof Uint8Array)||!colors.normalized)return false;
 const count=colors.count;
 return [
  'fieldworkSelfOcclusionMask','fieldworkExternalOcclusionMask',
  'fieldworkContactBaseTone','fieldworkContactComposedTone'
 ].every(key=>{
  const samples=geometry.userData[key];
  return samples instanceof Uint8Array&&samples.length===count;
 });
}
export function isolateStudioSelfShadow(geometry:THREE.BufferGeometry):number{
 if(geometry.userData.fieldworkAtlasSelfIsolated||!canIsolateSelfShadow(geometry))
  return 0;
 const attribute=geometry.getAttribute('color') as THREE.BufferAttribute;
 const values=attribute.array as Uint8Array;
 const self=geometry.userData.fieldworkSelfOcclusionMask as Uint8Array;
 const external=geometry.userData.fieldworkExternalOcclusionMask as Uint8Array;
 const base=geometry.userData.fieldworkContactBaseTone as Uint8Array;
 const composed=geometry.userData.fieldworkContactComposedTone as Uint8Array;
 const original=new Uint8Array(values);
 let corrected=0;
 for(let i=0;i<attribute.count;i++){
  // If external contact already dominates, the existing vertex color
  // contains no extra self-shadow; make no change.
  if(self[i]<=external[i]||base[i]===0||composed[i]===0)continue;
  const withoutSelf=Math.round(255*Math.max(GEAR_CONTACT_AO_FLOOR,
   base[i]/255*(1-external[i]/255)));
  if(withoutSelf<=composed[i])continue;
  const factor=Math.min(1.8,withoutSelf/composed[i]);
  for(let channel=0;channel<3;channel++){
   const idx=i*3+channel;
   values[idx]=Math.min(255,Math.round(original[idx]*factor));
  }
  corrected++;
 }
 geometry.userData.fieldworkAtlasPreIsolationColors=original;
 geometry.userData.fieldworkAtlasSelfIsolated=true;
 if(corrected)attribute.needsUpdate=true;
 return corrected;
}
/** Undo opt-in self-only correction if the experiment is disabled. */
export function restoreStudioSelfShadow(geometry:THREE.BufferGeometry):boolean{
 const original=geometry.userData.fieldworkAtlasPreIsolationColors;
 if(!geometry.userData.fieldworkAtlasSelfIsolated||
    !(original instanceof Uint8Array))return false;
 const attr=geometry.getAttribute('color');
 if(!attr||!(attr.array instanceof Uint8Array)||
   attr.array.length!==original.length)return false;
 (attr.array as Uint8Array).set(original);
 attr.needsUpdate=true;
 delete geometry.userData.fieldworkAtlasPreIsolationColors;
 delete geometry.userData.fieldworkAtlasSelfIsolated;
 return true;
}
export type StudioAtlasResult={atlases:number;bytes:number;shadedTexels:number};
/** Build one atlas for ONE already-merged material bucket. For each
 * logical part/face: fully independent self occlusion, no other parts.
 */
export function bakeStudioSelfShadowAtlas(
 geometry:THREE.BufferGeometry,
 spans:readonly Span[],
 saved:readonly StoredBox[]
):{texture:THREE.DataTexture;shadedTexels:number;bytes:number}|null{
 const position=geometry.getAttribute('position'),
  normal=geometry.getAttribute('normal');
 if(!position||!normal||position.count!==normal.count||
  geometry.getAttribute('uv1')||spans.length===0)return null;
 const boxes=saved.filter(b=>b.partId).map(b=>({
  partId:b.partId!,role:b.role??'surface',
  box:new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max))
 }));
 const bounds=spans.map(span=>{
  const box=new THREE.Box3();
  for(let i=span.start;i<span.start+span.count;i++)
   box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position,i));
  return box;
 });
 const occluders=spans.map((span,i)=>boxes.filter(b=>
  b.partId===span.partId&&!sameBounds(b.box,bounds[i]))
  .map(b=>b.box));
 if(!occluders.some(x=>x.length))return null;
 const cells=spans.length*6+1;
 const columns=Math.ceil(Math.sqrt(cells));
 const rows=Math.ceil(cells/columns);
 const width=power2(columns*CELL),height=power2(rows*CELL);
 if(width>1024||height>1024||textureBytes(width,height)>MAX_BYTES)return null;
 const pixels=new Uint8Array(width*height).fill(255);
 const uv1=new Float32Array(position.count*2);
 const point=new THREE.Vector3(),origin=new THREE.Vector3();
 let shadedTexels=0;
 for(let piece=0;piece<spans.length;piece++){
  const span=spans[piece],box=bounds[piece],casters=occluders[piece];
  for(let i=span.start;i<span.start+span.count;i++){
   point.fromBufferAttribute(position,i);
   const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
   const face=faceIndex(nx,ny,nz),tile=piece*6+face+1;
   const tx=tile%columns,ty=Math.floor(tile/columns);
   const [u,v]=faceUV(point,box,face);
   uv1[i*2]=(tx*CELL+PAD+u*(CELL-2*PAD))/width;
   uv1[i*2+1]=(ty*CELL+PAD+v*(CELL-2*PAD))/height;
  }
  if(!casters.length)continue;
  for(let face=0;face<6;face++){
   const tile=piece*6+face+1,tx=tile%columns,
    ty=Math.floor(tile/columns),n=faceNormal(face);
   for(let py=0;py<CELL;py++)for(let px=0;px<CELL;px++){
    const u=THREE.MathUtils.clamp((px+.5-PAD)/(CELL-2*PAD),0,1);
    const v=THREE.MathUtils.clamp((py+.5-PAD)/(CELL-2*PAD),0,1);
    facePoint(box,face,u,v,point);
    let self=0;
    for(const other of casters){
     self=Math.max(self,.46*crossEquipmentContactBox(point,n,other,.95));
     origin.copy(point).addScaledVector(n,.065);
     let direct=0;
     for(const ray of RAYS){
      if(n.dot(ray)<.02)continue;
      const t=shadowRayBox(origin,ray,other,1.85);
      if(t===null||t<.045)continue;
      const q=THREE.MathUtils.clamp((t-.15)/1.70,0,1);
      direct+=1-q*q*(3-2*q);
     }
     self=Math.max(self,.40*direct/RAYS.length);
    }
    const shade=Math.round(255*(1-THREE.MathUtils.clamp(self,0,.42)));
    if(shade<254)shadedTexels++;
    pixels[(ty*CELL+py)*width+tx*CELL+px]=shade;
   }
  }
 }
 if(!shadedTexels)return null;
 geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));
 const texture=new THREE.DataTexture(pixels,width,height,
  THREE.RedFormat,THREE.UnsignedByteType);
 texture.name='Fieldwork R5 experimental self-shadow UV1';
 texture.channel=1;
 texture.colorSpace=THREE.NoColorSpace;
 texture.magFilter=texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.needsUpdate=true;
 return {texture,shadedTexels,bytes:pixels.byteLength};
}
function syncPreviewMaterial(mesh:THREE.Mesh){
 const original=mesh.userData.fieldworkAtlasOriginal as
  THREE.MeshStandardMaterial|undefined;
 const clone=mesh.material;
 if(!original||!(clone instanceof THREE.MeshStandardMaterial))return;
 clone.color.copy(original.color);
 if(clone.map!==original.map){
  clone.map=original.map;clone.needsUpdate=true;
 }
 clone.roughness=original.roughness;
 clone.metalness=original.metalness;
}
export function applyStudioSelfShadowAtlases(root:THREE.Object3D):StudioAtlasResult{
 const result:StudioAtlasResult={atlases:0,bytes:0,shadedTexels:0};
 root.traverseVisible(node=>{
  if(!(node instanceof THREE.Group))return;
  const volumes=node.userData.fieldworkShadowVolumes as StoredBox[]|undefined;
  if(!volumes?.some(v=>v.partId))return;
  for(const child of node.children){
   if(!(child instanceof THREE.Mesh))continue;
   const geometry=child.geometry as THREE.BufferGeometry;
   const original=child.userData.fieldworkAtlasOriginal;
   if(original){
    if(child.userData.fieldworkAtlasGeometry===geometry){
     syncPreviewMaterial(child);continue;
    }
    // Geometry was refitted/rebuilt. Release its stale experimental map.
    if(child.material instanceof THREE.MeshStandardMaterial){
     child.material.dispose();
     child.material=original as THREE.MeshStandardMaterial;
    }
    delete child.userData.fieldworkAtlasOriginal;
   }
   if(!(child.material instanceof THREE.MeshStandardMaterial)||
    child.material.aoMap)return;
   const spans=geometry.userData.fieldworkLightingPartSpans as
    Span[]|undefined;
   // Refuse an atlas if its vertex-space self contribution can't be
   // removed without touching external contact or clothing brightness.
   if(!spans||!canIsolateSelfShadow(geometry))continue;
   const atlas=bakeStudioSelfShadowAtlas(geometry,spans,volumes);
   if(!atlas)continue;
   if(residentBytes+atlas.bytes>MAX_BYTES){
    geometry.deleteAttribute('uv1');atlas.texture.dispose();continue;
   }
   // The native UV1 atlas now REPLACES the baked per-vertex self shadow.
   // Preserve the already-composed external contact and height gradient.
   isolateStudioSelfShadow(geometry);
   const source=child.material,clone=source.clone() as PreviewMaterial;
   clone.aoMap=atlas.texture;
   // Full-strength replacement for isolated self lighting. The atlas
   // is STILL opt-in until real mobile visual comparisons approve it.
   clone.aoMapIntensity=.85;
   clone.needsUpdate=true;
   residentBytes+=atlas.bytes;
   clone.addEventListener('dispose',()=>{
    atlas.texture.dispose();
    residentBytes=Math.max(0,residentBytes-atlas.bytes);
   });
   child.userData.fieldworkAtlasOriginal=source;
   child.userData.fieldworkAtlasGeometry=geometry;
   child.material=clone;
   result.atlases++;
   result.bytes+=atlas.bytes;
   result.shadedTexels+=atlas.shadedTexels;
  }
 });
 return result;
}

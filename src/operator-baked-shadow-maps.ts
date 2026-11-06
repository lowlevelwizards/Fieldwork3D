/** Geometry-family shadow baking (no frame-time lights or shadow passes).
 *
 * A static 4x2 grayscale atlas records true directional ray-vs-volume
 * visibility on the six sides of the low-poly head and neck receivers.
 * All national colors, camouflage materials and skin tones share the bake.
 *
 * The atlas is computed on first appearance of a silhouette and cached.
 * We bake the RECEIVER surface (head/neck), not the projecting brim/collar.
 * Separate cached maps permit independent hat and jacket choices.
 */
import * as THREE from 'three';
import {canonicalPointToLegacy} from './operator-axis-convention.ts';
import {headwearCuboidVolumes,type HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import {boxFaceVertexRanges} from './rendering/pixel-materials.ts';

export type ShadowBox={min:THREE.Vector3;max:THREE.Vector3};
const CELL=32,COLS=4,ROWS=2;
const lightRays=[
 new THREE.Vector3(.57,.80,.16).normalize(),
 new THREE.Vector3(.47,.86,-.12).normalize(),
 new THREE.Vector3(.66,.74,.04).normalize(),
 new THREE.Vector3(.52,.82,-.22).normalize()
] as const;
export const BAKED_LIGHT_DIRECTION=lightRays[0];
export const BAKED_SHADOW_ATLAS_BYTES=COLS*ROWS*CELL*CELL*4;
const cache=new Map<string,THREE.DataTexture>();
const EPS=.055;

/** Slab ray test is a real line-of-sight obstruction check, not the old
 * nearest-center heuristic. Visible surfaces have no occluding box between
 * their point and the virtual key light. */
export function shadowRayBox(origin:THREE.Vector3,direction:THREE.Vector3,
 box:ShadowBox,maxDistance=16):number|null{
 let near=0,far=maxDistance;
 for(const axis of ['x','y','z'] as const){
  const d=direction[axis],o=origin[axis];
  if(Math.abs(d)<1e-7){
   if(o<box.min[axis]||o>box.max[axis])return null;
   continue;
  }
  const t0=(box.min[axis]-o)/d,t1=(box.max[axis]-o)/d;
  near=Math.max(near,Math.min(t0,t1));
  far=Math.min(far,Math.max(t0,t1));
  if(far<near)return null;
 }
 return far>EPS?near:null;
}
function pointShade(point:THREE.Vector3,normal:THREE.Vector3,
 boxes:readonly ShadowBox[],floor=.40):number{
 let hits=0;
 const origin=point.clone().addScaledVector(normal,.09);
 for(const ray of lightRays){
  if(normal.dot(ray)<-.12)continue;
  for(const box of boxes){
   if(shadowRayBox(origin,ray,box,16)!==null){hits++;break;}
  }
 }
 const occlusion=hits/lightRays.length;
 // One-direction miniature studio shadow, with several offset rays for
 // a low-resolution soft penumbra. Avoid pitch-black camouflage or skin.
 return Math.max(floor,1-.59*occlusion);
}
export function bakeReceiverShadowAtlas(
 key:string,center:THREE.Vector3,size:THREE.Vector3,
 boxes:readonly ShadowBox[],bodyGradient=.06):THREE.DataTexture{
 const existing=cache.get(key);if(existing)return existing;
 const width=COLS*CELL,height=ROWS*CELL;
 const pixels=new Uint8Array(width*height*4);
 const p=new THREE.Vector3(),n=new THREE.Vector3();
 for(let f=0;f<6;f++){
  const col=f%COLS,row=Math.floor(f/COLS);
  for(let v=0;v<CELL;v++)for(let u=0;u<CELL;u++){
   const su=(u+.5)/CELL,sv=(v+.5)/CELL;
   p.copy(center);
   if(f===0||f===1){
    p.x+=(f===0?1:-1)*size.x/2;
    p.y+=(sv-.5)*size.y;
    p.z+=(f===0?.5-su:su-.5)*size.z;
    n.set(f===0?1:-1,0,0);
   }else if(f===2||f===3){
    p.x+=(su-.5)*size.x;
    p.y+=(f===2?1:-1)*size.y/2;
    p.z+=(sv-.5)*size.z;
    n.set(0,f===2?1:-1,0);
   }else{
    p.x+=(su-.5)*size.x;
    p.y+=(sv-.5)*size.y;
    p.z+=(f===4?1:-1)*size.z/2;
    n.set(0,0,f===4?1:-1);
   }
   const shade=pointShade(p,n,boxes);
   const low=1-sv; // lower receiver pixels are slightly darker, by design.
   const value=Math.max(.39,shade*(1-bodyGradient*low)*
    (f===3?.84:1));
   const byte=Math.round(value*255);
   const index=((row*CELL+v)*width+col*CELL+u)*4;
   pixels[index]=byte;pixels[index+1]=byte;
   pixels[index+2]=byte;pixels[index+3]=255;
  }
 }
 const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
 texture.name='Fieldwork baked receiver light / '+key;
 texture.colorSpace=THREE.LinearSRGBColorSpace;
 texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.needsUpdate=true;
 cache.set(key,texture);
 return texture;
}
/** Give the cube's six faces independent UV islands in the tiny grayscale
 * atlas. No albedo UVs are borrowed or overwritten on camouflage assets. */
export function mapSkinReceiverAtlas(geometry:THREE.BoxGeometry):void{
 if(geometry.userData.fieldworkSkinShadowUV)return;
 const uv=geometry.getAttribute('uv'),pos=geometry.getAttribute('position');
 const ranges=boxFaceVertexRanges(geometry);
 const {width=w,height=h,depth=d}=geometry.parameters;
 for(let face=0;face<6;face++){
  const col=face%COLS,row=Math.floor(face/COLS);
  const {start,count}=ranges[face];
  for(let i=start;i<start+count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   const su=face<2?(face===0?.5-z/d:.5+z/d):
    (face<4?.5+x/w:.5+x/w);
   const sv=face<2?.5+y/h:face<4?.5+z/d:.5+y/h;
   const u=(col+.03+.94*THREE.MathUtils.clamp(su,0,1))/COLS,
    v=(row+.03+.94*THREE.MathUtils.clamp(sv,0,1))/ROWS;
   uv.setXY(i,u,v);
  }
 }
 uv.needsUpdate=true;
 geometry.userData.fieldworkSkinShadowUV=true;
}
function cuboidShadowBoxes(id:HeadSilhouetteId):ShadowBox[]{
 return headwearCuboidVolumes(id).map(part=>{
  const center=canonicalPointToLegacy(new THREE.Vector3(part.x,part.y,part.z));
  const half=new THREE.Vector3(part.depth*.5,part.height*.5,part.width*.5);
  return {min:center.clone().sub(half),max:center.clone().add(half)};
 });
}
const headSize=new THREE.Vector3(8,8,8);
const headCenter=new THREE.Vector3(0,3,0);
export function headwearCastShadowAtlas(headwear:string):THREE.DataTexture{
 const key='head:'+headwear;
 let boxes:ShadowBox[]=[];
 const ids=['patrol-cap','boonie','beanie','beret','pasgt','soviet-steel',
  'm1-steel','ddr-m56','police-helmet','ach','high-cut'] as const;
 const id=(headwear==='high-cut-rails'?'high-cut':headwear);
 if((ids as readonly string[]).includes(id))
  boxes=cuboidShadowBoxes(id as HeadSilhouetteId);
 else if(['baseball-cap','field-cap','backwards-cap'].includes(id)){
  const front=id==='backwards-cap'?-4.5:4.5;
  boxes=[{min:new THREE.Vector3(front-2.0,5.64,-3.85),
   max:new THREE.Vector3(front+2.0,6.24,3.85)}];
 }
 return bakeReceiverShadowAtlas(key,headCenter,headSize,boxes,.025);
}
const neckSize=new THREE.Vector3(3.6,4,3.8),neckCenter=new THREE.Vector3(0,7,0);
export function collarCastShadowAtlas(top:string,collars:readonly ShadowBox[]){
 // Version and garment style, not camo color or operator id, own each bake.
 // Caller supplies the authored collar pieces in chest coordinates.
 return bakeReceiverShadowAtlas('neck:'+top,neckCenter,neckSize,collars,.13);
}
export function shadowAtlasCacheSize(){return cache.size;}
/** For deterministic tests: sample the front-face pixel at given local Y/Z. */
export function frontShadowSample(texture:THREE.DataTexture,y:number,z=0,
 receiver:'head'|'neck'='head'):number{
 const size=receiver==='head'?headSize:neckSize;
 const center=receiver==='head'?headCenter:neckCenter;
 const u=THREE.MathUtils.clamp(.5-z/size.z,0,.999),
  v=THREE.MathUtils.clamp(.5+(y-center.y)/size.y,0,.999);
 const x=Math.floor(u*CELL),py=Math.floor(v*CELL);
 return (texture.image.data as Uint8Array)[(py*COLS*CELL+x)*4]/255;
}

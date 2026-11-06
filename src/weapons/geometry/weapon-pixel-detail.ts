/** Tiny, deliberately restrained pixel art for iconic exterior identities.
 * Baked into a few shared RGBA textures. One polygon per mark, not one per pixel.
 * Art-only overlays have no cast shadow and never affect weapon handling.
 */
import * as THREE from 'three';
export type WeaponMark='ar-port'|'ak-selector'|'ris-panel';
const dimensions:Record<WeaponMark,readonly [number,number]>={
 'ar-port':[16,12],'ak-selector':[16,8],'ris-panel':[32,8]
};
const shared=new Map<WeaponMark,THREE.MeshBasicMaterial>();
function materialFor(mark:WeaponMark):THREE.MeshBasicMaterial{
 const cached=shared.get(mark);if(cached)return cached;
 const [w,h]=dimensions[mark],data=new Uint8Array(w*h*4);
 const pixel=(x:number,y:number,light=false)=>{
  if(x<0||y<0||x>=w||y>=h)return;
  const n=(y*w+x)*4;
  const rgb=light?[104,109,95]:[29,36,32];
  data[n]=rgb[0];data[n+1]=rgb[1];data[n+2]=rgb[2];data[n+3]=210;
 };
 if(mark==='ar-port'){
  // A tall receiver-side rectangle with one illuminated upper seam.
  // Previously only its hairline highlight was legible on a phone.
  for(let y=2;y<=9;y++)for(let x=2;x<=13;x++)pixel(x,y);
  for(let x=2;x<=13;x++)pixel(x,2,true);
  for(let x=3;x<=12;x++)pixel(x,9,true);
 }else if(mark==='ak-selector'){
  for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)pixel(x,y,true);
  for(let x=6;x<=13;x++)pixel(x,3+Math.floor((x-6)/4));
 }else{
  // Three large spaced dark stamps read as rail blocks at small sizes.
  for(const start of [3,12,21])
   for(let y=2;y<=5;y++)for(let x=start;x<start+5;x++)pixel(x,y);
  for(let x=3;x<=26;x++)pixel(x,1,true);
 }
 const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);
 texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;texture.needsUpdate=true;
 const material=new THREE.MeshBasicMaterial({
  map:texture,transparent:true,depthWrite:false,
  polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
 });
 shared.set(mark,material);return material;
}
export function addWeaponPixelMark(root:THREE.Group,mark:WeaponMark,
 x:number,y:number,z:number,w:number,h:number){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),materialFor(mark));
 mesh.name='family-art-'+mark;
 mesh.position.set(x,y,z);
 mesh.userData.weaponPixelArt=true;
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=3;
 root.add(mesh);
 return mesh;
}

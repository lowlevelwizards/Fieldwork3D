/** Tiny, deliberately restrained pixel art for iconic exterior identities.
 * Baked into a few shared RGBA textures. One polygon per mark, not one per pixel.
 * Art-only overlays have no cast shadow and never affect weapon handling.
 */
import * as THREE from 'three';
export type WeaponMark='ar-port'|'ak-port'|'ak-selector'|'ris-panel'|'m5-panel'|'ras-panel'|'pri-vents'|'poly-ribs'|'car-ribs'|'a1-vents'|'ar-mag-stamp20'|'ar-mag-stamp30'|'ar-poly-panel';
const dimensions:Record<WeaponMark,readonly [number,number]>={
 'ar-port':[16,12],'ak-port':[16,12],
 'ak-selector':[16,8],'ris-panel':[32,8],'pri-vents':[16,8],
 'poly-ribs':[32,10],'car-ribs':[24,10],'a1-vents':[32,10],
 'm5-panel':[32,8],'ras-panel':[32,8],
 'ar-mag-stamp20':[16,16],'ar-mag-stamp30':[16,24],
 'ar-poly-panel':[16,24]
};
const shared=new Map<WeaponMark,THREE.MeshBasicMaterial>();
function materialFor(mark:WeaponMark):THREE.MeshBasicMaterial{
 const cached=shared.get(mark);if(cached)return cached;
 const [w,h]=dimensions[mark],data=new Uint8Array(w*h*4);
 const pixel=(x:number,y:number,light=false,strong=false)=>{
  if(x<0||y<0||x>=w||y>=h)return;
  const n=(y*w+x)*4;
  const rgb=strong?[9,13,12]:light?[88,99,88]:[24,31,27];
  data[n]=rgb[0];data[n+1]=rgb[1];data[n+2]=rgb[2];data[n+3]=strong?255:232;
 };
 if(mark==='ar-port'){
  // A tall receiver-side rectangle with one illuminated upper seam.
  // Previously only its hairline highlight was legible on a phone.
  for(let y=2;y<=9;y++)for(let x=2;x<=13;x++)pixel(x,y);
  for(let x=2;x<=13;x++)pixel(x,2,true);
  // No floating bright lower underline: the dark port reads by contrast.
 }else if(mark==='ak-port'){
  // Taller compact AK receiver opening, above (not behind) the magazine.
  for(let y=3;y<=9;y++)for(let x=3;x<=12;x++)pixel(x,y);
  for(let x=3;x<=12;x++)pixel(x,3,true);
 }else if(mark==='ak-selector'){
  for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)pixel(x,y,true);
  for(let x=6;x<=13;x++)pixel(x,3+Math.floor((x-6)/4));
 }else if(mark==='poly-ribs'||mark==='car-ribs'){
  const ribX=mark==='poly-ribs'?[3,7,11,15,19,23,27]:
   [3,7,11,15,19];
  // Strong dark bands run the full visible height, and one continuous
  // long mold seam crosses the middle. These are not holes or rail covers.
  for(const x of ribX)
   for(let y=1;y<h-1;y++)pixel(x,y,false,true);
  for(let x=2;x<w-2;x++)pixel(x,Math.floor(h/2),false,true);
 }else if(mark==='a1-vents'){
  // The A1 has dark upper ventilation apertures; never light gray dots.
  for(const x of [3,9,15,21,27])
   for(let dx=0;dx<3;dx++)for(let y=2;y<=6;y++)
    pixel(x+dx,y,false,true);
 }else if(mark==='ar-mag-stamp20'||mark==='ar-mag-stamp30'){
  // One texture holds three restrained full-height pressed STANAG ribs.
  for(const x of [3,8,13])for(let y=2;y<h-2;y++)pixel(x,y);
 }else if(mark==='ar-poly-panel'){
  for(let x=3;x<13;x++){pixel(x,3);pixel(x,h-4);}
  for(let y=3;y<h-3;y++){pixel(3,y);pixel(12,y);}
 }else if(mark==='pri-vents'){
  for(const x of [3,7,11])for(let y=3;y<=5;y++)pixel(x,y);
  for(let x=3;x<=13;x++)pixel(x,2,true);
 }else{
  // Large rail cover blocks; do not waste triangles on Picatinny teeth.
  const starts=mark==='m5-panel'?[2,10,18,26]:
   mark==='ras-panel'?[3,11,19,27]:[3,12,21];
  for(const start of starts)
   for(let y=2;y<=5;y++)for(let x=start;x<Math.min(w,start+4);x++)pixel(x,y);
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

/** Symmetric details are intentionally attached to both visible side faces.
 * Do not use for receiver ejection ports or other mechanically asymmetric art.
 */
export function addWeaponPixelMarkPair(root:THREE.Group,mark:WeaponMark,
 x:number,y:number,z:number,w:number,h:number){
 const right=addWeaponPixelMark(root,mark,x,y,z,w,h);
 const left=addWeaponPixelMark(root,mark,x,y,-z,w,h);
 left.rotation.y=Math.PI;
 return [right,left] as const;
}

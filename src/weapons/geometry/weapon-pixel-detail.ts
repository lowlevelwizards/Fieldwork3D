/** Tiny, deliberately restrained pixel art for iconic exterior identities.
 * Baked into a few shared RGBA textures. One polygon per mark, not one per pixel.
 * Art-only overlays have no cast shadow and never affect weapon handling.
 */
import * as THREE from 'three';
export type WeaponMark='ar-port'|'ak-port'|'ak-selector'|'ak-cover-ribs'|'ak-receiver-stamp'|'ris-panel'|'m5-panel'|'ras-panel'|'pri-vents'|'poly-ribs'|'car-ribs'|'ar-mag-stamp20'|'ar-mag-stamp30'|'ar-poly-panel'|'ar-birdcage'|'rail-cover-stripes'|'ar-spr-ports'|'hk-port'|'hk-selector'|'hk-wood-vents'|'hk-poly-vents';
const dimensions:Record<WeaponMark,readonly [number,number]>={
 'ar-port':[16,12],'ak-port':[16,12],
 'hk-port':[16,10],'hk-selector':[16,8],
 'hk-wood-vents':[32,8],'hk-poly-vents':[32,8],
 'ak-selector':[16,8],'ak-cover-ribs':[24,8],
 'ak-receiver-stamp':[32,8],'ris-panel':[32,8],'pri-vents':[16,8],
 'poly-ribs':[32,10],'car-ribs':[24,10],
 'm5-panel':[32,8],'ras-panel':[32,8],
 'ar-mag-stamp20':[16,16],'ar-mag-stamp30':[16,24],
 'ar-poly-panel':[16,24],'ar-birdcage':[16,8],
 'rail-cover-stripes':[32,8],'ar-spr-ports':[16,8]
};
const shared=new Map<WeaponMark,THREE.MeshBasicMaterial>();
function materialFor(mark:WeaponMark):THREE.MeshBasicMaterial{
 const cached=shared.get(mark);if(cached)return cached;
 const [w,h]=dimensions[mark],data=new Uint8Array(w*h*4);
 const pixel=(x:number,y:number,light=false,strong=false)=>{
  if(x<0||y<0||x>=w||y>=h)return;
  const n=(y*w+x)*4;
  const rgb=mark==='ak-cover-ribs'?[41,48,39]:
   mark==='ar-port'?(light?[59,70,61]:strong?[15,22,19]:[31,39,33]):
   strong?[9,13,12]:light?[88,99,88]:[24,31,27];
  data[n]=rgb[0];data[n+1]=rgb[1];data[n+2]=rgb[2];
  data[n+3]=mark==='ak-cover-ribs'?214:strong?255:232;
 };
 if(mark==='hk-port'){
   for(let y=2;y<=7;y++)for(let x=2;x<=13;x++)pixel(x,y,false,y>2);
   for(let x=3;x<=12;x++)pixel(x,2,true);
  }else if(mark==='hk-selector'){
   for(let y=3;y<=5;y++)for(let x=2;x<=4;x++)pixel(x,y);
   for(let x=4;x<=13;x++)pixel(x,4);
  }else if(mark==='hk-wood-vents'||mark==='hk-poly-vents'){
   const starts=mark==='hk-wood-vents'?[3,9,15,21,27]:[5,12,19,26];
   for(const x of starts)
    for(let y=2;y<=5;y++)for(let dx=0;dx<2;dx++)pixel(x+dx,y,false,true);
  }else if(mark==='ar-port'){
  // Dark recessed upper, with only a muted narrow lip. No silver decal.
  for(let y=2;y<=9;y++)for(let x=2;x<=13;x++)pixel(x,y,false,y>3);
  for(let x=2;x<=13;x++)pixel(x,2,true);
 }else if(mark==='ak-port'){
  // Taller compact AK receiver opening, above (not behind) the magazine.
  for(let y=3;y<=9;y++)for(let x=3;x<=12;x++)pixel(x,y);
  for(let x=3;x<=12;x++)pixel(x,3,true);
 }else if(mark==='ak-selector'){
  // One dark lever with a subtle pivot, not a floating white square.
  for(let y=2;y<=4;y++)for(let x=2;x<=4;x++)pixel(x,y);
  for(let x=4;x<=14;x++)pixel(x,3+Math.floor((x-4)/6));
 }else if(mark==='ak-receiver-stamp'){
  // Two small low-contrast trunnion rivets and one stamped flat.
  // All three live BELOW the port and selector; no dotted receiver noise.
  for(const x of [3,27])
   for(let y=3;y<=4;y++)for(let dx=0;dx<2;dx++)
    pixel(x+dx,y);
  for(let x=12;x<=20;x++)pixel(x,5);
 }else if(mark==='ak-cover-ribs'){
  // Broad, spaced pressed cover grooves, never tiny scattered surface noise.
  for(const start of [3,10,17])
   for(let y=1;y<7;y++)for(let x=start;x<start+2;x++)
    pixel(x,y,false,true);
 }else if(mark==='poly-ribs'||mark==='car-ribs'){
  const ribX=mark==='poly-ribs'?[3,7,11,15,19,23,27]:
   [3,7,11,15,19];
  // Strong dark bands run the full visible height, and one continuous
  // long mold seam crosses the middle. These are not holes or rail covers.
  for(const x of ribX)
   for(let y=1;y<h-1;y++)pixel(x,y,false,true);
  // Deliberately NO bright horizontal seam: the physical polymer ribs carry
  // the identity without a fluorescent-looking middle stripe.
 }else if(mark==='ar-mag-stamp20'||mark==='ar-mag-stamp30'){
  // Exactly two substantial press lines. On the 30-rounder their x center
  // curves with the contour toward the lower/front edge.
  for(let y=2;y<h-2;y++){
   const drift=mark==='ar-mag-stamp30'?Math.floor((y-2)/8):0;
   for(const x of [3,10])for(let dx=0;dx<2;dx++)
    pixel(x+drift+dx,y,false,true);
  }
 }else if(mark==='ar-poly-panel'){
  // Thick four-sided patch, canted to track the magazine's bend.
  for(let y=3;y<h-3;y++){
   const shift=Math.floor((y-3)/9);
   for(const x of [3+shift,4+shift,12+shift,13+shift])
    pixel(x,y,false,true);
  }
  for(let x=3;x<14;x++)for(let dy=0;dy<2;dy++){
   pixel(x,3+dy,false,true);pixel(x,20-dy,false,true);
  }
 }else if(mark==='rail-cover-stripes'){
  for(const x of [4,9,14,19,24,29])
   for(let y=1;y<7;y++)for(let dx=0;dx<2;dx++)
    pixel(x+dx,y,false,true);
 }else if(mark==='ar-birdcage'){
  // Longitudinal side slots, visually parallel to the barrel axis.
  for(const y of [1,5])
   for(let dy=0;dy<2;dy++)for(let x=2;x<14;x++)
    pixel(x,y+dy,false,true);
 }else if(mark==='ar-spr-ports'){
  // Two simple broad SPR side ports rather than an A2-style birdcage.
  for(const x of [2,9])
   for(let dx=0;dx<4;dx++)for(let y=2;y<=5;y++)
    pixel(x+dx,y,false,true);
 }else if(mark==='pri-vents'){
  // Quiet discrete vent windows. No full-width illuminated Mk12 side seam.
  for(const x of [3,7,11])for(let y=2;y<=5;y++)
   for(let dx=0;dx<2;dx++)pixel(x+dx,y,false,true);
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

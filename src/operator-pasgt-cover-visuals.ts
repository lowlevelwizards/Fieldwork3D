/** PASGT P2 — restrained cover and field equipment.
 * Unchanged underlying authored PASGT shell. Only the exterior textile and
 * optional field dress are built here. No global normal maps or per-frame meshes.
 *
 * UV: four 64x64 print regions; walls use the existing continuous-perimeter
 * UV1 and the crown has planar UV1. Sewing is painted into the dedicated
 * fabric texture and never represented by dark double-shell geometry.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {headwearCuboidVolumes} from './operator-headwear-silhouettes.ts';
import {headwearCamoTexture} from './operator-headwear-materials.ts';
import {headwearCamoPlacement,type HeadwearCamoId} from './operator-headwear-camo.ts';
import {readPasgtDetails,type PasgtDetails} from './operator-pasgt-cover-policy.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

const part=(name:string,x:number,y:number,z:number,width:number,height:number,depth:number):
 HeadwearCuboid=>({name,x,y,z,width,height,depth});
const hidden=(parent:THREE.Group,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);return g;
};
const plain=(hex:number)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:.97,metalness:0,flatShading:true,
 vertexColors:false
});
const mesh=(g:THREE.Group,m:THREE.Material,parts:readonly HeadwearCuboid[],name:string)=>{
 const geometry=unionCuboids(parts,{faceTone:()=>1,
  faceRegion:(_p,axis,sign)=>axis===1&&sign===1?3:0});
 const object=new THREE.Mesh(geometry,m);
 object.name=name;object.castShadow=true;object.receiveShadow=false;
 g.add(object);
 return object;
};
const cache=new Map<string,THREE.DataTexture>();
const SOLID_COVER_RGB=[146,150,123] as const;
/** Every pixel in the printed textile is authored in SRGB. Crucially no
 * pseudo-AO vertex multiplier, no olive fabric tint under camouflage and
 * no duplicate shell textures. This corrects the previous darkened cover.
 */
export function pasgtCoverTexture(camo:HeadwearCamoId|undefined,
 identity:string,roll=0):THREE.DataTexture{
 const pos=camo?headwearCamoPlacement(identity,'pasgt-cover',camo,roll):null;
 const key=camo?
  [camo,pos!.offsetX,pos!.offsetY].join(':'):'solid-pasgt-cloth';
 const cached=cache.get(key);
 if(cached){cache.delete(key);cache.set(key,cached);return cached;}
 const bytes=camo?
  new Uint8Array(headwearCamoTexture('pasgt',camo,pos!).image.data as Uint8Array):
  new Uint8Array(128*128*4);
 if(!camo){
  for(let i=0;i<128*128;i++){
   const n=i*4;bytes[n]=SOLID_COVER_RGB[0];
   bytes[n+1]=SOLID_COVER_RGB[1];bytes[n+2]=SOLID_COVER_RGB[2];
   bytes[n+3]=255;
  }
 }
 // Important: UV1 already maps the complete circumference into wall region
 // 0: front U0-8, right U8-16, rear U16-24, left U24-32. This leaves
 // panel-join marks on the actual four physical sectors rather than at
 // arbitrary per-cuboid faces.
 const mark=(region:number,x:number,y:number,tone:number)=>{
  const x0=(region%2)*64+x,y0=Math.floor(region/2)*64+y;
  if(x<0||x>=64||y<0||y>=64)return;
  const idx=(y0*128+x0)*4;
  for(let c=0;c<3;c++)bytes[idx+c]=Math.round(bytes[idx+c]*tone);
 };
 // Continuous panel joins: just a single restrained line at each stitched
 // quarter of the wrapped crown skirt. Short pale stitches interrupt it.
 for(const x of [16,32,48])for(let y=33;y<=54;y++){
  mark(0,x,y,.85);
  if(y%5===0)mark(0,x+1,y,1.025);
 }
 // Top is UV1 region 3, planar projected across the protective crown.
 // An intentionally simple central crown seam and two short shoulder joins.
 for(let y=21;y<=43;y++){
  mark(3,32,y,.85);
  if(y%6===0)mark(3,33,y,1.04);
 }
 for(const x of [22,42])for(let y=24;y<=39;y++){
  mark(3,x,y,.93);
 }
 const t=new THREE.DataTexture(bytes,128,128,THREE.RGBAFormat,
  THREE.UnsignedByteType);
 t.channel=1;t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.generateMipmaps=true;
 t.name='PASGT stitched '+key;t.needsUpdate=true;
 cache.set(key,t);
 if(cache.size>96){
  const old=cache.keys().next().value;
  if(old!==undefined){const evict=cache.get(old);cache.delete(old);evict?.dispose();}
 }
 return t;
}
/** Keep the original shell exactly as authored. Each fabric volume ends
 * 0.24 unit ABOVE its own source bottom. The composite lip therefore
 * remains physically visible all around the PASGT's unequal brow/ear/nape.
 * There is only one fitted cover, never a second padded loose-cover mesh.
 */
export function pasgtCoverVolumes():readonly HeadwearCuboid[]{
 return headwearCuboidVolumes('pasgt').map(s=>{
  const bottom=s.y-s.height/2+.26;
  const top=s.y+s.height/2+.12;
  return {...s,name:'pasgt-textile-'+s.name,
   y:(bottom+top)/2,height:top-bottom,
   width:s.width+.20,depth:s.depth+.20};
 });
}
export function pasgtHemVolumes():readonly HeadwearCuboid[]{
 return [
  part('front-sewn-edge',0,4.37,-6.48,10.54,.21,.13),
  part('rear-sewn-edge',0,2.01,5.80,10.54,.21,.13),
  ...([-1,1] as const).map(sign=>part(
   sign<0?'left-sewn-ear-edge':'right-sewn-ear-edge',
   sign*5.31,2.02,1.55,.13,.21,6.08
  ))
 ];
}
export type PasgtCoverLayers={
 fabric:THREE.MeshStandardMaterial;
 cover:THREE.Group;hem:THREE.Group;
 slits:THREE.Group;loops:THREE.Group;
 standardBand:THREE.Group;crossedBand:THREE.Group;
 foliage:THREE.Group;scrim:THREE.Group;net:THREE.Group;
 activePrint:string;
};
export function createPasgtCoverLayers(parent:THREE.Group):PasgtCoverLayers{
 // The fabric map itself owns the complete coloration. This material does
 // not opt into baked AO or even receive shell shadows: earlier overlays
 // were multiplied by the dark olive base AND by baked-gear vertex tones.
 const fabric=plain(0xffffff);
 fabric.map=pasgtCoverTexture(undefined,'default');
 const seams=plain(0x68715b);
 const bandMaterial=plain(0x5c674f);
 const field=plain(0x5f7050);
 const dryField=plain(0x8b8061);
 const darkSlit=plain(0x414d3b);
 const cover=hidden(parent,'pasgt-cloth-cover');
 const hem=hidden(parent,'pasgt-sewn-lower-hem');
 const slits=hidden(parent,'pasgt-foliage-buttonholes');
 const loops=hidden(parent,'pasgt-sewn-foliage-loops');
 const standardBand=hidden(parent,'pasgt-horizontal-band');
 const crossedBand=hidden(parent,'pasgt-crossed-webbing');
 const foliage=hidden(parent,'pasgt-field-foliage');
 const scrim=hidden(parent,'pasgt-broad-fabric-scrim');
 const net=hidden(parent,'pasgt-coarse-overnet');
 mesh(cover,fabric,pasgtCoverVolumes(),'pasgt-single-fitted-fabric');
 mesh(hem,fabric,pasgtHemVolumes(),'pasgt-hem-with-exposed-shell-rim');
 // Six low-contrast buttonholes. Avoid floating rivets or dozens of slits.
 mesh(slits,darkSlit,[
  part('front-hole-left',-2.60,5.62,-6.49,1.30,.16,.12),
  part('front-hole-right',2.60,5.62,-6.49,1.30,.16,.12),
  ...([-1,1] as const).flatMap(sign=>[
   part('side-hole-forward',sign*5.34,5.50,-2.20,.12,.16,1.36),
   part('side-hole-rear',sign*5.34,5.02,1.04,.12,.16,1.36)
  ])
 ],'pasgt-sturdy-foliage-slits');
 // Alternate cover construction intentionally uses a few much bigger,
 // proper raised loops instead of reusing the same visual as the slits.
 mesh(loops,seams,[
  part('front-loop-left',-2.60,5.62,-6.52,1.55,.38,.23),
  part('front-loop-right',2.60,5.62,-6.52,1.55,.38,.23),
  ...([-1,1] as const).flatMap(sign=>[
   part('side-loop-forward',sign*5.39,5.50,-2.15,.24,.42,1.50),
   part('side-loop-rear',sign*5.39,5.02,1.05,.24,.42,1.50)
  ])
 ],'pasgt-broad-sewn-attachment-loops');
 const horizontal=[
  part('front-retaining-band',0,4.83,-6.57,10.65,.50,.22),
  part('rear-retaining-band',0,4.81,5.92,10.65,.50,.22),
  ...([-1,1] as const).map(sign=>
   part('side-retaining-band',sign*5.41,4.83,0,.23,.50,10.75))
 ];
 mesh(standardBand,bandMaterial,horizontal,'pasgt-single-field-band');
 mesh(crossedBand,bandMaterial,horizontal,'pasgt-crossed-baseline');
 // Two enormous, shallow straps crossing the crown as a clear option
 // distinct from the standard horizontal retaining band.
 const xBand=new THREE.BoxGeometry(12.4,.24,.72);
 for(const rotation of [-.70,.70]){
  const m=new THREE.Mesh(xBand,bandMaterial);
  m.position.set(0,8.89,0);m.rotation.y=rotation;
  m.castShadow=true;m.receiveShadow=false;crossedBand.add(m);
 }
 // Field garnish is purposely four big symbolic shapes, not a botany system.
 mesh(foliage,field,[
  part('left-foliage-mass',-5.65,6.15,-1.5,1.90,1.05,2.05),
  part('right-foliage-mass',5.65,6.25,1.1,1.95,1.00,1.95),
  part('rear-foliage-mass',1.6,7.65,5.54,2.1,.82,1.20)
 ],'pasgt-largest-leaf-masses');
 mesh(foliage,dryField,[
  part('small-leaf-tip',-5.84,6.75,-1.1,1.22,.73,.90),
  part('side-leaf-tip',5.86,6.79,1.2,1.24,.74,1.14)
 ],'pasgt-leaf-contrast');
 mesh(scrim,dryField,[
  part('front-scrim',-2.75,6.05,-6.64,.92,1.77,.72),
  part('left-scrim',-5.63,5.52,1.84,.80,2.01,1.22),
  part('rear-scrim',2.40,5.23,5.94,.97,2.15,.75),
  part('right-scrim',5.68,6.05,-2.20,.89,1.50,1.15)
 ],'pasgt-few-broad-scrim-strips');
 mesh(net,bandMaterial,[
  ...[-2.3,0,2.3].map(x=>part('roof-lengthwise',x,8.89,0,.28,.19,10.7)),
  ...[-2.6,0,2.6].map(z=>part('roof-crosswise',0,8.93,z,10.55,.19,.28)),
  ...([-1,1] as const).map(sign=>
   part('net-drop-side',sign*5.38,5.72,.8,.27,2.9,.31))
 ],'pasgt-large-grid-net');
 for(const g of [slits,loops,standardBand,foliage,scrim,net])
  consolidateVisualGroup(g);
 return {fabric,cover,hem,slits,loops,standardBand,crossedBand,
  foliage,scrim,net,activePrint:''};
}
export function updatePasgtCoverLayers(v:PasgtCoverLayers,covered:boolean,
 details:PasgtDetails,camo:HeadwearCamoId|undefined,
 identity:string,roll=0):void{
 const chosen=readPasgtDetails(details);
 v.cover.visible=covered;
 v.hem.visible=covered;
 v.slits.visible=covered&&chosen.construction==='slits';
 v.loops.visible=covered&&chosen.construction==='loops';
 v.standardBand.visible=chosen.band==='standard';
 v.crossedBand.visible=chosen.band==='crossed';
 v.foliage.visible=chosen.concealment==='foliage';
 v.scrim.visible=chosen.concealment==='scrim';
 v.net.visible=chosen.concealment==='net';
 const map=pasgtCoverTexture(covered?camo:undefined,identity,roll);
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.activePrint=covered?(camo??'solid'):'';
}

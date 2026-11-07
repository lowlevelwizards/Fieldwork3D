/** PASGT P4-C field dress: every card and drape is attached to a real
 * foliage slit anchor. Stable authored orientations; no per-frame RNG.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {
 PASGT_SLIT_ANCHORS,createPasgtBandGeometry
} from './operator-pasgt-drape-geometry.ts';
import {resolvePasgtDetails,type PasgtDetails} from './operator-pasgt-cover-policy.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';

export type PasgtPalette='woodland'|'desert'|'urban';
export function pasgtConcealmentPalette(camo:HeadwearCamoId|undefined):PasgtPalette{
 const c=camo??'';
 if(/desert|arid|tropentarn|badlands|six-color|aor1|dpdu|highlander|tan/.test(c))
  return 'desert';
 if(/urban|ucp|gray|typhon|metropolis|black|abu/.test(c))
  return 'urban';
 return 'woodland';
}
const PALETTES:Record<PasgtPalette,readonly [number,number,number]>={
 woodland:[0x536341,0x778054,0x98906b],
 desert:[0x8a7752,0xb09c70,0x948a6d],
 urban:[0x62675b,0x838379,0x9c9683]
};
const material=(hex:number,side:THREE.Side=THREE.FrontSide)=>
 new THREE.MeshStandardMaterial({color:hex,roughness:1,flatShading:true,side});
const hidden=(parent:THREE.Group,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);return g;
};
const part=(name:string,x:number,y:number,z:number,width:number,height:number,depth:number):
 HeadwearCuboid=>({name,x,y,z,width,height,depth});
const unite=(parent:THREE.Group,parts:readonly HeadwearCuboid[],
 mat:THREE.Material,name:string)=>{
 const geo=unionCuboids(parts);
 const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.castShadow=true;
 mesh.receiveShadow=false;parent.add(mesh);
 return mesh;
};
function shapeGeometry(points:readonly (readonly [number,number])[]):THREE.ShapeGeometry{
 const shape=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();return new THREE.ShapeGeometry(shape);
}
const LEAF_SHAPE=shapeGeometry([
 [-.12,0],[.12,.12],[.13,.41],[.55,.65],[.33,.79],
 [.53,1.10],[.08,1.58],[-.35,1.18],[-.22,.93],[-.51,.62],
 [-.19,.40]
]);
const SCRIM_SHAPE=shapeGeometry([
 [-.24,.12],[.24,.12],[.23,-.54],[.42,-1.31],[.35,-1.80],
 [.09,-2.30],[-.29,-2.13],[-.18,-1.30],[-.33,-.75]
]);
const CARD_ANCHORS=['front-left','right-forward','right-aft',
 'rear-right','left-aft','left-forward'] as const;
const TILTS=[-.21,.17,-.10,.24,-.18,.13] as const;
function placedCard(parent:THREE.Group,index:number,mat:THREE.Material,
 geometry:THREE.BufferGeometry,name:string,offsetY=0):void{
 const anchor=PASGT_SLIT_ANCHORS.find(s=>s.id===CARD_ANCHORS[index]);
 if(!anchor)throw Error('unknown PASGT slit '+CARD_ANCHORS[index]);
 const mount=new THREE.Group();
 mount.name=name+'-mount';
 mount.position.set(anchor.position[0],anchor.position[1]+offsetY,anchor.position[2]);
 mount.rotation.y=anchor.yaw;
 // Small, fixed deliberate tilts rather than uncontrolled noise.
 mount.rotation.z=TILTS[index];
 mount.rotation.x=anchor.pitch;
 const card=new THREE.Mesh(geometry,mat);
 card.name=name;card.castShadow=true;card.receiveShadow=false;
 mount.add(card);parent.add(mount);
}
const pathRibbon=(polyline:readonly (readonly [number,number,number])[],
 width:number,axis:'x'|'z'):THREE.BufferGeometry=>{
 const positions:number[]=[];
 const push=(p:readonly number[])=>positions.push(p[0],p[1],p[2]);
 for(let i=0;i<polyline.length-1;i++){
  const a=polyline[i],b=polyline[i+1];
  const coord=axis==='x'?0:2;
  const leftA=[...a],rightA=[...a],leftB=[...b],rightB=[...b];
  leftA[coord]-=width/2;rightA[coord]+=width/2;
  leftB[coord]-=width/2;rightB[coord]+=width/2;
  push(leftA);push(rightA);push(rightB);
  push(leftA);push(rightB);push(leftB);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.computeVertexNormals();g.computeBoundingBox();
 return g;
};
export function createPasgtNetGeometry():THREE.BufferGeometry{
 const combined:number[]=[];
 const append=(polyline:readonly (readonly [number,number,number])[],
  axis:'x'|'z')=>{
  const g=pathRibbon(polyline,.28,axis),a=g.getAttribute('position');
  for(let i=0;i<a.count;i++)combined.push(a.getX(i),a.getY(i),a.getZ(i));
  g.dispose();
 };
 // Three lengthwise cords wrap down over front brow and rear skirt.
 for(const x of [-3.4,0,3.4])append([
  [x,4.63,-6.57],[x,6.24,-6.58],[x,9.01,-5.16],
  [x,9.01,0],[x,9.01,5.18],[x,6.30,5.95],
  [x,2.91,5.96]
 ],'x');
 // Cross-cords continue down both side walls, stopping above the actual
 // temple/ear hem (front side has a higher bottom edge).
 for(const z of [-3.30,0,3.30]){
  const bottom=z< -1.5?4.53:2.48;
  append([
   [-5.55,bottom,z],[-5.55,6.22,z],[-5.32,9.06,z],
   [0,9.06,z],[5.32,9.06,z],[5.55,6.22,z],[5.55,bottom,z]
  ],'z');
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(combined,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtNetFullDrape=true;
 g.userData.pasgtNetCordCount=6;
 return g;
}
export type PasgtFieldDressLayers={
 slits:THREE.Group;band:THREE.Group;
 foliage:THREE.Group;scrim:THREE.Group;net:THREE.Group;
 leafMaterials:readonly THREE.MeshStandardMaterial[];
 scrimMaterials:readonly THREE.MeshStandardMaterial[];
 palette:PasgtPalette|null;
};
export function createPasgtFieldDress(parent:THREE.Group):PasgtFieldDressLayers{
 const slits=hidden(parent,'pasgt-eight-buttonholes');
 const band=hidden(parent,'pasgt-one-chunky-elastic');
 const foliage=hidden(parent,'pasgt-leaves-from-buttonholes');
 const scrim=hidden(parent,'pasgt-fabric-strips-from-buttonholes');
 const net=hidden(parent,'pasgt-full-shell-overnet');
 const slitMat=material(0x404b3b),bandMat=material(0x5a6650);
 const leafMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 const scrimMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 // Eight holes arranged to look believable even with nothing in them.
 const holes=PASGT_SLIT_ANCHORS.map(a=>{
  const isSide=a.id.startsWith('right')||a.id.startsWith('left');
  return part(a.id+'-cut',a.position[0],a.position[1],a.position[2],
   isSide?.13:1.13,.15,isSide?1.13:.13);
 });
 unite(slits,holes,slitMat,'pasgt-simple-eight-foliage-cuts');
 const bandMesh=new THREE.Mesh(createPasgtBandGeometry(),bandMat);
 bandMesh.name='pasgt-upper-brow-band';bandMesh.castShadow=true;
 bandMesh.receiveShadow=false;band.add(bandMesh);
 for(let i=0;i<CARD_ANCHORS.length;i++){
  placedCard(foliage,i,leafMaterials[i%3],LEAF_SHAPE,
   'pasgt-simple-pixel-leaf',.05);
  placedCard(scrim,i,scrimMaterials[i%3],SCRIM_SHAPE,
   'pasgt-long-drooping-scrim',-.05);
 }
 const netMat=material(0x636e53,THREE.DoubleSide);
 const netMesh=new THREE.Mesh(createPasgtNetGeometry(),netMat);
 netMesh.name='pasgt-front-crown-side-rear-net';netMesh.castShadow=true;
 netMesh.receiveShadow=false;net.add(netMesh);
 consolidateVisualGroup(slits);
 return {slits,band,foliage,scrim,net,
  leafMaterials,scrimMaterials,palette:null};
}
export function updatePasgtFieldDress(v:PasgtFieldDressLayers,
 covered:boolean,details:PasgtDetails,camo:HeadwearCamoId|undefined):void{
 const effective=resolvePasgtDetails(details);
 v.slits.visible=covered&&effective.slits;
 v.band.visible=effective.band==='elastic'; // can be worn over the bare shell
 v.foliage.visible=covered&&effective.concealment==='foliage';
 v.scrim.visible=covered&&effective.concealment==='scrim';
 v.net.visible=covered&&effective.concealment==='net';
 const palette=pasgtConcealmentPalette(camo);
 if(v.palette!==palette){
  const colors=PALETTES[palette];
  for(let i=0;i<3;i++){
   v.leafMaterials[i].color.setHex(colors[i]);
   v.scrimMaterials[i].color.setHex(colors[(i+1)%3]);
  }
  v.palette=palette;
 }
}

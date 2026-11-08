/** Isometric foliage made of alpha-tested, pixel-scale *2D cards*.
 *
 * A small shared set of CPU-generated RGBA textures keeps foliage crisp,
 * stylized, and stable from orthographic to director views. Fixed crossed
 * cards never billboard/swing with the camera (or change tactical FOV).
 * The real worldgen Obstacle remains the only collider/cover authority.
 */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import type {FixtureVisualContext} from './fixture-visuals.ts';
import {propDefinition} from './asset-catalog.ts';
import {foliageCanopyFootprint} from './landscape-footprint.ts';

export type FoliageFamily='broadleaf'|'conifer'|'scrub'|'shrub'|'hedge';
const foliage:Readonly<Record<string,FoliageFamily>>={
 'tree':'broadleaf','tree-broadleaf':'broadleaf',
 'tree-conifer':'conifer','tree-scrub':'scrub',
 'shrub-round':'shrub','shrub-tall':'scrub',
 'hedge':'hedge','bush':'shrub','plant':'shrub'
};
export const FOLIAGE_CARD_FIXTURES=new Set(Object.keys(foliage));
export const FOLIAGE_TEXTURE_SIZE=64;
const colors:Readonly<Record<FoliageFamily,readonly number[]>>={
 broadleaf:[0x354e38,0x45633e,0x557347,0x6a8151,0x788258],
 conifer:[0x283f3b,0x345247,0x426354,0x567260,0x607566],
 scrub:[0x424f37,0x526543,0x657750,0x777c50,0x866f49],
 shrub:[0x385239,0x4b6541,0x5b7448,0x718057,0x7e8858],
 hedge:[0x334b38,0x425a3e,0x506745,0x60744c,0x788052]
};
function hash(x:number,y:number,seed:number):number{
 let h=Math.imul((x+17)^Math.imul(y+7,0x45d9f3b),0x27d4eb2d)^seed;
 h=Math.imul(h^(h>>>15),0x85ebca6b);
 return (h^(h>>>13))>>>0;
}
/** Art is deliberately chunky: every 4x4 texel leaf patch owns one color.
 * Jagged alpha outside the silhouette creates clear individual sprigs rather
 * than soft blended transparency, aliased circles or spheres.
 */
export function foliageCardPixels(kind:FoliageFamily):Uint8Array{
 const n=FOLIAGE_TEXTURE_SIZE,pixels=new Uint8Array(n*n*4);
 const palette=colors[kind],seed=palette[0];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const cx=Math.floor(x/4),cy=Math.floor(y/4),rand=hash(cx,cy,seed);
   const nx=(x+.5)/n*2-1,ny=(y+.5)/n*2-1;
   const noise=((rand&255)/255-.5)*.17;
   let inside=false;
   if(kind==='conifer'){
     const h=(ny+1)/2; // 0 bottom, 1 top
     const width=(.83*(1-h)+.045)*(1+noise);
     inside=h>.045&&h<.985&&Math.abs(nx)<width;
   }else if(kind==='hedge'){
     const upper=.72+noise,lower=-.74+noise*.5;
     inside=Math.abs(nx)<.93+noise*.3&&ny>lower&&ny<upper;
   }else{
     const sy=kind==='scrub'?.76:kind==='shrub'?.72:.92;
     const center=kind==='scrub'?-.10:kind==='shrub'?-.16:0;
     const jagged=1+noise;
     inside=(nx*nx)/(.91*.91)+(ny-center)*(ny-center)/(sy*sy)<
       jagged*jagged;
   }
   // Small gaps break up leafy interiors without making floating confetti.
   const radius=nx*nx+ny*ny;
   if(!inside||((rand>>>8)%29===0&&radius>.35))continue;
   const lightIndex=Math.min(palette.length-1,(rand>>>12)%palette.length);
   const rgb=palette[lightIndex],at=(y*n+x)*4;
   pixels[at]=(rgb>>>16)&255;
   pixels[at+1]=(rgb>>>8)&255;
   pixels[at+2]=rgb&255;
   pixels[at+3]=255;
 }
 return pixels;
}
const sharedMaterials=new Map<FoliageFamily,THREE.MeshStandardMaterial>();
function material(kind:FoliageFamily):THREE.MeshStandardMaterial{
 const cached=sharedMaterials.get(kind);if(cached)return cached;
 const texture=new THREE.DataTexture(foliageCardPixels(kind),
   FOLIAGE_TEXTURE_SIZE,FOLIAGE_TEXTURE_SIZE,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestFilter;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.generateMipmaps=false;texture.needsUpdate=true;
 const mat=new THREE.MeshStandardMaterial({
   map:texture,side:THREE.DoubleSide,alphaTest:.5,
   transparent:false,depthWrite:true,
   roughness:1,metalness:0,flatShading:true
 });
 sharedMaterials.set(kind,mat);
 return mat;
}
/** Each card owns a small planar geometry; scene teardown disposes it.
 * Shared textures/materials are process-lifetime, not copied per shrub.
 */
function card(parent:THREE.Group,kind:FoliageFamily,
 x:number,y:number,z:number,w:number,h:number,yaw:number,top=false){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material(kind));
 mesh.position.set(x,y,z);
 mesh.rotation.set(top?-Math.PI/2:0,yaw,0);
 mesh.castShadow=false;mesh.receiveShadow=true;
 mesh.userData.fieldworkFoliageCard=kind;
 parent.add(mesh);
}
/** Crossed vertical faces + a horizontal crown face retain volume from high
 * iso and lower director shots without polygonal balls. No animated sway.
 */
function crown(group:THREE.Group,kind:FoliageFamily,
 x:number,y:number,z:number,w:number,h:number,seed:number){
 const yaw=(seed%5)*Math.PI/15;
 card(group,kind,x,y,z,w,h,yaw);
 card(group,kind,x,y,z,w*.9,h*.98,yaw+Math.PI/2);
 card(group,kind,x,y+h*.23,z,w*.83,w*.72,0,true);
}
export function renderFoliageCardFixture(group:THREE.Group,c:Obstacle,
 i:number,ctx:FixtureVisualContext):boolean{
 const id=c.fixture??'',kind=foliage[id];
 if(!kind)return false;
 const art=propDefinition(id);
 const canopy=foliageCanopyFootprint(id,c.w,c.h,
   art?.width??c.w,art?.depth??c.h);
 const w=canopy.w,d=canopy.h;
 const tall=id==='plant'?27:id==='hedge'?30:
  id==='shrub-round'?23:id==='shrub-tall'?37:
  id==='bush'?25:id==='tree-scrub'?67:
  id==='tree-conifer'?116:105;
 const tree=id==='tree'||id.startsWith('tree-');
 const bark=ctx.solid(id==='tree-scrub'?0x716451:0x625442,.95,'wood');
 const variation=(i%7-3)/20;
 if(tree){
   const trunkHeight=tall*(kind==='conifer'?.60:kind==='scrub'?.49:.60);
   const thickness=Math.min(7.2,Math.min(c.w,c.h)*.43);
   ctx.box(group,c.x,trunkHeight*.5,c.y,thickness,trunkHeight,
      thickness,bark);
   ctx.box(group,c.x,3,c.y,thickness*1.5,6,thickness*1.5,bark,false);
   if(kind!=='conifer'){
     for(const sign of [-1,1]){
       const branch=ctx.box(group,c.x+sign*w*.13,trunkHeight*.89,
         c.y+sign*d*.025,thickness*.65,thickness*.65,w*.31,bark);
       branch.rotation.y=(sign>0?1:-1)*.35;
     }
   }
   if(kind==='conifer'){
     // The one broad taper is legible from every camera angle; no cone stack.
     crown(group,kind,c.x,tall*.65,c.y,w*.96,tall*.73,i);
   }else{
     crown(group,kind,c.x-w*.08,tall*.75,c.y+d*.04,
       w*(kind==='scrub'?.82:.89),tall*.47,i);
     crown(group,kind,c.x+w*.20,tall*(kind==='scrub'?.65:.82),
       c.y-d*.11,w*.60,tall*.32,i+2);
   }
 }else if(id==='hedge'){
   ctx.box(group,c.x,3.5,c.y,w*.87,7,d*.34,bark,false);
   crown(group,'hedge',c.x,tall*.59,c.y,w*.97,tall*.82,i);
 }else if(id==='plant'){
   const pot=ctx.solid(0x846c5a,.94,'concrete');
   ctx.box(group,c.x,5,c.y,w*.52,10,d*.55,pot);
   crown(group,'shrub',c.x,18,c.y,w*.72,22,i);
 }else{
   const shrubH=tall*(id==='shrub-tall'?.86:.95);
   crown(group,kind,c.x,tall*.52,c.y,w*.95,shrubH,i);
   // Uneven secondary sprig breaks the rectangular cross silhouette.
   card(group,kind,c.x+w*(variation+.17),tall*.53,
      c.y-d*.14,w*.55,shrubH*.70,Math.PI*.21);
 }
 return true;
}

/** Exterior planter greenery uses the same pixel cards as garden shrubs.
 * Unlike the former three solid icosahedron balls, these sprigs share the
 * existing five pooled foliage materials and never cast shadow-map quads.
 * The physical planter's obstacle is unchanged.
 */
export function renderPlanterFoliageCards(group:THREE.Group,c:Obstacle,
 seed:number):void{
 const H=propDefinition('planter')?.height??30;
 const w=c.w,d=c.h;
 // Slightly offset crowns avoid a symmetric green sphere silhouette.
 crown(group,'shrub',c.x-w*.12,H*.76,c.y+d*.08,
   w*.59,H*.47,seed);
 crown(group,'scrub',c.x+w*.18,H*.72,c.y-d*.12,
   w*.49,H*.40,seed+3);
}

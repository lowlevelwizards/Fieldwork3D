/** VEH 1–4: one opaque vertex-coloured mesh per static vehicle.
 * X is length (front +X), Y up, Z width. Caller owns returned geometry.
 * No global cache, scene state, separate wheel meshes or material mutations.
 */
import * as THREE from 'three';
import {VEHICLE_DIMENSIONS,type VehicleRecipe} from './vehicle-catalog.ts';
import {vehicleShape,type VehicleSideProfile} from './vehicle-shape.ts';
type P=[number,number,number];
type Profile=VehicleSideProfile;
const glass=0x35434b,rubber=0x242a2b,hub=0x858c88,trim=0x434947,head=0xe0d9b8,tail=0xa45146;
export function buildVehicleGeometry(recipe:VehicleRecipe,dimensions=VEHICLE_DIMENSIONS[recipe.family]):THREE.BufferGeometry{
 const [w,d,h]=dimensions;
 if(![w,d,h].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid vehicle dimensions');
 const pos:number[]=[],colors:number[]=[];
 const paint=new THREE.Color(recipe.paint);
 if(recipe.condition!=='clean')paint.lerp(new THREE.Color(0x8c8877),recipe.condition==='used'?.08:.22);
 if(recipe.configuration==='military')paint.lerp(new THREE.Color(0x747653),.7);
 if(recipe.configuration==='unmarked')paint.lerp(new THREE.Color(0x343c40),.7);
 if(recipe.configuration==='taxi')paint.lerp(new THREE.Color(0xbba055),.65);
 if(recipe.configuration==='economy')paint.lerp(new THREE.Color(0xaba69a),.24);
 const body=paint.getHex();
 function tri(a:P,b:P,c:P,hex:number,inside:P){
  const u=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const v=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
  const outward=new THREE.Vector3((a[0]+b[0]+c[0])/3-inside[0],(a[1]+b[1]+c[1])/3-inside[1],(a[2]+b[2]+c[2])/3-inside[2]);
  if(u.cross(v).dot(outward)<0)[b,c]=[c,b];
  const color=new THREE.Color(hex);
  for(const p of [a,b,c]){pos.push(...p);colors.push(color.r,color.g,color.b);}
 }
 function quad(a:P,b:P,c:P,e:P,hex:number,inside:P){tri(a,b,c,hex,inside);tri(a,c,e,hex,inside);}
 // Convex side profile extruded across the width; normalized world proportions.
 function prism(profile:Profile,halfWidth:number,hex:number){
  const a:P[]=profile.map(([x,y])=>[x*w,y*h,-halfWidth*d]);
  const b:P[]=profile.map(([x,y])=>[x*w,y*h,halfWidth*d]);
  const inside:P=[profile.reduce((s,p)=>s+p[0],0)/profile.length*w,profile.reduce((s,p)=>s+p[1],0)/profile.length*h,0];
  for(let i=1;i<a.length-1;i++){tri(a[0],a[i],a[i+1],hex,inside);tri(b[0],b[i],b[i+1],hex,inside);}
  for(let i=0;i<a.length;i++){const j=(i+1)%a.length;quad(a[i],a[j],b[j],b[i],hex,inside);}
 }
 function box(x0:number,x1:number,y0:number,y1:number,z:number,hex:number){
  prism([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],z,hex);
 }
 function side(x0:number,x1:number,y0:number,y1:number,z:number,hex:number){
  for(const s of [-1,1])quad([x0*w,y0*h,s*z*d],[x1*w,y0*h,s*z*d],[x1*w,y1*h,s*z*d],[x0*w,y1*h,s*z*d],hex,[0,0,0]);
 }
 function end(x:number,y0:number,y1:number,z0:number,z1:number,hex:number){
  quad([x*w,y0*h,z0*d],[x*w,y1*h,z0*d],[x*w,y1*h,z1*d],[x*w,y0*h,z1*d],hex,[0,0,0]);
 }
 const f=recipe.family,config=recipe.configuration;
 const truck=f==='light-truck',pickup=f==='pickup',van=f==='van',suv=f==='suv';
 const {belt,lower,body:bodyProfile,cabin,cw}=vehicleShape(f);
 prism(bodyProfile,.43,body);
 box(-.495,.495,lower-.045,lower+.045,.455,trim);
 prism(cabin,cw,body);
 const [rear,front,frontTop,rearTop]=cabin;
 const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
 const bottom=.12,top=.87;
 const windowY0=lerp(belt,frontTop[1],bottom),windowY1=lerp(belt,frontTop[1],top);
 // Side glass follows cabin roof rake. Solid van cargo sides remain painted.
 for(const s of [-1,1]){
  const z=s*(cw*d+.06);
  const x0=lerp(rear[0],rearTop[0],bottom)+.025,x1=lerp(front[0],frontTop[0],bottom)-.025;
  const x2=lerp(front[0],frontTop[0],top)-.018,x3=lerp(rear[0],rearTop[0],top)+.025;
  const cargo=van&&!['passenger','police'].includes(config);
  const leftBottom=cargo?Math.max(x0,x1-.18):x0;
  const leftTop=cargo?Math.max(x3,x2-.18):x3;
  quad([leftBottom*w,windowY0*h,z],[x1*w,windowY0*h,z],[x2*w,windowY1*h,z],[leftTop*w,windowY1*h,z],glass,[0,0,0]);
  if(!cargo&&!pickup&&!truck){
   const mid=(x1+x0)*.5,midTop=(x2+x3)*.5;
   quad([(mid-.012)*w,windowY0*h,z+s*.04],[(mid+.012)*w,windowY0*h,z+s*.04],[(midTop+.012)*w,windowY1*h,z+s*.04],[(midTop-.012)*w,windowY1*h,z+s*.04],body,[0,0,0]);
  }
 }
 function slopedWindow(a:readonly [number,number],b:readonly [number,number],sign:number){
  const x0=lerp(a[0],b[0],bottom)*w+sign*.08,x1=lerp(a[0],b[0],top)*w+sign*.08;
  const y0=lerp(a[1],b[1],bottom)*h,y1=lerp(a[1],b[1],top)*h,z=cw*d*.86;
  quad([x0,y0,-z],[x0,y0,z],[x1,y1,z],[x1,y1,-z],glass,[0,0,0]);
 }
 slopedWindow(front,frontTop,1);
 if(!van||config==='passenger')slopedWindow(rear,rearTop,-1);
 if(pickup){
  box(-.45,-.12,belt+.005,belt+.025,.32,trim);
  box(-.47,-.435,belt-.02,belt+.13,.43,body);
  // Bed sides are two thin longitudinal strips; open bed stays open.
  for(const s of [-1,1]){
   const z0=s*.32*d,z1=s*.43*d;
   const x0=-.47*w,x1=-.11*w,y0=(belt-.04)*h,y1=(belt+.13)*h;
   const p:P[]=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
   const center:P=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2];
   for(const [a,b,c,e] of [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[3,2,6,7],[0,1,5,4]])quad(p[a],p[b],p[c],p[e],body,center);
  }
  if(config==='covered'||config==='cargo')box(-.43,-.12,belt+.025,config==='covered'?.89:.73,.32,config==='covered'?body:0x85816c);
  if(config==='contractor')box(-.25,-.12,belt+.025,belt+.16,.31,trim);
 }
 if(truck){
  box(-.47,.08,belt-.03,belt+.03,.44,trim);
  if(config==='canvas'||config==='military')prism([[-.47,belt+.03],[.075,belt+.03],[.075,.91],[.045,.98],[-.44,.98],[-.47,.91]],.46,0x777b5b);
  else if(config!=='flatbed')box(-.47,.075,belt+.03,.98,.46,body);
 }
 // Eight-sided wheels: one cylinder surface and coloured outside cap,
 // no second hub cylinder. All four are baked into the final mesh.
 const r=Math.min(d*.19,h*.235),thickness=d*.13;
 for(const x of [-w*.32,w*.32])for(const s of [-1,1]){
  const outer=s*d*.497,inner=outer-s*thickness;
  const center:P=[x,r,(outer+inner)/2];
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
   const point=(angle:number,z:number,rad=r):P=>[x+Math.cos(angle)*rad,r+Math.sin(angle)*rad,z];
   quad(point(a,inner),point(b,inner),point(b,outer),point(a,outer),rubber,center);
   tri([x,r,inner],point(a,inner),point(b,inner),rubber,center);
   const aa=point(a,outer,r*.46),bb=point(b,outer,r*.46);
   quad(point(a,outer),point(b,outer),bb,aa,rubber,center);
   tri([x,r,outer],aa,bb,hub,center);
  }
 }
 for(const s of [-1,1]){
  const z0=s*.22,z1=s*.40;
  end(.491,belt-.15,belt-.095,z0,z1,head);
  end(-.491,belt-.13,belt-.065,z0,z1,tail);
 }
 end(.492,belt-.24,belt-.16,-.18,.18,trim);
 end(-.492,belt-.21,belt-.15,-.10,.10,hub);
 if(recipe.condition!=='clean')side(-.40,.36,lower+.06,lower+.115,.431,paint.clone().lerp(new THREE.Color(0x77715f),recipe.condition==='used'?.13:.35).getHex());
 const stripe=config==='police'?0x39556e:config==='medical'?0xa6564a:config==='delivery'?0x648577:config==='municipal'?0xb19a55:config==='contractor'?0x696e5a:config==='fleet'?0x778585:config==='taxi'?0x544e3c:config==='aid'?0x4f7d83:undefined;
 if(stripe!==undefined)side(-.37,.34,belt-.14,belt-.07,.431,stripe);
 // Large, integrated identity blocks remain legible from the iso camera.
 // They are vertex-coloured faces in the single mesh, not decals/objects.
 if(van&&['delivery','medical','contractor'].includes(config)){
  side(-.36,-.05,belt+.08,.79,.431,config==='medical'?0xd6d5c8:config==='delivery'?0x648577:0x696e5a);
  if(config==='medical'){
   side(-.24,-.17,belt+.13,.75,.432,0x466d79);
   side(-.30,-.11,belt+.20,belt+.28,.433,0x466d79);
  }
 }
 if(truck&&config==='municipal')side(-.42,.025,.63,.71,.461,0xb19a55);
 if(suv&&(config==='military'||config==='aid')){
  box(-.32,.04,.96,.985,.31,trim);
 }
 if(config==='police'||config==='medical'||config==='taxi'){
  const roof=frontTop[1];
  box(.0,.13,roof,Math.min(1,roof+.04),.20,config==='taxi'?0xb7a05f:config==='medical'?0xa6564a:0x567c9e);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

/** VEH11 coachwork: one opaque vertex-coloured mesh, real wheel openings,
 * tapered cabins and family-specific fascia. X front, Y up, Z width. */
import * as THREE from 'three';
import {VEHICLE_DIMENSIONS,type VehicleRecipe} from './vehicle-catalog.ts';
import {vehicleShape,type VehicleSideProfile} from './vehicle-shape.ts';
type P=[number,number,number];
type Profile=VehicleSideProfile;
const glass=0x35434b,rubber=0x242a2b,hub=0x8b918b,trim=0x434947,head=0xe0d9b8,tail=0xa45146;
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
 const body=paint.getHex(),seam=paint.clone().lerp(new THREE.Color(0x242a2b),.35).getHex();
 const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
 function tri(a:P,b:P,c:P,hex:number,inside:P){
  const u=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const v=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);
  const outward=new THREE.Vector3((a[0]+b[0]+c[0])/3-inside[0],(a[1]+b[1]+c[1])/3-inside[1],(a[2]+b[2]+c[2])/3-inside[2]);
  if(u.cross(v).dot(outward)<0)[b,c]=[c,b];
  const color=new THREE.Color(hex);
  for(const p of [a,b,c]){pos.push(...p);colors.push(color.r,color.g,color.b);}
 }
 function quad(a:P,b:P,c:P,e:P,hex:number,inside:P){tri(a,b,c,hex,inside);tri(a,c,e,hex,inside);}
 // Concave side faces are triangulated once at template build, not per frame.
 // Each perimeter strip has its own inward reference, including wheel wells.
 function prism(profile:Profile,width:number,hex:number,roofWidth=width){
  const minY=Math.min(...profile.map(p=>p[1])),maxY=Math.max(...profile.map(p=>p[1]));
  const half=(y:number)=>lerp(width,roofWidth,(y-minY)/(maxY-minY||1));
  const a:P[]=profile.map(([x,y])=>[x*w,y*h,-half(y)*d]);
  const b:P[]=profile.map(([x,y])=>[x*w,y*h,half(y)*d]);
  const faces=THREE.ShapeUtils.triangulateShape(profile.map(([x,y])=>new THREE.Vector2(x,y)),[]);
  for(const [i,j,k] of faces){tri(a[i],a[j],a[k],hex,[a[i][0],a[i][1],0]);tri(b[i],b[j],b[k],hex,[b[i][0],b[i][1],0]);}
  for(let i=0;i<a.length;i++){
   const j=(i+1)%a.length,dx=a[j][0]-a[i][0],dy=a[j][1]-a[i][1];
   const inside:P=[(a[i][0]+a[j][0])/2-dy*.01,(a[i][1]+a[j][1])/2+dx*.01,0];
   quad(a[i],a[j],b[j],b[i],hex,inside);
  }
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
 const truck=f==='light-truck',pickup=f==='pickup',van=f==='van',suv=f==='suv',compact=f==='hatchback';
 const {belt,lower,body:bodyProfile,cabin,cw,roofWidth,wheels,tire,glassBottom:bottom,glassTop:top}=vehicleShape(f);
 const r=d*tire,archR=r+Math.min(1.1,d*.028),rX=archR/w,ground=lower*h;
 // Actual cutouts: follow a coarse octagonal arch from the sill up and
 // over the tire. Tire sidewall stays just outside the body, not stuck on it.
 const contour:[number,number][]=[[-.49,lower]];
 for(const axle of wheels){
  const rise=Math.max(0,ground-r),edge=Math.sqrt(Math.max(0,archR*archR-rise*rise))/w;
  const shoulder=Math.min(edge*.86,rX*.707);
  contour.push([axle-edge,lower],[axle-shoulder,(r+Math.sqrt(archR*archR-(shoulder*w)**2))/h],
    [axle,(r+archR)/h],[axle+shoulder,(r+Math.sqrt(archR*archR-(shoulder*w)**2))/h],[axle+edge,lower]);
 }
 contour.push(...bodyProfile.slice(1).map(([x,y])=>[x,y] as [number,number]));
 prism(contour,.43,body);
 // Short substantial end bumpers; the recessed chassis and axles
 // physically connect the wheels without filling the visible arch openings.
 box(-.498,-.473,lower-.025,lower+.045,.455,trim);
 box(.473,.498,lower-.025,lower+.045,.455,trim);
 box(-.37,.37,lower-.075,lower+.015,.28,trim);
 for(const axle of wheels)box(axle-.014,axle+.014,r/h-.022,r/h+.022,.36,trim);
 prism(cabin,cw,body,roofWidth);
 const [rear,front,frontTop,rearTop]=cabin;
 const roof=frontTop[1];
 const widthAt=(t:number)=>lerp(cw,roofWidth,t);
 function pane(a:number,b:number,c:number,e:number,t0:number,t1:number,hex:number,offset=.0015){
  const y0=lerp(belt,roof,t0)*h,y1=lerp(belt,roof,t1)*h;
  for(const s of [-1,1]){
   const z0=s*(widthAt(t0)+offset)*d,z1=s*(widthAt(t1)+offset)*d;
   quad([a*w,y0,z0],[b*w,y0,z0],[c*w,y1,z1],[e*w,y1,z1],hex,[0,0,0]);
  }
 }
 const x0=lerp(rear[0],rearTop[0],bottom)+.025,x1=lerp(front[0],frontTop[0],bottom)-.023;
 const x2=lerp(front[0],frontTop[0],top)-.021,x3=lerp(rear[0],rearTop[0],top)+.025;
 const cargo=van&&!['passenger','police'].includes(config);
 if(cargo){
  // Nearly vertical rear edge of the cab door, rather than a
  // parallelogram following the windshield all the way across the van.
  const left=Math.max(x3+.04,x2-.20);
  pane(left,x1,x2,left+.008,bottom,top,glass);
 }else if(pickup||truck)pane(x0+.008,x1,x2,x3+.008,bottom,top,glass);
 else{
  // Separate pane polygons leave body-coloured structural pillars without
  // coplanar overlays. SUV/passenger van has an explicit cargo window.
  const cuts=suv||van?[.34,.65]:[compact?.49:.47];
  const stops=[0,...cuts,1];
  for(let i=0;i<stops.length-1;i++){
   const lo=stops[i],hi=stops[i+1],gap=.011;
   pane(lerp(x0,x1,lo)+(i?gap:0),lerp(x0,x1,hi)-(i<stops.length-2?gap:0),
    lerp(x3,x2,hi)-(i<stops.length-2?gap:0),lerp(x3,x2,lo)+(i?gap:0),bottom,top,glass);
  }
 }
 function slopedWindow(a:readonly [number,number],b:readonly [number,number],sign:number){
  const x0=lerp(a[0],b[0],bottom)*w+sign*.065,x1=lerp(a[0],b[0],top)*w+sign*.065;
  const y0=lerp(a[1],b[1],bottom)*h,y1=lerp(a[1],b[1],top)*h;
  const z0=widthAt(bottom)*d*.86,z1=widthAt(top)*d*.86;
  quad([x0,y0,-z0],[x0,y0,z0],[x1,y1,z1],[x1,y1,-z1],glass,[0,0,0]);
 }
 slopedWindow(front,frontTop,1);
 if(!van&&!truck||config==='passenger'||config==='police'&&van)slopedWindow(rear,rearTop,-1);
 if(pickup){
  // Thicker bed rail and actual inset floor, not a solid tall block.
  box(-.46,-.115,belt+.003,belt+.018,.33,trim);
  box(-.48,-.445,belt-.015,belt+.115,.43,body);
  for(const s of [-1,1]){
   const z0=s*.33*d,z1=s*.43*d;
   const x0=-.48*w,x1=-.105*w,y0=(belt-.015)*h,y1=(belt+.115)*h;
   const p:P[]=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
   const center:P=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2];
   for(const [a,b,c,e] of [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[3,2,6,7],[0,1,5,4]])quad(p[a],p[b],p[c],p[e],body,center);
  }
  if(config==='covered'||config==='cargo')box(-.445,-.105,belt+.018,config==='covered'?.92:.79,.33,config==='covered'?body:0x85816c);
  if(config==='contractor')box(-.23,-.11,belt+.018,belt+.17,.32,trim);
 }
 if(truck){
  box(-.48,.075,belt-.018,belt+.035,.44,trim);
  if(config==='canvas'||config==='military')prism([[-.47,belt+.035],[.075,belt+.035],[.075,.91],[.045,.98],[-.44,.98],[-.47,.91]],.46,0x777b5b);
  else if(config!=='flatbed')box(-.47,.075,belt+.035,.98,.46,body);
 }
 // 8-sided wheels, visible tread and hub, no separate meshes. The
 // closed inner cap is visible below the recessed body at low angles.
 const thickness=d*(pickup||suv||truck?.17:.145);
 for(const axle of wheels)for(const s of [-1,1]){
  const x=axle*w,outer=s*d*.492,inner=outer-s*thickness;
  const center:P=[x,r,(outer+inner)/2];
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
   const point=(angle:number,z:number,rad=r):P=>[x+Math.cos(angle)*rad,r+Math.sin(angle)*rad,z];
   quad(point(a,inner),point(b,inner),point(b,outer),point(a,outer),rubber,center);
   tri([x,r,inner],point(a,inner),point(b,inner),rubber,center);
   const aa=point(a,outer,r*(truck?.40:.48)),bb=point(b,outer,r*(truck?.40:.48));
   quad(point(a,outer),point(b,outer),bb,aa,rubber,center);
   tri([x,r,outer],aa,bb,hub,center);
  }
 }
 // Family-specific front and rear fascia, flat vertex-coloured patches.
 const frontTopY=bodyProfile[2][1],rearTopY=bodyProfile.at(-1)![1];
 const frontLow=lower+.055,frontHigh=frontTopY-.025,frontSpan=frontHigh-frontLow;
 for(const s of [-1,1]){
  const a=s*(suv||truck?.245:.225),b=s*.405;
  end(.491,frontHigh-frontSpan*(suv||truck?.68:pickup||van?.54:.40),frontHigh,a,b,head);
  end(-.491,rearTopY-.09,rearTopY-.022,s*.24,s*.41,tail);
 }
 const grilleWidth=truck?.235:suv?.225:pickup?.19:van?.16:compact?.13:.19;
 end(.492,frontLow,frontHigh-.016,-grilleWidth,grilleWidth,trim);
 if(suv){for(const x of [-.12,0,.12])end(.493,frontLow+.012,frontHigh-.025,x-.012,x+.012,hub);}
 else if(truck||pickup)end(.493,frontLow+frontSpan*.36,frontLow+frontSpan*.49,-grilleWidth*.84,grilleWidth*.84,hub);
 end(-.492,lower+.055,lower+.10,-.105,.105,hub);
 // Readable panel seams/handles, no separate mesh or micro bevels.
 const handleY=belt-.035;
 const handles=truck?[.18]:pickup?[.02]:van?[.18,-.08]:suv?[.03,-.25]:compact?[.01]:[.04,-.20];
 for(const x of handles)side(x-.035,x+.035,handleY-.024,handleY,.4315,trim);
 const seams=truck?[.11]:pickup?[-.085]:van?[-.12,-.41]:suv?[-.13,-.35]:compact?[-.11]:[-.10,-.28];
 for(const x of seams){
  const near=Math.min(...wheels.map(a=>Math.abs(x-a)*w))-.004*w;
  const archY=near<archR?(r+Math.sqrt(Math.max(0,archR*archR-near*near)))/h:lower;
  const y=Math.max(lower+.025,archY+.008);
  if(y<belt-.012)side(x-.0035,x+.0035,y,belt-.008,.431,seam);
 }
 if(recipe.condition!=='clean')side(-.12,.13,lower+.015,lower+.055,.431,paint.clone().lerp(new THREE.Color(0x77715f),recipe.condition==='used'?.13:.35).getHex());
 const stripe=config==='police'?0x39556e:config==='medical'?0xa6564a:config==='delivery'?0x648577:config==='municipal'?0xb19a55:config==='contractor'?0x696e5a:config==='fleet'?0x778585:config==='taxi'?0x544e3c:config==='aid'?0x4f7d83:undefined;
 if(stripe!==undefined){
  const y=Math.max(lower+.06,(r+archR)/h+.012);
  if(y<belt-.035)side(-.37,.30,y,Math.min(belt-.035,y+.055),.431,stripe);
 }
 if(van&&['delivery','medical','contractor'].includes(config)){
  pane(-.42,-.09,-.09,-.42,.20,.67,config==='medical'?0xd6d5c8:config==='delivery'?0x648577:0x696e5a);
  if(config==='medical'){
   pane(-.27,-.20,-.20,-.27,.27,.60,0x466d79,.0025);
   pane(-.34,-.13,-.13,-.34,.39,.48,0x466d79,.003);
  }
 }
 if(truck&&config==='municipal')side(-.42,.025,.63,.71,.461,0xb19a55);
 if(suv&&(config==='military'||config==='aid'))box(-.32,.04,.96,.985,.31,trim);
 if(config==='police'||config==='medical'||config==='taxi')box(-.03,.10,roof,Math.min(1,roof+.04),.20,config==='taxi'?0xb7a05f:config==='medical'?0xa6564a:0x567c9e);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

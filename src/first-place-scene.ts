import * as THREE from 'three';
import {FIRST_PLACE,FENCE,FOOTPATH,DRAINAGE,DITCH_CROSSING,
  FIELD_TREES,YARD_EQUIPMENT,type SiteSegment} from './first-place-layout.ts';
import {physicalGroundAt} from './regional-physical.ts';

const material=(color:number)=>new THREE.MeshStandardMaterial({
 color,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide,
});
/**
 * Authored local scene, never a new biome or world generator.
 * All props follow exactly the high-detail physical ground sampling.
 */
export class FirstPlaceScene{
 readonly group=new THREE.Group();
 private readonly materials:THREE.Material[]=[];
 private readonly geometries:THREE.BufferGeometry[]=[];
 constructor(scene:THREE.Scene){
  const soil=this.mat(0x746b58),packed=this.mat(0x88806a);
  const wood=this.mat(0x625747);
  const dark=this.mat(0x384640),iron=this.mat(0x71776f);
  const accent=this.mat(0xb19565);
  const darkWater=this.mat(0x4c605d),foliage=this.mat(0x566e55);
  const leafLight=this.mat(0x748565),bark=this.mat(0x625c48);
  const grassBits=this.mat(0x77876c);
  const grassMat=()=>grassBits;
  // Ground-readable hierarchy: a worked enclosure, paths connecting
  // the front door and gate, and a narrow drainage route beside it.
  this.groundPatch(FIRST_PLACE.center.x,FIRST_PLACE.center.z,53,47,
    0x879778,.20);
  for(const s of FOOTPATH)this.ribbon(s,2.35,packed,.09);
  for(const s of DRAINAGE){
   this.ribbon(s,3.5,soil,.13);
   this.ribbon(s,1.15,darkWater,.15);
  }
  this.ribbon(DITCH_CROSSING,2.1,wood,.29);
  for(const s of FENCE)this.fence(s,wood,iron);
  // A proper utility entrance, with two posts and a lintel.
  this.post(117,111,2.3,.24,iron);
  this.post(117,125,2.3,.24,iron);
  this.beam(117,111,117,125,2.35,.12,accent); // amber gate header
  // The earlier 038 building shell remains the wall/door collision
  // authority. These are readable details rather than duplicated shells.
  this.roof(76,90,20,15,6.0,wood,iron);
  this.roof(94,118,14,10,4.0,wood,iron);
  for(const site of [
   {x:76,z:90,w:20,d:15,h:6},
   {x:94,z:118,w:14,d:10,h:4},
  ]){
   const front=site.z+site.d/2+.25;
   this.box(site.x,front,1.80,3.25,.20,.35,dark);
   this.box(site.x-3.8,front,site.h*.65,1.4,.87,.16,iron);
   this.box(site.x+3.8,front,site.h*.65,1.4,.87,.16,iron);
   this.box(site.x+3.8,front+.1,site.h*.65,1.15,.67,.06,dark);
   this.box(site.x-3.8,front+.1,site.h*.65,1.15,.67,.06,dark);
   this.box(site.x,front+1.2,site.h-.42,3.6,.5,.18,accent);
  }
  // Station identity: the mast is a far- and near-distance landmark;
  // its supports, controller, wind vane and dish visibly attach.
  this.radioMast(62,76,iron,accent,dark);
  // A readable utility yard, not scattered random decorative cubes.
  for(const p of YARD_EQUIPMENT){
   switch(p.type){
    case 'tank':
     this.box(p.x,p.z,.65,2.7,1.3,1.8,iron);
     this.box(p.x,p.z,1.45,2.95,.20,1.95,dark);break;
    case 'generator':
     this.box(p.x,p.z,.70,2.65,1.35,1.7,dark);
     this.box(p.x,p.z,1.40,2.75,.25,1.8,accent);
     this.box(p.x,p.z+1.0,.84,1.8,.65,.1,iron);break;
    case 'pallet':
     this.box(p.x,p.z,.16,1.9,.26,1.55,wood);
     this.box(p.x,p.z,.64,1.4,.66,1.15,packed);break;
    case 'logs':
     this.box(p.x,p.z,.23,1.2,.5,.82,wood);
     this.box(p.x,p.z,.58,.93,.16,.62,accent);break;
    case 'sign':
     this.post(p.x,p.z,2.6,.12,wood);
     this.box(p.x,p.z,2.26,2.3,.76,.18,accent);
     this.box(p.x,p.z+.1,2.29,1.7,.15,.06,dark);break;
    case 'sensor':
     this.post(p.x,p.z,2.4,.058,iron);
     this.box(p.x,p.z,1.83,.58,.42,.36,accent);
     this.box(p.x,p.z,2.42,.14,.20,.75,iron);
     this.box(p.x+.32,p.z,1.25,.40,.55,.12,dark);
      // Visually identifiable instrument instead of floating markers.
      const panel=this.box(p.x-.42,p.z-.27,1.58,.73,.08,.49,dark);
      panel.rotation.x=-.28;
      this.post(p.x,p.z-.06,2.85,.032,iron);
      for(const dx of [-.24,.24])
        this.box(p.x+dx,p.z-.06,2.85,.24,.055,.05,iron);
     break;
   }
  }
  this.box(103,112,.40,2.5,.8,.35,wood); // work bench
  this.box(103,112,1.1,.25,.65,.25,iron);
  // Trees are deliberately anchored at the edge of the clearing.
  // They form a frame, not an impenetrable ornamental wall.
  for(let i=0;i<FIELD_TREES.length;i++){
   const t=FIELD_TREES[i],h=(8.5+i%3)*t.scale,r=3.2*t.scale;
   const g=physicalGroundAt(t.x,t.z);
   this.cylinder(t.x,t.z,g+h*.36,.18*t.scale,.28*t.scale,
     h*.72,6,bark);
   this.crown(t.x,t.z,g+h*.78,r,h*.56,foliage,i*.7);
   this.crown(t.x+r*.32,t.z+r*.1,g+h*.69,r*.69,h*.36,
     leafLight,i*.31);
  }
  // Small shrubs around the outside, framing entrances and paths.
  const shrubs=[
   [44,118],[58,151],[73,154],[126,72],[143,102],[144,146],
   [62,55],[101,53],[47,81],[155,109],[87,60],
   // Close to Rook: vegetation marks the worn yard's boundaries.
   [99,138],[113,137],[112,109],[104,147],[92,132],
  ];
  for(let i=0;i<shrubs.length;i++){
   const [x,z]=shrubs[i],g=physicalGroundAt(x,z);
   this.crown(x,z,g+.43,.67+(i%3)*.17,.90,leafLight,i);
  }
  // Small, intentionally placed low ground cover where boots and road
  // meet the yard: no millions of blades or new biome simulation.
  for(const [x,z] of [
    [95,136],[103,140],[107,116],[120,136],[90,133],
    [116,108],[96,122],[84,142],[128,113],[113,146],
  ]){
   this.box(x,z,.09,.58,.18,.46,grassMat());
  }
  scene.add(this.group);
 }
 private mat(color:number):THREE.MeshStandardMaterial{
  const m=material(color);this.materials.push(m);return m;
 }
 private use(geometry:THREE.BufferGeometry,mat:THREE.Material,
  x=0,y=0,z=0):THREE.Mesh{
  this.geometries.push(geometry);
  const m=new THREE.Mesh(geometry,mat);
  m.position.set(x,y,z);
  m.receiveShadow=true;m.castShadow=false;
  this.group.add(m);return m;
 }
 private box(x:number,z:number,above:number,w:number,h:number,d:number,
  mat:THREE.Material):THREE.Mesh{
  const y=physicalGroundAt(x,z)+above;
  return this.use(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 }
 private post(x:number,z:number,height:number,radius:number,mat:THREE.Material){
  return this.use(new THREE.CylinderGeometry(radius,radius*1.16,height,6),
   mat,x,physicalGroundAt(x,z)+height/2,z);
 }
 private beam(x1:number,z1:number,x2:number,z2:number,
  above:number,thickness:number,mat:THREE.Material){
  const y1=physicalGroundAt(x1,z1)+above,
   y2=physicalGroundAt(x2,z2)+above;
  const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2);
  const distance=a.distanceTo(b);
  const mesh=this.use(new THREE.BoxGeometry(thickness,distance,thickness),mat);
  mesh.position.copy(a.clone().add(b).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
    b.sub(a).normalize());
  return mesh;
 }
 private fence(segment:SiteSegment,wood:THREE.Material,iron:THREE.Material){
  const dist=Math.hypot(segment.x2-segment.x1,segment.z2-segment.z1);
  const count=Math.max(1,Math.ceil(dist/3.7));
  for(let i=0;i<=count;i++){
   const t=i/count;
   this.post(segment.x1+(segment.x2-segment.x1)*t,
    segment.z1+(segment.z2-segment.z1)*t,1.72,.085,wood);
  }
  for(const h of [.68,1.38])
   this.beam(segment.x1,segment.z1,segment.x2,segment.z2,h,.11,iron);
 }
 private ribbon(s:SiteSegment,width:number,mat:THREE.Material,offset:number){
  const distance=Math.hypot(s.x2-s.x1,s.z2-s.z1);
  const nx=-(s.z2-s.z1)/distance,nz=(s.x2-s.x1)/distance;
  const n=Math.max(2,Math.ceil(distance/1.2));
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=n;i++){
   const t=i/n,x=s.x1+(s.x2-s.x1)*t,z=s.z1+(s.z2-s.z1)*t;
   for(const side of [-1,1]){
    const px=x+nx*width/2*side,pz=z+nz*width/2*side;
    vertices.push(px,physicalGroundAt(px,pz)+offset,pz);
   }
   if(i){
    const k=2*i;indices.push(k-2,k-1,k,k-1,k+1,k);
   }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(indices);g.computeVertexNormals();
  const mesh=this.use(g,mat);mesh.renderOrder=2;
 }
 private groundPatch(x:number,z:number,w:number,d:number,
  color:number,offset:number){
  // A subdued trampled clearing, integrated with the existing ground.
  // Never an artificial 100x100 rectangle of flat floating geometry.
  const mat=new THREE.MeshStandardMaterial({
   color:0xffffff,vertexColors:true,roughness:1,
   metalness:0,side:THREE.DoubleSide,
  });
  this.materials.push(mat);
  const vx:number[]=[],colors:number[]=[],indices:number[]=[];
  const base=new THREE.Color(color);
  const tint=new THREE.Color(0x9f9876);
  const shade=new THREE.Color();
  const n=12;
  for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
   const u=(col/n-.5)*2,v=(row/n-.5)*2;
   const edge=Math.pow(1-Math.max(Math.abs(u),Math.abs(v)),2);
   const px=x+u*w/2,pz=z+v*d/2;
   const h=physicalGroundAt(px,pz)+offset*edge+.025;
   vx.push(px,h,pz);
   const wear=.5+.5*Math.sin(px*.17+pz*.08)*Math.cos(pz*.29-px*.11);
   shade.copy(base).lerp(tint,wear*.17);
   colors.push(shade.r,shade.g,shade.b);
  }
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
   const a=r*(n+1)+c,b=a+1,k=a+n+1;
   indices.push(a,k,b,b,k,k+1);
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(vx,3));
  geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  this.use(geom,mat);
 }
 private roof(x:number,z:number,w:number,d:number,height:number,
  wood:THREE.Material,metal:THREE.Material){
  const y=physicalGroundAt(x,z)+height;
  const sx=w*.54,sz=d*.55;
  const points=[
   [-sx,0,-sz],[0,.95,-sz],[sx,0,-sz],
   [-sx,0,sz],[0,.95,sz],[sx,0,sz],
  ];
  const verts=points.flatMap(([xx,yy,zz])=>[x+xx,y+yy+.28,z+zz]);
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setIndex([0,3,1,1,3,4,1,4,2,2,4,5]);
  geom.computeVertexNormals();this.use(geom,metal);
  this.beam(x-sx,z-sz,x-sx,z+sz,height+.32,.16,wood);
  this.beam(x+sx,z-sz,x+sx,z+sz,height+.32,.16,wood);
 }
 private cylinder(x:number,z:number,y:number,
  top:number,bottom:number,height:number,sides:number,mat:THREE.Material){
  this.use(new THREE.CylinderGeometry(top,bottom,height,sides),mat,x,y,z);
 }
 private crown(x:number,z:number,y:number,r:number,height:number,
  mat:THREE.Material,angle:number){
  const o=this.use(new THREE.IcosahedronGeometry(1,0),mat,x,y,z);
  o.scale.set(r,height/2,r*.93);o.rotation.y=angle;
 }
 private radioMast(x:number,z:number,metal:THREE.Material,
  accent:THREE.Material,dark:THREE.Material){
  for(let i=0;i<4;i++){
   const h=i*4+2;
   this.box(x,z,h,.30,4,.30,metal);
   if(i<3){
    for(const off of [-.75,.75]){
     this.box(x+off,z,h+.4,.12,.11,2,metal);
     this.box(x,z+off,h+.4,2,.11,.12,metal);
    }
   }
  }
  this.box(x,z,17.0,2.1,.27,.35,accent);
  this.box(x,z+.12,15.2,.95,1.55,.2,dark);
  this.box(x+.8,z,14.1,1.2,.4,.75,metal);
  this.box(x,z,18.6,.18,3,.18,metal);
  // Grounded control cabinet and equipment anchoring the tower.
  this.box(x+2.1,z+1.1,.75,1.15,1.5,.9,dark);
 }
 dispose(scene:THREE.Scene){
  scene.remove(this.group);
  this.group.clear();
  for(const g of this.geometries)g.dispose();
  for(const m of this.materials)m.dispose();
 }
}

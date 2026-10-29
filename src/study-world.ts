import * as THREE from 'three';

/**
 * Fieldwork art study. Everything exists at human scale in metres.
 * Hand-directed composition with deterministic surface detail;
 * intentionally independent from the region simulator.
 */
const C = (hex:number)=>new THREE.Color(hex);
const clamp=THREE.MathUtils.clamp;
const hash=(n:number)=>{const s=Math.sin(n*127.1+17.37)*43758.5453;return s-Math.floor(s);};
const noise=(x:number,z:number)=>{
  const a=Math.floor(x),b=Math.floor(z),u=x-a,v=z-b;
  const s=u*u*(3-2*u),t=v*v*(3-2*v);
  const q=(i:number,j:number)=>hash(i*19.1+j*82.7);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(q(a,b),q(a+1,b),s),
    THREE.MathUtils.lerp(q(a,b+1),q(a+1,b+1),s),t);
};
export const roadX=(z:number)=>2+Math.sin(z*.085)*2.9+z*.043;
export const groundHeight=(x:number,z:number)=>
  .10*Math.sin(x*.20+z*.07)+.065*Math.cos(z*.24-x*.16)+
  .11*(noise(x*.42,z*.42)-.5);
export type Obstacle={x:number;z:number;radius:number};
const trees:Obstacle[]=[];
const obstacles:Obstacle[]=[];
const fenceSegments:{x1:number;z1:number;x2:number;z2:number}[]=[];
const materials:THREE.Material[]=[];
const meshes:THREE.Object3D[]=[];
let randomSeed=6124;
const rnd=()=>{randomSeed=(1664525*randomSeed+1013904223)>>>0;return randomSeed/4294967296;};
const range=(a:number,b:number)=>a+(b-a)*rnd();
const mat=(color:number,roughness=.96)=>{
  const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0,flatShading:true,
    side:THREE.DoubleSide});materials.push(m);return m;
};
const box=(group:THREE.Group,loc:[number,number,number],size:[number,number,number],
  material:THREE.Material,shadow=true)=>{
  const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  o.position.set(...loc);o.castShadow=shadow;o.receiveShadow=true;group.add(o);return o;
};
const cylinder=(group:THREE.Group,x:number,y:number,z:number,top:number,bottom:number,
  height:number,material:THREE.Material,sides=7)=>{
  const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,sides),material);
  o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;
};
const beam=(group:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,width:number,
  material:THREE.Material)=>{
  const v=b.clone().sub(a);const o=new THREE.Mesh(new THREE.CylinderGeometry(width,width*1.15,v.length(),6),material);
  o.position.copy(a).addScaledVector(v,.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  o.castShadow=true;group.add(o);return o;
};
const height=(x:number,z:number,offset=0)=>groundHeight(x,z)+offset;
const distanceSegment=(x:number,z:number,s:{x1:number;z1:number;x2:number;z2:number})=>{
  const dx=s.x2-s.x1,dz=s.z2-s.z1;
  const t=clamp(((x-s.x1)*dx+(z-s.z1)*dz)/(dx*dx+dz*dz),0,1);
  return Math.hypot(x-s.x1-dx*t,z-s.z1-dz*t);
};
export function walkable(x:number,z:number):boolean{
  if(Math.abs(x)>28||Math.abs(z)>36)return false;
  if(x>-21.3&&x<-6.0&&z>-19.3&&z<-6.5)return false;
  if(trees.some(t=>Math.hypot(x-t.x,z-t.z)<t.radius+.34))return false;
  if(obstacles.some(t=>Math.hypot(x-t.x,z-t.z)<t.radius+.34))return false;
  if(fenceSegments.some(s=>distanceSegment(x,z,s)<.29))return false;
  return true;
}
function gridSurface(group:THREE.Group,
  width:number,length:number,step:number,
  get:(x:number,z:number)=>{x:number;y:number;z:number;c:THREE.Color},
  material:THREE.Material){
  const nx=Math.round(width/step),nz=Math.round(length/step);
  const pos:number[]=[],colors:number[]=[],ids:number[]=[];
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
    const p=get(ix/nx*width-width/2,iz/nz*length-length/2);
    pos.push(p.x,p.y,p.z);colors.push(p.c.r,p.c.g,p.c.b);
  }
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
    const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1;
    ids.push(a,c,b,b,c,c+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(ids);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;group.add(mesh);
  return mesh;
}
function ribbon(group:THREE.Group,zFrom:number,zTo:number,width:number,
  lateral:number,above:number,material:THREE.Material,color:number){
  const vertices:number[]=[],cols:number[]=[],index:number[]=[];
  const segments=Math.ceil((zTo-zFrom)/.55);
  const c=C(color);
  for(let i=0;i<=segments;i++){
    const z=zFrom+(zTo-zFrom)*i/segments;
    for(const edge of [-1,1]){
      const x=roadX(z)+lateral+edge*width*.5;
      const y=height(x,z,above);
      vertices.push(x,y,z);
      const shade=.85+.26*noise(x*1.1,z*1.4);
      cols.push(c.r*shade,c.g*shade,c.b*shade);
    }
    if(i){const n=2*i;index.push(n-2,n,n-1,n-1,n,n+1);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  g.setIndex(index);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);
  mesh.receiveShadow=true;mesh.renderOrder=1;group.add(mesh);
}
function puddle(group:THREE.Group,x:number,z:number,radius:number,
  water:THREE.Material,wetBank:THREE.Material){
  for(let ring=0;ring<2;ring++){
    const segments=19,vertices:number[]=[],indices:number[]=[];
    const sx=radius*(ring===0?1.25:1),sz=radius*(ring===0?.48:.37);
    const yy=ring===0?.048:.07;
    vertices.push(x,height(x,z,yy),z);
    for(let i=0;i<=segments;i++){
      const theta=i/segments*Math.PI*2;
      const r=.83+.16*noise(12+i*.21+z,18+x);
      const px=x+Math.cos(theta)*sx*r,pz=z+Math.sin(theta)*sz*r;
      vertices.push(px,height(px,pz,yy),pz);
      if(i>0)indices.push(0,i,i+1);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setIndex(indices);g.computeVertexNormals();
    const o=new THREE.Mesh(g,ring===0?wetBank:water);
    o.renderOrder=ring===0?3:4;group.add(o);
  }
}
function farmhouse(group:THREE.Group){
  const root=new THREE.Group();root.position.set(-14,height(-14,-13),-13);group.add(root);
  const wall=mat(0x988f78),boardA=mat(0xafa28b),boardB=mat(0x837e70);
  const trim=mat(0x504e42),iron=mat(0x5a594f),roof=mat(0x5c665e);
  const roofRust=mat(0x795b4a),stone=mat(0x53534b),glass=mat(0x273a37,.35);
  const wood=mat(0x776450);
  box(root,[0,.32,0],[12.8,.65,9.5],stone);
  box(root,[0,2.85,0],[12,5.1,9],wall);
  // Separate vertical timber boards give tactile construction, not a big flat box.
  for(let i=0;i<39;i++){
    const x=-5.91+i*.31,m=i%7===0?boardB:i%3===0?boardA:wall;
    box(root,[x,2.91,4.57],[.038,4.94,.06],m,false);
    if(i<30){
      const z=-4.42+i*.302;
      box(root,[-6.05,2.92,z],[.06,4.94,.048],m,false);
    }
  }
  // Gable roof: a strong, simple silhouette with real eaves and ridgeline.
  for(const side of [-1,1]){
    const vertices:number[]=[];
    const edge=-0.05,outer=side*6.8;
    for(const z of [-5.05,5.05]){
      vertices.push(edge,7.25,z,outer,5.13,z);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,side===1?roofRust:roof);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    for(let i=0;i<13;i++){
      const x=side*(.24+i*.49),y=7.25-2.12*Math.abs(x)/6.8;
      box(root,[x,y+.04,0],[.055,.045,10.1],i%5===0?roofRust:iron,false);
    }
  }
  // Dark porch, inset door, visible glass and painted frames.
  box(root,[1.65,2.10,4.69],[1.75,3.0,.10],trim);
  box(root,[1.65,2.1,4.77],[1.48,2.76,.06],wood);
  cylinder(root,2.18,2.05,4.86,.05,.05,.10,iron);
  for(const x of [-3.65,4.22]){
    box(root,[x,3.02,4.70],[2.20,2.05,.15],trim);
    box(root,[x,3.02,4.80],[1.92,1.80,.085],glass);
    box(root,[x,3.02,4.89],[.09,1.89,.06],boardA);
    box(root,[x,3.02,4.91],[2.0,.085,.07],boardA);
    box(root,[x,2.02,4.89],[2.5,.15,.33],stone);
  }
  // Worked porch, believable posts, barrels, discarded materials.
  box(root,[1.4,.18,6.0],[6,.29,3.3],wood);
  box(root,[1.4,3.75,6.0],[6.4,.22,3.7],roof);
  for(const x of [-1.4,4.2])cylinder(root,x,1.95,7.55,.095,.13,3.7,wood);
  for(const [x,z] of [[-4.8,6.15],[-5.0,6.7],[-2.7,7.2]])
    box(root,[x,.32,z],[.8,.6,.7],wood);
  box(root,[-4.65,1.0,5.58],[1.5,1.4,.60],boardB);
  box(root,[-3.0,7.30,-2.45],[1.0,2.4,1.25],stone);
  box(root,[-3.0,8.56,-2.45],[1.23,.19,1.48],iron);
  // A narrow adjoining utility lean-to.
  box(root,[-8.4,1.45,.2],[4.4,2.75,5.1],boardB);
  const lean=box(root,[-8.4,3.05,.2],[5.0,.18,5.6],roofRust);
  lean.rotation.z=-.16;
  for(const x of [-9.6,-7.45])cylinder(root,x,.52,3.4,.42,.43,.95,iron);
  obstacles.push({x:-9.4,z:-9.6,radius:.7});
}
function fences(group:THREE.Group){
  const wood=mat(0x77715b),old=mat(0x625f50);
  const add=(ax:number,az:number,bx:number,bz:number)=>{
    fenceSegments.push({x1:ax,z1:az,x2:bx,z2:bz});
    const n=Math.ceil(Math.hypot(bx-ax,bz-az)/2.3);
    for(let i=0;i<=n;i++){
      const t=i/n,x=THREE.MathUtils.lerp(ax,bx,t),z=THREE.MathUtils.lerp(az,bz,t);
      cylinder(group,x,height(x,z,.78),z,.095,.12,1.56,old);
    }
    for(const y of [.66,1.19]){
      beam(group,new THREE.Vector3(ax,height(ax,az,y),az),
        new THREE.Vector3(bx,height(bx,bz,y),bz),.055,wood);
    }
  };
  add(-7,-25,-7,-8);
  add(-7,0,-7,10);
  add(-7,16,-7,33);
  add(11,-28,11,-13);
  add(11,-7,11,5);
  add(11,14,11,30);
  // A broken rail is grounded and leads the eye toward the open gate.
  beam(group,new THREE.Vector3(-7,height(-7,11,.3),11),
    new THREE.Vector3(-6,height(-6,15,.1),15),.09,old);
}
function tree(group:THREE.Group,x:number,z:number,scale:number,index:number){
  trees.push({x,z,radius:.37*scale});
  const bark=mat(index%3===0?0x4b4c40:0x555448);
  const foliage=[mat(0x3c5041),mat(0x495b44),mat(0x586347),mat(0x666a48)];
  const g=height(x,z),h=range(6.5,10.4)*scale;
  cylinder(group,x,g+h*.47,z,.18*scale,.30*scale,h*.94,bark);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5+index*.4,len=range(1.45,2.8)*scale;
    const from=new THREE.Vector3(x,g+h*(.54+.055*i),z);
    const end=from.clone().add(new THREE.Vector3(Math.cos(a)*len,len*.31,Math.sin(a)*len));
    beam(group,from,end,.10*scale,bark);
  }
  const n=10;for(let i=0;i<n;i++){
    const a=i*2.399+index*.7;
    const r=i===0?0:range(.45,2.1)*scale;
    const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
    const py=g+h*(.73+range(-.16,.18));
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),foliage[(i+index)%4]);
    crown.position.set(px,py,pz);
    crown.scale.set(range(.9,1.8)*scale,range(.8,1.5)*scale,
      range(.85,1.6)*scale);
    crown.rotation.y=a;crown.castShadow=true;crown.receiveShadow=true;group.add(crown);
  }
}
function shrubs(group:THREE.Group){
  const shades=[mat(0x54644c),mat(0x6b7654),mat(0x445b49),mat(0x77764e)];
  const trunks=mat(0x554b3c);
  for(let i=0;i<100;i++){
    const x=range(-28,28),z=range(-35,35);
    const d=Math.abs(x-roadX(z));
    if(d<4.4||x>-23&&x<-6&&z>-21&&z<-5)continue;
    const r=range(.34,.88),y=height(x,z);
    cylinder(group,x,y+.32,z,.025,.04,.65,trunks,5);
    const f=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),shades[i%4]);
    f.position.set(x,y+.56,z);f.scale.set(r,r*.72,r*.86);f.rotation.y=range(0,6);
    f.castShadow=true;group.add(f);
  }
}
function grass(group:THREE.Group){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,
    roughness:1,side:THREE.DoubleSide});
  materials.push(material);
  const geom=new THREE.PlaneGeometry(.15,.95);
  const count=3600,inst=new THREE.InstancedMesh(geom,material,count);
  const transform=new THREE.Object3D(),color=new THREE.Color();
  let used=0;
  for(let i=0;i<count*2&&used<count;i++){
    const x=range(-31,31),z=range(-39,39);
    if(Math.abs(x-roadX(z))<3.05||x>-21.5&&x<-6.0&&z>-20&&z<-6)continue;
    const h=range(.12,.52);
    transform.position.set(x,height(x,z,h*.45),z);
    transform.rotation.set(0,range(0,Math.PI*2),range(-.12,.12));
    transform.scale.set(range(.65,1.35),h/.95,1);
    transform.updateMatrix();inst.setMatrixAt(used,transform.matrix);
    const n=noise(x*.21,z*.21);
    color.set(0x61714f).lerp(C(0x938a5c),n*.67);
    inst.setColorAt(used,color);used++;
  }
  inst.count=used;inst.instanceMatrix.needsUpdate=true;
  inst.castShadow=false;inst.receiveShadow=false;inst.frustumCulled=false;group.add(inst);
}
function fieldLitter(group:THREE.Group){
  const pebble=mat(0x696659),leaf=mat(0x807452);
  const geom=new THREE.IcosahedronGeometry(1,0);
  for(const [count,material,size] of [[450,pebble,.07],[350,leaf,.045]] as const){
    const inst=new THREE.InstancedMesh(geom,material,count),o=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const x=range(-29,29),z=range(-37,37);
      o.position.set(x,height(x,z,.055),z);
      o.scale.set(size*range(.5,2),size*.22,size*range(.4,2));
      o.rotation.set(0,range(0,6.3),0);o.updateMatrix();inst.setMatrixAt(i,o.matrix);
    }
    inst.instanceMatrix.needsUpdate=true;inst.frustumCulled=false;group.add(inst);
  }
}
function roadsideDetails(group:THREE.Group){
  const wood=mat(0x6f614d),metal=mat(0x666962),dark=mat(0x3e4845),rust=mat(0x835d49);
  const rocks=mat(0x777568);
  // Hand-placed objects supply recognizable visual rhythm.
  for(const [x,z,w] of [[-3,7,1.2],[-5,14,.85],[8,-17,1.4],
    [7,21,.8],[9,5,1.1]]){
    const g=height(x,z);
    const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(w*.55,0),rocks);
    stone.position.set(x,g+.17*w,z);stone.scale.y=.5;stone.rotation.y=x;group.add(stone);
  }
  for(const [x,z] of [[-4,8],[9,17],[-5,-8]]){
    const g=height(x,z);
    cylinder(group,x,g+.46,z,.40,.43,.91,rust);
    cylinder(group,x,g+.95,z,.41,.41,.08,dark);
    for(const offset of [.25,.66])
      cylinder(group,x,g+offset,z,.416,.416,.035,metal);
  }
  // Roadside tarp with purposeful crate silhouette.
  box(group,[-10,height(-10,5,.42),5],[2.3,.84,1.25],wood);
  const tarp=box(group,[-10,height(-10,5,1.02),5],[2.6,.35,1.7],mat(0x657058));
  tarp.rotation.z=-.09;
  obstacles.push({x:-10,z:5,radius:1.5});
  // Telegraph pole and wires vanish into the composition's depth.
  for(const [x,z,h] of [[12,-23,10],[12,13,10]] as const){
    const g=height(x,z);
    cylinder(group,x,g+h/2,z,.15,.23,h,wood);
    box(group,[x,g+h-1.5,z],[3,.16,.2],wood);
    for(const dx of [-1.1,1.1])cylinder(group,x+dx,g+h-1.34,z,.095,.095,.37,metal);
  }
  const points=[new THREE.Vector3(10.9,height(12,-23,8.65),-23),
    new THREE.Vector3(10.9,height(12,-5,7.4),-5),
    new THREE.Vector3(10.9,height(12,13,8.65),13)];
  const wire=new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),42,.025,4,false),dark);
  group.add(wire);
}
export class StudyWorld{
  readonly group=new THREE.Group();
  readonly ground:THREE.Mesh;
  constructor(scene:THREE.Scene){
    trees.length=0;obstacles.length=0;fenceSegments.length=0;
    randomSeed=6124;
    const surface=new THREE.MeshStandardMaterial({vertexColors:true,
      roughness:1,side:THREE.DoubleSide});materials.push(surface);
    this.ground=gridSurface(this.group,76,86,.65,(x,z)=>{
      const d=Math.abs(x-roadX(z));
      const bare=clamp((4.7-d)/4,0,1);
      const n=.59*noise(x*.21,z*.21)+.41*noise(x*.92,z*.92);
      const c=C(0x52684d).lerp(C(0x8b8565),n*.67)
        .lerp(C(0x645e49),bare*.24);
      c.multiplyScalar(.92+.17*noise(x*2,z*2));
      return {x,y:groundHeight(x,z),z,c};
    },surface);
    const roadMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,
      side:THREE.DoubleSide});materials.push(roadMat);
    ribbon(this.group,-40,40,5.9,0,.045,roadMat,0x645746);
    ribbon(this.group,-40,40,.63,-1.35,.066,roadMat,0x3d453a);
    ribbon(this.group,-40,40,.63,1.35,.067,roadMat,0x40473b);
    ribbon(this.group,-40,40,.76,0,.069,roadMat,0x716b51);
    const wet=mat(0x394b44,.31),water=new THREE.MeshPhysicalMaterial({
      color:0x6b8179,roughness:.17,metalness:.1,clearcoat:1,
      clearcoatRoughness:.08,transparent:true,opacity:.79,
      side:THREE.DoubleSide,depthWrite:false});
    materials.push(water);
    for(const [z,off,r] of [[-31,-1.25,.95],[-25,1.3,.7],
      [-20,-1.1,1.1],[-14,1.2,.82],[-9,-1.25,1.25],
      [-4,1.3,1.0],[2,-1.1,.92],[8,1.2,1.4],
      [15,-1.1,.90],[21,1.0,1.17],[28,-1.0,.8]] as const)
      puddle(this.group,roadX(z)+off,z,r,water,wet);
    farmhouse(this.group);
    fences(this.group);
    const treeSites=[
      [-26,-30,1.05],[-27,-17,1.15],[-24,0,.92],[-27,16,1.18],
      [-23,30,1.12],[-15,27,.82],[-16,-33,1.05],
      [-4,-32,.9],[17,-31,1.10],[22,-23,1.25],[26,-11,.95],
      [23,0,1.05],[25,15,1.13],[21,31,1.2],[15,35,.85],
      [-22,10,.75],[18,-3,.75],[-20,-24,.65],
    ] as const;
    treeSites.forEach(([x,z,s],i)=>tree(this.group,x,z,s,i));
    shrubs(this.group);grass(this.group);fieldLitter(this.group);
    roadsideDetails(this.group);
    meshes.push(this.group);scene.add(this.group);
  }
  dispose(scene:THREE.Scene){
    scene.remove(this.group);
    this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    for(const m of materials)m.dispose();materials.length=0;
  }
}

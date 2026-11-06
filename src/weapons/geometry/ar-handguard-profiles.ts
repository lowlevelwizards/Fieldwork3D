/** R4.8 low-poly forearms: 3D cross-sections instead of extruded side slabs.
 * Rendering-only miniature art, generated once per family configuration.
 */
import * as THREE from 'three';
import type {SlotName} from './profile-primitives.ts';
export type ARForearmProfile='a1-triangle'|'ribbed-round';
const rings=8;
function yz(angle:number,profile:ARForearmProfile,ry:number,rz:number){
 let a=Math.cos(angle),b=Math.sin(angle);
 // Sharpen the triangle's upper ridge; keep big lower facets for shading.
 if(profile==='a1-triangle'&&a>0)b*=.85;
 return [a*ry,b*rz] as const;
}
type ARForearmSection={x:number;ry:number;rz:number};
/** Shared shape section definition; both the model and its vents use it.
 * Never author a second approximate A1 side plane at a guessed Z.
 */
function forearmSections(from:number,to:number,profile:ARForearmProfile,
 small=false):ARForearmSection[]{
 return [
  {x:from,ry:profile==='a1-triangle'?1.73:small?1.47:1.72,
   rz:profile==='a1-triangle'?1.88:small?1.57:1.88},
  {x:to-.67,ry:profile==='a1-triangle'?1.31:small?1.44:1.65,
   rz:profile==='a1-triangle'?1.66:small?1.52:1.83},
  {x:to,ry:profile==='a1-triangle'?1.02:small?1.18:1.35,
   rz:profile==='a1-triangle'?1.48:small?1.27:1.54}
 ];
}
export function addARFacetedForearm(root:THREE.Group,slot:SlotName,id:string,
 index:number,from:number,to:number,axisY:number,
 profile:ARForearmProfile,material:THREE.Material,small=false){
 const sections=forearmSections(from,to,profile,small);
 const vertices:number[]=[],indices:number[]=[];
 for(const s of sections)for(let j=0;j<rings;j++){
  const [y,z]=yz(j*Math.PI*2/rings,profile,s.ry,s.rz);
  vertices.push(s.x,y+axisY,z);
 }
 for(let layer=0;layer<sections.length-1;layer++)
  for(let j=0;j<rings;j++){
   const a=layer*rings+j,b=layer*rings+(j+1)%rings,
    c=(layer+1)*rings+j,d=(layer+1)*rings+(j+1)%rings;
   indices.push(a,b,c,b,d,c);
  }
 const start=vertices.length/3;vertices.push(from,axisY,0);
 const end=vertices.length/3;vertices.push(to,axisY,0);
 for(let j=0;j<rings;j++){
  indices.push(start,(j+1)%rings,j);
  indices.push(end,(sections.length-1)*rings+j,
   (sections.length-1)*rings+(j+1)%rings);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',
  new THREE.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-'+slot+'-'+id+'-'+index;
 mesh.userData.arForearmProfile=profile;
 mesh.userData.arForearmCrossSection=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}
/** Four broad dark vents on EACH actual sloped A1 face.
 * Builds the quads directly from the same section/ring math as the body,
 * rather than putting a flat XY sticker at an arbitrary Z. A 0.018-unit
 * along-normal bias prevents z-fighting without a visibly floating card.
 */
const A1_VENT_OFFSET=.018;
const A1_VENT_COUNT=4;
const A1_VENT_MATERIAL=new THREE.MeshBasicMaterial({
 color:0x101814,side:THREE.DoubleSide,depthTest:true,depthWrite:false,
 polygonOffset:true,polygonOffsetFactor:-1
});
export function addARA1SurfaceVents(root:THREE.Group,from:number,to:number,
 axisY:number){
 const sections=forearmSections(from,to,'a1-triangle');
 const [rear,mid]=sections;
 const deltaX=mid.x-rear.x;
 const result:THREE.Mesh[]=[];
 for(const side of [1,-1] as const){
  const points:number[]=[],indices:number[]=[];
  const surface=(x:number,u:number)=>{
   const t=THREE.MathUtils.clamp((x-rear.x)/deltaX,0,1);
   const ry=THREE.MathUtils.lerp(rear.ry,mid.ry,t);
   const rz=THREE.MathUtils.lerp(rear.rz,mid.rz,t);
   // The actual ring faces are 45–90 degrees (upper side facets).
   const [ya,za]=yz(Math.PI/4,'a1-triangle',ry,rz);
   const [yb,zb]=yz(Math.PI/2,'a1-triangle',ry,rz);
   const [dyadx,dzadx]=yz(Math.PI/4,'a1-triangle',
    (mid.ry-rear.ry)/deltaX,(mid.rz-rear.rz)/deltaX);
   const [dybdx,dzbdx]=yz(Math.PI/2,'a1-triangle',
    (mid.ry-rear.ry)/deltaX,(mid.rz-rear.rz)/deltaX);
   const tangentX=new THREE.Vector3(1,
    THREE.MathUtils.lerp(dyadx,dybdx,u),
    side*THREE.MathUtils.lerp(dzadx,dzbdx,u));
   const tangentU=new THREE.Vector3(0,yb-ya,side*(zb-za));
   const normal=new THREE.Vector3();
   if(side===1)normal.crossVectors(tangentU,tangentX);
   else normal.crossVectors(tangentX,tangentU);
   normal.normalize();
   return new THREE.Vector3(x,axisY+THREE.MathUtils.lerp(ya,yb,u),
    side*THREE.MathUtils.lerp(za,zb,u))
    .addScaledVector(normal,A1_VENT_OFFSET);
  };
  for(let i=0;i<A1_VENT_COUNT;i++){
   const x=THREE.MathUtils.lerp(from+1.52,to-1.86,
    i/(A1_VENT_COUNT-1));
   const width=1.15,uTop=.18,uBottom=.77;
   const base=points.length/3;
   for(const v of [
    surface(x-width/2,uTop),surface(x+width/2,uTop),
    surface(x+width/2,uBottom),surface(x-width/2,uBottom)
   ])points.push(v.x,v.y,v.z);
   indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geom.setIndex(indices);geom.computeVertexNormals();
  const mesh=new THREE.Mesh(geom,A1_VENT_MATERIAL);
  mesh.name='family-art-a1-vents';
  mesh.userData.weaponPixelArt=true;
  mesh.userData.arA1FaceAligned=true;
  mesh.userData.arVentSide=side;
  mesh.userData.arVentCount=A1_VENT_COUNT;
  mesh.userData.arVentSurfaceOffset=A1_VENT_OFFSET;
  mesh.renderOrder=3;mesh.castShadow=false;mesh.receiveShadow=false;
  root.add(mesh);result.push(mesh);
 }
 return result;
}

/** One instanced mesh for all rib bands. Every band follows the octagonal
 * body in 3D; unlike flat pixel stripes it creates real face-to-face relief.
 */
export function addARPolymerRibs(root:THREE.Group,slot:SlotName,id:string,
 index:number,start:number,end:number,axisY:number,
 retro:boolean,material:THREE.Material,explicitCount?:number){
 const count=explicitCount??(retro?5:7),depth=retro?1.54:1.88;
 const thickness=.12,width=.25;
 const mats:{x:number;y:number;z:number;rotation:number;span:number}[]=[];
 for(let i=0;i<count;i++){
  const x=start+.95+i*(end-start-1.90)/(count-1);
  const ry=retro?1.46:1.68;
  for(let j=0;j<rings;j++){
   const t=j*Math.PI*2/rings,n=(j+1)*Math.PI*2/rings;
   const y0=Math.cos(t)*ry,z0=Math.sin(t)*depth;
   const y1=Math.cos(n)*ry,z1=Math.sin(n)*depth;
   const dy=y1-y0,dz=z1-z0;
   const angle=Math.atan2(dz,dy);
   const cy=(y0+y1)/2,cz=(z0+z1)/2;
   const norm=Math.hypot(cy/ry,cz/depth)||1;
   mats.push({x,y:axisY+cy+.045*cy/ry/norm,
    z:cz+.045*cz/depth/norm,rotation:angle,
    span:Math.hypot(dy,dz)*.98});
  }
 }
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
  material,mats.length);
 mesh.name='family-'+slot+'-'+id+'-'+index;
 mesh.userData.arPolymerRibs=true;mesh.userData.arRibBandCount=count;
 const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 const m=new THREE.Matrix4();
 for(let i=0;i<mats.length;i++){
  const a=mats[i];
  p.set(a.x,a.y,a.z);
  q.setFromAxisAngle(new THREE.Vector3(1,0,0),a.rotation);
  s.set(width,a.span,thickness);
  m.compose(p,q,s);mesh.setMatrixAt(i,m);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingBox();mesh.computeBoundingSphere();
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

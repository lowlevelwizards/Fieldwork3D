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
export function addARFacetedForearm(root:THREE.Group,slot:SlotName,id:string,
 index:number,from:number,to:number,axisY:number,
 profile:ARForearmProfile,material:THREE.Material){
 const sections=[
  {x:from,ry:profile==='a1-triangle'?1.73:1.72,
   rz:profile==='a1-triangle'?1.88:1.88},
  {x:to-.67,ry:profile==='a1-triangle'?1.31:1.65,
   rz:profile==='a1-triangle'?1.66:1.83},
  {x:to,ry:profile==='a1-triangle'?1.02:1.35,
   rz:profile==='a1-triangle'?1.48:1.54}
 ];
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
/** One instanced mesh for all rib bands. Every band follows the octagonal
 * body in 3D; unlike flat pixel stripes it creates real face-to-face relief.
 */
export function addARPolymerRibs(root:THREE.Group,slot:SlotName,id:string,
 index:number,start:number,end:number,axisY:number,
 retro:boolean,material:THREE.Material){
 const count=retro?5:7,depth=retro?1.54:1.88;
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

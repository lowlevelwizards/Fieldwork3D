/** R4.8 low-poly forearms: 3D cross-sections instead of extruded side slabs.
 * Rendering-only miniature art, generated once per family configuration.
 */
import * as THREE from 'three';
import {tagVisualMaterial} from '../../rendering/material-identity.ts';
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
// A4.3: A1 recessed ventilation is matte paint, not unlit black ink.
// The geometry follows real sloped facets; it stays an opaque, shared mat.
const A1_VENT_MATERIAL=tagVisualMaterial(new THREE.MeshStandardMaterial({
 color:0x101814,roughness:.98,metalness:0,
 side:THREE.DoubleSide,depthTest:true,depthWrite:false,
 polygonOffset:true,polygonOffsetFactor:-1
}),'paint');
export function addARA1SurfaceVents(root:THREE.Group,from:number,to:number,
 axisY:number){
 const sections=forearmSections(from,to,'a1-triangle');
 const [rear,mid]=sections;
 const deltaX=mid.x-rear.x;
 const result:THREE.Mesh[]=[];
 for(const side of [1,-1] as const){
  const points:number[]=[],indices:number[]=[];
  // These are the EXACT vertex rings used by addARFacetedForearm.
  // The left/negative side is intentionally not assumed to mirror the
  // right: the legacy yz() polygon has subtly asymmetric rear facets.
  const thetaA=side===1?Math.PI/4:7*Math.PI/4;
  const thetaB=side===1?Math.PI/2:6*Math.PI/4;
  const vertex=(section:ARForearmSection,theta:number)=>{
   const [y,z]=yz(theta,'a1-triangle',section.ry,section.rz);
   return new THREE.Vector3(section.x,axisY+y,z);
  };
  const a=vertex(rear,thetaA),b=vertex(rear,thetaB);
  const c=vertex(mid,thetaA),d=vertex(mid,thetaB);
  const normal=new THREE.Vector3();
  const surface=(x:number,u:number)=>{
   const t=THREE.MathUtils.clamp((x-rear.x)/deltaX,0,1);
   const point=new THREE.Vector3();
   let tri:THREE.Triangle;
   if(side===1){
    // Actual indexed faces are [rear A, rear B, mid A] and
    // [rear B, mid B, mid A]; the diagonal is t+u=1.
    if(t+u<=1){
     point.copy(a).multiplyScalar(1-t-u).addScaledVector(b,u)
      .addScaledVector(c,t);
     tri=new THREE.Triangle(a,b,c);
    }else{
     point.copy(d).multiplyScalar(t+u-1).addScaledVector(b,1-t)
      .addScaledVector(c,1-u);
     tri=new THREE.Triangle(b,d,c);
    }
   }else{
    // Reverse winding: indexed left facets have diagonal u=t.
    if(u>=t){
     point.copy(a).multiplyScalar(1-u).addScaledVector(b,u-t)
      .addScaledVector(d,t);
     tri=new THREE.Triangle(b,a,d);
    }else{
     point.copy(a).multiplyScalar(1-t).addScaledVector(c,t-u)
      .addScaledVector(d,u);
     tri=new THREE.Triangle(a,d,c);
    }
   }
   tri.getNormal(normal);
   if(normal.z*side<0)normal.negate();
   return point.addScaledVector(normal,A1_VENT_OFFSET);
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

/** WA6: one continuous faceted exterior artwork mesh for the decorative
 * bands. Follow the already authored surface; do not build eight separate
 * boxes for every stripe. Three visible strips per facet, no hidden backs
 * or duplicate end faces. This is miniature-art relief, not physical data.
 */
export function addARPolymerRibs(root:THREE.Group,slot:SlotName,id:string,
 index:number,start:number,end:number,axisY:number,
 retro:boolean,material:THREE.Material,explicitCount?:number){
 const count=explicitCount??(retro?5:7);
 const sections=forearmSections(start,end,'ribbed-round',retro);
 const profileAt=(x:number)=>{
  const a=x<=sections[1].x?sections[0]:sections[1];
  const b=x<=sections[1].x?sections[1]:sections[2];
  const t=THREE.MathUtils.clamp((x-a.x)/(b.x-a.x),0,1);
  return {ry:THREE.MathUtils.lerp(a.ry,b.ry,t),rz:THREE.MathUtils.lerp(a.rz,b.rz,t)};
 };
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<count;i++){
  const center=start+.95+i*(end-start-1.90)/(count-1);
  // Broad, uninterrupted graphic relief follows the existing tapered
  // exterior. The two inset edges meet the parent artwork, not empty space.
  const halfWidth=.16,raised=.075,inset=-.015;
  const offset=positions.length/3;
  for(const [x,lift] of [[center-halfWidth,inset],[center-halfWidth,raised],
    [center+halfWidth,raised],[center+halfWidth,inset]]){
   const {ry,rz}=profileAt(x);
   for(let j=0;j<rings;j++){
    const [y,z]=yz(j*Math.PI*2/rings,'ribbed-round',ry+lift,rz+lift);
    positions.push(x,axisY+y,z);
   }
  }
  for(let k=0;k<3;k++)for(let j=0;j<rings;j++){
   const a=offset+k*rings+j,b=offset+k*rings+(j+1)%rings;
   const c=a+rings,d=b+rings;
   indices.push(a,b,c,b,d,c);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='family-'+slot+'-'+id+'-'+index;
 mesh.userData.arPolymerRibs=true;mesh.userData.arRibBandCount=count;
 mesh.userData.arContinuousGraphicBands=true;
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 return mesh;
}

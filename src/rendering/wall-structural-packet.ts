import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Segment,Pt} from '../breach-core.ts';
import {planWallCapJoins,type WallCapJoinPlan} from './wall-cap-joins.ts';
export type TrimPart={kind:'skirting'|'cap'|'joint';x:number;y:number;z:number;width:number;height:number;depth:number;yaw:number;color:number};
export type WallTrimPacket={index:number;mid:Pt;parts:TrimPart[]};
/** Geometry-only authoring, exact original cap/foot dimensions and owner.
 * Local origins keep transparent sort centers close to the wall segment. */
export function planWallTrimPackets(walls:readonly Segment[],height:number,trim:number,cap:number,joins:WallCapJoinPlan=planWallCapJoins(walls)):WallTrimPacket[]{
 const packets=walls.map((wall,index):WallTrimPacket=>{
  const {a,b}=wall,dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const parts:TrimPart[]=[];
  if(len>=5){
   const yaw=-Math.atan2(dz,dx);
   parts.push({kind:'skirting',x:mid.x,y:2,z:mid.y,width:len,height:4,depth:12,yaw,color:trim});
   const [start,end]=joins.trims[index],shift=(start-end)/2;
   parts.push({kind:'cap',x:mid.x+dx/len*shift,y:height+.3,z:mid.y+dz/len*shift,width:Math.max(1,len-start-end),height:2,depth:11,yaw,color:cap});
  }
  return {index,mid,parts};
 });
 for(const joint of joins.junctions){
  packets[joint.owner]?.parts.push({kind:'joint',x:joint.p.x,y:height+.35,z:joint.p.y,width:11,height:2.12,depth:11,yaw:0,color:cap});
 }
 return packets;
}
/** Build only the final indexed geometry; temporary boxes never enter the
 * scene or resource cache. Vertex colors are THREE's working linear space. */
export function compileWallTrimGeometry(packet:WallTrimPacket):THREE.BufferGeometry|null{
 if(!packet.parts.length)return null;
 const pieces=packet.parts.map(part=>{
  const g=new THREE.BoxGeometry(part.width,part.height,part.depth);
  g.rotateY(part.yaw);g.translate(part.x-packet.mid.x,part.y,part.z-packet.mid.y);
  const color=new THREE.Color(part.color),count=g.getAttribute('position').count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)colors.set([color.r,color.g,color.b],i*3);
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return g;
 });
 const result=mergeGeometries(pieces,false);
 for(const part of pieces)part.dispose();
 if(!result)throw Error('Incompatible wall trim geometry');
 result.computeBoundingBox();result.computeBoundingSphere();
 return result;
}

/** W4.2: preserve the body-local transform and atlas UVs. Trim uses a
 * constant white texel and linear vertex colors, so no additional map,
 * material, geometry group or visible draw is required. */
export function compileUnifiedWallGeometry(body:THREE.BufferGeometry,packet:WallTrimPacket,bodyYaw:number,bodyHeight:number,whiteU:number,whiteV:number){
 const trim=compileWallTrimGeometry(packet);
 if(!trim||!body.index)throw Error('Unified wall requires indexed body and trim');
 body.computeBoundingSphere();
 const bodySphere=body.boundingSphere!.clone();
 const core=body.clone(),colors=new Float32Array(core.getAttribute('position').count*3).fill(1);
 core.setAttribute('color',new THREE.BufferAttribute(colors,3));
 trim.rotateY(-bodyYaw);trim.translate(0,-bodyHeight/2,0);
 const uv=trim.getAttribute('uv') as THREE.BufferAttribute;
 for(let i=0;i<uv.count;i++)uv.setXY(i,whiteU,whiteV);
 const geometry=mergeGeometries([core,trim],false),shadowIndexCount=core.index!.count;
 core.dispose();trim.dispose();
 if(!geometry)throw Error('Unified wall geometry incompatible');
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return {geometry,shadowIndexCount,bodySphere};
}
/** Three invokes these around each actual shadow submission. The same
 * indexed geometry draws only its original body in the depth pass, then
 * restores the full range for the main pass. No extra shadow-only object. */
export function restrictWallShadowToBody(mesh:THREE.Mesh,bodyIndices:number,bodySphere?:THREE.Sphere){
 if(bodySphere)mesh.userData.fieldworkBodyShadowSphere=bodySphere;
 const total=mesh.geometry.index!.count;
 mesh.onBeforeShadow=()=>mesh.geometry.setDrawRange(0,bodyIndices);
 mesh.onAfterShadow=()=>mesh.geometry.setDrawRange(0,total);
 mesh.onBeforeRender=()=>{if(mesh.geometry.drawRange.count!==total)mesh.geometry.setDrawRange(0,total);};
 mesh.geometry.setDrawRange(0,total);
}

/** Shadow-map culling happens BEFORE onBeforeShadow. Full visual bounds
 * include trim, but shadow culling must use the original body sphere.
 * Only swap bounds during actual shadow refreshes, not main rendering.
 * The profiler may wrap the same method; preserve receiver and arguments. */
type WallShadowMap={render:(...args:unknown[])=>unknown;enabled:boolean;autoUpdate:boolean;needsUpdate:boolean};
export function installWallShadowBounds(shadowMap:WallShadowMap,walls:()=>readonly {mesh:THREE.Mesh}[]){
 const original=shadowMap.render;
 shadowMap.render=function(this:unknown,...args:unknown[]){
  if(!shadowMap.enabled||(!shadowMap.autoUpdate&&!shadowMap.needsUpdate))return Reflect.apply(original,this,args);
  const changed:{geometry:THREE.BufferGeometry;bounds:THREE.Sphere|null}[]=[];
  for(const {mesh} of walls()){
   const body=mesh.userData.fieldworkBodyShadowSphere as THREE.Sphere|undefined;
   if(!body||!mesh.castShadow)continue;
   const geometry=mesh.geometry;changed.push({geometry,bounds:geometry.boundingSphere});geometry.boundingSphere=body;
  }
  try{return Reflect.apply(original,this,args);}
  finally{for(const {geometry,bounds} of changed){geometry.boundingSphere=bounds;geometry.setDrawRange(0,geometry.index!.count);}}
 };
}

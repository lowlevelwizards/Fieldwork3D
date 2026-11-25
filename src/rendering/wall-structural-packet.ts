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

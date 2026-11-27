/** CT9 — a deterministic casualty body frame shared by both rig families.
 * Body center remains the recorded physical subject; the visual torso
 * moves only within the supported transport silhouette. No simulation writes. */
import * as THREE from 'three';
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
import {canonicalRootOrientation} from './operator-axis-convention.ts';
type Patient={id:string;p:Pt;health:number;heading:number;carriedById?:string|null;transportMode?:TransportMode|null};
type Carrier={id:string;p:Pt;health:number;heading:number;carryingId?:string|null;velocity?:number;stride?:number;
 transportContact?:{kind:string;elapsed:number;duration:number}};
export type TransportPatientPose=Readonly<{mode:TransportMode;carrierId:string;heading:number;
 roll:number;chest:Readonly<{x:number;y:number;z:number}>;release:number;motion:number}>;
export const TRANSPORT_PATIENT_CHEST_Y=26;
export const TRANSPORT_PATIENT_HIP_Y=20.2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function readTransportPatientPose(patient:Patient,carriers:readonly Carrier[]):TransportPatientPose|undefined{
 if(patient.health>0||!patient.carriedById)return undefined;
 const carrier=carriers.find(c=>c.id===patient.carriedById&&c.carryingId===patient.id&&c.health>0);
 if(!carrier)return undefined;
 const mode=patient.transportMode==='carry'?'carry':'drag';
 const dx=carrier.p.x-patient.p.x,dz=carrier.p.y-patient.p.y;
 const toward=Math.hypot(dx,dz)>1?Math.atan2(dz,dx):carrier.heading+Math.PI;
 const contact=carrier.transportContact;
 const release=contact?.kind==='release'?clamp(contact.elapsed/Math.max(.01,contact.duration)):0;
 const motion=Math.sin((carrier.stride??0)*.12)*clamp((carrier.velocity??0)/25);
 const dragHeight=5.8;
 // Head is along -forward of the supine model. Carry lies transversely,
 // with the upper torso seated on the right-side shoulder region.
 const heading=mode==='drag'?toward+Math.PI:carrier.heading+Math.PI/2;
 const height=mode==='drag'?dragHeight:THREE.MathUtils.lerp(30.5+motion*.35,dragHeight,release);
 const offset=mode==='drag'?5.8:0;
 return {mode,carrierId:carrier.id,heading,roll:Math.PI/2,
  chest:{x:patient.p.x+Math.cos(toward)*offset,y:height,z:patient.p.y+Math.sin(toward)*offset},
  release,motion};
}
export function patientRootTransform(p:TransportPatientPose,scale=1){
 const legacy=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-p.heading,p.roll,'XYZ'));
 const offset=new THREE.Vector3(0,TRANSPORT_PATIENT_CHEST_Y*scale,0).applyQuaternion(legacy);
 const position=new THREE.Vector3(p.chest.x,p.chest.y,p.chest.z).sub(offset);
 return {position,quaternion:canonicalRootOrientation(0,-p.heading,p.roll),legacy};
}
export function patientAnkleOffset(p:TransportPatientPose,side:number){
 return p.mode==='drag'?{x:1.4+Math.abs(p.motion)*.45,y:-20,z:side*.45}:
  {x:-10.2,y:-15.5,z:side*1.1};
}
export function patientWrist(p:TransportPatientPose,side:number){
 return p.mode==='drag'?{x:-1,y:-11,z:side*8.4}:
  {x:-11.2,y:-6,z:side*7.5};
}

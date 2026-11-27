/** CT9 — a deterministic casualty body frame shared by both rig families.
 * Body center remains the recorded physical subject; the visual torso
 * moves only within the supported transport silhouette. No simulation writes. */
import * as THREE from 'three';
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
import {canonicalRootOrientation} from './operator-axis-convention.ts';
type Patient={id:string;p:Pt;health:number;heading:number;carriedById?:string|null;transportMode?:TransportMode|null};
type Carrier={id:string;p:Pt;health:number;heading:number;carryingId?:string|null;velocity?:number;stride?:number;
 transportContact?:{kind:string;elapsed:number;duration:number;patientId?:string;mode?:TransportMode}};
export type TransportPatientPose=Readonly<{mode:TransportMode;carrierId:string;heading:number;
 roll:number;chest:Readonly<{x:number;y:number;z:number}>;release:number;motion:number;drape?:number}>;
export const TRANSPORT_PATIENT_CHEST_Y=26;
export const TRANSPORT_PATIENT_HIP_Y=20.2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function readTransportPatientPose(patient:Patient,carriers:readonly Carrier[]):TransportPatientPose|undefined{
 if(patient.health>0)return undefined;
 const owner=patient.carriedById?carriers.find(c=>c.id===patient.carriedById&&c.carryingId===patient.id&&c.health>0):undefined;
 // Only an explicitly recorded, reachable pickup contact can start a visual
 // transfer before acquisition. The casualty remains physically on the floor
 // until the fixed-step ownership commit, and drag remains unchanged.
 const pickup=!owner&&!patient.carriedById?carriers.find(c=>c.health>0&&!c.carryingId&&
  c.transportContact?.kind==='pickup'&&c.transportContact.mode==='carry'&&
  c.transportContact.patientId===patient.id):undefined;
 const carrier=owner??pickup;if(!carrier)return undefined;
 const mode=pickup?'carry':patient.transportMode==='carry'?'carry':'drag';
 const dx=carrier.p.x-patient.p.x,dz=carrier.p.y-patient.p.y;
 const toward=Math.hypot(dx,dz)>1?Math.atan2(dz,dx):carrier.heading+Math.PI;
 const contact=carrier.transportContact;
 const release=contact?.kind==='release'?clamp(contact.elapsed/Math.max(.01,contact.duration)):0;
 const motion=Math.sin((carrier.stride??0)*.12)*clamp((carrier.velocity??0)/25);
 if(mode==='drag')return {mode,carrierId:carrier.id,heading:toward+Math.PI,
  roll:THREE.MathUtils.lerp(1.30,Math.PI/2,release),
  chest:{x:patient.p.x+Math.cos(toward)*7.8,y:THREE.MathUtils.lerp(10.2,5.8,release),
    z:patient.p.y+Math.sin(toward)*7.8},release,motion};
 // The carrying silhouette is an authored supported load, not a horizontal
 // ragdoll chasing a ground-space point. Seat the torso across the UPPER
 // BACK, behind the helmet, and let the torso, hips and limbs drape down.
 const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
 const progress=pickup&&contact?clamp(contact.elapsed/Math.max(.01,contact.duration)):1;
 const drape=pickup?ease((progress-.38)/.57):1-ease(release);
 if(pickup&&drape<=0)return undefined;
 const h=carrier.heading,c=Math.cos(h),s=Math.sin(h);
 const shoulderX=carrier.p.x-10*c+4.8*s,shoulderZ=carrier.p.y-10*s-4.8*c;
 const idleRise=2*Math.max(0,1-(carrier.velocity??0)/12);
 const high=32.5+idleRise+motion*.28;
 const groundHeading=patient.heading;
 const targetHeading=h+Math.PI/2;
 const turn=Math.atan2(Math.sin(targetHeading-groundHeading),Math.cos(targetHeading-groundHeading));
 return {mode,carrierId:carrier.id,heading:groundHeading+turn*drape,roll:Math.PI/2,
  chest:{x:THREE.MathUtils.lerp(patient.p.x,shoulderX,drape),
    y:THREE.MathUtils.lerp(5.8,high,drape)+(pickup?2.0*Math.sin(Math.PI*drape):0),
    z:THREE.MathUtils.lerp(patient.p.y,shoulderZ,drape)},release,motion,drape};
}
export function patientRootTransform(p:TransportPatientPose,scale=1){
 const legacy=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-p.heading,p.roll,'XYZ'));
 const offset=new THREE.Vector3(0,TRANSPORT_PATIENT_CHEST_Y*scale,0).applyQuaternion(legacy);
 const position=new THREE.Vector3(p.chest.x,p.chest.y,p.chest.z).sub(offset);
 return {position,quaternion:canonicalRootOrientation(0,-p.heading,p.roll),legacy};
}
export function patientDrape(p:TransportPatientPose){return p.mode==='carry'?(p.drape??1):0;}
export function patientChestTilt(p:TransportPatientPose){return .48*patientDrape(p);}
export function patientHipOffset(p:TransportPatientPose){return -3.8*patientDrape(p);}
export function patientAnkleOffset(p:TransportPatientPose,side:number){
 const w=patientDrape(p);
 return {x:THREE.MathUtils.lerp(-2.0+Math.abs(p.motion)*.45,-16,w),
  y:THREE.MathUtils.lerp(-20,-8.2,w),z:side*THREE.MathUtils.lerp(.45,1.6,w)};
}
export function patientWrist(p:TransportPatientPose,side:number){
 const w=patientDrape(p);
 return {x:THREE.MathUtils.lerp(-1,-13,w),y:THREE.MathUtils.lerp(-11,-3,w),
  z:side*THREE.MathUtils.lerp(8.4,7.0,w)};
}

/** CT10: both hands refer to the same model-space frame as the patient rig.
 * Drag grasps the shoulder/underarm region. Carry supports upper torso and
 * thigh separately. Sort by carrier lateral axis to avoid crossed arms. */
export function patientTransportContacts(p:TransportPatientPose,carrierHeading:number){
 const {legacy}=patientRootTransform(p);
 const center=new THREE.Vector3(p.chest.x,p.chest.y,p.chest.z);
 const local=p.mode==='drag'?
  [new THREE.Vector3(.8,4.8,-7.8),new THREE.Vector3(.8,4.8,7.8)]:
  [new THREE.Vector3(-2,5.5,3).applyAxisAngle(new THREE.Vector3(0,0,1),patientChestTilt(p)),
   new THREE.Vector3(patientHipOffset(p)-5,-11,3)];
 const world=local.map(v=>v.applyQuaternion(legacy).add(center));
 const side=new THREE.Vector3(-Math.sin(carrierHeading),0,Math.cos(carrierHeading));
 world.sort((a,b)=>a.dot(side)-b.dot(side));
 return [world[0],world[1]] as const;
}

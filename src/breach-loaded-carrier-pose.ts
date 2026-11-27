/** CT8: read-only loaded-carrier pose policy. Simulation owns custody,
 * positions and speed. The same input is used by live/replay and Lab. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
export type LoadedTransportPose=Readonly<{mode:TransportMode;patientId:string;
 patient:Pt;heading:number;releaseWeight?:number;
 patientPose?:import('./breach-transport-patient-pose.ts').TransportPatientPose}>;
export function loadedCarrierHeading(mode:TransportMode,carrier:Pt,patient:Pt,heading:number){
 const dx=patient.x-carrier.x,dy=patient.y-carrier.y;
 return mode==='drag'&&Math.hypot(dx,dy)>3?Math.atan2(dy,dx):heading;
}
export function sampleLoadedCarrier(p:LoadedTransportPose,speed:number,stride:number){
 const weight=Math.max(0,Math.min(1,1-(p.releaseWeight??0)));
 const moving=Math.max(0,Math.min(1,speed/24));
 const drag=p.mode==='drag';
 return {weight,crouch:(drag?4.6:2.4)*weight,
  torsoLean:(drag?.19:.13)*weight,torsoSide:(drag?0:-.10)*weight,
  strideSway:Math.sin(stride*.13)*moving*(drag?.022:.042)*weight,
  wristLeft:drag?{x:12,y:-9,z:-4.8}:{x:6,y:3,z:-5},
  wristRight:drag?{x:12,y:-9,z:4.8}:{x:4,y:5,z:8}};
}

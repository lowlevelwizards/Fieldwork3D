/** Observational, opt-in temporal pose diagnostics.
 * Static validity alone cannot detect switching between two valid elbow fits.
 * No pose mutation, interpolation, combat or solver authority is held here.
 * The caller supplies its own stable intent identity and presentation time.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';

type MeasuredPoint={position:THREE.Vector3;rotation:THREE.Quaternion};
type Frame={
  key:string;time:number;
  chest:MeasuredPoint;head:MeasuredPoint;weapon:MeasuredPoint;
  wrists:[THREE.Vector3,THREE.Vector3];
  elbows:[THREE.Vector3,THREE.Vector3];
};
export type PoseTemporalReport={
  firstSample:boolean;unchangedIntent:boolean;sameTimestamp:boolean;
  elapsedSeconds:number;
  chestTranslation:number;chestRotation:number;
  headTranslation:number;headRotation:number;
  weaponTranslation:number;weaponRotation:number;
  wristTranslation:readonly [number,number];
  elbowTranslation:readonly [number,number];
  maxTranslation:number;maxRotation:number;
  /** Repeated identical input time should produce identical rig geometry. */
  frozenDrift:boolean;
};
const copyPoint=(object:THREE.Object3D):MeasuredPoint=>({
 position:object.getWorldPosition(new THREE.Vector3()),
 rotation:object.getWorldQuaternion(new THREE.Quaternion())
});
function frameOf(rig:OperatorRig,key:string,time:number):Frame{
  rig.root.updateMatrixWorld(true);
  const wrists:[THREE.Vector3,THREE.Vector3]=[
    rig.arms[0].hand.getWorldPosition(new THREE.Vector3()),
    rig.arms[1].hand.getWorldPosition(new THREE.Vector3())
  ];
  // Arm segments are centered at their midpoints. Infer the actual elbow
  // from the rendered lower segment and wrist, not a solver's chosen flag.
  const elbows:[THREE.Vector3,THREE.Vector3]=[
    rig.arms[0].lower.getWorldPosition(new THREE.Vector3())
      .multiplyScalar(2).sub(wrists[0]),
    rig.arms[1].lower.getWorldPosition(new THREE.Vector3())
      .multiplyScalar(2).sub(wrists[1])
  ];
  return {key,time,chest:copyPoint(rig.chest),
    head:copyPoint(rig.head),weapon:copyPoint(rig.weapon),
    wrists,elbows};
}
const distance=(a:MeasuredPoint,b:MeasuredPoint)=>
  a.position.distanceTo(b.position);
const rotation=(a:MeasuredPoint,b:MeasuredPoint)=>
  a.rotation.angleTo(b.rotation);
export class PoseTemporalMonitor{
  private readonly previous=new WeakMap<OperatorRig,Frame>();
  reset(rig:OperatorRig){this.previous.delete(rig);}
  sample(rig:OperatorRig,key:string,time:number):PoseTemporalReport{
    const next=frameOf(rig,key,time);
    const before=this.previous.get(rig);
    this.previous.set(rig,next);
    const same=!!before&&before.key===key;
    const elapsed=before?Math.max(0,time-before.time):0;
    const atSameTime=same&&Math.abs(time-before.time)<=1e-7;
    const c=before?distance(next.chest,before.chest):0;
    const h=before?distance(next.head,before.head):0;
    const g=before?distance(next.weapon,before.weapon):0;
    const ca=before?rotation(next.chest,before.chest):0;
    const ha=before?rotation(next.head,before.head):0;
    const ga=before?rotation(next.weapon,before.weapon):0;
    const w=(before?next.wrists.map((v,i)=>
      v.distanceTo(before.wrists[i])):[0,0]) as [number,number];
    const e=(before?next.elbows.map((v,i)=>
      v.distanceTo(before.elbows[i])):[0,0]) as [number,number];
    const maxTranslation=Math.max(c,h,g,...w,...e);
    const maxRotation=Math.max(ca,ha,ga);
    return {firstSample:!before,unchangedIntent:same,sameTimestamp:atSameTime,
      elapsedSeconds:elapsed,
      chestTranslation:c,chestRotation:ca,
      headTranslation:h,headRotation:ha,
      weaponTranslation:g,weaponRotation:ga,
      wristTranslation:w,elbowTranslation:e,
      maxTranslation,maxRotation,
      frozenDrift:atSameTime&&
        (maxTranslation>1e-4||maxRotation>1e-4)};
  }
}

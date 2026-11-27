/** WR12 — stateless Lab audition. No changes to saved loadouts or simulation. */
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
import type {RetentionTransitionState} from './breach-weapon-retention-transition.ts';
import {retentionPoseSupported} from './breach-weapon-retention-pose.ts';
import {readSlingKind} from './breach-weapon-retention.ts';
export const RETENTION_LAB_MODES=['held-one','front-slung','side-slung','back-slung'] as const;
export function labRetentionSample(mode:string,slingId:string|undefined,weight:number,
 cycle:boolean,seconds:number):RetentionTransitionState|undefined{
 if(!RETENTION_LAB_MODES.includes(mode as RetentionPoseMode))return undefined;
 const target=mode as RetentionPoseMode;
 if(!retentionPoseSupported(target,readSlingKind(slingId)))return undefined;
 const phase=((Math.max(0,seconds)%3)/3);
 const w=cycle?Math.min(1,phase*4,(1-phase)*4):
  Math.max(0,Math.min(1,Number.isFinite(weight)?weight:0));
 return {mode:target,desired:cycle&&phase>.5?null:target,weight:w};
}

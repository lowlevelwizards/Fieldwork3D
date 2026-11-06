/** Replay R2: never derive forensic ballistics from expired visual tracers.
 * Captures every authoritative shot once at the 60 Hz recorder call-site,
 * independent of the 20 Hz visual film and the renderer's cosmetic cap.
 */
import type {Session,ShotEvent} from './breach-game.ts';
import type {WeaponId} from './breach-combat.ts';
export type RecordedShot=ShotEvent & {
  recordedAt:number;weaponAtFire?:WeaponId;suppressedAtFire?:boolean
};
const position=(p:{x:number;y:number})=>({x:p.x,y:p.y});

export class ReplayBallisticsRecorder{
  readonly shots:RecordedShot[]=[];
  private lastShotId=0;

  capture(s:Session):void{
    // Simulation IDs are monotonic. The transient live effects array can
    // expire a shot without removing the permanent history recorded here.
    for(const shot of s.shots){
      if(shot.id<=this.lastShotId)continue;
      const recordedAt=shot.firedAt??s.seconds-shot.age;
      const shooter=s.operators.find(a=>a.id===shot.shooterId);
      this.shots.push({
        ...shot,start:position(shot.start),end:position(shot.end),
        weaponAtFire:shooter?.weapon,
        suppressedAtFire:shooter?.weaponConfiguration?.slots.muzzle===
          'muzzle-suppressor',
        recordedAt:Number.isFinite(recordedAt)?recordedAt:s.seconds
      });
      this.lastShotId=shot.id;
    }
  }

  /** Binary search into a time-bounded history without copying all shots. */
  between(start:number,end:number,actorId?:string):RecordedShot[]{
    const entries=this.shots;
    if(!entries.length||end<start)return [];
    let lo=0,hi=entries.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(entries[mid].recordedAt<start)lo=mid+1;else hi=mid;
    }
    const found:RecordedShot[]=[];
    for(let i=lo;i<entries.length&&entries[i].recordedAt<=end;i++){
      const shot=entries[i];
      if(!actorId||shot.shooterId===actorId)found.push(shot);
    }
    return found;
  }
}

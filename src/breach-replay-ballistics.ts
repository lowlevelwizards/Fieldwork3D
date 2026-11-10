/** Replay R2: never derive forensic ballistics from expired visual tracers.
 * Captures every authoritative shot once at the 60 Hz recorder call-site,
 * independent of the 20 Hz visual film and the renderer's cosmetic cap.
 */
import type {Session,ShotEvent} from './breach-game.ts';
import type {WeaponId} from './breach-combat.ts';
import {FAMILY_PARTS} from './equipment-weapon-families.ts';
export type RecordedShot=ShotEvent & {
  recordedAt:number;weaponAtFire?:WeaponId;suppressedAtFire?:boolean;
  receiverAtFire?:string;familyAtFire?:string;
  /** Visual preset caliber; firing mechanics remain class-based. */
  nominalCaliberAtFire?:string
};
const position=(p:{x:number;y:number})=>({x:p.x,y:p.y});
const nominalCaliber:Record<string,string>={
  stanag:'5.56×45 mm',ak762:'7.62×39 mm',ak545:'5.45×39 mm',
  hk762:'7.62×51 mm',hk556:'5.56×45 mm',hk9:'9×19 mm'
};

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
        receiverAtFire:shooter?.weaponConfiguration?.build?.parts.receiver,
        familyAtFire:shooter?.weaponConfiguration?.build?.family,
        nominalCaliberAtFire:nominalCaliber[
          FAMILY_PARTS[shooter?.weaponConfiguration?.build?.parts.receiver??'']?.feed??''],
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

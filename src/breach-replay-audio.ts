/** Replay R2: immutable semantic sound track built from recorded outcomes.
 * Indexed interval queries never re-simulate world state or play sounds
 * during a seek. A playback controller chooses when to audition events.
 */
import type {BattleEvent} from './breach-combat.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import type {Pt} from './breach-core.ts';
import type {WeaponId} from './breach-combat.ts';

export type ReplaySoundKind='gunshot'|'door'|'flash'|'reload'|
  'interaction'|'surrender';
export type ReplaySoundEvent={
  id:string;t:number;kind:ReplaySoundKind;
  actorId:string|null;p:Pt|null;
  weapon:WeaponId|null;suppressed:boolean;
  hit:boolean;down:boolean;description?:string;
};
export class ReplaySoundTimeline{
  readonly events:readonly ReplaySoundEvent[];
  constructor(shots:readonly RecordedShot[],
    battle:readonly BattleEvent[]){
    const entries:ReplaySoundEvent[]=[];
    for(const shot of shots)
      entries.push({
        id:'shot:'+shot.id,t:shot.recordedAt,kind:'gunshot',
        actorId:shot.shooterId,p:{...shot.start},
        weapon:shot.weaponAtFire??'carbine',
        suppressed:shot.suppressedAtFire??false,
        hit:shot.hit,down:shot.down
      });
    for(const e of battle){
      if(e.kind!=='door'&&e.kind!=='flash'&&e.kind!=='reload'&&
        e.kind!=='interaction'&&e.kind!=='surrender')continue;
      entries.push({
        id:'battle:'+e.id,t:e.t,kind:e.kind,
        actorId:e.actor??null,p:e.p?{...e.p}:null,
        weapon:null,suppressed:false,hit:false,down:false,description:e.text
      });
    }
    entries.sort((a,b)=>a.t-b.t||a.id.localeCompare(b.id));
    this.events=entries;
  }
  /** Exclusive start and inclusive end: each event fires exactly once
   * while continuously advancing through time. Seeking calls no query.
   */
  between(start:number,end:number,max=12):ReplaySoundEvent[]{
    if(end<=start)return [];
    const a=this.events;
    let lo=0,hi=a.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(a[mid].t<=start)lo=mid+1;else hi=mid;
    }
    const result:ReplaySoundEvent[]=[];
    for(let i=lo;i<a.length&&a[i].t<=end&&result.length<max;i++)
      result.push(a[i]);
    return result;
  }
}

/** Replays retain the actual recorded door interaction, not just "door".
 * This never invents an event: it only selects the correct existing cue. */
export function replayDoorSoundId(description=''):string{
 if(description.includes('KICK RESISTED')||
    description.includes('FORCED OPEN')||
    description.includes('KICKED'))return 'doors.kick';
 if(description.includes('CLOSING'))return 'doors.close';
 return 'doors.open';
}

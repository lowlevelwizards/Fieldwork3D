/** Player-facing Bodycam eligibility for archived replay data.
 * An empty recorded sight array is VALID negative evidence; missing observer
 * evidence (legacy film) is NOT license to re-run line of sight.
 */
import type {ReplayKnowledge} from './breach-replay-visibility.ts';
import type {PersonalGroundBatch} from './breach-replay-personal-ground.ts';

export function bodycamEligibleObserverIds(
  sample:ReplayKnowledge|null|undefined,friendlies:readonly string[]
):string[]{
  const observed=sample?.operatorVisibleActorIds;
  if(!observed)return [];
  return friendlies.filter(id=>
    Object.prototype.hasOwnProperty.call(observed,id));
}
export function bodycamHasPersonalGround(
  batches:readonly PersonalGroundBatch[],observerId:string
):boolean{
  return batches.some(batch=>batch.observerId===observerId&&
    batch.keys.some(key=>key.startsWith('fine:')||
      key.startsWith('micro:')));
}
/** All footage is reconstructed; historical geometry is still a shared
 * mission recording, not proof that each object was personally inspected.
 */
export function bodycamDisclosureLabel(
  observerId:string,mount:'chest'|'helmet',groundEvidence:boolean
):string{
  return 'RECONSTRUCTED BODYCAM · '+
    observerId.toUpperCase()+' · '+mount.toUpperCase()+
    (groundEvidence?
      ' · PERSONAL CONTACTS · SHARED ARCHITECTURE':
      ' · PERSONAL GROUND UNAVAILABLE · SHARED ARCHITECTURE');
}

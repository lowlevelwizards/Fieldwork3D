/** Operator-contact review filters ONLY individual confirmed contacts and
 * non-sensitive self activity. The battlefield/fog stays the SHARED team map:
 * personal terrain/civilian/door knowledge is not in the film yet.
 * No guesswork from proximity, team visibility or omniscient state.
 */
import type {ReplayIndexedEvent} from './breach-replay-event-index.ts';
import type {ReplayKnowledge} from './breach-replay-visibility.ts';
import {recordedObserverCanSee} from './breach-replay-visibility.ts';
export const SELF_REVIEW_KINDS=new Set([
  'door','reload','flash','shot','blocked','resumed','completed',
  'waiting','recovering','wound','down','interaction'
]);
export function operatorContactEventKnown(
  e:ReplayIndexedEvent,
  knowledge:ReplayKnowledge|null|undefined,observerId:string,
  friendlyIds:ReadonlySet<string>
):boolean{
  if(!e.actor)return false;
  if(e.actor===observerId)
    return e.kind!=='intel'&&SELF_REVIEW_KINDS.has(e.kind);
  if(friendlyIds.has(e.actor))return false;
  return recordedObserverCanSee(knowledge,observerId,e.actor)===true;
}
export function operatorContactAvailable(
  knowledge:ReplayKnowledge|null|undefined,observerId:string
):boolean{
  return !!knowledge?.operatorVisibleActorIds&&
    Object.prototype.hasOwnProperty.call(
      knowledge.operatorVisibleActorIds,observerId);
}

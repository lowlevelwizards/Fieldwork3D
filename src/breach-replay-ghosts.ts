/** Replay R2: sample fixed historical actor facts for lightweight ghosts.
 * Never constructs additional full soldier rigs or touches simulation state.
 */
import type {ReplayFrame} from './breach-replay.ts';

type FrameLookup={at:(time:number)=>ReplayFrame|null};
export type ReplayGhost={
  actorId:string;p:{x:number;y:number};heading:number;
  ageSeconds:number;health:number;
};
export const GHOST_OFFSETS=[.5,1,2,4] as const;

export function sampleReplayGhosts(
  lookup:FrameLookup,time:number,actorIds:ReadonlySet<string>,
  offsets:readonly number[]=GHOST_OFFSETS
):ReplayGhost[]{
  const ghosts:ReplayGhost[]=[];
  for(const offset of offsets){
    if(time<offset)continue;
    const frame=lookup.at(time-offset);
    if(!frame)continue;
    for(const actor of frame.actors){
      if(!actorIds.has(actor.id))continue;
      ghosts.push({actorId:actor.id,p:{...actor.p},heading:actor.heading,
        ageSeconds:offset,health:actor.health});
    }
  }
  return ghosts;
}

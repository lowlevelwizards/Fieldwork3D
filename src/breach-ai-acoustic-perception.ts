/** Enemy acoustic observation intake, separate from intent/behavior.
 * Process each sound identifier at most once, preserving signal priority and
 * acquired evidence without learning hidden positions from presentation.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {interpretSound,soundPriority}
 from './breach-sound-evidence.ts';
import {addObservation} from './breach-awareness.ts';
import {observeSuspicion} from './breach-ai-suspicion.ts';
import {npcSoundResponse} from './breach-ai-identity.ts';

export function scanEnemySoundEvidence(s:Session,a:TeamActor):
 ReturnType<typeof interpretSound>{
 let strongest:ReturnType<typeof interpretSound>=null;
 const newestNoise=s.noise.at(-1);
 // The live event queue is append-only by increasing ID. Empty and fully
 // consumed queues cannot contain new evidence; no roster-times-queue scan.
 if(!newestNoise||newestNoise.id!==undefined&&newestNoise.id<=a.lastNoiseExaminedId&&
   newestNoise.time<=a.lastNoiseExaminedAt)return null;
 let priorPriority=-1;
 const walls=sessionWorldGeometry(s).walls;
 for(const sound of s.noise){
  if(sound.id!==undefined?sound.id<=a.lastNoiseExaminedId:
    sound.time<=a.lastNoiseExaminedAt)continue;
  if(s.seconds-sound.time>1)continue;
  const evidence=interpretSound(sound,a.id,a.p,s.doors,walls,s.windows);
  if(evidence){
   addObservation(a.awareness,{id:'audio/'+a.id+'/'+evidence.id,
    observerId:a.id,source:'auditory',at:evidence.at,
    estimate:evidence.estimate,uncertainty:evidence.uncertainty,
    kind:evidence.kind});
   const disposition=npcSoundResponse(evidence.kind,evidence.intensity,a.npcIdentity);
   if(disposition!=='ignore')observeSuspicion(a.suspicion,{
    id:'sound/'+evidence.id,at:evidence.at,
    kind:disposition==='alarm'?'alarm':
     disposition==='investigate'?'investigate':'orient',
    intensity:evidence.intensity,cause:evidence.kind
   });
   const urgency=soundPriority(disposition);
   if(urgency>0&&(urgency>priorPriority||
      urgency===priorPriority&&evidence.intensity>strongest!.intensity)){
     strongest=evidence;priorPriority=urgency;
   }
  }
 }
 if(newestNoise){
  a.lastNoiseExaminedId=Math.max(a.lastNoiseExaminedId,
   newestNoise.id??a.lastNoiseExaminedId);
  a.lastNoiseExaminedAt=Math.max(a.lastNoiseExaminedAt,newestNoise.time);
 }
 return strongest;
}

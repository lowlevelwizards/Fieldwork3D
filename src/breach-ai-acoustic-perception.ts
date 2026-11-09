/** Enemy acoustic observation intake, separate from intent/behavior.
 * Process each sound identifier at most once, preserving signal priority and
 * acquired evidence without learning hidden positions from presentation.
 */
import type {Session,TeamActor} from './breach-game.ts';
import {WALLS} from './breach-core.ts';
import {interpretSound,soundResponse,soundPriority}
 from './breach-sound-evidence.ts';
import {addObservation} from './breach-awareness.ts';
import {observeSuspicion} from './breach-ai-suspicion.ts';

export function scanEnemySoundEvidence(s:Session,a:TeamActor):
 ReturnType<typeof interpretSound>{
 let strongest:ReturnType<typeof interpretSound>=null;
 for(const sound of s.noise){
  if(sound.id!==undefined?sound.id<=a.lastNoiseExaminedId:
    sound.time<=a.lastNoiseExaminedAt)continue;
  if(s.seconds-sound.time>1)continue;
  const evidence=interpretSound(sound,a.id,a.p,s.doors,WALLS,s.windows);
  if(evidence){
   addObservation(a.awareness,{id:'audio/'+a.id+'/'+evidence.id,
    observerId:a.id,source:'auditory',at:evidence.at,
    estimate:evidence.estimate,uncertainty:evidence.uncertainty,
    kind:evidence.kind});
   const disposition=soundResponse(evidence.kind,evidence.intensity);
   if(disposition!=='ignore')observeSuspicion(a.suspicion,{
    id:'sound/'+evidence.id,at:evidence.at,
    kind:disposition==='alarm'?'alarm':
     disposition==='investigate'?'investigate':'orient',
    intensity:evidence.intensity,cause:evidence.kind
   });
   const urgency=soundPriority(disposition);
   const prior=strongest?soundPriority(
    soundResponse(strongest.kind,strongest.intensity)):-1;
   if(urgency>0&&(urgency>prior||
      urgency===prior&&evidence.intensity>strongest!.intensity))
     strongest=evidence;
  }
 }
 const newestNoise=s.noise.at(-1);
 if(newestNoise){
  a.lastNoiseExaminedId=Math.max(a.lastNoiseExaminedId,
   newestNoise.id??a.lastNoiseExaminedId);
  a.lastNoiseExaminedAt=Math.max(a.lastNoiseExaminedAt,newestNoise.time);
 }
 return strongest;
}

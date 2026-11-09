/** Recorded replay disclosure and personal-sight evidence ownership.
 * This is archive knowledge, not a new LOS simulation or omniscient camera.
 */
import type {Session} from './breach-game.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {ReplayDisclosure} from './breach-replay-visibility.ts';
import {ReplayOperatorSightIndex} from './breach-replay-operator-sight.ts';
import {ReplayDoorKnowledgeHistory} from './breach-replay-door-knowledge.ts';
import {ReplayWindowKnowledgeHistory} from './breach-replay-window-knowledge.ts';
import {PersonalGroundHistory} from './breach-replay-personal-ground.ts';
export class ReplayKnowledgeController{
 omniscient=true;observerId:string|null=null;
 hasContactEvidence=false;
 sightIndex:ReplayOperatorSightIndex|null=null;
 doorHistory:ReplayDoorKnowledgeHistory|null=null;
 windowHistory:ReplayWindowKnowledgeHistory|null=null;
 personalGround:PersonalGroundHistory|null=null;
 groundLensOn=false;
 groundCacheObserver:string|null=null;
 groundCacheCount=-1;
 groundCacheSite:Session['site']|null=null;
 disclosure():ReplayDisclosure{
   return this.observerId?{mode:'operator',observerId:this.observerId}:
     this.omniscient?{mode:'full'}:{mode:'squad'};
 }
 reset():void{
   this.omniscient=true;this.observerId=null;this.hasContactEvidence=false;
   this.sightIndex=null;this.doorHistory=null;this.windowHistory=null;
   this.personalGround=null;this.groundLensOn=false;
   this.groundCacheObserver=null;this.groundCacheCount=-1;
   this.groundCacheSite=null;
 }
 prepare(recorder:MissionRecorder):void{
   this.reset();
   this.hasContactEvidence=recorder.frames.some(frame=>
     !!frame.knowledge?.operatorVisibleActorIds&&
     Object.keys(frame.knowledge.operatorVisibleActorIds).length>0);
   this.sightIndex=this.hasContactEvidence?
     new ReplayOperatorSightIndex(recorder.frames):null;
   this.doorHistory=recorder.doorKnowledge.observations.length?
     new ReplayDoorKnowledgeHistory(recorder.doorKnowledge.observations):null;
   this.windowHistory=recorder.windowKnowledge.observations.length?
     new ReplayWindowKnowledgeHistory(recorder.windowKnowledge.observations):null;
   this.personalGround=recorder.personalGround.length?
     new PersonalGroundHistory(recorder.personalGround):null;
 }
}

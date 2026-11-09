/** Owns recorded Director evidence, storyboard, grading and temporal state.
 * No DOM, render loop, simulation writes or live hidden-world queries here.
 * Rebuild on the chosen historical disclosure policy; never simulate sight.
 */
import {team,type Session} from './breach-game.ts';
import {MissionRecorder} from './breach-replay.ts';
import {ReplayEventIndex} from './breach-replay-event-index.ts';
import {buildReplayDirectorCues,type ReplayDirectorCue} from './breach-replay-director.ts';
import {buildDirectorFilmBeats,directorFilmBeatAt,directorFilmPair,
  type DirectorFilmBeat} from './breach-replay-director-film.ts';
import {ReplayDirectorStoryboard,composeReplayDirectorShots}
  from './breach-replay-director-reset.ts';
import {ReplayDirectorSubjectTimeline}
  from './breach-replay-director-subject-timeline.ts';
import {directorRecordedContact} from './breach-replay-director-contact.ts';
import {directorEditorialCandidates} from './breach-replay-director-edit.ts';
import {directorRecentAction} from './breach-replay-director-action.ts';
import {directorRecordedDiscovery} from './breach-replay-director-discovery.ts';
import type {DirectorShotGrade} from './breach-replay-director-grade.ts';
import {directorReplaySafeFrame} from './breach-replay-director-projection.ts';
import {buildDirectorTempoEdits,type DirectorTempoEdit}
  from './breach-replay-director-tempo.ts';
import {buildDirectorPlanIndex,directorIntentsAt,type DirectorPlanIndex}
  from './breach-replay-director-intent.ts';
import {buildDirectorFutureCues,directorFutureAt,type DirectorFutureCue}
  from './breach-replay-director-events.ts';
import {buildDirectorEntryEvents,directorFirstEntryAt,type DirectorEntryEvent}
  from './breach-replay-director-crossings.ts';
import type {DirectorShot} from './breach-replay-director-shots.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';

export type DirectorBuildContext={
 recorder:MissionRecorder;eventIndex:ReplayEventIndex;state:Session;
 observerId:string|null;omniscient:boolean;
 isShotVisible:(shot:RecordedShot)=>boolean;
 width:number;height:number;headerBottom:number;dockPixels:number;baseSpan:number;
};
export class ReplayDirectorController{
 cues:ReplayDirectorCue[]=[];
 future:DirectorFutureCue[]=[];
 planIndex:DirectorPlanIndex=new Map();
 filmBeats:DirectorFilmBeat[]=[];
 entries:DirectorEntryEvent[]=[];
 storyboard:ReplayDirectorStoryboard|null=null;
 subjectTimeline:ReplayDirectorSubjectTimeline|null=null;
 camEligibleObservers:readonly string[]=[];
 tempoEdits:DirectorTempoEdit[]=[];
 editNoticeUntil=0;editNoticeSeconds=0;
 target:DirectorShot|null=null;
 grade:DirectorShotGrade|null=null;
 gradeBucket=-1;gradeKey='';
 safeFrame:ReturnType<typeof directorReplaySafeFrame>|null=null;
 indexPlans(revisions:Parameters<typeof buildDirectorPlanIndex>[0]):void{
   this.planIndex=buildDirectorPlanIndex(revisions);
 }
 reset():void{
   this.cues=[];this.future=[];this.planIndex=new Map();
   this.filmBeats=[];this.entries=[];this.storyboard=null;
   this.subjectTimeline=null;this.camEligibleObservers=[];
   this.tempoEdits=[];this.editNoticeUntil=0;this.editNoticeSeconds=0;
   this.target=null;this.grade=null;this.gradeBucket=-1;
   this.gradeKey='';this.safeFrame=null;
 }
 rebuild({recorder,eventIndex,state,observerId,omniscient,isShotVisible,
   width,height,headerBottom,dockPixels,baseSpan}:DirectorBuildContext):void{
  // Only disclosed historical events are eligible for the director.
  this.cues=buildReplayDirectorCues(eventIndex.all);
  const friendlies=new Set(team(state).map(a=>a.id));
  this.future=buildDirectorFutureCues(eventIndex.all,
    friendlies);
  const doors=state.site?.doors??[];
  this.filmBeats=buildDirectorFilmBeats(
    recorder.ballistics.shots,eventIndex.all,
    t=>recorder.at(t),doors,friendlies,
    shot=>isShotVisible(shot));
  this.entries=buildDirectorEntryEvents(
    recorder.frames,doors,friendlies);
  this.tempoEdits=buildDirectorTempoEdits(recorder.frames,
    recorder.executionEvents,recorder.events,friendlies);
  const directorSafeFrame=directorReplaySafeFrame(width,height,headerBottom,dockPixels);
  this.safeFrame=directorSafeFrame;
  this.grade=null;this.gradeBucket=-1;this.gradeKey='';
  // The director knows the whole finished film. Fixed knots are lazily
  // solved from historical samples, independent of FPS or seek direction.
  const evidenceAt=(t:number)=>{

    const frame=recorder.at(t);
    if(!frame)return null;
    const actors=frame.actors.map(a=>({
      id:a.id,p:a.p,heading:a.heading,health:a.health,
      velocity:a.velocity,side:friendlies.has(a.id)?
        'blue' as const:'red' as const
    }));
    const intents=directorIntentsAt(frame,this.planIndex,
      doors,t,friendlies);
    const beat=directorFilmBeatAt(t,this.filmBeats);
    const contact=directorRecordedContact(frame,friendlies,
      beat?.actorId??null,observerId);
    const opposite=beat?.kind==='fight'?
      (beat.actorId===beat.shooterId?
        beat.targetId:beat.shooterId):null;
    // A future combat beat is NOT permission to place an undiscovered
    // enemy in the shot. Current individual observation is authoritative.
    const canShowPair=beat?.kind==='fight'&&t>=beat.first&&
      !!opposite&&frame.actors.some(a=>a.id===opposite)&&
      (friendlies.has(opposite)||
       omniscient&&!observerId||
       !!contact&&contact.targetId===opposite&&
        contact.observerId===beat.actorId);
    // Never use a missed bullet's impact coordinate as a human target.
    // FULL SIGHT may frame a physically present recorded enemy; TEAM and
    // OPERATOR views require actual historical actor observation.
    const directorContext={
        intents,upcoming:directorFutureAt(t,this.future),
        beat,contact,
        discovery:directorRecordedDiscovery(frame,
          recorder.at(Math.max(0,t-1.1)),friendlies),
        actionPair:canShowPair&&beat?
          directorFilmPair(beat,frame):null,
        actionLines:directorRecentAction(recorder.ballistics.between(
          Math.max(0,t-.72),t),t,isShotVisible),
        entry:directorFirstEntryAt(t,this.entries,2.2,1.4),
        doors:frame.doors,cover:frame.coverState,
        usableWidth:width<500?.75:.85,
        usableHeight:height<520?.68:.81,maxZoom:14,
        safeFrame:directorSafeFrame
      };
    const stories=directorEditorialCandidates(t,actors,directorContext,5);
    return {actors,directorContext,stories};
  };
  // Camera choice is irrelevant to this film-time subject auction.
  // Personal camera eligibility comes only from recorded operator sight,
  // never a newly simulated line of sight.
  const eligible=new Set<string>();
  for(const frame of recorder.frames)
    for(const id of Object.keys(frame.knowledge?.operatorVisibleActorIds??{}))
      if(friendlies.has(id))eligible.add(id);
  this.camEligibleObservers=[...eligible].sort();
  this.subjectTimeline=eligible.size?
    new ReplayDirectorSubjectTimeline(recorder.duration,t=>
      evidenceAt(t)?.stories.filter(s=>eligible.has(s.primaryActorId))??[],
      {step:.5,minResidence:1.5,switchAdvantage:1.6}):null;
  // The established OTS storyboard is untouched by the CAM presentation.
  // Both camera modes consume the same historical editorial evidence.
  this.storyboard=new ReplayDirectorStoryboard(recorder.duration,t=>{
    const data=evidenceAt(t);
    if(!data)return null;
    const {actors,directorContext,stories}=data;
    const proposals=stories.flatMap(editorial=>composeReplayDirectorShots(
      t,actors,state.site?.rooms??[],state.site?.walls??[],
      width/Math.max(1,height),0,baseSpan,
      {...directorContext,editorial}));
    // At most ten measured alternatives at a fixed film-time knot;
    // this is not a new render-frame search or a hidden-world query.
    return proposals.sort((a,b)=>(b.decisionScore??-Infinity)-
      (a.decisionScore??-Infinity)).slice(0,10);
  },{step:.5,maxCache:96,rooms:state.site?.rooms??[],
    walls:state.site?.walls??[],cover:state.site?.cover??[],
    doors:state.site?.doors??[],
    sceneAt:t=>{
      const sample=recorder.at(t);
      return {doors:sample?.doors??[],cover:sample?.coverState??[]};
    },
    aspect:width/Math.max(1,height),
    baseSpan:baseSpan,
    usableWidth:width<500?.75:.83,
    usableHeight:height<520?.69:.77,
    safeFrame:directorSafeFrame});
  this.target=null;
  

 }
}

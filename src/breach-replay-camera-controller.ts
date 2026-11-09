/** Replay camera presentation authority.
 * Applies recorded Director shots or ordinary replay follow targets.
 * Does not mutate the authoritative mission simulation or reveal actors.
 */
import {team,type Session} from './breach-game.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {MissionRecorder} from './breach-replay.ts';
import {replayCameraTarget,easeReplayCamera,type ReplayCameraMode}
  from './breach-replay-director.ts';
import {gradeActualDirectorShot} from './breach-replay-director-grade.ts';
import {directorFilmBeatAt} from './breach-replay-director-film.ts';
import {resolvedReplayCamera,type ReplayPerspective}
  from './breach-replay-ui-state.ts';
import {ReplayDirectorController} from './breach-replay-director-controller.ts';
import type {ReplayDisclosure} from './breach-replay-visibility.ts';
import type {BodycamMount} from './breach-replay-bodycam-controller.ts';

export type ReplayCameraContext={
 dt:number;instant?:boolean;replaying:boolean;
 manualBodycamActive?:boolean;
 stage:TacticalScene3D|null;viewMode:ViewMode;
 state:Session;recorder:MissionRecorder;replayTime:number;
 replayContactObserverId:string|null;replayOmniscient:boolean;
 cssW:number;cssH:number;replayFollowStatus:HTMLElement;
 debugPanel:HTMLOutputElement|null;
};
export class ReplayCameraController{
 readonly director=new ReplayDirectorController();
 mode:ReplayCameraMode='free';
 follow=false;followId='rook';
 lens:'ortho'|'wide'|'cam'='ortho';
 camMount:BodycamMount='chest';
 /** The one operator whose historical model the renderer is currently using. */
 directorCamActor:string|null=null;
 camDecision:string|null=null;
 private appliedCamMount:BodycamMount|null=null;
 directorCamDisclosure():ReplayDisclosure|null{
   return this.mode==='director'&&this.lens==='cam'&&
     this.directorCamActor?
     {mode:'operator',observerId:this.directorCamActor}:null;
 }
 selectMode(wanted:ReplayCameraMode,view:ReplayPerspective,
    hasScene:boolean,bodycamActive:boolean):ReplayCameraMode{
   const available=resolvedReplayCamera(wanted,view,hasScene,bodycamActive);
   // A camera mode is not active merely because a UI button requested it.
   // The Director requires a prepared historical film to become selectable.
   this.mode=available==='director'&&!this.director.storyboard?'free':available;
   this.follow=this.mode==='operator';
   if(this.mode!=='director')this.director.target=null;
   return this.mode;
 }
 reset(stage:TacticalScene3D|null=null):void{
   this.mode='free';this.follow=false;this.followId='rook';this.lens='ortho';
   this.camMount='chest';this.directorCamActor=null;
   this.camDecision=null;this.appliedCamMount=null;
   this.director.reset();
   stage?.setReplayDirectorCameraAnchor(null);
   stage?.setReplayDirectorFocus(null);
   stage?.setReplayDirectorSubjects([]);
   stage?.setReplayBodycam(null);
 }
 advance({dt,instant=false,replaying,manualBodycamActive=false,
   stage,viewMode,state,recorder,replayTime,
   replayContactObserverId,replayOmniscient,cssW,cssH,replayFollowStatus,
   debugPanel}:ReplayCameraContext):void{

  if(!replaying||!stage)return;
  if(viewMode==='plan2d'){
    // The 3D scene clears its camera on leaving ISO. Clear our applied
    // mount too, or returning to ISO may wrongly think CAM is installed.
    if(this.directorCamActor){
      stage.setReplayBodycam(null);
      this.directorCamActor=null;this.appliedCamMount=null;
    }
    return;
  }
  const actors=state.operators.map(a=>({
    id:a.id,p:a.p,side:a.side,health:a.health,heading:a.heading
  }));
  if(this.mode==='director'){
    if(this.lens==='cam'){
      // Separate SUBJECT timeline: no room geometry, legal shoulder,
      // projection grade or OTS fallback can decide whether CAM activates.
      const chosen=this.director.subjectTimeline?.sample(replayTime)??null;
      const eligible=this.director.camEligibleObservers;
      const actorId=chosen?.actorId??(
        this.directorCamActor&&eligible.includes(this.directorCamActor)?
          this.directorCamActor:
        actors.find(a=>a.side==='blue'&&a.health>0&&
          eligible.includes(a.id))?.id??null);
      this.camDecision=chosen?.cutReason??'hold:recorded-operator';
      this.director.target=null;
      this.director.grade=null;delete replayFollowStatus.dataset.grade;
      stage.setReplayDirectorCameraAnchor(null);
      stage.setReplayDirectorFocus(null);
      stage.setReplayDirectorSubjects([]);
      if(!actorId){
        // No personal evidence: stay in Director with an explicit status.
        // Never silently switch to free or expose squad/full-sight actors.
        if(this.directorCamActor)stage.setReplayBodycam(null);
        this.directorCamActor=null;this.appliedCamMount=null;
        replayFollowStatus.title='Director CAM unavailable: no recorded personal sight';
        if(debugPanel)debugPanel.hidden=true;
        return;
      }
      if(actorId!==this.directorCamActor||
         this.camMount!==this.appliedCamMount){
        // Reuse the exact helmet/chest socket, owner mask and smoothing
        // from manual Bodycam. A new actor is a HARD camera cut.
        stage.setReplayBodycam({actorId,mount:this.camMount,
          stabilization:'balanced',fov:95});
        this.appliedCamMount=this.camMount;
      }
      this.directorCamActor=actorId;
      replayFollowStatus.title='RECONSTRUCTED DIRECTOR CAM · '+
        actorId.toUpperCase()+' · '+this.camMount.toUpperCase()+
        ' · '+(chosen?.reason??'recorded perspective')+
        ' · '+this.camDecision;
      if(debugPanel){
        debugPanel.hidden=false;
        debugPanel.textContent='DIRECTOR CAM · '+
          actorId.toUpperCase()+' · '+this.camMount.toUpperCase()+
          '\nSUBJECT '+(chosen?.reason??'recorded perspective')+
          '\nDECISION '+this.camDecision+
          '\nNO CINEMATIC CAMERA STAGING';
      }
      return;
    }
    // Leaving CAM restores the unchanged ORTHO/WIDE presenter.
    if(this.directorCamActor){
      stage.setReplayBodycam(null);
      this.directorCamActor=null;this.appliedCamMount=null;
      this.camDecision=null;
    }
    const target=this.director.storyboard?.sample(replayTime)??null;
    this.director.target=target;
    
    if(!target){
      // A missing/invalid filmed shot cannot leave the UI in Director mode
      // while the scene silently falls back to the ordinary projection.
      this.mode='free';this.follow=false;
      this.director.grade=null;
      delete replayFollowStatus.dataset.grade;
      replayFollowStatus.title='Director unavailable: no valid recorded shot';
      stage.setReplayDirectorCameraAnchor(null);
      stage.setReplayDirectorFocus(null);
      stage.setReplayDirectorSubjects([]);
      if(debugPanel)debugPanel.hidden=true;
      return;
    }
    // Grade the ACTUAL held/tracked camera, not the raw staging candidate.
    // Sample at 8 Hz for iPhone cost control; seeking and shot changes
    // invalidate immediately. The label remains visible in screenshots.
    const gradeBucket=Math.floor(replayTime*8);
    const gradeKey=(target.editorialId??'unknown')+'|'+
      this.lens+'|'+(replayContactObserverId??'team')+
      '|'+String(replayOmniscient)+'|'+target.cameraDecision;
    if(gradeBucket!==this.director.gradeBucket||
       gradeKey!==this.director.gradeKey||instant){
      const current=recorder.at(replayTime);
      if(current){
        const friendlies=new Set(team(state).map(a=>a.id));
        const visibleHostiles=new Set<string>(
          replayOmniscient&&!replayContactObserverId?
            current.actors.filter(a=>!friendlies.has(a.id)).map(a=>a.id):
          replayContactObserverId?
            current.knowledge?.operatorVisibleActorIds?.[
              replayContactObserverId]??[]:
            current.knowledge?.visibleActorIds??[]);
        this.director.grade=gradeActualDirectorShot({
          shot:target,current,
          previous:recorder.at(Math.max(0,replayTime-1.1)),
          friendlies,visibleHostiles,
          rooms:state.site?.rooms??[],walls:state.site?.walls??[],
          lens:this.lens,aspect:cssW/Math.max(1,cssH),
          baseSpan:stage.replayCameraBaseSpan(),
          safeFrame:this.director.safeFrame??undefined});
        this.director.gradeBucket=gradeBucket;
        this.director.gradeKey=gradeKey;
        const grade=this.director.grade;
        replayFollowStatus.dataset.grade=grade.grade+
          (grade.confidence==='limited'?'?':'')+' · '+grade.score;
        replayFollowStatus.title='DIRECTOR SELF-GRADE '+
          grade.grade+' ('+grade.score+'/100) · '+grade.summary+
          ' · '+grade.decision;
      }
    }
    if(debugPanel){
      debugPanel.hidden=false;
      const beat=directorFilmBeatAt(replayTime,this.director.filmBeats);
      debugPanel.textContent='DIRECTOR FILM · '+
        target.shotType.toUpperCase()+
        (this.director.grade?'\nSELF-GRADE '+
          this.director.grade.grade+' · '+
          this.director.grade.score+'/100'+
          '\nMODEL CONFIDENCE '+this.director.grade.confidence+
          '\nASSESSMENT '+this.director.grade.summary+
          '\nVISIBLE HERO '+this.director.grade.subjectVisible+
          ' / ENEMY '+this.director.grade.targetVisible+
          '\nLOOK IN FRAME '+this.director.grade.attentionVisible+
          ' / SUPPORT '+this.director.grade.supportVisible+
          '\nNEW GROUND '+this.director.grade.discovery.newGround+
          ' / ACQUISITIONS '+
            this.director.grade.discovery.newHostiles:'')+
        '\\nBEAT '+(beat?.kind.toUpperCase()??'TRAVEL')+
        '\\nSUBJECTS '+target.subjects.join(', ')+
        '\\nDOOR '+(target.doorId??'—')+
        '\\nLENS '+this.lens.toUpperCase()+
        '\\nZOOM '+target.zoom.toFixed(2)+
        ' / OCC '+target.occluded+
        '\\nROOM '+(target.roomId??'—')+
        '\\nSHOT '+(target.editorialId??'legacy')+
        '\\nDECISION '+(target.cameraDecision??'framing')+
        '\\nREASON '+(target.editReason??'—')+
        '\\nTARGET '+(target.requiredPoints?.length??0)+
        ' REQUIRED / WIDE '+(target.wideCoverage?'FIT':'CROP')+
        '\\nSELECTED UTILITY '+(target.decisionScore?.toFixed(1)??'—')+
        ' / '+(target.decisionReason??'—')+
        '\\nANGLE '+(target.decisionBreakdown?.viewpoint??'unknown')+
        ' / FRAME '+(target.decisionBreakdown?.framing??'unknown')+
        '\\nRUNNER-UPS '+(target.decisionAlternatives?.map(c=>
          c.id+' '+c.score.toFixed(1)+' ('+c.viewpoint+'/'+c.framing+
          ': '+c.reason+')').join(' | ')??'none')+
        '\\nCOMPOSITION '+(target.compositionQuality?
          target.compositionQuality.score.toFixed(1)+' / OTS '+
          (target.compositionQuality.shoulderReadable?'CLEAR':'FALLBACK'):
          'LEGACY')+
        '\\nVISIBILITY '+Math.round((target.subjectVisibility??0)*100)+'%'+
        '\\nTEMPO '+this.director.tempoEdits.length+' EDITS';
    }
    // No reactive hold/reorientation race and no frame-rate-dependent
    // orbit damping. The camera follows the precomputed film-time path.
    stage.view.focus=target.focus;
    stage.view.zoom=target.zoom;
    stage.view.yaw=target.yaw;
    stage.view.pitch=target.pitch;
    stage.setReplayDirectorCameraAnchor(target.cameraAnchor,
      target.fov??108,this.lens);
    stage.setReplayDirectorFocus(target.focus);
    stage.setReplayDirectorSubjects(actors.filter(a=>a.side==='blue'&&
      target.subjects.includes(a.id)).map(a=>a.p));
    return;
  }
  stage.setReplayDirectorCameraAnchor(null);
  stage.setReplayDirectorFocus(null);
  if(this.directorCamActor){
    // Manual Bodycam owns its own mount; do not clear it when a user
    // explicitly switches from auto CAM to manual first-person mode.
    if(!manualBodycamActive)stage.setReplayBodycam(null);
    this.directorCamActor=null;this.appliedCamMount=null;
    this.camDecision=null;
  }
  this.director.grade=null;
  delete replayFollowStatus.dataset.grade;
  replayFollowStatus.title='Replay camera';
  if(debugPanel)debugPanel.hidden=true;
  const target=replayCameraTarget(this.mode,replayTime,actors,
    this.followId,cssW/Math.max(1,cssH),this.director.cues);
  if(!target)return;
  const current={focus:stage.view.focus,zoom:stage.view.zoom,kind:target.kind};
  const next=easeReplayCamera(current,target,dt,instant);
  stage.view.focus=next.focus;stage.view.zoom=next.zoom;

 }
}

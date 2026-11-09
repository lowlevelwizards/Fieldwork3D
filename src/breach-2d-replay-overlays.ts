/** Historical replay evidence overlays, independent of simulation authority. */
import {team,type Session} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import type {MissionRecorder} from './breach-replay.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';
import {sampleReplayGhosts} from './breach-replay-ghosts.ts';
import type {ReplayMovementHistory} from './breach-replay-movement-history.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
import type {ReplayCameraController} from './breach-replay-camera-controller.ts';
import type {ReplayBodycamController} from './breach-replay-bodycam-controller.ts';
export type Replay2DFrame={
 state:Session;replaying:boolean;selected:string;recorder:MissionRecorder;
 selectedReplayShotId:number|null;
 replayTraceMode:'off'|'recent'|'selected';
 replayTrailMode:'off'|'recent'|'full';
 replayGhostMode:'off'|'selected'|'squad';
 replayNameTags:boolean;viewScale:number;
 replayMovementHistory:ReplayMovementHistory|null;
};
export type Replay2DDrawing={
 draw:CanvasRenderingContext2D;
 getFrame:()=>Replay2DFrame;
 worldToScreen:(p:Pt,height?:number)=>Pt;
 colorFor:(id:string)=>string;
 historicalShotVisible:(shot:RecordedShot)=>boolean;
 replayPlayback:ReplayPlaybackController;
 replayCamera:ReplayCameraController;
 replayBodycam:ReplayBodycamController;
};
export function createBreach2DReplayOverlays({
 draw,getFrame,worldToScreen,colorFor,historicalShotVisible,
 replayPlayback,replayCamera,replayBodycam
}:Replay2DDrawing){
function renderReplayBallistics(projected:boolean):void{
  const {replaying,replayTraceMode,recorder,selected,selectedReplayShotId}=getFrame();
  if(!replaying||replayTraceMode==='off')return;
  const windowSeconds=replayTraceMode==='selected'?10:3;
  const recent=recorder.ballistics.between(
    Math.max(0,replayPlayback.time-windowSeconds),replayPlayback.time,
    replayTraceMode==='selected'?selected:undefined);
  // Cap only the rendered strokes, not the permanent shot history.
  draw.save();draw.lineWidth=1.8;
  for(const shot of recent.slice(-128)){
    if(!historicalShotVisible(shot))continue;
    const from=projected?
      worldToScreen(shot.start,shot.muzzleHeight??16):shot.start;
    const to=projected?
      worldToScreen(shot.end,shot.impactHeight??7):shot.end;
    draw.globalAlpha=.83-.49*Math.min(1,
      (replayPlayback.time-shot.recordedAt)/windowSeconds);
    draw.strokeStyle=shot.side==='blue'?'#e8c985':'#d88d75';
    draw.setLineDash(shot.hit?[]:[4,4]);
    draw.beginPath();draw.moveTo(from.x,from.y);
    draw.lineTo(to.x,to.y);draw.stroke();
    draw.setLineDash([]);
    draw.fillStyle=shot.hit?'#efc2a0':'#b5a998';
    draw.beginPath();draw.arc(to.x,to.y,shot.hit?4:2.5,0,Math.PI*2);
    draw.fill();
  }
  const selectedShot=selectedReplayShotId===null?null:
    recorder.ballistics.shots.find(s=>s.id===selectedReplayShotId);
  if(selectedShot&&historicalShotVisible(selectedShot)){
    const a=projected?worldToScreen(selectedShot.start,selectedShot.muzzleHeight??16):selectedShot.start;
    const b=projected?worldToScreen(selectedShot.end,selectedShot.impactHeight??7):selectedShot.end;
    draw.save();draw.globalAlpha=1;draw.strokeStyle='#f5e8b3';draw.lineWidth=3;
    draw.setLineDash([]);draw.beginPath();draw.moveTo(a.x,a.y);
    draw.lineTo(b.x,b.y);draw.stroke();
    draw.fillStyle='#fff0a6';draw.beginPath();draw.arc(b.x,b.y,6,0,Math.PI*2);
    draw.fill();draw.restore();
  }
  draw.restore();
}
/** Ghost sprites are intentionally abstract and share the operator palette. */
/** Replay R3: actual recorded route — not authored waypoints. */
/** Camera-follow selection is a spatial affordance, not just a HUD label.
 * The ring sits on the actual historical friendly; no enemy data is used. */
function renderReplayFollowMarker(projected:boolean):void{
  const {replaying,replayNameTags,state,viewScale}=getFrame();
  if(!replaying||!replayNameTags||replayCamera.mode!=='operator'||replayBodycam.active)return;
  const actor=team(state).find(a=>a.id===replayCamera.followId&&a.health>0);
  if(!actor)return;
  const point=projected?worldToScreen(actor.p,21):actor.p;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
  const px=projected?1:1/Math.max(.3,viewScale);
  const radius=22*px;
  const pulse=1.5*Math.sin(replayPlayback.time*2.2);
  draw.save();
  draw.lineWidth=3*px;
  draw.strokeStyle='#1b302b';
  draw.beginPath();draw.arc(point.x,point.y,radius+2*px,0,Math.PI*2);
  draw.stroke();
  draw.lineWidth=2.3*px;
  draw.strokeStyle='#f0d394';
  draw.beginPath();draw.arc(point.x,point.y,radius+pulse*px,0,Math.PI*2);
  draw.stroke();
  draw.fillStyle='#f5e4bb';
  draw.font='700 '+(11*px)+'px "Saira Condensed",sans-serif';
  draw.textAlign='center';
  draw.fillText('FOLLOW · '+actor.name.toUpperCase(),
    point.x,point.y-(radius+10*px));
  draw.restore();
}
function renderReplayMovementHistory(projected:boolean):void{
  const {replaying,replayTrailMode,replayMovementHistory,state}=getFrame();
  if(!replaying||replayTrailMode==='off'||!replayMovementHistory)return;
  draw.save();draw.globalAlpha=.58;draw.lineWidth=2.15;draw.setLineDash([]);
  for(const a of team(state)){
    const trail=replayMovementHistory.segment(a.id,replayPlayback.time,
      replayTrailMode==='recent'?15:Infinity,350);
    if(trail.length<2)continue;
    draw.strokeStyle=colorFor(a.id);draw.beginPath();
    for(let i=0;i<trail.length;i++){
      const p=projected?worldToScreen(trail[i].p,2):trail[i].p;
      if(i===0)draw.moveTo(p.x,p.y);else draw.lineTo(p.x,p.y);
    }
    draw.stroke();
  }
  draw.restore();
}
function renderReplayGhosts(projected:boolean):void{
  const {replaying,replayGhostMode,selected,recorder,state}=getFrame();
  if(!replaying||replayGhostMode==='off')return;
  const ids=new Set(replayGhostMode==='selected'?[selected]:
    team(state).map(a=>a.id));
  const ghosts=sampleReplayGhosts(recorder,replayPlayback.time,ids);
  draw.save();draw.lineWidth=1.5;
  for(const ghost of ghosts){
    const p=projected?worldToScreen(ghost.p,20):ghost.p;
    draw.save();
    draw.translate(p.x,p.y);draw.rotate(ghost.heading);
    draw.globalAlpha=.34/(1+ghost.ageSeconds*.28);
    draw.strokeStyle=colorFor(ghost.actorId);
    draw.fillStyle=colorFor(ghost.actorId);
    // Simple body-and-weapon symbol; never creates another expensive rig.
    draw.strokeRect(-7,-5,14,10);
    draw.fillRect(4,-2,8,4);
    draw.restore();
  }
  draw.restore();
}

 return {renderReplayBallistics,renderReplayFollowMarker,
   renderReplayMovementHistory,renderReplayGhosts};
}

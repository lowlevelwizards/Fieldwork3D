/** R8: composition executes an editorial shot, never selects its story.
 * The physical solver chooses legal staging; projection computes fit.
 * No duplicate yaw-score search, subject-group re-ranking, or 4-person
 * mandatory framing requirement.
 */
import type {DirectorActor,DirectorRoom,DirectorWall,CinematicShot}
  from './breach-replay-cinematic-director.ts';
import type {DirectorIntent} from './breach-replay-director-intent.ts';
import type {DirectorFutureCue} from './breach-replay-director-events.ts';
import type {DirectorFilmBeat} from './breach-replay-director-film.ts';
import type {DirectorEntryEvent} from './breach-replay-director-crossings.ts';
import {selectDirectorEditorialShot,type DirectorEditorialShot}
  from './breach-replay-director-edit.ts';
import {physicalDirectorView,directorLineBlocked}
  from './breach-replay-director-physical.ts';
import {directorOrthoFittingZoom,directorPerspectiveCovers,
  type DirectorSafeFrame}
  from './breach-replay-director-projection.ts';
import type {Door,Obstacle} from './breach-core.ts';

export type DirectorShotType='travel'|'approach'|'stack'|'breach'|
  'entry'|'contact'|'overwatch'|'reorientation';
type Pt={x:number;y:number};
export type DirectorShotContext={
  intents:readonly DirectorIntent[];
  upcoming:DirectorFutureCue|null;
  beat?:DirectorFilmBeat|null;
  actionPair?:{shooter:Pt;target:Pt}|null;
  entry?:DirectorEntryEvent|null;
  editorial?:DirectorEditorialShot|null;
  usableWidth?:number;usableHeight?:number;
  safeFrame?:DirectorSafeFrame;
  maxZoom?:number;maxSubjects?:number;
  doors?:readonly Pick<Door,'a'|'b'|'open'|'openFraction'|'style'|'kind'|'hinge'|'swing'|'slideDirection'>[];
  cover?:readonly Pick<Obstacle,'x'|'y'|'w'|'h'|'low'|'fixture'>[]
};
export type DirectorShot=CinematicShot&{
  shotType:DirectorShotType;subjects:string[];doorId:string|null;
  score:number;occluded:number;motion:number;beatId:string|null;
  cameraAnchor:Pt;fov?:number;
  operatorPoint?:Pt;framePoints?:Pt[];
  attentionPoint?:Pt|null;followDirection?:Pt|null;
  firstEntry?:boolean;actionWeight?:number;
  /** Declarative cinematography from the only editorial authority. */
  editorialId?:string;editorialKind?:DirectorEditorialShot['kind'];
  editorialPriority?:number;primaryActorId?:string;
  requiredPoints?:Pt[];actionAxis?:Pt|null;editReason?:string;
  /** Perspective can legitimately fail to cover all required subjects.
   * Never misreport a failed two-shot as successful. */
  wideCoverage?:boolean;
  compositionQuality?:import('./breach-replay-director-projection.ts').DirectorCompositionQuality;
  subjectVisibility?:number;subjectReadable?:boolean;
  /** HOLD/REFRAME/TRACK/CUT derived from storyboard decision. */
  cameraDecision?:string
};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:Pt,b:Pt,t:number):Pt=>({
  x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const unit=(p:Pt):Pt=>{
  const n=Math.hypot(p.x,p.y);
  return n>.001?{x:p.x/n,y:p.y/n}:{x:1,y:0};
};
const clip=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function shotType(plan:DirectorEditorialShot,
  ctx:DirectorShotContext):DirectorShotType{
  switch(plan.kind){
    case 'engage':return 'contact';
    case 'entry':return 'entry';
    case 'follow':return 'travel';
    case 'establish':return 'reorientation';
    case 'settle':return 'overwatch';
    case 'door':{
      if(ctx.beat?.kind==='door')return 'breach';
      const intent=ctx.intents.find(i=>i.actorId===plan.primaryActorId);
      if(intent?.kind==='breach')return 'breach';
      if(intent?.kind==='entry')return 'entry';
      if(intent?.kind==='stack')return 'stack';
      return 'approach';
    }
  }
}
export function composeReplayDirectorShot(time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],aspect:number,
  _currentYaw:number,baseSpan:number,
  context:DirectorShotContext):DirectorShot|null{
  const friends=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  const plan=context.editorial??selectDirectorEditorialShot(time,
    friends,context);
  if(!plan)return null;
  const primary=friends.find(a=>a.id===plan.primaryActorId);
  if(!primary)return null;
  const included=[primary,...plan.secondaryActorIds.map(id=>
    friends.find(a=>a.id===id)).filter((a):a is DirectorActor=>!!a)];
  const featured=included.slice(0,Math.max(1,context.maxSubjects??4));
  const direction=unit(plan.actionDirection);
  const door=plan.door;
  // Camera looks toward the selected editorial subject's action, not
  // toward the numerical average of all four squad members.
  const anchor=plan.required[1]??plan.interest??{
    x:primary.p.x+direction.x*56,
    y:primary.p.y+direction.y*56};
  const isContact=plan.kind==='engage';
  const isDoor=plan.kind==='door'||plan.kind==='entry';
  const focus=mix(primary.p,anchor,
    isContact?.54:isDoor?.59:.37);
  const required=plan.required.slice();
  // Optional teammates affect composition only when there is enough
  // room; they must never displace an actual shooter-target pair.
  const optional=plan.optional.filter(p=>dist(p,primary.p)<145);
  const fitSubjects=[...required,...optional.slice(
    0,isContact?0:isDoor?2:3)];
  let hero=primary;
  let physical=physicalDirectorView({
    operator:primary.p,focus,
    subjectPoints:featured.map(a=>a.p),
    requiredPoints:required,
    // Doorway markers are not human targets; only real actors enter the
    // target silhouette coverage test.
    target:plan.target,
    preferredYaw:Math.atan2(-direction.x,-direction.y),
    followDirection:direction,
    doorPoint:plan.kind==='door'?door?.mid??null:null,
    doorNormal:plan.kind==='door'?door?.normal??null:null,
    targetWeight:isContact?270:isDoor?210:125,
    composition:{treatment:plan.kind,
      baseSpan,usableWidth:context.usableWidth??.78,
      usableHeight:context.usableHeight??.76,
      safeFrame:context.safeFrame}
  },{rooms,walls,doors:context.doors,cover:context.cover},aspect);
  // If the nominated protagonist is truly invisible, the final fallback
  // is another historically recorded friendly. This is a cutaway, not
  // license to reveal undisclosed combatants or shoot through solid walls.
  if(physical.subjectReadable===false){
    for(const alternate of featured.filter(a=>a.id!==primary.id)){
      const recovered=physicalDirectorView({
        operator:alternate.p,
        focus:{x:alternate.p.x+direction.x*27,
          y:alternate.p.y+direction.y*27},
        subjectPoints:featured.map(a=>a.p),
        requiredPoints:[alternate.p],target:null,
        preferredYaw:Math.atan2(-direction.x,-direction.y),
        followDirection:direction,targetWeight:0,
        composition:{treatment:'follow',baseSpan,
          usableWidth:context.usableWidth??.78,
          usableHeight:context.usableHeight??.76,
          safeFrame:context.safeFrame}
      },{rooms,walls,doors:context.doors,cover:context.cover},aspect);
      if(recovered.subjectReadable&&
        (recovered.subjectVisibility??0)>(physical.subjectVisibility??0)+.12){
        hero=alternate;physical=recovered;break;
      }
    }
  }
  const activeRequired=hero===primary?required:[hero.p];
  const legalRequired=activeRequired.filter(p=>
    !directorLineBlocked(physical.cameraAnchor,p,
      {rooms,walls,doors:context.doors,cover:context.cover}));
  const mandatory=[hero.p,...legalRequired.filter(p=>
    dist(p,hero.p)>.01)];
  const points=[...mandatory,...fitSubjects.filter(p=>
    dist(p,hero.p)>1&&
    !mandatory.some(v=>dist(v,p)<1)&&
    !directorLineBlocked(physical.cameraAnchor,p,
      {rooms,walls,doors:context.doors,cover:context.cover}))];
  const safeWidth=clip(context.usableWidth??.78,.5,.92);
  const safeHeight=clip(context.usableHeight??.77,.5,.9);
  const zoom=directorOrthoFittingZoom(physical.cameraAnchor,
    physical.focus,points,aspect,baseSpan,
    safeWidth,safeHeight,
    Math.min(featured.length>2?7.4:8,context.maxZoom??14),
    .81,context.safeFrame);
  const yaw=Math.atan2(physical.cameraAnchor.x-physical.focus.x,
    physical.cameraAnchor.y-physical.focus.y);
  const tilt=Math.atan2(53-17,Math.max(1,
    dist(physical.cameraAnchor,physical.focus)));
  const wideCoverage=directorPerspectiveCovers(
    physical.cameraAnchor,physical.focus,mandatory,aspect,
    physical.fov,Math.min(.89,safeWidth+.1),
    Math.min(.9,safeHeight+.1),context.safeFrame);
  return {focus:physical.focus,zoom,
    yaw:(yaw+Math.PI*2)%(Math.PI*2),pitch:tilt,
    roomId:physical.roomId,actorsFramed:featured.length,
    kind:isContact||plan.kind==='door'?'action':'squad',
    shotType:shotType(plan,context),
    subjects:featured.map(a=>a.id),doorId:plan.doorId,
    score:plan.priority*20-physical.occluded*12,
    occluded:physical.occluded,
    motion:featured.reduce((n,a)=>n+(
      context.intents.find(i=>i.actorId===a.id)?.speed??
      a.velocity??0),0),
    beatId:context.beat?.id??null,
    cameraAnchor:physical.cameraAnchor,
    fov:physical.fov,operatorPoint:{...hero.p},
    framePoints:points,
    attentionPoint:hero===primary?plan.target??door?.mid??null:null,
    followDirection:direction,
    firstEntry:plan.firstEntry,
    actionWeight:isContact?1:isDoor?.85:
      plan.kind==='follow'?.5:0,
    editorialId:hero===primary?plan.id:plan.id+':fallback:'+hero.id,
    editorialKind:plan.kind,
    editorialPriority:plan.priority,primaryActorId:hero.id,
    requiredPoints:mandatory,actionAxis:direction,
    editReason:hero===primary?plan.reason:
      'supporting operator cutaway: primary occluded',
    wideCoverage,compositionQuality:physical.compositionQuality,
    subjectVisibility:physical.subjectVisibility,
    subjectReadable:physical.subjectReadable};
}

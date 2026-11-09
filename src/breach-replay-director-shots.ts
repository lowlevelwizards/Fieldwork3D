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
import type {DirectorActionLine} from './breach-replay-director-action.ts';
import type {DirectorRecordedContact} from './breach-replay-director-contact.ts';
import type {DirectorDiscovery} from './breach-replay-director-discovery.ts';
import {selectDirectorEditorialShot,type DirectorEditorialShot}
  from './breach-replay-director-edit.ts';
import {scoreDirectorCandidate,type DirectorDecisionScore}
  from './breach-replay-director-decision.ts';
import {physicalDirectorView,physicalDirectorCandidates,directorLineBlocked}
  from './breach-replay-director-physical.ts';
import {directorOrthoFittingZoom,directorPerspectiveCovers,
  directorCompositionQuality,type DirectorSafeFrame}
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
  actionLines?:readonly DirectorActionLine[];
  contact?:DirectorRecordedContact|null;
  discovery?:DirectorDiscovery|null;
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
  /** Current subject's actual recorded importance, NOT camera quality. */
  subjectImportance?:number;subjectReason?:string;
  requiredPoints?:Pt[];actionAxis?:Pt|null;editReason?:string;
  /** Perspective can legitimately fail to cover all required subjects.
   * Never misreport a failed two-shot as successful. */
  wideCoverage?:boolean;
  compositionQuality?:import('./breach-replay-director-projection.ts').DirectorCompositionQuality;
  subjectVisibility?:number;subjectReadable?:boolean;
  foregroundOperatorPoints?:Pt[];
  /** Explicit real, disclosed enemy target. Never infer from an endpoint. */
  contactTargetPoint?:Pt|null;
  /** Actual newly discovered ground / sightline during this beat. */
  discoveryStrength?:number;
  /** HOLD/REFRAME/TRACK/CUT derived from storyboard decision. */
  cameraDecision?:string;
  /** Predicted utility is separate from the actual post-render grade. */
  decisionScore?:number;decisionReason?:string;
  decisionBreakdown?:DirectorDecisionScore;
  /** Losing bids remain visible in dev diagnostics, never in game intel. */
  decisionAlternatives?:Array<{id:string;score:number;reason:string;
    viewpoint:string;framing:string}>
};
/** R10.1 invariant: every final camera must be behind and well to
 * the side of the operator's ACTION axis, not merely their route. */
export function directorShoulderSide(shot:Pick<DirectorShot,
  'cameraAnchor'|'operatorPoint'|'actionAxis'>):number{
  const actor=shot.operatorPoint,axis=shot.actionAxis;
  if(!actor||!axis)return 0;
  const n=Math.hypot(axis.x,axis.y);
  if(n<.001)return 0;
  const dx=axis.x/n,dy=axis.y/n;
  const rx=shot.cameraAnchor.x-actor.x;
  const ry=shot.cameraAnchor.y-actor.y;
  const back=-(rx*dx+ry*dy);
  const lateral=rx*dy-ry*dx;
  return back>=18&&Math.abs(lateral)>=32&&
    Math.abs(lateral)>=back*.42?Math.sign(lateral):0;
}
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
export function composeReplayDirectorShots(time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],aspect:number,
  _currentYaw:number,baseSpan:number,
  context:DirectorShotContext):DirectorShot[]{
  const friends=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  const plan=context.editorial??selectDirectorEditorialShot(time,
    friends,context);
  if(!plan)return [];
  const primary=friends.find(a=>a.id===plan.primaryActorId);
  if(!primary)return [];
  const included=[primary,...plan.secondaryActorIds.map(id=>
    friends.find(a=>a.id===id)).filter((a):a is DirectorActor=>!!a)];
  const featured=included.slice(0,Math.max(1,context.maxSubjects??4));
  const direction=unit(plan.actionDirection);
  const movementIntent=context.intents.find(i=>i.actorId===primary.id);
  // Move alongside the true route, even while the operator's active
  // LOOK or WATCH leads the photographed content in another direction.
  const movementDirection=plan.kind==='follow'&&movementIntent?
    unit(movementIntent.direction):direction;
  const door=plan.door;
  // Camera looks toward the selected editorial subject's action, not
  // toward the numerical average of all four squad members.
  const anchor=plan.required[1]??plan.interest??{
    x:primary.p.x+direction.x*56,
    y:primary.p.y+direction.y*56};
  const isContact=plan.kind==='engage';
  const isDoor=plan.kind==='door'||plan.kind==='entry';
  // R10.0: a single action-leading shoulder rig. The focus stays in
  // FRONT of the acting operator, never at the squad centroid.
  const focus=mix(primary.p,anchor,
    isContact?.72:isDoor?.73:.66);
  const required=plan.required.slice();
  // Optional teammates affect composition only when there is enough
  // room; they must never displace an actual shooter-target pair.
  const optional=plan.optional.filter(p=>dist(p,primary.p)<145);
  const fitSubjects=[...required,...optional.slice(
    0,isContact?0:isDoor?1:1)];
  if((plan.discoveryStrength??0)>0&&plan.interest)
    fitSubjects.push(plan.interest);
  let hero=primary;
  let physicals=physicalDirectorCandidates({
    operator:primary.p,focus,
    // Every foreground teammate may hide the enemy, not just featured
    // actors participating in this editorial beat.
    subjectPoints:friends.map(a=>a.p),
    requiredPoints:required,
    // Doorway markers are not human targets; only real actors enter the
    // target silhouette coverage test.
    target:plan.target,
    preferredYaw:Math.atan2(-direction.x,-direction.y),
    followDirection:direction,
    motionSpeed:movementIntent?.speed??primary.velocity??0,
    // Entry and stack photographs deserve the door's full front face
    // just as much as the act of opening it.
    doorPoint:isDoor?door?.mid??null:null,
    doorNormal:isDoor?door?.normal??null:null,
    targetWeight:isContact?270:isDoor?210:125,
    actionLines:isContact?context.actionLines:undefined,
    composition:{treatment:plan.kind,
      baseSpan,usableWidth:context.usableWidth??.78,
      usableHeight:context.usableHeight??.76,
      safeFrame:context.safeFrame,
      discoveryStrength:plan.discoveryStrength??0,
      attentionPoint:plan.discoveryStrength?plan.interest:null}
  },{rooms,walls,doors:context.doors,cover:context.cover},aspect,3);
  // No approved legal shoulder: let the storyboard hold its existing shot.
  if(!physicals.length)return [];
  let physical=physicals[0];
  // If the nominated protagonist is truly invisible, the final fallback
  // is another historically recorded friendly. This is a cutaway, not
  // license to reveal undisclosed combatants or shoot through solid walls.
  if(physical.subjectReadable===false&&!isContact){
    for(const alternate of featured.filter(a=>a.id!==primary.id)){
      const recovered=physicalDirectorView({
        operator:alternate.p,
        focus:{x:alternate.p.x+direction.x*27,
          y:alternate.p.y+direction.y*27},
        subjectPoints:friends.map(a=>a.p),
        requiredPoints:[alternate.p],target:null,
        preferredYaw:Math.atan2(-direction.x,-direction.y),
        followDirection:direction,targetWeight:0,
        composition:{treatment:'follow',baseSpan,
          usableWidth:context.usableWidth??.78,
          usableHeight:context.usableHeight??.76,
          safeFrame:context.safeFrame}
      },{rooms,walls,doors:context.doors,cover:context.cover},aspect);
      if(recovered&&recovered.subjectReadable&&
        (recovered.subjectVisibility??0)>(physical.subjectVisibility??0)+.12){
        hero=alternate;physical=recovered;break;
      }
    }
  }
  if(hero!==primary)physicals=[physical];
  const scene={rooms,walls,doors:context.doors,cover:context.cover};
  const results:DirectorShot[]=[];
  // Only the strongest angle gets two gentle framing alternatives;
  // the physical solver already audited the other angles. A competing
  // focus never moves the camera through a wall or changes disclosure.
  for(const view of physicals){
    const d=unit({x:view.focus.x-view.cameraAnchor.x,
      y:view.focus.y-view.cameraAnchor.y});
    const shifts=[0]; // No independent left/right framing inventions.
    for(const side of shifts){
      const offset=isContact?12:isDoor?10:14;
      const proposedFocus={x:view.focus.x-d.y*side*offset,
        y:view.focus.y+d.x*side*offset};
      const physical={...view,focus:side&&
        !directorLineBlocked(view.cameraAnchor,proposedFocus,scene)?
        proposedFocus:view.focus};
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
  // A little more geography in hallway/door shots, without flattening
  // all of R9.3's compelling intimate two-person exchanges.
  const treatmentZoom=isContact?7.5:isDoor?7.0:
    plan.kind==='follow'?7.0:6.8;
  const zoom=directorOrthoFittingZoom(physical.cameraAnchor,
    physical.focus,points,aspect,baseSpan,
    safeWidth,safeHeight,
    Math.min(featured.length>2?
      Math.min(7.25,treatmentZoom):treatmentZoom,context.maxZoom??14),
    .81,context.safeFrame);
  const yaw=Math.atan2(physical.cameraAnchor.x-physical.focus.x,
    physical.cameraAnchor.y-physical.focus.y);
  const tilt=Math.atan2(53-17,Math.max(1,
    dist(physical.cameraAnchor,physical.focus)));
  // Check the ACTUAL final camera and zoom, not the physical solver's
  // preliminary candidate. Storyboard must know when an advertised
  // two-shot has in fact become a centered backpack.
  const finalQuality=directorCompositionQuality(
    physical.cameraAnchor,physical.focus,hero.p,
    isContact&&hero===primary?plan.target:null,
    direction,plan.kind,'ortho',aspect,baseSpan,zoom,physical.fov,
    safeWidth,safeHeight,context.safeFrame,friends.map(a=>a.p));
  if(isContact&&plan.target&&!physical.targetVisible)
    finalQuality.targetReadable=false;
  const wideCoverage=directorPerspectiveCovers(
    physical.cameraAnchor,physical.focus,mandatory,aspect,
    physical.fov,Math.min(.89,safeWidth+.1),
    Math.min(.9,safeHeight+.1),context.safeFrame);
  const built:DirectorShot={focus:physical.focus,zoom,
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
    attentionPoint:hero===primary?
      plan.target??door?.mid??(plan.discoveryStrength?plan.interest:null):
      null,
    followDirection:movementDirection,
    firstEntry:plan.firstEntry,
    actionWeight:isContact?1:isDoor?.85:
      plan.kind==='follow'?.5:0,
    editorialId:hero===primary?plan.id:plan.id+':fallback:'+hero.id,
    editorialKind:plan.kind,
    editorialPriority:plan.priority,primaryActorId:hero.id,
    requiredPoints:mandatory,actionAxis:direction,
    editReason:hero===primary?plan.reason:
      'supporting operator cutaway: primary occluded',
    wideCoverage,compositionQuality:finalQuality,
    subjectVisibility:physical.subjectVisibility,
    subjectReadable:physical.subjectReadable&&finalQuality.primaryReadable,
    foregroundOperatorPoints:friends.map(a=>a.p),
    contactTargetPoint:isContact?plan.target:null,
    discoveryStrength:plan.discoveryStrength??0};
      const decision=scoreDirectorCandidate(built,{
        scene,aspect,baseSpan,safeFrame:context.safeFrame});
      built.decisionScore=decision.score;
      built.decisionReason=decision.reason;
      built.decisionBreakdown=decision;
      if(decision.legal)results.push(built);
    }
  }
  // Final camera candidates must satisfy the same invariant as playback.
  // Rank only the approved shoulder rig's legal alternatives.
  return results.filter(s=>directorShoulderSide(s)!==0).sort((a,b)=>(b.decisionScore??-Infinity)-
    (a.decisionScore??-Infinity)||
    (a.cameraAnchor.x-b.cameraAnchor.x)||
    (a.cameraAnchor.y-b.cameraAnchor.y)).slice(0,7);
}
/** Compatibility API used by legacy benchmarks and single-shot callers. */
export function composeReplayDirectorShot(time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],aspect:number,
  currentYaw:number,baseSpan:number,
  context:DirectorShotContext):DirectorShot|null{
  return composeReplayDirectorShots(time,actors,rooms,walls,aspect,
    currentYaw,baseSpan,context)[0]??null;
}

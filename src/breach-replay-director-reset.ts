/**
 * Replay Director / clean-slate OTS v1.
 *
 * One shot grammar: the camera must be behind AND distinctly to one side
 * of the acting operator's current attention axis. A second shoulder is
 * another legal staging of the SAME shot, not a new cinematic shot type.
 *
 * Historical editorial evidence decides WHAT is worth filming. This module
 * decides WHERE a shoulder camera may stand and WHEN an edit is justified.
 * It never changes combat, tactical visibility, recorded events or fog.
 */
import type {DirectorActor,DirectorRoom,DirectorWall}
  from './breach-replay-cinematic-director.ts';
import type {DirectorShot,DirectorShotContext}
  from './breach-replay-director-shots.ts';
import {directorShoulderSide} from './breach-replay-director-shots.ts';
import {selectDirectorEditorialShot}
  from './breach-replay-director-edit.ts';
import {directorCameraLegal,directorLineBlocked,directorOperatorRoom,
  directorSubjectVisibility,type PhysicalDirectorScene}
  from './breach-replay-director-physical.ts';
import {directorOrthoFittingZoom,directorCompositionQuality,
  type DirectorSafeFrame} from './breach-replay-director-projection.ts';

type Pt={x:number;y:number};
type Staged=DirectorShot&{sceneStartIndex:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const length=(v:Pt)=>Math.hypot(v.x,v.y);
const dist=(a:Pt,b:Pt)=>length({x:a.x-b.x,y:a.y-b.y});
const unit=(v:Pt):Pt=>{
  const n=length(v);
  return n>.001?{x:v.x/n,y:v.y/n}:{x:1,y:0};
};
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const between=(a:Pt,b:Pt,p:number):Pt=>({
  x:lerp(a.x,b.x,p),y:lerp(a.y,b.y,p)});
const direction=(a:Pt,b:Pt)=>unit({x:b.x-a.x,y:b.y-a.y});
const yaw=(camera:Pt,focus:Pt)=>{
  const n=Math.atan2(camera.x-focus.x,camera.y-focus.y);
  return (n+Math.PI*2)%(Math.PI*2);
};
function sceneFor(rooms:readonly DirectorRoom[],walls:readonly DirectorWall[],
  context:DirectorShotContext):PhysicalDirectorScene{
  return {rooms,walls,doors:context.doors,cover:context.cover};
}
function shotType(kind:string):DirectorShot['shotType']{
  switch(kind){
    case 'engage':return 'contact';
    case 'entry':return 'entry';
    case 'door':return 'approach';
    case 'settle':return 'overwatch';
    case 'establish':return 'reorientation';
    default:return 'travel';
  }
}

/** A very small number of deliberate shoulder positions; no orbit search,
 * no frontal/reverse cameras and no scoring a generic "best view". */
export function composeReplayDirectorShots(
  _time:number,actors:readonly DirectorActor[],
  rooms:readonly DirectorRoom[],walls:readonly DirectorWall[],
  aspect:number,_yaw:number,baseSpan:number,
  context:DirectorShotContext
):DirectorShot[]{
  const friends=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  const plan=context.editorial??selectDirectorEditorialShot(_time,
    friends,context);
  if(!plan)return [];
  const actor=friends.find(a=>a.id===plan.primaryActorId);
  if(!actor)return [];
  const intent=context.intents.find(i=>i.actorId===actor.id);
  const knownTarget=plan.kind==='engage'?plan.target:null;
  // The door is a useful setup, but once the first operator has crossed
  // the threshold it is BEHIND the action. Follow the entrant's current
  // movement / attention into the room, never look back at the old leaf.
  const doorway=plan.kind==='door'||
    (plan.kind==='entry'&&!plan.firstEntry)?
    plan.door?.mid??plan.target:null;
  const observed=knownTarget??doorway;
  // The action axis overrides the route when looking, watching or
  // engaging. Never choose a shoulder relative to obsolete travel.
  const axis=observed&&dist(observed,actor.p)>8?
    direction(actor.p,observed):
    intent?.watchDirection?unit(intent.watchDirection):
    unit(plan.actionDirection);
  const desired=observed??plan.interest??{
    x:actor.p.x+axis.x*100,y:actor.p.y+axis.y*100};
  const lead=clamp(dist(actor.p,desired)*.76,62,155);
  const aim={x:actor.p.x+axis.x*lead,
    y:actor.p.y+axis.y*lead};
  const required=[actor.p];
  if(observed)required.push(observed);
  const scene=sceneFor(rooms,walls,context);
  const room=directorOperatorRoom(actor.p,rooms);
  const safeW=clamp(context.usableWidth??.8,.5,.92);
  const safeH=clamp(context.usableHeight??.76,.5,.9);
  const staging:Array<{shot:DirectorShot;side:number;quality:number}>=[];
  for(const side of [-1,1]){
    for(const back of [26,38,50]){
      for(const lateral of [42,54,68]){
        const camera={x:actor.p.x-axis.x*back+axis.y*side*lateral,
          y:actor.p.y-axis.y*back-axis.x*side*lateral};
        if(!directorCameraLegal(camera,room,scene)||
          directorLineBlocked(camera,actor.p,scene))continue;
        // The actual seven-ray actor silhouette, not just its center.
        const silhouette=directorSubjectVisibility(camera,actor.p,scene);
        if(!silhouette.readable)continue;
        // Camera faces into the action; foreground shoulder stays displaced.
        // An actual enemy may be required only after disclosure. It cannot
        // be "recovered" by photographing through a wall.
        const targetClear=!!observed&&
          !directorLineBlocked(camera,observed,scene)&&
          directorSubjectVisibility(camera,observed,scene).readable;
        const focus=aim;
        const fitting=targetClear?required:[actor.p,aim];
        const zoom=directorOrthoFittingZoom(camera,focus,fitting,
          aspect,baseSpan,safeW,safeH,
          Math.min(context.maxZoom??14,7.4),.83,context.safeFrame);
        const quality=directorCompositionQuality(camera,focus,actor.p,
          targetClear?observed:null,axis,plan.kind,
          'ortho',aspect,baseSpan,zoom,108,safeW,safeH,
          context.safeFrame,friends.map(a=>a.p));
        if(quality.primaryCoverage<.73)continue;
        const pitch=Math.atan2(36,Math.max(1,dist(camera,focus)));
        const shot:DirectorShot={
          focus,zoom,yaw:yaw(camera,focus),pitch,
          cameraAnchor:camera,fov:108,roomId:room?.id??null,
          actorsFramed:1,kind:knownTarget||doorway?'action':'squad',
          shotType:shotType(plan.kind),
          subjects:[actor.id],doorId:plan.doorId,
          score:plan.priority,occluded:1-silhouette.fraction,
          motion:intent?.speed??actor.velocity??0,
          beatId:context.beat?.id??null,
          operatorPoint:{...actor.p},actionAxis:axis,
          primaryActorId:actor.id,framePoints:fitting,
          attentionPoint:observed??plan.interest??aim,
          followDirection:axis,firstEntry:plan.firstEntry,
          editorialId:plan.id,editorialKind:plan.kind,
          editorialPriority:plan.priority,editReason:plan.reason,
          requiredPoints:fitting,contactTargetPoint:knownTarget,
          discoveryStrength:plan.discoveryStrength??0,
          compositionQuality:quality,
          subjectReadable:quality.primaryCoverage>=.73,
          subjectVisibility:silhouette.fraction,
          foregroundOperatorPoints:friends.map(a=>a.p),
          wideCoverage:!observed||targetClear&&quality.targetReadable
        };
        if(directorShoulderSide(shot)!==side)continue;
        // The only ranking questions: does the operator appear clearly,
        // is real attention visible, and which side leaves more look space?
        const optical=targetClear&&quality.targetReadable?36:
          observed?-28:0;
        const shoulder=quality.shoulderReadable?12:0;
        const clearFrame=quality.primaryReadable?12:0;
        const blocking=friends.filter(a=>a.id!==actor.id&&
          dist(camera,a.p)<26).length*12;
        const cost=dist(camera,actor.p)*.025;
        const value=optical+shoulder+clearFrame+
          quality.primaryCoverage*25+quality.score*.08-
          blocking-cost;
        shot.decisionScore=plan.priority*100+value;
        shot.decisionReason=targetClear&&quality.targetReadable?
          'legal shoulder / disclosed action readable':
          'legal shoulder / operator and forward sightline';
        staging.push({shot,side,quality:value});
      }
    }
  }
  // Retain the best legal option from each shoulder, so the storyboard
  // can KEEP an established side without competing against an orbit.
  const results:DirectorShot[]=[];
  for(const side of [-1,1]){
    const best=staging.filter(s=>s.side===side)
      .sort((a,b)=>b.quality-a.quality||
        a.shot.cameraAnchor.x-b.shot.cameraAnchor.x||
        a.shot.cameraAnchor.y-b.shot.cameraAnchor.y)[0];
    if(best)results.push(best.shot);
  }
  return results.sort((a,b)=>(b.decisionScore??0)-
    (a.decisionScore??0));
}

type StoryboardOptions={
  step?:number;maxCache?:number;rooms?:readonly DirectorRoom[];
  walls?:PhysicalDirectorScene['walls'];
  cover?:PhysicalDirectorScene['cover'];
  doors?:PhysicalDirectorScene['doors'];
  aspect?:number;baseSpan?:number;
  usableWidth?:number;usableHeight?:number;safeFrame?:DirectorSafeFrame;
  sceneAt?:(time:number)=>Pick<PhysicalDirectorScene,'doors'|'cover'>
};

/** A deterministic edit list evaluated on film-time knots. No hysteresis
 * between render frames, no "winning" grades, and no camera orbit. */
export class ReplayDirectorStoryboard{
  private readonly step:number;
  private readonly maxCache:number;
  private readonly duration:number;
  private readonly solve:(t:number)=>DirectorShot|readonly DirectorShot[]|null;
  private readonly options:StoryboardOptions;
  private readonly cache=new Map<number,Staged|null>();
  private readonly checkpoints=new Map<number,Staged|null>();
  private readonly bids=new Map<number,DirectorShot[]>();
  constructor(duration:number,
    solve:(t:number)=>DirectorShot|readonly DirectorShot[]|null,
    options:StoryboardOptions={}){
    this.duration=Math.max(0,duration);
    this.solve=solve;this.options=options;
    this.step=Math.max(.2,options.step??.5);
    this.maxCache=Math.max(8,options.maxCache??96);
  }
  clear():void{
    this.cache.clear();this.checkpoints.clear();this.bids.clear();
  }
  get cachedKnots():number{return this.cache.size;}
  private scene(index:number):PhysicalDirectorScene{
    const dynamic=this.options.sceneAt?.(
      Math.min(this.duration,index*this.step));
    return {rooms:this.options.rooms??[],walls:this.options.walls??[],
      doors:dynamic?.doors??this.options.doors,
      cover:dynamic?.cover??this.options.cover};
  }
  private candidates(index:number):DirectorShot[]{
    if(this.bids.has(index))return this.bids.get(index)!;
    const found=this.solve(Math.min(this.duration,index*this.step));
    const shots:DirectorShot[]=Array.isArray(found)?[...found]:
      found?[found as DirectorShot]:[];
    const valid=shots.filter(s=>
      !s.operatorPoint||!s.actionAxis||directorShoulderSide(s)!==0)
      .sort((a,b)=>(b.decisionScore??b.editorialPriority??0)-
        (a.decisionScore??a.editorialPriority??0));
    this.bids.set(index,valid.slice(0,10));
    while(this.bids.size>this.maxCache)
      this.bids.delete(this.bids.keys().next().value!);
    return valid.slice(0,10);
  }
  /** Validity is checked AGAIN after tracking and before interpolation.
   * A camera cannot change shoulder by traveling THROUGH the operator. */
  private legal(shot:DirectorShot,scene:PhysicalDirectorScene):boolean{
    const actor=shot.operatorPoint;
    if(actor&&shot.actionAxis&&directorShoulderSide(shot)===0)
      return false;
    const room=scene.rooms.find(r=>r.id===shot.roomId)??null;
    return directorCameraLegal(shot.cameraAnchor,room,scene)&&
      (!actor||!directorLineBlocked(shot.cameraAnchor,actor,scene));
  }
  /** A held shot may TRACK a real operator, but it must never silently
   * teleport to a fresh candidate. Returning null means a motivated edit
   * is necessary; no obsolete actor coordinates may be reused. */
  private track(prior:Staged,next:DirectorShot,
    scene:PhysicalDirectorScene):DirectorShot|null{
    if(!next.operatorPoint||!prior.operatorPoint||
      next.primaryActorId!==prior.primaryActorId||
      next.roomId!==prior.roomId)return null;
    const d={x:next.operatorPoint.x-prior.operatorPoint.x,
      y:next.operatorPoint.y-prior.operatorPoint.y};
    const moved=length(d);
    const aligned=!!prior.actionAxis&&!!next.actionAxis&&
      prior.actionAxis.x*next.actionAxis.x+
      prior.actionAxis.y*next.actionAxis.y>.82;
    // A substantial corner turn needs a NEW look into the new space.
    // Do not pretend the old shoulder can remain legal while rotating
    // through the subject, or snap to a new camera without recording a cut.
    if(!aligned||moved>90)return null;
    const tracked={...next,
      cameraAnchor:{x:prior.cameraAnchor.x+d.x,
        y:prior.cameraAnchor.y+d.y},
      focus:{x:prior.focus.x+d.x,y:prior.focus.y+d.y},
      zoom:prior.zoom};
    tracked.yaw=yaw(tracked.cameraAnchor,tracked.focus);
    tracked.pitch=Math.atan2(36,
      Math.max(1,dist(tracked.cameraAnchor,tracked.focus)));
    const hero=directorSubjectVisibility(tracked.cameraAnchor,
      next.operatorPoint,scene);
    const focusPoint=next.contactTargetPoint??next.attentionPoint;
    if(!this.legal(tracked,scene)||!hero.readable||
      focusPoint&&next.shotType==='contact'&&
      directorLineBlocked(tracked.cameraAnchor,focusPoint,scene))
      return null;
    const quality=directorCompositionQuality(
      tracked.cameraAnchor,tracked.focus,next.operatorPoint,
      next.contactTargetPoint??null,next.actionAxis??{x:1,y:0},
      next.editorialKind??'follow','ortho',
      this.options.aspect??1.1,this.options.baseSpan??1100,
      tracked.zoom,108,this.options.usableWidth??.8,
      this.options.usableHeight??.76,this.options.safeFrame);
    if(quality.primaryCoverage<.73||
      next.contactTargetPoint&&!quality.targetReadable)return null;
    return {...tracked,compositionQuality:quality,
      cameraDecision:moved>2?'track:active-operator':
        'hold:readable-action'};
  }
  private select(index:number,prior:Staged|null):Staged|null{
    const scene=this.scene(index);
    const candidates=this.candidates(index).filter(s=>this.legal(s,scene));
    if(!candidates.length){
      // A legal camera coordinate alone does not imply anybody is still
      // standing in front of it. Never hold an empty door forever.
      return prior&&index-prior.sceneStartIndex<=1&&
        this.legal(prior,scene)?
        {...prior,cameraDecision:'hold:brief-camera-gap'}:null;
    }
    const best=candidates[0];
    if(!prior)return {...best,sceneStartIndex:index,
      cameraDecision:'establish:shoulder'};
    const elapsed=(index-prior.sceneStartIndex)*this.step;
    const side=directorShoulderSide(prior);
    const sameActor=candidates.filter(s=>
      s.primaryActorId===prior.primaryActorId&&
      s.roomId===prior.roomId);
    const retained=sameActor.find(s=>directorShoulderSide(s)===side);
    const following=retained?this.track(prior,retained,scene):null;
    const isEntry=!!best.firstEntry&&best.shotType==='entry'&&
      (!prior.firstEntry||prior.editorialId!==best.editorialId||
       prior.roomId!==best.roomId);
    const newContact=best.shotType==='contact'&&
      !!best.contactTargetPoint&&
      (prior.shotType!=='contact'||
       prior.editorialId!==best.editorialId);
    const newDiscovery=(best.discoveryStrength??0)>.25&&
      (prior.discoveryStrength??0)<=.25;
    const newInformation=isEntry||newContact||newDiscovery;
    const sameSubject=best.primaryActorId===prior.primaryActorId;
    const sameRoom=best.roomId===prior.roomId;

    // A valid established shoulder is the default. Different editorial
    // labels, grades, and tiny score gains are not reasons to cut. Follow
    // the person and smoothly update the aim within this one shot grammar.
    const rivalImportance=(best.editorialPriority??0)-
      (retained?.editorialPriority??0);
    const rivalMoving=best.motion>7&&
      (retained?.motion??0)<4.5;
    const differentRoom=best.roomId!==prior.roomId;
    // Handoff only when another actor is genuinely more informative.
    // A higher-scored pose of the same person is NOT a new shot.
    if(following&&(sameSubject&&sameRoom||
      !newInformation&&(elapsed<3.0||
        rivalImportance<1.4&&!rivalMoving&&!differentRoom))){
      return {...following,sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:following.cameraDecision??'hold:committed-shot'};
    }
    const better=(best.editorialPriority??0)-
      (retained?.editorialPriority??prior.editorialPriority??0);
    const lostPreviousSubject=!sameActor.length||!following;
    const meaningfulChange=!sameSubject||!sameRoom||
      (best.actionAxis&&prior.actionAxis&&
       best.actionAxis.x*prior.actionAxis.x+
       best.actionAxis.y*prior.actionAxis.y<.82)||
      better>=1.4;
    const residence=3.0;
    // A new disclosed contact or actual threshold crossing takes priority
    // over the residence rule. Losing the current subject/shoulder also
    // demands prompt recovery; staying is not proof of continuity.
    if(!newInformation&&!lostPreviousSubject&&elapsed<residence){
      return {...following!,sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:no-meaningful-edit'};
    }
    if(!newInformation&&!meaningfulChange&&following)
      return {...following,sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:no-meaningful-edit'};
    // For an ordinary editorial handoff (not a reveal or lost frame),
    // insist on enough residence to make the change intelligible.
    if(!newInformation&&following&&elapsed<residence)
      return {...following,sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:shot-commitment'};
    if(!newInformation&&lostPreviousSubject&&elapsed<1.0&&
      this.legal(prior,scene))
      return {...prior,cameraDecision:'hold:short-edit-bridge'};
    return {...best,sceneStartIndex:index,
      cameraDecision:isEntry?'cut:follow-through-entry':
        newContact?'cut:new-contact':
        newDiscovery?'cut:newly-seen-ground':
        lostPreviousSubject?'cut:recover-live-action':
        'cut:meaningful-action-change'};
  }
  private key(index:number):Staged|null{
    const i=clamp(index,0,Math.ceil(this.duration/this.step));
    if(this.cache.has(i))return this.cache.get(i)!;
    let start=0,prior:Staged|null=null;
    for(const [j,shot] of this.checkpoints)
      if(j<i&&j>=start){start=j+1;prior=shot;}
    for(const [j,shot] of this.cache)
      if(j<i&&j>=start){start=j+1;prior=shot;}
    for(let j=start;j<=i;j++){
      prior=this.select(j,prior);
      this.cache.set(j,prior);
      if(j%24===0)this.checkpoints.set(j,prior);
      while(this.cache.size>this.maxCache)
        this.cache.delete(this.cache.keys().next().value!);
    }
    return prior;
  }
  sample(time:number):DirectorShot|null{
    const t=clamp(time,0,this.duration),f=t/this.step;
    const i=Math.floor(f),fraction=f-i;
    const from=this.key(i),to=this.key(i+1);
    if(!from)return null;
    if(!to||fraction<=0)return from;
    const cut=from.sceneStartIndex!==to.sceneStartIndex||
      from.primaryActorId!==to.primaryActorId||
      from.roomId!==to.roomId||
      directorShoulderSide(from)!==directorShoulderSide(to)||
      // Editorial labels are not edits. A tracked setup can change from
      // stack to entry or follow while its actual shoulder remains stable.
      false;
    // Never pre-reveal the next beat by transitioning early.
    if(cut)return from;
    const p=clamp(fraction,0,1);
    const blended:DirectorShot={...from,
      cameraAnchor:between(from.cameraAnchor,to.cameraAnchor,p),
      focus:between(from.focus,to.focus,p),
      operatorPoint:from.operatorPoint&&to.operatorPoint?
        between(from.operatorPoint,to.operatorPoint,p):
        from.operatorPoint,
      actionAxis:from.actionAxis&&to.actionAxis?
        unit(between(from.actionAxis,to.actionAxis,p)):
        from.actionAxis,
      zoom:lerp(from.zoom,to.zoom,p),
      pitch:lerp(from.pitch,to.pitch,p)};
    blended.yaw=yaw(blended.cameraAnchor,blended.focus);
    const scene=this.scene(i);
    // This guard is strict: a partial lerp is not an excuse to turn
    // an approved over-shoulder camera into a front or central shot.
    return this.legal(blended,scene)?blended:from;
  }
}

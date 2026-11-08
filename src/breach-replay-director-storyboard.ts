/** Replay Director is a deterministic camera track, not a string of cuts.
 * Raw camera suggestions are targets, never permission to teleport. Only a
 * sustained change of occupied room can edit to another camera setup.
 * Inside a room the rig walks, pans and zooms at bounded rates; if an
 * obstruction prevents travel it holds its position instead of cutting.
 */
import type {DirectorShot} from './breach-replay-director-shots.ts';
import type {DirectorRoom} from './breach-replay-cinematic-director.ts';
import {directorCameraLegal,directorLineBlocked,directorSubjectVisibility}
  from './breach-replay-director-physical.ts';
import type {PhysicalDirectorScene} from './breach-replay-director-physical.ts';
import {directorOrthoFittingZoom,directorCompositionQuality,
  type DirectorSafeFrame}
  from './breach-replay-director-projection.ts';

type Pt={x:number;y:number};
type RailShot=DirectorShot&{sceneStartIndex?:number};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const delta=(next:number,from:number)=>
  Math.atan2(Math.sin(next-from),Math.cos(next-from));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const yawOf=(anchor:Pt,focus:Pt)=>Math.atan2(
  anchor.x-focus.x,anchor.y-focus.y);
const cameraStep=16; // Base dolly per .8-second storyboard knot.
const turnStep=6*Math.PI/180; // Unhurried travel pan, never a whip.
const actionTurnStep=19*Math.PI/180; // Keep actual action in shot.
const radiusStep=19;
const minFocusRadius=30;
const maxFocusRadius=300;

export class ReplayDirectorStoryboard{
  private cache=new Map<number,RailShot|null>();
  private checkpoints=new Map<number,RailShot|null>();
  private rawCache=new Map<number,DirectorShot|null>();
  private readonly step:number;
  private readonly maxCache:number;
  private readonly rooms:readonly DirectorRoom[];
  private physicalScene:PhysicalDirectorScene;
  private readonly sceneAt?:(
    time:number)=>Pick<PhysicalDirectorScene,'doors'|'cover'>;
  private readonly aspect:number;
  private readonly baseSpan:number;
  private readonly usableWidth:number;
  private readonly usableHeight:number;
  private readonly safeFrame?:DirectorSafeFrame;
  private readonly duration:number;
  private readonly solve:(time:number)=>DirectorShot|null;
  constructor(duration:number,solve:(time:number)=>DirectorShot|null,
    options:{step?:number;maxCache?:number;rooms?:readonly DirectorRoom[];
      walls?:PhysicalDirectorScene['walls'];
      cover?:PhysicalDirectorScene['cover'];
      doors?:PhysicalDirectorScene['doors'];
      aspect?:number;baseSpan?:number;
      usableWidth?:number;usableHeight?:number;
      safeFrame?:DirectorSafeFrame;
      sceneAt?:(time:number)=>Pick<PhysicalDirectorScene,'doors'|'cover'>}={}){
    this.duration=duration;this.solve=solve;
    this.step=Math.max(.2,options.step??.8);
    this.maxCache=Math.max(4,options.maxCache??96);
    this.rooms=options.rooms??[];
    this.physicalScene={rooms:this.rooms,walls:options.walls??[],
      cover:options.cover,doors:options.doors};
    this.sceneAt=options.sceneAt;
    this.aspect=clamp(options.aspect??1.1,.45,2.5);
    this.baseSpan=Math.max(200,options.baseSpan??1100);
    this.usableWidth=clamp(options.usableWidth??.78,.5,.9);
    this.usableHeight=clamp(options.usableHeight??.76,.5,.9);
    this.safeFrame=options.safeFrame;
  }
  clear():void{
    this.cache.clear();this.checkpoints.clear();this.rawCache.clear();
  }
  get cachedKnots():number{return this.cache.size;}
  private raw(index:number):DirectorShot|null{
    const i=Math.max(0,Math.min(Math.ceil(this.duration/this.step),index));
    if(this.rawCache.has(i))return this.rawCache.get(i)!;
    const pose=this.solve(Math.min(this.duration,i*this.step));
    this.rawCache.set(i,pose);
    while(this.rawCache.size>this.maxCache)
      this.rawCache.delete(this.rawCache.keys().next().value!);
    return pose;
  }
  /** Camera travel is physically checked at regular intervals, including
   * center-based furniture. An obstacle means HOLD, not an instant cut. */
  private traversable(from:Pt,to:Pt,room:DirectorRoom|null):boolean{
    const n=Math.max(1,Math.ceil(distance(from,to)/2));
    for(let j=1;j<=n;j++){
      const p={x:mix(from.x,to.x,j/n),y:mix(from.y,to.y,j/n)};
      if(!directorCameraLegal(p,room,this.physicalScene))return false;
    }
    return !directorLineBlocked(from,to,this.physicalScene,false);
  }
  /** Short local camera-dolly route around furniture and inside corners.
   * Only evaluated when the direct route is obstructed; a bounded
   * visibility graph prevents the camera from freezing behind a sofa,
   * while all interpolated positions remain legal and in the room. */
  private detour(from:Pt,goal:Pt,
    room:DirectorRoom|null):Pt|null{
    if(!room||!directorCameraLegal(goal,room,this.physicalScene))
      return null;
    const direct=distance(from,goal);
    const segmentDistance=(p:Pt)=>{
      const dx=goal.x-from.x,dy=goal.y-from.y;
      const t=clamp(((p.x-from.x)*dx+(p.y-from.y)*dy)/
        Math.max(1,dx*dx+dy*dy),0,1);
      return Math.hypot(p.x-from.x-dx*t,p.y-from.y-dy*t);
    };
    const candidates:Pt[]=[];
    const put=(p:Pt)=>{
      if(directorCameraLegal(p,room,this.physicalScene))
        candidates.push(p);
    };
    const covers=(this.physicalScene.cover??[])
      .filter(o=>segmentDistance(o)<
        Math.max(o.w,o.h)*.7+40)
      .sort((a,b)=>segmentDistance(a)-segmentDistance(b))
      .slice(0,4);
    for(const o of covers)
      for(const sx of [-1,1])for(const sy of [-1,1])
        put({x:o.x+sx*(o.w/2+13),
          y:o.y+sy*(o.h/2+13)});
    // Broken partitions and wide archways may be the obstruction rather
    // than a rectangular prop. Allow a legal camera move around wall ends.
    const relevantWalls=this.physicalScene.walls
      .filter(w=>Math.min(segmentDistance(w.a),
        segmentDistance(w.b))<75).slice(0,8);
    for(const wall of relevantWalls){
      const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y;
      const length=Math.hypot(dx,dy)||1;
      for(const end of [wall.a,wall.b])
        for(const side of [-1,1])
          put({x:end.x+side*(-dy/length)*15,
            y:end.y+side*(dx/length)*15});
    }
    const inset=Math.min(13,room.w*.23,room.h*.23);
    for(const x of [room.x+inset,room.x+room.w-inset])
      for(const y of [room.y+inset,room.y+room.h-inset])
        put({x,y});
    const nodes=[from,...candidates,goal],n=nodes.length;
    const reached=new Set<number>(),g=new Array<number>(n).fill(Infinity);
    const predecessor=new Array<number>(n).fill(-1);
    g[0]=0;
    // Dijkstra on <=4 furniture obstacles and <=8 wall-end pairs:
    // no global pathfinding, no simulation mutation and no GPU work.
    for(let iterations=0;iterations<n;iterations++){
      let u=-1,best=Infinity;
      for(let i=0;i<n;i++)if(!reached.has(i)&&g[i]<best){
        best=g[i];u=i;
      }
      if(u<0||u===n-1)break;
      reached.add(u);
      for(let v=1;v<n;v++){
        if(v===u||reached.has(v))continue;
        const length=distance(nodes[u],nodes[v]);
        if(length>Math.max(100,direct*.7)&&v!==n-1)continue;
        const cost=g[u]+length;
        if(cost>=g[v]||!this.traversable(nodes[u],nodes[v],room))
          continue;
        g[v]=cost;predecessor[v]=u;
      }
    }
    if(predecessor[n-1]<0)return null;
    let j=n-1;
    while(predecessor[j]>0)j=predecessor[j];
    return nodes[j]??null;
  }
  private walk(from:Pt,desired:Pt,room:DirectorRoom|null,
    maxStep=cameraStep):Pt{
    // A blocked straight route may still have a legal dolly around a
    // table or end of a partition. Prefer a short waypoint over HOLD.
    if(!this.traversable(from,desired,room))
      desired=this.detour(from,desired,room)??desired;
    const d=distance(from,desired);
    if(d<.05)return from;
    const step=Math.min(maxStep*this.step/.8,d);
    const angle=Math.atan2(desired.y-from.y,desired.x-from.x);
    // Try the direct dolly, then plausible small sidesteps around
    // furniture. Never leap to the newly suggested camera anchor.
    const offsets=[0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,
      Math.PI/2,-Math.PI/2,2*Math.PI/3,-2*Math.PI/3];
    let best:Pt|null=null,bestScore=-Infinity;
    for(const offset of offsets){
      const point={x:from.x+Math.cos(angle+offset)*step,
        y:from.y+Math.sin(angle+offset)*step};
      if(!this.traversable(from,point,room))continue;
      const progress=d-distance(point,desired);
      // Reject backwards jolts. Lateral exploration is allowed, but
      // the current camera wins ties (prevents left/right oscillation).
      if(progress<-.4)continue;
      const score=progress-Math.abs(offset)*.16;
      if(score>bestScore){bestScore=score;best=point;}
    }
    return best??from;
  }
  /** How much of the real cast/action the current moving frame covers.
   * The view is an overhead orthographic lens with a fixed 53-unit eye
   * and 17-unit gaze height, NOT the tactical 1200-unit orbit.
   * This fit follows the actual moving camera and keeps key subjects in
   * frame while the rig tracks, pans, and dollies. */
  private fittingZoom(shot:DirectorShot,anchor:Pt,focus:Pt):number{
    const points=shot.framePoints?.length?shot.framePoints:
      shot.requiredPoints??[];
    if(!points.length)return shot.zoom;
    return directorOrthoFittingZoom(anchor,focus,points,
      this.aspect,this.baseSpan,this.usableWidth,
      this.usableHeight,shot.subjects.length<=2?8.4:7.4,.8,
      this.safeFrame);
  }
  /** Read physical door and cover state at the recorded knot. This
   * never affects replay simulation, only camera collision and LOS. */
  private activateScene(index:number):void{
    const sample=this.sceneAt?.(Math.min(this.duration,index*this.step));
    if(!sample)return;
    this.physicalScene={...this.physicalScene,
      doors:sample.doors,cover:sample.cover};
  }
  /** Is the ALREADY established camera good enough for the new
   * essential subjects? This question precedes every shot change. */
  private coversPrior(prior:RailShot,raw:DirectorShot):boolean{
    if(!raw.requiredPoints?.length||!prior.cameraAnchor)return false;
    const room=this.rooms.find(r=>r.id===prior.roomId)??null;
    if(!directorCameraLegal(prior.cameraAnchor,room,
      this.physicalScene))return false;
    if(raw.requiredPoints.some(point=>directorLineBlocked(
      prior.cameraAnchor,point,this.physicalScene)))return false;
    const fit=directorOrthoFittingZoom(prior.cameraAnchor,
      prior.focus,raw.requiredPoints,this.aspect,this.baseSpan,
      this.usableWidth,this.usableHeight,10,.92,
      this.safeFrame);
    if(prior.zoom>fit*1.04)return false;
    // A point can be geometrically visible yet hidden by a foreground
    // silhouette. Judge the established frame with the SAME evaluator
    // that produced the competing R9 shot, not a second focus heuristic.
    if(raw.operatorPoint&&raw.editorialKind){
      if(!directorSubjectVisibility(prior.cameraAnchor,raw.operatorPoint,
        this.physicalScene).readable)return false;
      const quality=directorCompositionQuality(prior.cameraAnchor,
        prior.focus,raw.operatorPoint,
        raw.editorialKind==='engage'&&raw.requiredPoints.length>1?
          raw.requiredPoints[1]:null,
        raw.actionAxis??{x:1,y:0},raw.editorialKind,
        'ortho',this.aspect,this.baseSpan,prior.zoom,
        prior.fov??108,this.usableWidth,this.usableHeight,
        this.safeFrame);
      if(!quality.primaryReadable||!quality.targetReadable)return false;
      if(raw.compositionQuality&&
        raw.compositionQuality.score-quality.score>12)return false;
    }
    return true;
  }

  /** At each fixed historical knot, validate the CURRENT subject against
   * the currently held rig. This must run BEFORE any hold/room-deference
   * choice; otherwise a once-good camera can film an empty wall forever. */
  private subjectLegible(prior:RailShot,raw:DirectorShot):boolean{
    if(!raw.operatorPoint)return this.coversPrior(prior,raw);
    const room=this.rooms.find(r=>r.id===prior.roomId)??null;
    if(!directorCameraLegal(prior.cameraAnchor,room,
      this.physicalScene))return false;
    const physical=directorSubjectVisibility(prior.cameraAnchor,
      raw.operatorPoint,this.physicalScene);
    if(!physical.readable)return false;
    const quality=directorCompositionQuality(prior.cameraAnchor,
      prior.focus,raw.operatorPoint,
      raw.editorialKind==='engage'&&(raw.requiredPoints?.length??0)>1?
        raw.requiredPoints![1]:null,
      raw.actionAxis??{x:1,y:0},
      raw.editorialKind??'follow',
      'ortho',this.aspect,this.baseSpan,prior.zoom,
      prior.fov??108,this.usableWidth,this.usableHeight,
      this.safeFrame);
    return quality.primaryReadable&&quality.targetReadable;
  }
  /** No camera edit merely because another framewise shot scores higher.
   * Confirm an actual new majority room for three consecutive recorded
   * samples and enforce minimum residency in the previous room. */
  private acceptsNewRoom(raw:DirectorShot,prior:RailShot,index:number){
    if(raw.roomId===prior.roomId)return false;
    // The first recorded ENTRY is already real physical evidence.
    // Cut once when that operator enters, not when the fourth crosses.
    // A transition just after another scene edit still waits for one
    // whole knot, so repeated adjacent doors cannot strobe.
    if(raw.firstEntry&&raw.shotType==='entry')
      return index-(prior.sceneStartIndex??0)>=1;
    const minResidence=Math.ceil(2.4/this.step);
    if(index-(prior.sceneStartIndex??0)<minResidence)return false;
    if(index<2)return false;
    return this.raw(index-1)?.roomId===raw.roomId&&
      this.raw(index-2)?.roomId===raw.roomId;
  }
  private plan(raw:DirectorShot|null,prior:RailShot|null,
    index:number):RailShot|null{
    this.activateScene(index);
    if(!prior)return raw?{...raw,sceneStartIndex:index,
      cameraDecision:'establish'}:null;
    if(!raw)return {...prior,cameraDecision:'hold:no-evidence'};
    const sameStory=!!raw.editorialId&&
      raw.editorialId===prior.editorialId;
    const covered=this.coversPrior(prior,raw);
    const establishedLegible=this.subjectLegible(prior,raw);
    const rawLegible=raw.subjectReadable!==false&&
      raw.compositionQuality?.primaryReadable!==false;
    const verifiedRecovery=raw.subjectReadable===true&&
      raw.compositionQuality?.primaryReadable!==false;
    const entering=!!raw.firstEntry&&raw.shotType==='entry';
    // Hard integrity outranks scene residence and aesthetic continuity.
    // If action has LEFT the existing image, use the legal, newly
    // solved rig at the next fixed knot rather than tracking empty walls.
    if(!establishedLegible&&verifiedRecovery&&
      index-(prior.sceneStartIndex??0)>=1){
      return {...raw,sceneStartIndex:index,
        cameraDecision:'cut:restore-visible-subject'};
    }
    // The fresh candidate may also be obstructed: prefer an established,
    // actually readable frame to a new door/backpack-only image.
    if(!rawLegible&&establishedLegible)
      return {...prior,cameraDecision:'hold:visible-over-obstructed'};
    if(raw.roomId!==prior.roomId){
      // The first entrant calls for an editorial evaluation, NOT an
      // automatic cut. An existing legal threshold two-shot can hold.
      if(entering&&covered)return {...raw,
        roomId:prior.roomId,cameraAnchor:prior.cameraAnchor,
        focus:prior.focus,yaw:prior.yaw,zoom:prior.zoom,
        sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:entry-covered'};
      if(!this.acceptsNewRoom(raw,prior,index))
        return {...prior,cameraDecision:'hold:room-confirmation'};
      return {...raw,sceneStartIndex:index,
        cameraDecision:entering?'cut:first-entry-uncovered':
          'cut:confirmed-new-room'};
    }
    if(!sameStory&&covered){
      // Adopt the new narrative subject without moving the actual rig
      // if the existing view already covers this event.
      return {...raw,cameraAnchor:prior.cameraAnchor,
        focus:prior.focus,yaw:prior.yaw,zoom:prior.zoom,
        sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:new-story-covered'};
    }
    if(sameStory&&covered&&raw.motion<9){
      // Once a new action has taken ownership of an adequate static
      // composition, keep that same rig; don't creep toward the latest
      // raw camera suggestion at the following storyboard knot.
      return {...raw,cameraAnchor:prior.cameraAnchor,
        focus:prior.focus,yaw:prior.yaw,zoom:prior.zoom,
        sceneStartIndex:prior.sceneStartIndex,
        cameraDecision:'hold:action-covered'};
    }
    const actionOutOfFrame=!sameStory&&!covered&&
      (raw.editorialPriority??0)>=5&&
      (raw.editorialPriority??0)>=(prior.editorialPriority??0);
    if(actionOutOfFrame&&index-(prior.sceneStartIndex??0)>=1){
      // An essential gunfight is sometimes better served by one
      // purposeful same-room cut than by a slow sideways chase.
      return {...raw,sceneStartIndex:index,
        cameraDecision:'cut:action-out-of-frame'};
    }
    const room=this.rooms.find(r=>r.id===raw.roomId)??null;
    const meanSpeed=raw.motion/Math.max(1,raw.subjects.length);
    const action=raw.shotType==='contact'||raw.shotType==='breach'||
      raw.shotType==='entry';
    const traveling=meanSpeed>7;
    // A held WATCH, stopped squad or completed traversal is NOT a
    // request to orbit, pan or zoom continually toward fresh suggestions.
    // Keep the established frame steady until actors actually move or
    // a real recorded action becomes the subject.
    if(!action&&!traveling&&raw.motion<9){
      if(!covered&&verifiedRecovery&&
        index-(prior.sceneStartIndex??0)>=Math.ceil(1/this.step))
        return {...raw,sceneStartIndex:index,
          cameraDecision:'cut:quiet-recover-action'};
      // A newly authored doorway approach can be meaningful even while
      // the breacher is temporarily still. Avoid trapping the camera on
      // the previous unrelated subject for the rest of the scene.
      const interest=!sameStory&&
        (raw.editorialPriority??0)>(prior.editorialPriority??0)+1.2&&
        index-(prior.sceneStartIndex??0)>=Math.ceil(1.5/this.step);
      if(interest)return {...raw,sceneStartIndex:index,
        cameraDecision:'cut:quiet-new-interest'};
      return {...prior,sceneStartIndex:prior.sceneStartIndex,
        motion:raw.motion,actionWeight:0,
        cameraDecision:'hold:quiet'};
    }
    const dolly=cameraStep+Math.min(34,
      Math.max(0,meanSpeed)*.74)+
      (action?7:0);
    // A tracking shot is a translation alongside the protagonist.
    // Carry their actual displacement into the desired rig position;
    // don't make the camera repeatedly chase a new best-angled anchor.
    const traveled=raw.operatorPoint&&prior.operatorPoint?
      {x:raw.operatorPoint.x-prior.operatorPoint.x,
        y:raw.operatorPoint.y-prior.operatorPoint.y}:null;
    const translated=traveled?{
      x:prior.cameraAnchor.x+traveled.x,
      y:prior.cameraAnchor.y+traveled.y}:null;
    const follow=translated&&traveling&&
      directorCameraLegal(translated,room,this.physicalScene)&&
      !directorLineBlocked(translated,raw.operatorPoint!,
        this.physicalScene)?{
          x:mix(raw.cameraAnchor.x,translated.x,.72),
          y:mix(raw.cameraAnchor.y,translated.y,.72)
        }:raw.cameraAnchor;
    // Protect the established action axis and shoulder side. A tiny
    // raw-solver score improvement may not orbit through the opposite
    // side of the hero while the current lens still covers the event.
    const side=(axis:Pt,operator:Pt,camera:Pt)=>
      axis.x*(camera.y-operator.y)-
      axis.y*(camera.x-operator.x);
    const oldSide=prior.actionAxis&&prior.operatorPoint?
      side(prior.actionAxis,prior.operatorPoint,
        prior.cameraAnchor):0;
    const candidateSide=raw.actionAxis&&raw.operatorPoint?
      side(raw.actionAxis,raw.operatorPoint,
        raw.cameraAnchor):0;
    const preserveSide=sameStory&&covered&&
      Math.abs(oldSide)>12&&
      oldSide*candidateSide<0;
    const wanted=preserveSide?
      translated??prior.cameraAnchor:follow;
    const desired=directorCameraLegal(wanted,room,
      this.physicalScene)?wanted:raw.cameraAnchor;
    const cameraAnchor=this.walk(prior.cameraAnchor,desired,
      room,dolly);
    // A subject crossing immediately behind the camera must not produce
    // an 180° reorientation. Turn toward new interest gradually instead.
    const oldYaw=yawOf(prior.cameraAnchor,prior.focus);
    // An important door or fire pair requires a balanced two-shot:
    // the shooter remains the foreground anchor while the real target
    // or doorway leads the frame. Ordinary tracking keeps the raw focus.
    // Composer owns the one intended aim point. Don't introduce
    // yet another operator/target focus blend in the motion layer.
    const aim=raw.focus;
    const requestedDistance=distance(cameraAnchor,aim);
    const desiredYaw=requestedDistance<minFocusRadius?
      oldYaw:yawOf(cameraAnchor,aim);
    const turnLimit=(raw.attentionPoint?actionTurnStep:turnStep)*
      this.step/.8;
    const yaw=oldYaw+clamp(delta(desiredYaw,oldYaw),
      -turnLimit,turnLimit);
    const oldRadius=clamp(distance(prior.cameraAnchor,prior.focus),
      minFocusRadius,maxFocusRadius);
    const wantedRadius=clamp(requestedDistance,minFocusRadius,maxFocusRadius);
    const radius=oldRadius+clamp(wantedRadius-oldRadius,
      -radiusStep*this.step/.8,radiusStep*this.step/.8);
    // Keep the camera looking along its actual physical optical axis.
    // The focus is an aim point, not permission to move the camera.
    let focus={x:cameraAnchor.x-Math.sin(yaw)*radius,
      y:cameraAnchor.y-Math.cos(yaw)*radius};
    if(directorLineBlocked(cameraAnchor,focus,this.physicalScene)){
      const prevYaw=yawOf(prior.cameraAnchor,prior.focus);
      focus={x:cameraAnchor.x-Math.sin(prevYaw)*oldRadius,
        y:cameraAnchor.y-Math.cos(prevYaw)*oldRadius};
      if(directorLineBlocked(cameraAnchor,focus,this.physicalScene))
        focus={...prior.focus};
    }
    const accurateYaw=yawOf(cameraAnchor,focus);
    const currentZoom=prior.zoom;
    const desiredZoom=this.fittingZoom(raw,cameraAnchor,focus);
    // Dynamically calculate fit AFTER the move and pan, not at the
    // historical solver position. Emergency pullbacks rescue a shooter
    // and target from the edge; slow push-ins add visual intention.
    const zoom=clamp(desiredZoom,
      currentZoom*Math.pow(.64,this.step/.8),
      currentZoom*Math.pow(1.10,this.step/.8));
    const currentFov=prior.fov??108,desiredFov=raw.fov??108;
    const fov=currentFov+clamp(desiredFov-currentFov,
      -4*this.step/.8,6*this.step/.8);
    return {...raw,sceneStartIndex:prior.sceneStartIndex,
      roomId:prior.roomId,cameraAnchor,focus,
      yaw:(accurateYaw+2*Math.PI)%(2*Math.PI),
      zoom,fov,pitch:prior.pitch+(raw.pitch-prior.pitch)*.16,
      cameraDecision:traveling?'track:subject-motion':
        action?'reframe:action':'hold:composition'};
  }
  private remember(index:number,shot:RailShot|null):void{
    this.cache.set(index,shot);
    while(this.cache.size>this.maxCache)
      this.cache.delete(this.cache.keys().next().value!);
    if(index%24===0)this.checkpoints.set(index,shot);
  }
  /** Offline deterministic, so rewinding, fast playback and scrubbing
   * show the same camera position at the same recording timestamp. */
  private key(index:number):RailShot|null{
    const i=Math.max(0,Math.min(Math.ceil(this.duration/this.step),index));
    if(this.cache.has(i))return this.cache.get(i)!;
    let start=0,prior:RailShot|null=null;
    for(const [j,shot] of this.checkpoints){
      if(j<i&&j>=start){start=j+1;prior=shot;}
    }
    for(const [j,shot] of this.cache){
      if(j<i&&j>=start){start=j+1;prior=shot;}
    }
    for(let j=start;j<=i;j++){
      const planned=this.plan(this.raw(j),prior,j);
      this.remember(j,planned);prior=planned;
    }
    return prior;
  }
  sample(time:number):DirectorShot|null{
    const t=clamp(time,0,this.duration);
    const fraction=t/this.step,index=Math.floor(fraction);
    const from=this.key(index),to=this.key(index+1);
    if(!from)return to;
    if(!to)return from;
    const p=clamp(fraction-index,0,1);
    if(from.roomId!==to.roomId||
      (from.sceneStartIndex!==to.sceneStartIndex&&
        to.cameraDecision?.startsWith('cut:'))){
      // Only a CONFIRMED room change cuts. Every other shot change
      // below is continuously interpolated and never jumps.
      return p<.5?from:to;
    }
    // Linear knot interpolation avoids stopping and starting the camera
    // every .8 seconds as repeated smoothstep would do. The planned
    // endpoints already bound travel, turning and lens movement.
    const cameraAnchor={x:mix(from.cameraAnchor.x,to.cameraAnchor.x,p),
      y:mix(from.cameraAnchor.y,to.cameraAnchor.y,p)};
    const focus={x:mix(from.focus.x,to.focus.x,p),
      y:mix(from.focus.y,to.focus.y,p)};
    const yaw=yawOf(cameraAnchor,focus);
    return {...(p<.5?from:to),cameraAnchor,focus,
      zoom:mix(from.zoom,to.zoom,p),
      fov:mix(from.fov??108,to.fov??108,p),
      yaw:(yaw+2*Math.PI)%(2*Math.PI),
      pitch:mix(from.pitch,to.pitch,p)};
  }
}

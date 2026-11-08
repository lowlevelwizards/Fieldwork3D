/** R7: bounded cinematic shot search. Pure projection/geometry only.
 * No simulation or live enemy state is read here; caller passes friendlies.
 */
import type {DirectorActor,DirectorRoom,DirectorWall,CinematicShot}
  from './breach-replay-cinematic-director.ts';
import {directorIntentGroup,type DirectorIntent}
  from './breach-replay-director-intent.ts';
import type {DirectorFutureCue} from './breach-replay-director-events.ts';
import type {DirectorFilmBeat} from './breach-replay-director-film.ts';
import {physicalDirectorView,directorOperatorRoom}
  from './breach-replay-director-physical.ts';
import type {Door,Obstacle} from './breach-core.ts';

export type DirectorShotType='travel'|'approach'|'stack'|'breach'|
  'entry'|'contact'|'overwatch'|'reorientation';
export type DirectorShotContext={
  intents:readonly DirectorIntent[];
  upcoming:DirectorFutureCue|null;
  /** Already recorded event, selected using the complete film timeline. */
  beat?:DirectorFilmBeat|null;
  /** Shooter AND intended victim, located in the sampled historical frame. */
  actionPair?:{shooter:Pt;target:Pt}|null;
  /** Geometry space corresponding to viewport without controls. */
  usableWidth?:number;usableHeight?:number;
  maxZoom?:number;maxSubjects?:number;
  /** Physical obstacles at the historical replay timestamp. */
  doors?:readonly Pick<Door,'a'|'b'|'open'|'openFraction'|'style'>[];
  cover?:readonly Pick<Obstacle,'x'|'y'|'w'|'h'>[]
};
export type DirectorShot=CinematicShot&{
  shotType:DirectorShotType;subjects:string[];doorId:string|null;
  score:number;occluded:number;motion:number;
  /** Stable film beat identifier; an ongoing exchange is one camera setup. */
  beatId:string|null;
  /** Actual director-only camera position in the map's X/Z plane. */
  cameraAnchor:Pt;
  /** A real perspective lens in replay-only Director mode. */
  fov?:number;
  /** Friendly actor the camera operator must physically accompany. */
  operatorPoint?:Pt;
  /** Primary action anchors must stay visible during dolly and reframe. */
  framePoints?:Pt[];
  attentionPoint?:Pt|null;
  /** Used to track the lead operator from behind rather than orbit them. */
  followDirection?:Pt|null;
  /** A recorded lead operator crossed into the next room: edit promptly. */
  firstEntry?:boolean;
  /** Only genuine action or significant travel should move the film rig. */
  actionWeight?:number
};
type Pt={x:number;y:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const atan=(p:Pt)=>Math.atan2(p.x,p.y);
const delta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const cross=(a:Pt,b:Pt)=>a.x*b.y-a.y*b.x;
const segmentCross=(a:Pt,b:Pt,c:Pt,d:Pt)=>{
  const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y};
  const den=cross(r,s);
  if(Math.abs(den)<.0001)return false;
  const q={x:c.x-a.x,y:c.y-a.y};
  const t=cross(q,s)/den,u=cross(q,r)/den;
  return t>.05&&t<.95&&u>.01&&u<.99;
};
const pointIn=(p:Pt,room:DirectorRoom,margin=0)=>
  p.x>=room.x+margin&&p.y>=room.y+margin&&
  p.x<=room.x+room.w-margin&&p.y<=room.y+room.h-margin;
const average=(actors:readonly DirectorActor[]):Pt=>({
  x:actors.reduce((v,a)=>v+a.p.x,0)/actors.length,
  y:actors.reduce((v,a)=>v+a.p.y,0)/actors.length
});
const mag=(p:Pt)=>Math.hypot(p.x,p.y);
const normalize=(p:Pt):Pt=>mag(p)<.001?{x:0,y:1}:
  {x:p.x/mag(p),y:p.y/mag(p)};
const lerp=(a:Pt,b:Pt,t:number):Pt=>({
  x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t
});
const bounded=(origin:Pt,target:Pt,reach:number):Pt=>{
  const d=dist(origin,target);
  return d<=reach?{...target}:lerp(origin,target,reach/d);
};
const mixDirection=(primary:Pt,secondary:Pt,strength:number):Pt=>
  normalize(lerp(normalize(primary),normalize(secondary),strength));
const speedFor=(a:DirectorActor,ctx:DirectorShotContext):number=>
  ctx.intents.find(i=>i.actorId===a.id)?.speed??a.velocity??0;

function subjectGroup(actors:readonly DirectorActor[],
  ctx:DirectorShotContext):DirectorActor[]{
  const starring=ctx.beat&&actors.find(a=>a.id===ctx.beat!.actorId);
  if(starring){
    // Establish a wide scene of the active squad, not an isolated
    // close-up of a single shooter's back.
    const support=actors.filter(a=>a.id!==starring.id&&
      dist(a.p,starring.p)<165);
    return [starring,...support].slice(0,ctx.maxSubjects??4);
  }
  const future=ctx.upcoming&&actors.find(a=>a.id===ctx.upcoming!.actorId);
  if(future){
    // Only focus on the friendly participant and nearby support.
    const nearby=actors.filter(a=>dist(a.p,future.p)<155);
    return nearby.length?nearby:[future];
  }
  const movers=actors.filter(a=>speedFor(a,ctx)>9);
  const holding=actors.filter(a=>speedFor(a,ctx)<=9);
  if(movers.length&&holding.length&&
    dist(average(movers),average(holding))>65){
    // The active element takes the shot when it moves decisively away
    // from a holding team. Static teammates must not pin the view.
    const focus=average(movers);
    const support=holding.filter(a=>dist(a.p,focus)<38);
    return [...movers,...support].slice(0,ctx.maxSubjects??4);
  }
  const group=directorIntentGroup(ctx.intents);
  if(group&&group.count>=Math.max(2,Math.ceil(actors.length*.75))){
    const members=actors.filter(a=>group.actors.includes(a.id));
    if(members.length>=2)return members;
  }
  // Do not abandon the entry element to film two operators still
  // stacked at a door. Keep the moving squad together while it is near.
  const center=average(actors);
  const spread=Math.max(...actors.map(a=>dist(a.p,center)));
  if(spread>140&&actors.length>=3){
    // When separated, the largest coherent local cluster earns the shot.
    const clusters=actors.map(a=>
      actors.filter(b=>dist(a.p,b.p)<130).sort((x,y)=>
        dist(a.p,x.p)-dist(a.p,y.p)));
    clusters.sort((a,b)=>b.length-a.length||
      a[0].id.localeCompare(b[0].id));
    return clusters[0].slice(0,ctx.maxSubjects??4);
  }
  return actors.slice(0,ctx.maxSubjects??4);
}
function shotClass(subjects:readonly DirectorActor[],
  ctx:DirectorShotContext):DirectorShotType{
  if(ctx.beat)return ctx.beat.kind==='fight'?'contact':'breach';
  // The first actor's recorded entry is itself an editorial event,
  // even while three teammates are still on the original side.
  if(ctx.intents.some(i=>i.kind==='entry'&&i.door&&
    i.door.distance<42))return 'entry';
  if(ctx.upcoming?.kind==='contact'||ctx.upcoming?.kind==='casualty')
    return 'contact';
  const doors=directorIntentGroup(ctx.intents);
  const matching=ctx.intents.filter(i=>subjects.some(a=>a.id===i.actorId));
  if(doors&&doors.count>=2){
    const front=matching.filter(i=>i.door?.id===doors.door.id&&
      i.door.approachSide===doors.door.approachSide);
    if(front.length<2)return matching.some(i=>i.route.length>1)?
      'travel':'reorientation';
    if(front.some(i=>i.kind==='breach'))return 'breach';
    if(front.some(i=>i.kind==='entry'))return 'entry';
    if(front.filter(i=>i.door!.distance<42).length>=2)return 'stack';
    return 'approach';
  }
  if(matching.some(i=>i.kind==='overwatch'))return 'overwatch';
  if(matching.some(i=>i.route.length>1))return 'travel';
  return 'reorientation';
}
function routeLead(route:readonly Pt[],maxDistance:number):Pt{
  let remaining=maxDistance;
  for(let i=1;i<route.length;i++){
    const start=route[i-1],end=route[i];
    const segment=dist(start,end);
    if(segment<.001)continue;
    if(segment>=remaining){
      const t=remaining/segment;
      return {x:start.x+(end.x-start.x)*t,
        y:start.y+(end.y-start.y)*t};
    }
    remaining-=segment;
  }
  return route.at(-1)??{x:0,y:0};
}
/** Compose nearby readable geometry with the actors. Future plans
 * control *direction* and a bounded lead, never force an extreme wide
 * framing or reveal an unobserved opponent. */
function anchorsFor(subjects:readonly DirectorActor[],
  ctx:DirectorShotContext,kind:DirectorShotType){
  const out=subjects.map(a=>a.p);
  const intents=ctx.intents.filter(i=>
    subjects.some(a=>a.id===i.actorId));
  const kinetic=intents.filter(i=>i.speed>8);
  const focusActors=kinetic.length?subjects.map(a=>{
    const speed=intents.find(i=>i.actorId===a.id)?.speed??0;
    return {actor:a,weight:1+Math.min(2,speed/28)};
  }):subjects.map(a=>({actor:a,weight:1}));
  const total=focusActors.reduce((v,a)=>v+a.weight,0);
  const center={
    x:focusActors.reduce((v,a)=>v+a.actor.p.x*a.weight,0)/total,
    y:focusActors.reduce((v,a)=>v+a.actor.p.y*a.weight,0)/total
  };
  let interest:Pt|null=null;
  const bestIntent=intents.slice().sort((a,b)=>
    b.speed-a.speed||
    (a.plannedAttention?.distance??Infinity)-
    (b.plannedAttention?.distance??Infinity)||
    dist(a.position,center)-dist(b.position,center))[0];
  if(ctx.beat?.kind==='fight'&&ctx.actionPair){
    const pair=ctx.actionPair;
    // The two participants are non-negotiable framing anchors, even
    // when one is hostile and not part of the friendly subject group.
    out.push(pair.shooter,pair.target);
    interest=lerp(pair.shooter,pair.target,.5);
    const actionCenter=lerp(center,interest,.73);
    return {points:out,focus:actionCenter,attention:interest};
  }
  if(ctx.beat?.kind==='door'){
    interest=ctx.beat.target;
    out.push(ctx.beat.shooter,ctx.beat.target);
    return {points:out,focus:lerp(center,
      bounded(center,interest,62),.43),attention:interest};
  }
  if(kind==='contact'){
    const actor=subjects.find(a=>a.id===ctx.upcoming?.actorId);
    const intent=intents.find(i=>i.actorId===actor?.id);
    if(actor){
      const dir=intent?.watchDirection??intent?.direction??
        {x:Math.cos(actor.heading??0),y:Math.sin(actor.heading??0)};
      interest={x:actor.p.x+dir.x*36,y:actor.p.y+dir.y*36};
    }
  }else{
    const group=directorIntentGroup(ctx.intents);
    if(group&&['approach','stack','breach','entry'].includes(kind)){
      interest=group.door.mid;
      // Keep the front surface and stack wall near frame center, without
      // requiring both long ends of the wall in a tight over-shoulder shot.
      out.push(bounded(center,group.door.mid,56));
      out.push(bounded(center,{
        x:group.door.mid.x+group.door.normal.x*13,
        y:group.door.mid.y+group.door.normal.y*13},43));
    }else if(bestIntent){
      const lead=bestIntent.route.length>1?
        routeLead(bestIntent.route,88):
        {x:bestIntent.position.x+bestIntent.direction.x*50,
          y:bestIntent.position.y+bestIntent.direction.y*50};
      // Give the currently authored next action a head start even if it
      // is several nodes away and not yet the running instruction.
      const future=bestIntent.plannedAttention;
      interest=future?lerp(lead,future.at,
        future.kind==='watch'?.24:.38):lead;
      if(bestIntent.watchDirection)
        interest=lerp(interest,{
          x:bestIntent.position.x+bestIntent.watchDirection.x*75,
          y:bestIntent.position.y+bestIntent.watchDirection.y*75},.55);
      out.push(bounded(center,interest,48));
    }
  }
  if(interest)out.push(bounded(center,interest,39));
  // The point of interest leads, but the live operators remain in frame.
  // More speed earns a slightly stronger lead without sacrificing fit.
  const leadStrength=kinetic.length?.32:.23;
  const focus=interest?lerp(center,bounded(center,interest,56),
    leadStrength):center;
  return {points:out,focus,attention:interest};
}
/** For a deliberate WATCH while moving, orient down the weapon with
 * enough travel information to keep the upcoming route legible. Future
 * WATCH nodes progressively bias this direction before becoming active. */
function forwardDirection(subjects:readonly DirectorActor[],
  ctx:DirectorShotContext):Pt{
  let x=0,y=0,total=0;
  for(const a of subjects){
    const i=ctx.intents.find(i=>i.actorId===a.id);
    const travel=i?.direction??{
      x:Math.cos(a.heading??0),y:Math.sin(a.heading??0)};
    let direction=travel;
    if(i?.watchDirection){
      direction=mixDirection(travel,i.watchDirection,
        i.speed>7?.72:.56);
    }else if(i?.plannedAttention){
      const future=i.plannedAttention;
      const anticipation=clamp(1-future.distance/230,.15,1);
      const bias=future.kind==='watch'?
        .24+.35*anticipation:.10+.24*anticipation;
      direction=mixDirection(travel,future.direction,bias);
    }
    const weight=1+Math.min(2.6,Math.max(0,i?.speed??a.velocity??0)/23);
    x+=direction.x*weight;y+=direction.y*weight;total+=weight;
  }
  const direction={x:x/Math.max(1,total),y:y/Math.max(1,total)};
  return normalize(direction);
}
function projectedBounds(pts:readonly Pt[],center:Pt,
  yaw:number,pitch:number,aspect:number,baseSpan:number,
  maxZoom:number,usableWidth:number,usableHeight:number){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  let furthestX=0,furthestY=0;
  for(const pt of pts){
    const x=(pt.x-center.x)*c-(pt.y-center.y)*s;
    const y=((pt.x-center.x)*s+(pt.y-center.y)*c)*Math.sin(pitch);
    furthestX=Math.max(furthestX,Math.abs(x));
    furthestY=Math.max(furthestY,Math.abs(y));
  }
  // Zoom must be computed relative to the ACTUAL camera focus, not a
  // bounding box re-centered on the subjects. Otherwise looking ahead
  // can quietly push the operators offscreen at high zoom.
  const width=furthestX*2+37;
  const height=furthestY*2+38*Math.cos(pitch)+24;
  const w=Math.max(.4,aspect)*baseSpan*usableWidth;
  const h=baseSpan*usableHeight;
  const zoom=clamp(Math.min(w/Math.max(1,width),
    h/Math.max(1,height)),.65,maxZoom);
  return {zoom,width,height};
}
function wallCost(center:Pt,yaw:number,subjects:readonly Pt[],
  room:DirectorRoom|null,walls:readonly DirectorWall[],
  squadCenter:Pt){
  const ray={x:Math.sin(yaw),y:Math.cos(yaw)};
  // Solve a REAL camera in the operator's room, rather than merely
  // pretending the orthographic camera is inside while placing it
  // 1,200 world units away. In a gunfight, the focus may lie outside
  // the occupied room, but the camera stays on the operator's side.
  const inset=room?Math.min(9,room.w*.2,room.h*.2):0;
  const origin=room?{
    x:clamp(squadCenter.x,room.x+inset,room.x+room.w-inset),
    y:clamp(squadCenter.y,room.y+inset,room.y+room.h-inset)
  }:squadCenter;
  let clearance=78;
  if(room){
    for(const [p,d,min,max] of [
      [origin.x,ray.x,room.x,room.x+room.w],
      [origin.y,ray.y,room.y,room.y+room.h]
    ] as const){
      if(Math.abs(d)>.001)clearance=Math.min(clearance,
        Math.max(0,((d>0?max:min)-p)/d));
    }
  }
  const offset=room?Math.max(0,Math.min(66,clearance-inset)):
    54;
  const camera={x:origin.x+ray.x*offset,y:origin.y+ray.y*offset};
  let blocked=0;
  for(const wall of walls){
    if(segmentCross(camera,center,wall.a,wall.b))blocked+=2;
    for(const subject of subjects)
      if(segmentCross(camera,subject,wall.a,wall.b))blocked+=1;
  }
  return {blocked,roomClearance:clearance,
    camera,insideRoom:!room||pointIn(camera,room,Math.min(3,inset))};
}
export function composeReplayDirectorShot(_time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],aspect:number,
  currentYaw:number,baseSpan:number,
  context:DirectorShotContext):DirectorShot|null{
  const friendly=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  if(!friendly.length)return null;
  const subjects=subjectGroup(friendly,context);
  const type=shotClass(subjects,context);
  const composition=anchorsFor(subjects,context,type);
  const points=composition.points;
  const center=composition.focus;
  const group=directorIntentGroup(context.intents);
  const relevantDoor=['approach','stack','breach','entry'].includes(type)?
    group?.door??null:null;
  const doorBeat=context.beat?.kind==='door'?context.beat:null;
  const room=rooms.filter(r=>subjects.some(a=>pointIn(a.p,r,-2)))
    .sort((a,b)=>subjects.filter(x=>pointIn(x.p,b,-2)).length-
      subjects.filter(x=>pointIn(x.p,a,-2)).length)[0]??null;
  let forward=forwardDirection(subjects,context);
  if(context.beat?.kind==='fight'&&context.actionPair){
    const centerActor=subjects.find(a=>a.id===context.beat!.actorId);
    const other=context.beat.actorId===context.beat.shooterId?
      context.actionPair.target:context.actionPair.shooter;
    if(centerActor)forward=normalize({
      x:other.x-centerActor.p.x,y:other.y-centerActor.p.y});
  }else if(doorBeat)forward=normalize({
    x:doorBeat.target.x-doorBeat.shooter.x,
    y:doorBeat.target.y-doorBeat.shooter.y});
  const behind=atan({x:-forward.x,y:-forward.y});
  let best:DirectorShot|null=null;
  // Director mode is intentionally independent of the tactical UI cap.
  const maxZoom=Math.min(18,context.maxZoom??14);
  const usableWidth=clamp(context.usableWidth??.83,.55,.92);
  const usableHeight=clamp(context.usableHeight??.78,.55,.9);
  // The threshold normal points toward the stacked operators. Filming
  // along it is a recognisable frontal doorway shot, not a side-on wall.
  const front=doorBeat?atan(normalize({
    x:doorBeat.shooter.x-doorBeat.target.x,
    y:doorBeat.shooter.y-doorBeat.target.y})):
    relevantDoor?atan(relevantDoor.normal):behind;
  for(let a=-4;a<=4;a++){
    const yaw=front+a*Math.PI/(relevantDoor?18:12);
    for(const degrees of [12,17,22,29,36]){
      const pitch=degrees*Math.PI/180;
      const wall=wallCost(center,yaw,
        [...subjects.map(x=>x.p),
          ...(context.beat?.kind==='fight'&&context.actionPair?
            [context.actionPair.shooter,context.actionPair.target]:[])],
        room,walls,average(subjects));
      const trueYaw=atan({x:wall.camera.x-center.x,
        y:wall.camera.y-center.y});
      const bounds=projectedBounds(points,center,trueYaw,pitch,aspect,
        baseSpan,maxZoom,usableWidth,usableHeight);
      // Zoom tightness rewards intimate framing only after subject coverage.
      const close=clamp((bounds.zoom-.65)/9,0,1);
      const elevationTarget=type==='contact'?17:
        type==='stack'||type==='breach'?18:
        type==='approach'||type==='entry'?22:
        type==='travel'||type==='overwatch'?20:25;
      const dynamicElevation=elevationTarget+(1-close)*7;
      const score=
        45 + Math.min(23,bounds.zoom*2.55) -
        Math.abs(degrees-dynamicElevation)*.38 -
        wall.blocked*4.4 -
        (wall.insideRoom?0:30) -
        (room?Math.max(0,23-wall.roomClearance)*.85:0) -
        (relevantDoor||doorBeat?Math.abs(delta(trueYaw,front))*11:
          Math.abs(delta(trueYaw,behind))*2.3) -
        Math.abs(delta(trueYaw,currentYaw))*1.05;
      if(!best||score>best.score){
        best={focus:{...center},zoom:bounds.zoom,
          yaw:(trueYaw%(2*Math.PI)+2*Math.PI)%(2*Math.PI),
          pitch,roomId:room?.id??null,
          actorsFramed:subjects.length,
          kind:type==='contact'||type==='breach'?'action':'squad',
          shotType:type,subjects:subjects.map(a=>a.id),
          doorId:doorBeat?.doorId??relevantDoor?.id??null,
          score,occluded:wall.blocked,
          motion:subjects.reduce((v,a)=>v+speedFor(a,context),0),
          beatId:context.beat?.id??null,
          cameraAnchor:wall.camera};
      }
    }
  }
  if(!best)return null;
  // Ordinary travel stays with the squad's majority; a real ENTRY
  // changes that rule. Once a breacher is across the physical threshold,
  // film that lead rather than waiting until all four have entered.
  const dominant=rooms.map(room=>({room,count:subjects.filter(actor=>
    directorOperatorRoom(actor.p,rooms)?.id===room.id).length}))
    .sort((a,b)=>b.count-a.count)[0];
  const leadEntry=type==='entry'&&dominant?.count?
    subjects.filter(a=>{
      const intent=context.intents.find(i=>i.actorId===a.id);
      const inRoom=directorOperatorRoom(a.p,rooms);
      return intent?.kind==='entry'&&!!intent.door&&
        intent.door.distance<42&&!!inRoom&&
        inRoom.id!==dominant.room.id;
    }).sort((a,b)=>{
      const av=speedFor(a,context),bv=speedFor(b,context);
      return bv-av||a.id.localeCompare(b.id);
    })[0]:undefined;
  const leadRoom=leadEntry?directorOperatorRoom(leadEntry.p,rooms):null;
  const filmingRoom=leadRoom??dominant?.room??null;
  const members=filmingRoom?
    subjects.filter(a=>directorOperatorRoom(a.p,rooms)?.id===
      filmingRoom.id):subjects;
  const ranked=members.slice().sort((a,b)=>{
    const ai=context.intents.find(i=>i.actorId===a.id);
    const bi=context.intents.find(i=>i.actorId===b.id);
    const weight=(i:typeof ai,v:number)=>(
      i?.kind==='breach'?200:i?.kind==='entry'?165:
      i?.kind==='stack'?115:i?.kind==='approach'?95:
      i?.kind==='travel'?65:0)+v*.65+
      (i?.door?Math.max(0,50-i.door.distance)*.8:0);
    return weight(bi,speedFor(b,context))-
      weight(ai,speedFor(a,context))||
      a.id.localeCompare(b.id);
  });
  const operator=leadEntry??
    members.find(a=>a.id===context.beat?.actorId)??
    members.find(a=>a.id===context.upcoming?.actorId)??
    ranked[0]??subjects[0];
  if(!operator)return best;
  const entryDirection=leadEntry?
    context.intents.find(i=>i.actorId===leadEntry.id)?.direction:null;
  const target=context.beat?.kind==='fight'&&context.actionPair?
    (context.beat.actorId===context.beat.shooterId?
      context.actionPair.target:context.actionPair.shooter):
    leadEntry&&entryDirection?{
      x:leadEntry.p.x+entryDirection.x*52,
      y:leadEntry.p.y+entryDirection.y*52
    }:doorBeat?.target??relevantDoor?.mid??null;
  const physical=physicalDirectorView({
    operator:operator.p,focus:best.focus,
    subjectPoints:subjects.map(a=>a.p),
    target,preferredYaw:best.yaw,
    followDirection:leadEntry&&entryDirection?entryDirection:
      relevantDoor?normalize({x:relevantDoor.mid.x-operator.p.x,
        y:relevantDoor.mid.y-operator.p.y}):forward,
    doorPoint:!leadEntry?doorBeat?.target??relevantDoor?.mid??null:null,
    doorNormal:!leadEntry?relevantDoor?.normal??null:null,
    targetWeight:type==='contact'?255:
      ['approach','stack','breach','entry'].includes(type)?190:110
  },{rooms,walls,doors:context.doors,cover:context.cover},aspect);
  const realYaw=atan({x:physical.cameraAnchor.x-physical.focus.x,
    y:physical.cameraAnchor.y-physical.focus.y});
  // Orthographic default: choose scale from EVERY involved friendly
  // plus the reachable action target, with ample safety border. The
  // camera must not clip heads, feet or the advancing element.
  const visibleSubjects=leadEntry?subjects.filter(a=>
    directorOperatorRoom(a.p,rooms)?.id===leadRoom?.id||
    !walls.some(w=>segmentCross(physical.cameraAnchor,a.p,
      w.a,w.b))):subjects;
  const visibleTargets=[...visibleSubjects.map(a=>a.p),
    ...(target&&physical.targetVisible?[target]:[]),
    ...(!target&&composition.attention&&
      !walls.some(w=>segmentCross(physical.cameraAnchor,
        composition.attention!,w.a,w.b))?
      [bounded(operator.p,composition.attention,68)]:[])];
  // Match the REAL in-room overhead position: as the team gets closer
  // to the rig, its projection gets steeper. Fit at that elevation
  // instead of pretending the camera is still a flat 17° shoulder POV.
  const planar=dist(physical.cameraAnchor,physical.focus);
  const orthoTilt=Math.atan2(53-17,Math.max(1,planar));
  const focused=subjects.length<=2;
  const zoomCeiling=focused?8.4:7.4;
  const fit=projectedBounds(visibleTargets,physical.focus,realYaw,
    orthoTilt,aspect,baseSpan,zoomCeiling,
    Math.min(.83,usableWidth),Math.min(.77,usableHeight));
  const wideZoom=clamp(fit.zoom*.79,.65,zoomCeiling);
  return {...best,focus:physical.focus,
    cameraAnchor:physical.cameraAnchor,
    zoom:wideZoom,pitch:orthoTilt,
    yaw:(realYaw+2*Math.PI)%(2*Math.PI),
    roomId:physical.roomId,occluded:physical.occluded,
    fov:physical.fov,operatorPoint:{...operator.p},
    attentionPoint:target?(physical.targetVisible?{...target}:
      {...physical.focus}):
      composition.attention?{...composition.attention}:null,
    followDirection:leadEntry&&entryDirection?{...entryDirection}:
      relevantDoor?normalize({x:relevantDoor.mid.x-operator.p.x,
        y:relevantDoor.mid.y-operator.p.y}):{...forward},
    firstEntry:!!leadEntry,
    actionWeight:type==='contact'?1:
      ['entry','breach','stack','approach'].includes(type)?.84:
      type==='travel'?.5:0,
    framePoints:visibleTargets.map(p=>({...p}))};
}

/** R7: bounded cinematic shot search. Pure projection/geometry only.
 * No simulation or live enemy state is read here; caller passes friendlies.
 */
import type {DirectorActor,DirectorRoom,DirectorWall,CinematicShot}
  from './breach-replay-cinematic-director.ts';
import {directorIntentGroup,type DirectorIntent}
  from './breach-replay-director-intent.ts';
import type {DirectorFutureCue} from './breach-replay-director-events.ts';

export type DirectorShotType='travel'|'approach'|'stack'|'breach'|
  'entry'|'contact'|'overwatch'|'reorientation';
export type DirectorShotContext={
  intents:readonly DirectorIntent[];
  upcoming:DirectorFutureCue|null;
  /** Geometry space corresponding to viewport without controls. */
  usableWidth?:number;usableHeight?:number;
  maxZoom?:number;maxSubjects?:number
};
export type DirectorShot=CinematicShot&{
  shotType:DirectorShotType;subjects:string[];doorId:string|null;
  score:number;occluded:number;motion:number
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
const midpoint=(a:Pt,b:Pt):Pt=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
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
  const future=ctx.upcoming&&actors.find(a=>a.id===ctx.upcoming!.actorId);
  if(future){
    // Only focus on the friendly participant and nearby support.
    const nearby=actors.filter(a=>dist(a.p,future.p)<105);
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
  return {points:out,focus};
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
  room:DirectorRoom|null,walls:readonly DirectorWall[]){
  const ray={x:Math.sin(yaw),y:Math.cos(yaw)};
  // Evaluate a low virtual camera on the SUBJECTS' side of the room.
  // Looking through a distant external wall or an adjacent room should
  // lose against a shot with the camera inside the occupied room.
  const inset=room?Math.min(9,room.w*.2,room.h*.2):0;
  const origin=room?{
    x:clamp(center.x,room.x+inset,room.x+room.w-inset),
    y:clamp(center.y,room.y+inset,room.y+room.h-inset)
  }:center;
  let distToRoom=80;
  if(room){
    for(const [p,d,min,max] of [
      [origin.x,ray.x,room.x,room.x+room.w],
      [origin.y,ray.y,room.y,room.y+room.h]
    ] as const){
      if(Math.abs(d)>.001)distToRoom=Math.min(distToRoom,
        Math.max(0,((d>0?max:min)-p)/d));
    }
  }
  const camera={x:origin.x+ray.x*Math.min(72,Math.max(4,distToRoom-8)),
    y:origin.y+ray.y*Math.min(72,Math.max(4,distToRoom-8))};
  let blocked=0;
  for(const wall of walls){
    if(segmentCross(camera,center,wall.a,wall.b))blocked+=2;
    for(const subject of subjects)
      if(segmentCross(camera,subject,wall.a,wall.b))blocked+=1;
  }
  return {blocked,roomClearance:distToRoom,
    insideRoom:!room||pointIn(camera,room,3)};
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
  const room=rooms.filter(r=>subjects.some(a=>pointIn(a.p,r,-2)))
    .sort((a,b)=>subjects.filter(x=>pointIn(x.p,b,-2)).length-
      subjects.filter(x=>pointIn(x.p,a,-2)).length)[0]??null;
  const forward=forwardDirection(subjects,context);
  const behind=atan({x:-forward.x,y:-forward.y});
  let best:DirectorShot|null=null;
  const maxZoom=Math.min(11,context.maxZoom??9.5);
  const usableWidth=clamp(context.usableWidth??.83,.55,.92);
  const usableHeight=clamp(context.usableHeight??.78,.55,.9);
  // The threshold normal points toward the stacked operators. Filming
  // along it is a recognisable frontal doorway shot, not a side-on wall.
  const front=relevantDoor?atan(relevantDoor.normal):behind;
  for(let a=-4;a<=4;a++){
    const yaw=front+a*Math.PI/(relevantDoor?18:12);
    for(const degrees of [20,25,31,38,44]){
      const pitch=degrees*Math.PI/180;
      const bounds=projectedBounds(points,center,yaw,pitch,aspect,
        baseSpan,maxZoom,usableWidth,usableHeight);
      const wall=wallCost(center,yaw,subjects.map(x=>x.p),room,walls);
      // Zoom tightness rewards intimate framing only after subject coverage.
      const close=clamp((bounds.zoom-.65)/9,0,1);
      const elevationTarget=type==='contact'||type==='stack'||
        type==='breach'?24:type==='approach'||type==='entry'?27:
        type==='travel'||type==='overwatch'?26:31;
      const dynamicElevation=elevationTarget+(1-close)*7;
      const score=
        45 + Math.min(23,bounds.zoom*2.55) -
        Math.abs(degrees-dynamicElevation)*.38 -
        wall.blocked*4.4 -
        (wall.insideRoom?0:10) -
        (room?Math.max(0,24-wall.roomClearance)*.44:0) -
        (relevantDoor?Math.abs(delta(yaw,front))*11:
          Math.abs(delta(yaw,behind))*2.3) -
        Math.abs(delta(yaw,currentYaw))*1.05;
      if(!best||score>best.score){
        best={focus:{...center},zoom:bounds.zoom,
          yaw:(yaw%(2*Math.PI)+2*Math.PI)%(2*Math.PI),
          pitch,roomId:room?.id??null,
          actorsFramed:subjects.length,
          kind:type==='contact'||type==='breach'?'action':'squad',
          shotType:type,subjects:subjects.map(a=>a.id),
          doorId:relevantDoor?.id??null,
          score,occluded:wall.blocked,
          motion:subjects.reduce((v,a)=>v+speedFor(a,context),0)};
      }
    }
  }
  return best;
}

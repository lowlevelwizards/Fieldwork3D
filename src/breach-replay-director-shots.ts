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
  score:number;occluded:number
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

function subjectGroup(actors:readonly DirectorActor[],
  ctx:DirectorShotContext):DirectorActor[]{
  const future=ctx.upcoming&&actors.find(a=>a.id===ctx.upcoming!.actorId);
  if(future){
    // Only focus on the friendly participant and nearby support.
    const nearby=actors.filter(a=>dist(a.p,future.p)<105);
    return nearby.length?nearby:[future];
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
    if(matching.some(i=>i.door?.id===doors.door.id&&i.kind==='breach'))
      return 'breach';
    if(matching.some(i=>i.door?.id===doors.door.id&&i.kind==='entry'))
      return 'entry';
    if(matching.filter(i=>i.door?.id===doors.door.id&&
      i.door.distance<42).length>=2)return 'stack';
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
function anchorsFor(subjects:readonly DirectorActor[],
  ctx:DirectorShotContext,kind:DirectorShotType):Pt[]{
  const out=subjects.map(a=>a.p);
  if(kind==='contact'){
    const actor=subjects.find(a=>a.id===ctx.upcoming?.actorId);
    if(actor){
      const intent=ctx.intents.find(i=>i.actorId===actor.id);
      const d=intent?.direction??{x:Math.cos(actor.heading??0),
        y:Math.sin(actor.heading??0)};
      // Lead from the disclosed friendly's own movement, never the
      // unrevealed contact position.
      out.push({x:actor.p.x+d.x*32,y:actor.p.y+d.y*32});
    }
  }else{
    const group=directorIntentGroup(ctx.intents);
    if(group&&['approach','stack','breach','entry'].includes(kind)){
      const door=group.door;
      // Compose the FRONT of the door and the operator-side wall, not
      // the far side of the doorway. Door detail is a framing anchor
      // only: living operators remain the dominant subject.
      out.push(door.mid);
      out.push({x:door.mid.x+door.normal.x*18,
        y:door.mid.y+door.normal.y*18});
      if(kind==='stack'||kind==='breach'){
        const tangent=normalize({x:door.b.x-door.a.x,
          y:door.b.y-door.a.y});
        out.push({x:door.a.x-tangent.x*14,
          y:door.a.y-tangent.y*14});
        out.push({x:door.b.x+tangent.x*14,
          y:door.b.y+tangent.y*14});
      }
    }else{
      // A bounded look-ahead (not every operator's distant final node)
      // reveals where the already-drawn plan flows without dragging
      // the actual squad out of the viewport.
      const center=average(subjects);
      const intent=ctx.intents.filter(i=>
        subjects.some(a=>a.id===i.actorId)&&i.route.length>1)
        .sort((a,b)=>dist(a.position,center)-dist(b.position,center))[0];
      if(intent){
        out.push(routeLead(intent.route,38));
        out.push(routeLead(intent.route,65));
      }
    }
  }
  return out;
}
function projectedBounds(pts:readonly Pt[],center:Pt,
  yaw:number,pitch:number,aspect:number,baseSpan:number,
  maxZoom:number,usableWidth:number,usableHeight:number){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const pt of pts){
    const x=(pt.x-center.x)*c-(pt.y-center.y)*s;
    const y=((pt.x-center.x)*s+(pt.y-center.y)*c)*Math.sin(pitch);
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  // Bounds include chunky helmets and long weapons, not just foot positions.
  const width=maxX-minX+39;
  const height=maxY-minY+39*Math.cos(pitch)+28;
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
  const points=anchorsFor(subjects,context,type);
  const center=midpoint(points[0],points[0]);
  // Aim at both people and upcoming action; the door/path earns extra
  // headroom but never displaces the squad outside the shot.
  center.x=points.reduce((v,p)=>v+p.x,0)/points.length;
  center.y=points.reduce((v,p)=>v+p.y,0)/points.length;
  const group=directorIntentGroup(context.intents);
  const relevantDoor=['approach','stack','breach','entry'].includes(type)?
    group?.door??null:null;
  const room=rooms.filter(r=>subjects.some(a=>pointIn(a.p,r,-2)))
    .sort((a,b)=>subjects.filter(x=>pointIn(x.p,b,-2)).length-
      subjects.filter(x=>pointIn(x.p,a,-2)).length)[0]??null;
  const intent=context.intents.find(i=>subjects.some(a=>a.id===i.actorId)&&
    mag(i.direction)>.5);
  const forward=intent?.direction??normalize({
    x:subjects.reduce((v,a)=>v+Math.cos(a.heading??0),0),
    y:subjects.reduce((v,a)=>v+Math.sin(a.heading??0),0)
  });
  const behind=atan({x:-forward.x,y:-forward.y});
  let best:DirectorShot|null=null;
  const maxZoom=Math.min(7.5,context.maxZoom??6);
  const usableWidth=clamp(context.usableWidth??.83,.55,.92);
  const usableHeight=clamp(context.usableHeight??.78,.55,.9);
  // The threshold normal points toward the stacked operators. Filming
  // along it is a recognisable frontal doorway shot, not a side-on wall.
  const front=relevantDoor?atan(relevantDoor.normal):behind;
  for(let a=-4;a<=4;a++){
    const yaw=front+a*Math.PI/(relevantDoor?18:12);
    for(const degrees of [31,37,43,49]){
      const pitch=degrees*Math.PI/180;
      const bounds=projectedBounds(points,center,yaw,pitch,aspect,
        baseSpan,maxZoom,usableWidth,usableHeight);
      const wall=wallCost(center,yaw,subjects.map(x=>x.p),room,walls);
      // Zoom tightness rewards intimate framing only after subject coverage.
      const close=clamp((bounds.zoom-.65)/5,0,1);
      const elevationTarget=type==='contact'||type==='stack'||
        type==='breach'?34:type==='approach'||type==='entry'?38:
        type==='travel'?40:44;
      const dynamicElevation=elevationTarget+(1-close)*6;
      const score=
        45 + Math.min(16,bounds.zoom*2.35) -
        Math.abs(degrees-dynamicElevation)*.32 -
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
          score,occluded:wall.blocked};
      }
    }
  }
  return best;
}

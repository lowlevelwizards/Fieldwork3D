/** Replay Director physical cinematography.
 * No X-ray framing: camera positions obey occupied room boundaries, solid
 * wall segments and fixtures. Camera-to-subject lines must be physically
 * unobstructed. Never changes simulation visibility or replay knowledge.
 */
import type {DirectorRoom,DirectorWall} from './breach-replay-cinematic-director.ts';
import type {Door,Obstacle} from './breach-core.ts';

export type PhysicalPoint={x:number;y:number};
export type PhysicalDirectorScene={
  rooms:readonly DirectorRoom[];
  walls:readonly DirectorWall[];
  cover?:readonly Pick<Obstacle,'x'|'y'|'w'|'h'>[];
  doors?:readonly Pick<Door,'a'|'b'|'open'|'openFraction'|'style'>[];
};
export type PhysicalDirectorRequest={
  operator:PhysicalPoint;focus:PhysicalPoint;
  subjectPoints:readonly PhysicalPoint[];
  target?:PhysicalPoint|null;preferredYaw:number;
};
export type PhysicalDirectorView={
  cameraAnchor:PhysicalPoint;focus:PhysicalPoint;
  roomId:string|null;fov:number;targetVisible:boolean;
  occluded:number
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:PhysicalPoint,b:PhysicalPoint)=>
  Math.hypot(a.x-b.x,a.y-b.y);
const angleDelta=(a:number,b:number)=>
  Math.atan2(Math.sin(a-b),Math.cos(a-b));
const inside=(p:PhysicalPoint,r:DirectorRoom,pad=0)=>
  p.x>=r.x+pad&&p.x<=r.x+r.w-pad&&
  p.y>=r.y+pad&&p.y<=r.y+r.h-pad;
const cross=(a:PhysicalPoint,b:PhysicalPoint)=>a.x*b.y-a.y*b.x;
const segmentHits=(a:PhysicalPoint,b:PhysicalPoint,
  c:PhysicalPoint,d:PhysicalPoint)=>{
  const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y};
  const den=cross(r,s);if(Math.abs(den)<1e-6)return false;
  const p={x:c.x-a.x,y:c.y-a.y};
  const t=cross(p,s)/den,u=cross(p,r)/den;
  return t>.001&&t<.999&&u>=0&&u<=1;
};
const segmentDistance=(p:PhysicalPoint,a:PhysicalPoint,b:PhysicalPoint)=>{
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/
    Math.max(1e-8,dx*dx+dy*dy),0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
};
/** Closed physical doors block optical lines through otherwise open wall
 * gaps. Glazed doors remain optically permeable, but camera rigs cannot
 * occupy the door opening. */
const closedDoors=(scene:PhysicalDirectorScene)=>scene.doors?.filter(d=>
  (d.openFraction!==undefined?d.openFraction<.8:!d.open)&&
  !['glazed','french','screen','mesh-gate'].includes(d.style??''))??[];
export function directorLineBlocked(a:PhysicalPoint,b:PhysicalPoint,
  scene:PhysicalDirectorScene,checkDoors=true):boolean{
  if(scene.walls.some(w=>segmentHits(a,b,w.a,w.b)))return true;
  return checkDoors&&closedDoors(scene).some(d=>segmentHits(a,b,d.a,d.b));
}
/** A camera can fit in a room only if it has wall, leaf and furniture
 * clearance. Opaque roofs never alter this ground-plane feasibility. */
export function directorCameraLegal(p:PhysicalPoint,
  room:DirectorRoom|null,scene:PhysicalDirectorScene):boolean{
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
  if(room){
    const inset=Math.min(11,room.w*.24,room.h*.24);
    if(!inside(p,room,inset))return false;
  }else if(scene.rooms.some(r=>inside(p,r,0)))return false;
  if(scene.walls.some(w=>segmentDistance(p,w.a,w.b)<8.5))return false;
  if((scene.doors??[]).some(d=>segmentDistance(p,d.a,d.b)<7))return false;
  // Cover coordinates are center-based, unlike the room rectangles.
  if((scene.cover??[]).some(o=>Math.abs(p.x-o.x)<=o.w/2+7&&
    Math.abs(p.y-o.y)<=o.h/2+7))return false;
  return true;
}
export function directorOperatorRoom(p:PhysicalPoint,
  rooms:readonly DirectorRoom[]):DirectorRoom|null{
  const exact=rooms.filter(r=>inside(p,r,1))
    .sort((a,b)=>a.w*a.h-b.w*b.h)[0];
  if(exact)return exact;
  // At thresholds, an actor can be a few units into the door gap.
  // Preserve the nearest occupied room rather than sending the camera
  // outside to photograph an interior scene through its outer wall.
  const adjacent=rooms.map(r=>({room:r,d:Math.hypot(
    p.x-clamp(p.x,r.x,r.x+r.w),
    p.y-clamp(p.y,r.y,r.y+r.h))}))
    .sort((a,b)=>a.d-b.d||a.room.w*a.room.h-b.room.w*b.room.h)[0];
  return adjacent&&adjacent.d<=7?adjacent.room:null;
}
/** Perspective audition: generous over-the-shoulder height and lens,
 * framing the full squad rather than cropping on the nearest backpack.
 * Walls still prevent impossible cross-room two-shots. */
function requiredFov(anchor:PhysicalPoint,focus:PhysicalPoint,
  pts:readonly PhysicalPoint[],aspect=1.1):number{
  const dx=focus.x-anchor.x,dz=focus.y-anchor.y;
  const dx3=dx,dy3=-24,dz3=dz;
  const length=Math.hypot(dx3,dy3,dz3)||1;
  const fwd={x:dx3/length,y:dy3/length,z:dz3/length};
  const horizontal=Math.hypot(fwd.x,fwd.z)||1;
  const right={x:fwd.z/horizontal,z:-fwd.x/horizontal};
  const up={x:-fwd.y*fwd.x/horizontal,
    y:horizontal,z:-fwd.y*fwd.z/horizontal};
  let half=0;
  for(const p of pts)for(const h of [5,23,38]){
    const v={x:p.x-anchor.x,y:h-42,z:p.y-anchor.y};
    const depth=v.x*fwd.x+v.y*fwd.y+v.z*fwd.z;
    if(depth<3)return 150;
    const x=Math.abs(v.x*right.x+v.z*right.z);
    const y=Math.abs(v.x*up.x+v.y*up.y+v.z*up.z);
    half=Math.max(half,Math.atan2(x*1.27,depth*Math.max(.65,aspect)),
      Math.atan2(y*1.22,depth));
  }
  return Math.max(96,half*360/Math.PI);
}
export function physicalDirectorView(req:PhysicalDirectorRequest,
  scene:PhysicalDirectorScene,aspect=1.1):PhysicalDirectorView{
  const room=directorOperatorRoom(req.operator,scene.rooms);
  // Prefer a roomy, elevated three-quarter composition. A camera
  // planted against a helmet is never an acceptable wide shot.
  const radius=[38,52,68,84,100];
  const anchors:PhysicalPoint[]=[];
  const add=(p:PhysicalPoint)=>{if(directorCameraLegal(p,room,scene)&&
    distance(p,req.operator)>=29&&distance(p,req.operator)<125&&
    distance(p,req.focus)>=26&&
    req.subjectPoints.every(subject=>distance(p,subject)>=24))
    anchors.push(p);};
  // Search around the actual friendly actor, not a focus point across
  // a wall in a different room. The full 360° set always contains a
  // location behind the preferred shoulder, if one is walkable.
  for(let a=0;a<24;a++){
    const yaw=req.preferredYaw+a*Math.PI/12;
    for(const r of radius)add({x:req.operator.x+Math.sin(yaw)*r,
      y:req.operator.y+Math.cos(yaw)*r});
  }
  if(room){
    for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)
      add({x:room.x+room.w*a/9,y:room.y+room.h*b/9});
  }
  // In an extremely small room the safest available shot is a
  // centered, close establishing shot; never retreat outside the wall.
  if(!anchors.length){
    const fallback=room?{x:clamp(req.operator.x,
      room.x+Math.min(11,room.w*.24),room.x+room.w-Math.min(11,room.w*.24)),
      y:clamp(req.operator.y,
        room.y+Math.min(11,room.h*.24),room.y+room.h-Math.min(11,room.h*.24))}:
      {...req.operator};
    return {cameraAnchor:fallback,focus:{...req.operator},
      roomId:room?.id??null,fov:112,targetVisible:false,occluded:0};
  }
  let best:PhysicalDirectorView|null=null,score=-Infinity;
  for(const p of anchors){
    if(directorLineBlocked(p,req.operator,scene))continue;
    const targetVisible=!!req.target&&
      !directorLineBlocked(p,req.target,scene);
    // The intended victim may physically be in a different room.
    // Without an opening, frame the shooter and the threat direction
    // rather than centering an enemy behind an opaque wall.
    let focus:PhysicalPoint=targetVisible||!req.target?
      {...req.focus}:{
        x:req.operator.x+(req.target.x-req.operator.x)*
          Math.min(1,22/Math.max(1,distance(req.operator,req.target))),
        y:req.operator.y+(req.target.y-req.operator.y)*
          Math.min(1,22/Math.max(1,distance(req.operator,req.target)))
      };
    if(directorLineBlocked(p,focus,scene))focus={...req.operator};
    const visible=req.subjectPoints.filter(pt=>
      !directorLineBlocked(p,pt,scene));
    const fits=[...visible,
      ...(targetVisible&&req.target?[req.target]:[])];
    const fov=requiredFov(p,focus,fits,aspect);
    const yaw=Math.atan2(p.x-focus.x,p.y-focus.y);
    // Coverage first. Full squad outweighs a pretty angle or a single
    // target, and wide framing wins over intimate backpack closeups.
    const groupCenter=visible.length?{
      x:visible.reduce((v,a)=>v+a.x,0)/visible.length,
      y:visible.reduce((v,a)=>v+a.y,0)/visible.length
    }:req.operator;
    const candidate=visible.length*46+
      (targetVisible?30:0)-
      (req.target&&!targetVisible?6:0)-
      Math.abs(angleDelta(yaw,req.preferredYaw))*14-
      Math.abs(distance(p,groupCenter)-75)*.19-
      Math.max(0,fov-112)*3-
      Math.max(0,visible.length?0:120);
    if(candidate>score){
      score=candidate;
      best={cameraAnchor:p,focus,roomId:room?.id??null,
        fov:clamp(fov,96,116),targetVisible,
        occluded:req.subjectPoints.length-visible.length+
          (req.target&&!targetVisible?1:0)};
    }
  }
  // In a room with no optically clear shot, keep the camera INSIDE and
  // look at the nearest friendly. It must not jump outside the building.
  return best??{cameraAnchor:anchors[0],focus:{...req.operator},
    roomId:room?.id??null,fov:112,targetVisible:false,
    occluded:req.subjectPoints.length};
}

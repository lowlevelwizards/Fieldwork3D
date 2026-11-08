/** Replay Director physical cinematography.
 * No X-ray framing: camera positions obey occupied room boundaries, solid
 * wall segments and fixtures. Camera-to-subject lines must be physically
 * unobstructed. Never changes simulation visibility or replay knowledge.
 */
import type {DirectorRoom,DirectorWall} from './breach-replay-cinematic-director.ts';
import type {Door,Obstacle} from './breach-core.ts';
import {directorPerspectiveCovers,directorOrthoFittingZoom,
  directorCompositionQuality,type DirectorCompositionTreatment,
  type DirectorCompositionQuality}
  from './breach-replay-director-projection.ts';

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
  /** R8: if required actors are readable, other teammates are optional. */
  requiredPoints?:readonly PhysicalPoint[];
  target?:PhysicalPoint|null;preferredYaw:number;
  /** Travel/weapon direction: prefer a follow rig behind the active actor. */
  followDirection?:PhysicalPoint|null;
  /** Action LOS outranks merely including an unrelated supporting actor. */
  targetWeight?:number;
  /** Filming across the threshold normal yields the door's front face. */
  doorPoint?:PhysicalPoint|null;
  doorNormal?:PhysicalPoint|null;
  composition?:{treatment:DirectorCompositionTreatment;baseSpan:number;
    usableWidth:number;usableHeight:number};
};
export type PhysicalDirectorView={
  cameraAnchor:PhysicalPoint;focus:PhysicalPoint;
  roomId:string|null;fov:number;targetVisible:boolean;
  occluded:number;compositionQuality?:DirectorCompositionQuality
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
export function directorRequiredFov(anchor:PhysicalPoint,focus:PhysicalPoint,
  pts:readonly PhysicalPoint[],aspect=1.1):number{
  const dx=focus.x-anchor.x,dz=focus.y-anchor.y;
  const dx3=dx,dy3=-26,dz3=dz;
  const length=Math.hypot(dx3,dy3,dz3)||1;
  const fwd={x:dx3/length,y:dy3/length,z:dz3/length};
  const horizontal=Math.hypot(fwd.x,fwd.z)||1;
  const right={x:fwd.z/horizontal,z:-fwd.x/horizontal};
  const up={x:-fwd.y*fwd.x/horizontal,
    y:horizontal,z:-fwd.y*fwd.z/horizontal};
  let half=0;
  for(const p of pts)for(const h of [5,23,38]){
    const v={x:p.x-anchor.x,y:h-44,z:p.y-anchor.y};
    const depth=v.x*fwd.x+v.y*fwd.y+v.z*fwd.z;
    if(depth<3)return 150;
    const x=Math.abs(v.x*right.x+v.z*right.z);
    const y=Math.abs(v.x*up.x+v.y*up.y+v.z*up.z);
    half=Math.max(half,Math.atan2(x*1.27,depth*Math.max(.65,aspect)),
      Math.atan2(y*1.22,depth));
  }
  return Math.max(82,half*360/Math.PI);
}
export function physicalDirectorView(req:PhysicalDirectorRequest,
  scene:PhysicalDirectorScene,aspect=1.1):PhysicalDirectorView{
  const room=directorOperatorRoom(req.operator,scene.rooms);
  // Prefer a roomy, elevated three-quarter composition. A camera
  // planted against a helmet is never an acceptable wide shot.
  const radius=[50,66,82,98,116];
  const anchors:PhysicalPoint[]=[];
  const add=(p:PhysicalPoint)=>{if(directorCameraLegal(p,room,scene)&&
    distance(p,req.operator)>=40&&distance(p,req.operator)<145&&
    distance(p,req.focus)>=32&&
    req.subjectPoints.every(subject=>distance(p,subject)>=35))
    anchors.push(p);};
  // Search around the actual friendly actor, not a focus point across
  // a wall in a different room. The full 360° set always contains a
  // location behind the preferred shoulder, if one is walkable.
  for(let a=0;a<24;a++){
    const yaw=req.preferredYaw+a*Math.PI/12;
    for(const r of radius)add({x:req.operator.x+Math.sin(yaw)*r,
      y:req.operator.y+Math.cos(yaw)*r});
  }
  // Explicit shoulder offsets supplement, never replace, the legal
  // 360-degree and room-grid searches. Both sides must be considered.
  if(req.composition?.treatment==='engage'&&req.followDirection){
    const d=req.followDirection,n=Math.hypot(d.x,d.y)||1;
    const fx=d.x/n,fy=d.y/n;
    for(const back of [54,72,90])for(const side of [-1,1])
      for(const lateral of [22,34])add({
        x:req.operator.x-fx*back-fy*lateral*side,
        y:req.operator.y-fy*back+fx*lateral*side});
  }
  if(room){
    for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)
      add({x:room.x+room.w*a/9,y:room.y+room.h*b/9});
  }
  // Cramped rooms occasionally have no candidate with a 35-unit
  // standoff from EVERY teammate. Relax only the shoulder margin, never
  // actual wall/door/fixture geometry; prefer a legal establishing frame
  // over placing the lens inside the selected operator's backpack.
  if(!anchors.length){
    const relaxed:PhysicalPoint[]=[];
    const addRelaxed=(p:PhysicalPoint)=>{
      if(directorCameraLegal(p,room,scene)&&
         distance(p,req.operator)>=29&&
         req.subjectPoints.every(subject=>distance(p,subject)>=20)&&
         !directorLineBlocked(p,req.operator,scene))
        relaxed.push(p);
    };
    if(room){
      for(let x=1;x<=12;x++)for(let y=1;y<=12;y++)
        addRelaxed({x:room.x+room.w*x/13,
          y:room.y+room.h*y/13});
    }else for(let i=0;i<24;i++){
      const yaw=req.preferredYaw+i*Math.PI/12;
      for(const radius of [31,40,52])
        addRelaxed({x:req.operator.x+Math.sin(yaw)*radius,
          y:req.operator.y+Math.cos(yaw)*radius});
    }
    relaxed.sort((a,b)=>{
      const direction=req.followDirection;
      const ahead=(p:PhysicalPoint)=>direction?
        (p.x-req.operator.x)*direction.x+
        (p.y-req.operator.y)*direction.y:0;
      const score=(p:PhysicalPoint)=>
        distance(p,req.operator)*.45-
        Math.max(0,ahead(p))*1.8;
      return score(b)-score(a);
    });
    anchors.push(...relaxed.slice(0,36));
  }
  if(!anchors.length){
    // Truly impossible physical placement: preserve the old safe
    // fallback without inventing passage through a solid wall.
    const fallback=room?{x:clamp(req.operator.x,
      room.x+Math.min(11,room.w*.24),room.x+room.w-Math.min(11,room.w*.24)),
      y:clamp(req.operator.y,
        room.y+Math.min(11,room.h*.24),room.y+room.h-Math.min(11,room.h*.24))}:
      {...req.operator};
    return {cameraAnchor:fallback,focus:{...req.operator},
      roomId:room?.id??null,fov:112,targetVisible:false,occluded:0};
  }
  let best:PhysicalDirectorView|null=null,score=-Infinity;
  const candidates:{view:PhysicalDirectorView;score:number}[]=[];
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
    const mandatory=req.requiredPoints??[req.operator];
    const essentialVisible=mandatory.filter(pt=>
      !directorLineBlocked(p,pt,scene));
    const fits=[...essentialVisible,
      ...(targetVisible&&req.target?[req.target]:[])];
    const fov=directorRequiredFov(p,focus,fits,aspect);
    const yaw=Math.atan2(p.x-focus.x,p.y-focus.y);
    // Coverage first. Full squad outweighs a pretty angle or a single
    // target, and wide framing wins over intimate backpack closeups.
    const groupCenter=visible.length?{
      x:visible.reduce((v,a)=>v+a.x,0)/visible.length,
      y:visible.reduce((v,a)=>v+a.y,0)/visible.length
    }:req.operator;
    const dir=req.followDirection;
    const mag=dir?Math.hypot(dir.x,dir.y):0;
    const forward=dir&&mag>.01?{x:dir.x/mag,y:dir.y/mag}:null;
    const ideal=forward?{
      x:req.operator.x-forward.x*78-forward.y*15,
      y:req.operator.y-forward.y*78+forward.x*15}:null;
    const forwardOffset=forward?
      (p.x-req.operator.x)*forward.x+
      (p.y-req.operator.y)*forward.y:0;
    const door=req.doorPoint,normal=req.doorNormal;
    const doorFacing=door&&normal?
      ((p.x-door.x)*normal.x+(p.y-door.y)*normal.y)/
       Math.max(1,distance(p,door)):null;
    // A deliberate door-front photograph should see the whole mouth
    // nearly perpendicular to its wall, from the approach side.
    // Penalize a side-on profile, even when it fits all four actors.
    const doorPenalty=doorFacing===null?0:
      Math.max(0,.82-doorFacing)*115;
    // The shooter/target two-shot is higher priority than an unrelated
    // teammate behind the camera. A foreground backpack with the target
    // outside the lens is never an acceptable successful composition.
    const candidate=essentialVisible.length*310-
      (mandatory.length-essentialVisible.length)*450+
      visible.length*9+
      (targetVisible?(req.targetWeight??155):0)-
      (req.target&&!targetVisible?100:0)-
      doorPenalty-
      Math.abs(angleDelta(yaw,req.preferredYaw))*5-
      Math.abs(distance(p,groupCenter)-86)*.13-
      (ideal?distance(p,ideal)*.92:0)-
      (forwardOffset>0?Math.min(110,forwardOffset*1.65):0)-
      Math.max(0,fov-107)*7-
      Math.max(0,visible.length?0:120);
    const proposal:PhysicalDirectorView={cameraAnchor:p,focus,roomId:room?.id??null,
      fov:clamp(Math.max(96,fov),96,116),targetVisible,
      occluded:req.subjectPoints.length-visible.length+
        (req.target&&!targetVisible?1:0)};
    let rankedScore=candidate;
    if(req.composition){
      const c=req.composition;
      const zoom=directorOrthoFittingZoom(p,focus,
        req.requiredPoints??[req.operator],aspect,c.baseSpan,
        c.usableWidth,c.usableHeight,8,.8);
      const quality=directorCompositionQuality(p,focus,req.operator,
        targetVisible?req.target??null:null,
        req.followDirection??{x:1,y:0},c.treatment,'ortho',
        aspect,c.baseSpan,zoom,proposal.fov,
        c.usableWidth,c.usableHeight);
      proposal.compositionQuality=quality;
      // Coverage remains paramount. A back-of-head that conceals a real
      // target is not an acceptable OTS even if point LOS is clear.
      if(targetVisible&&req.target&&!quality.targetReadable)
        rankedScore-=420;
      if(!quality.primaryReadable)rankedScore-=230;
      rankedScore+=(quality.score-80)*2.6;
      if(quality.shoulderReadable&&c.treatment==='engage')
        rankedScore+=36;
    }
    candidates.push({score:rankedScore,view:proposal});
    if(rankedScore>score){score=rankedScore;best=proposal;}
  }
  // Only inspect the strongest small set with the REAL WIDE projection.
  // The old FOV estimate could request 150 degrees then clamp to 116
  // and silently crop a required shooter/target. Prefer a different
  // legal setup when it is comparably strong and genuinely fits.
  if(best&&req.requiredPoints?.length){
    const ranked=candidates.sort((a,b)=>b.score-a.score);
    for(const proposal of ranked.slice(0,16)){
      if(proposal.score<score-200)break;
      if(directorPerspectiveCovers(proposal.view.cameraAnchor,
        proposal.view.focus,req.requiredPoints,aspect,
        proposal.view.fov,.90,.89))return proposal.view;
    }
  }
  // No legal WIDE two-shot exists: preserve the strongest physical
  // ORTHO setup rather than inventing an impossible camera position.
  return best??{cameraAnchor:anchors[0],focus:{...req.operator},
    roomId:room?.id??null,fov:112,targetVisible:false,
    occluded:req.subjectPoints.length};
}

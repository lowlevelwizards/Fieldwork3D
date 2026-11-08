/** Replay Director physical cinematography.
 * No X-ray framing: camera positions obey occupied room boundaries, solid
 * wall segments and fixtures. Camera-to-subject lines must be physically
 * unobstructed. Never changes simulation visibility or replay knowledge.
 */
import type {DirectorRoom,DirectorWall} from './breach-replay-cinematic-director.ts';
import {doorOpticalSegment,doorTransmitsSightAndLight,
  type Door,type Obstacle} from './breach-core.ts';
import {directorPerspectiveCovers,directorOrthoFittingZoom,
  directorCompositionQuality,directorForegroundOccupancy,
  directorProjectedActionVisibility,directorAttentionVisible,
  type DirectorForegroundSegment,type DirectorSafeFrame,
  type DirectorCompositionTreatment,type DirectorCompositionQuality}
  from './breach-replay-director-projection.ts';
import type {DirectorActionLine}
  from './breach-replay-director-action.ts';

export type PhysicalPoint={x:number;y:number};
export type PhysicalDirectorScene={
  rooms:readonly DirectorRoom[];
  walls:readonly DirectorWall[];
  cover?:readonly Pick<Obstacle,'x'|'y'|'w'|'h'|'low'|'fixture'>[];
  doors?:readonly Pick<Door,'a'|'b'|'open'|'openFraction'|'style'|'kind'|'hinge'|'swing'|'slideDirection'>[];
};
export type PhysicalDirectorRequest={
  operator:PhysicalPoint;focus:PhysicalPoint;
  subjectPoints:readonly PhysicalPoint[];
  /** R8: if required actors are readable, other teammates are optional. */
  requiredPoints?:readonly PhysicalPoint[];
  target?:PhysicalPoint|null;preferredYaw:number;
  /** Travel/weapon direction: prefer a follow rig behind the active actor. */
  followDirection?:PhysicalPoint|null;
  motionSpeed?:number;
  /** Action LOS outranks merely including an unrelated supporting actor. */
  targetWeight?:number;
  /** Historical muzzle/impact lines add a SMALL framing bonus, never
   * a new cut reason or an implicit/disclosed target. */
  actionLines?:readonly DirectorActionLine[];
  /** Filming across the threshold normal yields the door's front face. */
  doorPoint?:PhysicalPoint|null;
  doorNormal?:PhysicalPoint|null;
  composition?:{treatment:DirectorCompositionTreatment;baseSpan:number;
    usableWidth:number;usableHeight:number;safeFrame?:DirectorSafeFrame;
    discoveryStrength?:number;attentionPoint?:PhysicalPoint|null};
};
export type PhysicalDirectorView={
  cameraAnchor:PhysicalPoint;focus:PhysicalPoint;
  roomId:string|null;fov:number;targetVisible:boolean;
  occluded:number;compositionQuality?:DirectorCompositionQuality;
  subjectVisibility?:number;subjectReadable?:boolean
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

/** Fraction of camera-to-subject ray crossing a vertical architectural
 * edge. The height test is separate: high camera rays can clear low cover. */
const segmentHitFraction=(a:PhysicalPoint,b:PhysicalPoint,
  c:PhysicalPoint,d:PhysicalPoint):number|null=>{
  const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y};
  const den=cross(r,s);if(Math.abs(den)<1e-6)return null;
  const p={x:c.x-a.x,y:c.y-a.y};
  const t=cross(p,s)/den,u=cross(p,r)/den;
  return t>.002&&t<.985&&u>=0&&u<=1?t:null;
};
const segmentHits=(a:PhysicalPoint,b:PhysicalPoint,
  c:PhysicalPoint,d:PhysicalPoint)=>
  segmentHitFraction(a,b,c,d)!==null;
const segmentDistance=(p:PhysicalPoint,a:PhysicalPoint,b:PhysicalPoint)=>{
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/
    Math.max(1e-8,dx*dx+dy*dy),0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
};
/** Closed physical doors block optical lines through otherwise open wall
 * gaps. Glazed doors remain optically permeable, but camera rigs cannot
 * occupy the door opening. */
const opaqueDoors=(scene:PhysicalDirectorScene)=>
  (scene.doors??[]).filter(d=>!doorTransmitsSightAndLight(d as Door));
export function directorLineBlocked(a:PhysicalPoint,b:PhysicalPoint,
  scene:PhysicalDirectorScene,checkDoors=true):boolean{
  if(scene.walls.some(w=>segmentHits(a,b,w.a,w.b)))return true;
  // The door has MOVED since the level was built: use the actual leaf,
  // not the closed threshold line. This includes fully open solid doors.
  return checkDoors&&opaqueDoors(scene).some(d=>{
    const leaf=doorOpticalSegment(d as Door);
    return segmentHits(a,b,leaf.a,leaf.b);
  });
}

/** Cheap 3D silhouette visibility for a staged operator. Seven optical rays
 * sample head, torso, shoulders and feet; a point-only LOS is insufficient
 * when an open door or furniture masks most of the character. This is
 * camera evidence ONLY, not tactical/fog-of-war visibility. */
export function directorSubjectVisibility(
  camera:PhysicalPoint,subject:PhysicalPoint,scene:PhysicalDirectorScene,
  eyeHeight=53
):{fraction:number;torsoVisible:boolean;headVisible:boolean;readable:boolean}{
  // Architectural walls are always hard opaque regardless of camera
  // elevation. The sampled-height allowance below is only for leaves
  // and furniture, and must never introduce a wall X-ray.
  if(scene.walls.some(w=>segmentHits(camera,subject,w.a,w.b)))
    return {fraction:0,torsoVisible:false,headVisible:false,
      readable:false};
  const dx=subject.x-camera.x,dy=subject.y-camera.y;
  const length=Math.hypot(dx,dy)||1;
  const side={x:-dy/length,y:dx/length};
  const samples:readonly [number,number][]=[
    [22,0],[36,0],[8,0],[25,-9],[25,9],[33,-7],[33,7]];
  const doors=opaqueDoors(scene).map(d=>doorOpticalSegment(d as Door));
  const visible=(height:number,offset:number)=>{
    const point={x:subject.x+side.x*offset,y:subject.y+side.y*offset};
    const blocks=(a:PhysicalPoint,b:PhysicalPoint,h:number)=>{
      const t=segmentHitFraction(camera,point,a,b);
      return t!==null&&eyeHeight+(height-eyeHeight)*t<h;
    };
    if(scene.walls.some(w=>blocks(w.a,w.b,47)))return false;
    if(doors.some(d=>blocks(d.a,d.b,44)))return false;
    // Furniture is center-based; lower pieces should obscure boots,
    // not a torso. Its exact screen geometry varies by prop family.
    for(const o of scene.cover??[]){
      const minX=o.x-o.w/2,minY=o.y-o.h/2;
      const sx=point.x-camera.x,sy=point.y-camera.y;
      let entry=0,exit=1;
      for(const [base,dir,low,high] of [
        [camera.x,sx,minX,minX+o.w],
        [camera.y,sy,minY,minY+o.h]]){
        if(Math.abs(dir)<1e-7){
          if(base<low||base>high){entry=2;break;}
        }else{
          const t1=(low-base)/dir,t2=(high-base)/dir;
          entry=Math.max(entry,Math.min(t1,t2));
          exit=Math.min(exit,Math.max(t1,t2));
        }
      }
      if(entry>0.002&&entry<.98&&entry<=exit&&
        eyeHeight+(height-eyeHeight)*entry<(o.low?17:35))
        return false;
    }
    return true;
  };
  let count=0;
  const seen=samples.map(([height,offset])=>{
    const ok=visible(height,offset);if(ok)count++;return ok;
  });
  const fraction=count/samples.length;
  return {fraction,torsoVisible:seen[0],headVisible:seen[1],
    readable:fraction>=.43&&(seen[0]||seen[1]||seen[3]&&seen[4])};
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
  if((scene.doors??[]).some(d=>{
    const leaf=doorOpticalSegment(d as Door);
    return segmentDistance(p,d.a,d.b)<7||
      segmentDistance(p,leaf.a,leaf.b)<8;
  }))return false;
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
    // A 15-unit shoulder offset produces the centered-backpack failure.
    // Audition both genuine lateral shoulders and near-profile cameras.
    // All positions still pass the same room/wall/leaf clearance gates.
    for(const back of [18,42,66,88])for(const side of [-1,1])
      for(const lateral of [36,54,74])add({
        x:req.operator.x-fx*back-fy*lateral*side,
        y:req.operator.y-fy*back+fx*lateral*side});
  }
  if(req.composition?.treatment==='follow'&&req.followDirection&&
     (req.motionSpeed??0)>6){
    const d=req.followDirection,n=Math.hypot(d.x,d.y)||1;
    const fx=d.x/n,fy=d.y/n;
    // Traveling beside the team: lateral dolly with some look-ahead.
    // These remain candidates in the EXISTING legal solver, not a new
    // camera state machine or permission to cut.
    for(const along of [-45,-25,0])for(const side of [-1,1])
      for(const lateral of [52,78,104])add({
        x:req.operator.x+fx*along-fy*lateral*side,
        y:req.operator.y+fy*along+fx*lateral*side});
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
    const primaryVision=directorSubjectVisibility(p,req.operator,scene);
    const targetVisible=!!req.target&&
      directorSubjectVisibility(p,req.target,scene).readable&&
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
      directorSubjectVisibility(p,pt,scene).readable);
    const mandatory=req.requiredPoints??[req.operator];
    const essentialVisible=mandatory.filter(pt=>
      (distance(pt,req.operator)<.5?primaryVision.readable:
        !directorLineBlocked(p,pt,scene)));
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
    // Camera-side neutrality: the original +54 ideal silently favored
    // one shoulder even when that side faced a wall. Both shoulders
    // compete on actual visible content, not a preselected preference.
    const lateral=req.composition?.treatment==='engage'?0:15;
    const ideal=forward?{
      x:req.operator.x-forward.x*78-forward.y*lateral,
      y:req.operator.y-forward.y*78+forward.x*lateral}:null;
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
      visible.length*(req.composition?.discoveryStrength?2:
        req.composition?.treatment==='door'||
        req.composition?.treatment==='entry'?22:9)+
      (targetVisible?(req.targetWeight??155):0)-
      (req.target&&!targetVisible?100:0)-
      doorPenalty-
      Math.abs(angleDelta(yaw,req.preferredYaw))*5-
      Math.abs(distance(p,groupCenter)-86)*.13-
      (ideal?distance(p,ideal)*.92:0)-
      (forwardOffset>0?Math.min(110,forwardOffset*1.65):0)-
      Math.max(0,fov-107)*7-
      Math.max(0,visible.length?0:120)+
      // A center-point LOS alone does not make a shot watchable.
      // These penalties dominate pretty-angle and exact-thirds terms;
      // partial foreground silhouettes remain intentionally allowed.
      primaryVision.fraction*640-
      (primaryVision.readable?0:1450)-
      (!primaryVision.torsoVisible&&!primaryVision.headVisible?310:0);
    const proposal:PhysicalDirectorView={cameraAnchor:p,focus,roomId:room?.id??null,
      fov:clamp(Math.max(96,fov),96,116),targetVisible,
      occluded:req.subjectPoints.length-visible.length+
        (req.target&&!targetVisible?1:0),
      subjectVisibility:primaryVision.fraction,
      subjectReadable:primaryVision.readable};
    let rankedScore=candidate;
    if(req.composition){
      const c=req.composition;
      const zoom=directorOrthoFittingZoom(p,focus,
        req.requiredPoints??[req.operator],aspect,c.baseSpan,
        c.usableWidth,c.usableHeight,8,.8,c.safeFrame);
      const quality=directorCompositionQuality(p,focus,req.operator,
        targetVisible?req.target??null:null,
        req.followDirection??{x:1,y:0},c.treatment,'ortho',
        aspect,c.baseSpan,zoom,proposal.fov,
        c.usableWidth,c.usableHeight,c.safeFrame,req.subjectPoints);
      proposal.compositionQuality=quality;
      // Coverage remains paramount. A back-of-head that conceals a real
      // target is not an acceptable OTS even if point LOS is clear.
      if(req.target){
        // A seen hostile that vanishes behind ANY nearer teammate is not
        // a cinematic two-shot. Never award a point-only LOS victory.
        if(!targetVisible||!quality.targetReadable){
          rankedScore-=1450;
          proposal.targetVisible=false;
          // When the room makes a true two-shot impossible, the least
          // dishonest alternative still favors a lateral, separated
          // view rather than straight down the backpack.
          rankedScore+=Math.min(.3,quality.targetHorizontalGap)*350;
        }else rankedScore+=380;
      }
      if(!quality.primaryReadable)rankedScore-=850;
      rankedScore+=(quality.score-80)*3;
      if(c.treatment==='follow'&&(req.motionSpeed??0)>6&&forward){
        const rel={x:p.x-req.operator.x,y:p.y-req.operator.y};
        const separation=Math.hypot(rel.x,rel.y)||1;
        const sideAngle=Math.abs(forward.x*rel.y-forward.y*rel.x)/
          separation;
        // A modest staging preference; the already-held rail remains
        // authoritative, so this never forces the editor to change shot.
        rankedScore+=Math.max(0,sideAngle-.55)*200;
      }
      if(c.treatment==='engage'){
        // Contact framing prefers shoulders with real lateral separation,
        // not just a frontal muzzle and a point-coordinate behind it.
        const d=req.followDirection;
        if(d){
          const delta={x:p.x-req.operator.x,y:p.y-req.operator.y};
          const cross=Math.abs(d.x*delta.y-d.y*delta.x)/
            Math.max(1,Math.hypot(d.x,d.y)*Math.hypot(delta.x,delta.y));
          rankedScore-=Math.max(0,.43-cross)*600;
        }
        if(quality.shoulderReadable)rankedScore+=90;
      }
    }
    candidates.push({score:rankedScore,view:proposal});
    if(rankedScore>score){score=rankedScore;best=proposal;}
  }
  // A full-screen opened door leaf may pass a point LOS. Audition the
  // strongest *physical* candidates for real projected foreground surface
  // occupation, then rank again before selecting either lens. This runs
  // only at storyboard knots, never each rendered frame.
  let auditedCandidates=candidates;
  if(req.composition&&candidates.length){
    const surfaces:DirectorForegroundSegment[]=[
      ...scene.walls.map(w=>({a:w.a,b:w.b,height:47,
        kind:'wall' as const})),
      ...opaqueDoors(scene).map(d=>{
        const leaf=doorOpticalSegment(d as Door);
        return {...leaf,height:44,kind:'door' as const};
      }),
      ...(scene.cover??[]).flatMap(o=>{
        const a={x:o.x-o.w/2,y:o.y-o.h/2},
          b={x:o.x+o.w/2,y:o.y+o.h/2},
          c={x:a.x,y:b.y},d={x:b.x,y:a.y};
        return [{a,b,height:o.low?17:35,
          kind:'furniture' as const},
          {a:c,b:d,height:o.low?17:35,
          kind:'furniture' as const}];
      })
    ];
    const sorted=candidates.slice().sort((a,b)=>b.score-a.score);
    // Preserve BOTH shoulder candidates in the optical occupancy audit.
    // A best-24 filter sorted by a generic following score can eliminate
    // the only wall-free shoulder before its screen image is inspected.
    const shortlisted=new Set(sorted.slice(0,20));
    if(req.target&&req.followDirection){
      const signed=(p:PhysicalPoint)=>{
        const d=req.followDirection!;
        return d.x*(p.y-req.operator.y)-d.y*(p.x-req.operator.x);
      };
      for(const side of [-1,1])for(const candidate of sorted.filter(c=>
        signed(c.view.cameraAnchor)*side>12).slice(0,7))
        shortlisted.add(candidate);
    }
    auditedCandidates=Array.from(shortlisted);
    for(const candidate of shortlisted){
      const v=candidate.view;
      const zoom=directorOrthoFittingZoom(v.cameraAnchor,v.focus,
        req.requiredPoints??[req.operator],aspect,
        req.composition.baseSpan,req.composition.usableWidth,
        req.composition.usableHeight,8,.8,
        req.composition.safeFrame);
      const fg=directorForegroundOccupancy(v.cameraAnchor,v.focus,
        req.operator,surfaces,'ortho',aspect,
        req.composition.baseSpan,zoom,v.fov,
        req.composition.safeFrame);
      if(req.composition.treatment==='door'||
         req.composition.treatment==='entry'||
         req.composition.treatment==='follow'){
        // Count DISTINCT readable miniatures, not just actor centers
        // intersecting the viewport. Four stacked helmets in one column
        // should never beat a clear two- or three-operator doorway shot.
        const visibleXs:number[]=[];
        for(const actor of req.subjectPoints){
          if(!directorSubjectVisibility(v.cameraAnchor,actor,scene).readable)
            continue;
          const actorQuality=directorCompositionQuality(v.cameraAnchor,
            v.focus,actor,null,
            req.followDirection??{x:1,y:0},
            req.composition.treatment,'ortho',aspect,
            req.composition.baseSpan,zoom,v.fov,
            req.composition.usableWidth,req.composition.usableHeight,
            req.composition.safeFrame);
          if(actorQuality.primaryReadable)
            visibleXs.push(actorQuality.primaryScreenX);
        }
        visibleXs.sort((a,b)=>a-b);
        let distinct=0,last=-Infinity;
        for(const x of visibleXs)if(x-last>.13){
          distinct++;last=x;
        }
        const bonus=req.composition.treatment==='follow'?12:24;
        candidate.score+=Math.max(0,distinct-1)*bonus-
          Math.max(0,visibleXs.length-distinct)*11;
      }
      candidate.score-=
        Math.max(0,fg.door-.30)*660+
        Math.max(0,fg.wall-.55)*390+
        Math.max(0,fg.furniture-.69)*120+
        Math.max(0,fg.subjectMask-.42)*95;
      if((req.composition.discoveryStrength??0)>.1&&
        req.composition.attentionPoint){
        const attention=req.composition.attentionPoint;
        const disclosedLook=directorAttentionVisible(
          v.cameraAnchor,v.focus,attention,'ortho',aspect,
          req.composition.baseSpan,zoom,v.fov,
          req.composition.safeFrame)&&
          !directorLineBlocked(v.cameraAnchor,attention,scene);
        // Seeing what is newly discovered outranks fitting the cast,
        // but can't excuse a missing protagonist or an illegal camera.
        candidate.score+=(disclosedLook?340:-410)*
          (req.composition.discoveryStrength??0);
      }
      if(req.composition.treatment==='engage'&&req.actionLines?.length){
        const opticallyClear=req.actionLines.filter(line=>
          !directorLineBlocked(v.cameraAnchor,line.start,scene)&&
          !directorLineBlocked(v.cameraAnchor,line.end,scene));
        candidate.score+=90*directorProjectedActionVisibility(
          v.cameraAnchor,v.focus,opticallyClear,'ortho',aspect,
          req.composition.baseSpan,zoom,v.fov,req.composition.safeFrame);
      }
      if(req.target&&candidate.view.targetVisible){
        const target=directorForegroundOccupancy(v.cameraAnchor,v.focus,
          req.target,surfaces,'ortho',aspect,req.composition.baseSpan,
          zoom,v.fov,req.composition.safeFrame);
        // This distinguishes a shoulder looking INTO the encounter from
        // one whose view is largely a near wall/door. Do not favor an
        // opposite shoulder if either actor vanishes behind its masonry.
        candidate.score-=Math.max(0,target.subjectMask-.12)*1150+
          Math.max(0,target.door-.18)*560+
          Math.max(0,target.wall-.38)*380;
        if(candidate.view.compositionQuality?.targetReadable&&
           target.subjectMask<.14&&target.door<.24)
          candidate.score+=185;
      }
    }
    // Never let an unconvincing backpack view defeat a verified two-shot
    // merely through generic follow-camera or visible-teammate rewards.
    const clear=req.target&&req.composition.treatment==='engage'?
      auditedCandidates.filter(c=>c.view.targetVisible&&
        c.view.compositionQuality?.targetReadable&&
        c.view.compositionQuality.primaryReadable):[];
    const ranked=(clear.length?
      clear.filter(c=>shortlisted.has(c)):Array.from(shortlisted))
      .sort((a,b)=>b.score-a.score);
    best=ranked[0]?.view??best;
    score=ranked[0]?.score??score;
  }
  // The camera rig is common to ORTHO and WIDE. Confirm the strongest
  // shots in real perspective before opting for one with a cropped cast.
  if(best&&req.requiredPoints?.length){
    const clear=req.target&&req.composition?.treatment==='engage'?
      auditedCandidates.filter(c=>c.view.targetVisible&&
        c.view.compositionQuality?.targetReadable&&
        c.view.compositionQuality.primaryReadable):[];
    const ranked=(clear.length?clear:auditedCandidates)
      .sort((a,b)=>b.score-a.score);
    for(const proposal of ranked.slice(0,16)){
      if(proposal.score<score-200)break;
      if(directorPerspectiveCovers(proposal.view.cameraAnchor,
        proposal.view.focus,req.requiredPoints,aspect,
        proposal.view.fov,.90,.89,req.composition?.safeFrame))
        return proposal.view;
    }
  }
  // No legal WIDE two-shot exists: retain the highest-ranked, legal
  // ORTHO candidate. Never accept a hidden subject merely because the
  // perspective-audition lens cannot fit the full two-shot.
  return best??{cameraAnchor:anchors[0],focus:{...req.operator},
    roomId:room?.id??null,fov:112,targetVisible:false,
    occluded:req.subjectPoints.length,
    subjectVisibility:0,subjectReadable:false};
}

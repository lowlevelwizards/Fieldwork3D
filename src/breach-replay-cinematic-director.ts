/** Replay R5: camera-only director that frames the largest coherent squad
 * group around disclosed action. World geometry is static; only historical
 * friendly positions and disclosure-filtered cues may affect composition.
 * The camera never changes LOS, fog, AI, actor positions or recorded events.
 */
import type {ReplayCameraActor,ReplayCameraPoint,ReplayDirectorCue}
  from './breach-replay-director.ts';

export type DirectorActor=ReplayCameraActor&{heading?:number};
export type DirectorRoom={id?:string;x:number;y:number;w:number;h:number};
export type DirectorWall={a:ReplayCameraPoint;b:ReplayCameraPoint};
export type CinematicShot={
  focus:ReplayCameraPoint;zoom:number;yaw:number;pitch:number;
  roomId:string|null;actorsFramed:number;kind:'squad'|'action'
};
const TAU=2*Math.PI;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const angleDelta=(to:number,from:number)=>
  Math.atan2(Math.sin(to-from),Math.cos(to-from));
const inside=(p:ReplayCameraPoint,room:DirectorRoom,pad=0)=>
  p.x>=room.x-pad&&p.x<=room.x+room.w+pad&&
  p.y>=room.y-pad&&p.y<=room.y+room.h+pad;
const dist=(a:ReplayCameraPoint,b:ReplayCameraPoint)=>
  Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a:ReplayCameraPoint,b:ReplayCameraPoint)=>
  a.x*b.y-a.y*b.x;
const intersects=(a:ReplayCameraPoint,b:ReplayCameraPoint,
  c:ReplayCameraPoint,d:ReplayCameraPoint)=>{
  const r={x:b.x-a.x,y:b.y-a.y};
  const s={x:d.x-c.x,y:d.y-c.y};
  const den=cross(r,s);
  if(Math.abs(den)<1e-5)return false;
  const offset={x:c.x-a.x,y:c.y-a.y};
  const t=cross(offset,s)/den,u=cross(offset,r)/den;
  return t>.04&&t<.97&&u>=0&&u<=1;
};
const cueAt=(cues:readonly ReplayDirectorCue[],time:number)=>{
  let lo=0,hi=cues.length;
  while(lo<hi){const i=(lo+hi)>>>1;
    if(cues[i].t<=time)lo=i+1;else hi=i;}
  const cue=cues[lo-1];
  return cue&&time-cue.t>=0&&time-cue.t<5.5?cue:null;
};
/** Geometrical 2-D projection of squad positions into an orthographic shot.
 * Includes operator body width/height and a safe frame on each edge.
 * Camera target never depends on enemy positions or undisclosed events.
 */
const squadFrameZoom=(actors:readonly DirectorActor[],yaw:number,
  pitch:number,aspect:number,baseSpan:number):number=>{
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const horizontal=actors.map(a=>a.p.x*c-a.p.y*s);
  const vertical=actors.map(a=>(a.p.x*s+a.p.y*c)*Math.sin(pitch));
  const width=Math.max(...horizontal)-Math.min(...horizontal)+30;
  // Head/weapon silhouette projects roughly 30–40 world units above boots.
  const height=Math.max(...vertical)-Math.min(...vertical)+
    39*Math.cos(pitch)+24;
  const fittedHeight=Math.max(height/.77,width/(Math.max(.42,aspect)*.78));
  return clamp(baseSpan/Math.max(1,fittedHeight),.65,18);
};
/** Tightest practical close-up of the ENTIRE living squad; no enemy
 * position enters framing. Room geometry only influences camera azimuth.
 * baseSpan must match ThreeScene's orthographic world-span calculation.
 */
export function cinematicReplayShot(time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],cues:readonly ReplayDirectorCue[],
  aspect:number,currentYaw:number,baseSpan=820):CinematicShot|null{
  const alive=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  if(!alive.length)return null;
  const minX=Math.min(...alive.map(a=>a.p.x));
  const maxX=Math.max(...alive.map(a=>a.p.x));
  const minY=Math.min(...alive.map(a=>a.p.y));
  const maxY=Math.max(...alive.map(a=>a.p.y));
  const center={x:(minX+maxX)/2,y:(minY+maxY)/2};
  const groups=rooms.map((room,idx)=>({
    room,idx,count:alive.filter(a=>inside(a.p,room,3)).length
  })).filter(g=>g.count>0);
  groups.sort((a,b)=>b.count-a.count||a.idx-b.idx);
  const room=groups[0]?.room??null;
  // Action can affect camera direction, but is NEVER allowed to pull
  // the framing center away from the team, even during a loud firefight.
  const cue=cueAt(cues,time);
  const nearAction=!!cue&&alive.some(a=>dist(a.p,cue.p)<90);
  let meanX=0,meanY=0;
  for(const actor of alive){
    const h=Number.isFinite(actor.heading)?actor.heading!:0;
    meanX+=Math.cos(h);meanY+=Math.sin(h);
  }
  const behind=Math.atan2(-meanX,-meanY);
  const pitch=Math.PI*52/180;
  let bestYaw=behind,bestScore=-Infinity,bestZoom=.65;
  // Favor the closest safe group shot, with a gentle over-the-shoulder
  // bias and a penalty for tracing the camera through solid walls.
  for(let i=-4;i<=4;i++){
    const yaw=behind+i*Math.PI/8;
    const zoom=squadFrameZoom(alive,yaw,pitch,aspect,baseSpan);
    const ray={x:Math.sin(yaw),y:Math.cos(yaw)};
    const cameraAt={x:center.x+ray.x*65,y:center.y+ray.y*65};
    const wallCrossings=walls.reduce((n,wall)=>n+
      (intersects(center,cameraAt,wall.a,wall.b)?1:0),0);
    let clearance=65;
    if(room&&inside(center,room)){
      for(const [p,d,min,max] of [
        [center.x,ray.x,room.x,room.x+room.w],
        [center.y,ray.y,room.y,room.y+room.h]
      ] as const){
        if(Math.abs(d)>.001)
          clearance=Math.min(clearance,Math.max(0,((d>0?max:min)-p)/d));
      }
    }
    const score=zoom*.65-
      Math.max(0,25-clearance)*.05-
      wallCrossings*3-
      Math.abs(angleDelta(yaw,behind))*.6-
      Math.abs(angleDelta(yaw,currentYaw))*.4;
    if(score>bestScore){bestScore=score;bestYaw=yaw;bestZoom=zoom;}
  }
  return {
    focus:center,zoom:bestZoom,yaw:((bestYaw%TAU)+TAU)%TAU,pitch,
    roomId:room?.id??null,actorsFramed:alive.length,
    kind:nearAction?'action':'squad'
  };
}
/** Framerate independent, wrap-safe cinematic motion; seeks can be instant. */
export function easeCinematicReplayShot(
  current:CinematicShot,target:CinematicShot,dt:number,instant=false
):CinematicShot{
  // A replay camera can be cinematic without letting the operators
  // walk off screen. Large target jumps (especially through doors)
  // receive faster position catch-up; angles retain gentle damping.
  const distance=Math.hypot(target.focus.x-current.focus.x,
    target.focus.y-current.focus.y);
  const focusRate=distance>75?6.2:distance>35?4.6:3.2;
  const f=instant?1:1-Math.exp(-clamp(dt,0,.1)*focusRate);
  const z=instant?1:1-Math.exp(-clamp(dt,0,.1)*2.4);
  const r=instant?1:1-Math.exp(-clamp(dt,0,.1)*2.45);
  const yaw=current.yaw+angleDelta(target.yaw,current.yaw)*r;
  return {
    ...target,
    focus:{
      x:current.focus.x+(target.focus.x-current.focus.x)*f,
      y:current.focus.y+(target.focus.y-current.focus.y)*f
    },zoom:current.zoom+(target.zoom-current.zoom)*z,
    yaw:((yaw%TAU)+TAU)%TAU,
    pitch:current.pitch+(target.pitch-current.pitch)*r
  };
}

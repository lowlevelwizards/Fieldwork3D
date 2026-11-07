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
/** Return a stable candidate shot; smoothing is separate from selection. */
export function cinematicReplayShot(time:number,
  actors:readonly DirectorActor[],rooms:readonly DirectorRoom[],
  walls:readonly DirectorWall[],cues:readonly ReplayDirectorCue[],
  aspect:number,currentYaw:number):CinematicShot|null{
  const alive=actors.filter(a=>a.side==='blue'&&a.health>0&&
    Number.isFinite(a.p.x)&&Number.isFinite(a.p.y));
  if(!alive.length)return null;
  const cue=cueAt(cues,time);
  const action=cue&&alive.some(a=>dist(a.p,cue.p)<160)?cue:null;
  const groups=rooms.map((room,i)=>({
    room,idx:i,members:alive.filter(a=>inside(a.p,room,3)),
    containsAction:!!action&&inside(action.p,room,5)
  })).filter(x=>x.members.length>0);
  groups.sort((a,b)=>{
    const score=(g:typeof a)=>g.members.length*3+
      (g.containsAction?Math.min(5,2+Math.max(0,action!.weight)*.3):0);
    return score(b)-score(a)||a.idx-b.idx;
  });
  const group=groups[0];
  const framed=group?.members??alive;
  const minX=Math.min(...framed.map(a=>a.p.x));
  const maxX=Math.max(...framed.map(a=>a.p.x));
  const minY=Math.min(...framed.map(a=>a.p.y));
  const maxY=Math.max(...framed.map(a=>a.p.y));
  const center={x:(minX+maxX)/2,y:(minY+maxY)/2};
  if(group?.containsAction&&action){
    center.x=center.x*.68+action.p.x*.32;
    center.y=center.y*.68+action.p.y*.32;
  }
  if(group){
    const margin=Math.min(12,Math.max(2,Math.min(group.room.w,group.room.h)*.12));
    center.x=clamp(center.x,group.room.x+margin,
      group.room.x+group.room.w-margin);
    center.y=clamp(center.y,group.room.y+margin,
      group.room.y+group.room.h-margin);
  }
  // Framing is room-scale rather than map-scale, preferring a close
  // composition of the largest team group without clipping its formation.
  const spread=Math.max(maxX-minX,maxY-minY);
  const scale=clamp(aspect/1.08,.64,1);
  const zoom=clamp(350/(spread+85)*scale,.85,3.6);
  let meanX=0,meanY=0;
  for(const actor of framed){
    const h=Number.isFinite(actor.heading)?actor.heading!:0;
    meanX+=Math.cos(h);meanY+=Math.sin(h);
  }
  const behind= Math.atan2(-meanX,-meanY);
  let bestYaw=behind,bestScore=-Infinity;
  // Eight bounded angles evaluate a view from within the room; architecture
  // never gets x-rayed to improve a director shot.
  for(let i=-4;i<=3;i++){
    const yaw=behind+i*Math.PI/4;
    const ray={x:Math.sin(yaw),y:Math.cos(yaw)};
    const at={x:center.x+ray.x*60,y:center.y+ray.y*60};
    const blockers=walls.reduce((n,wall)=>n+
      (intersects(center,at,wall.a,wall.b)?1:0),0);
    let clearance=60;
    if(group){
      const room=group.room;
      for(const [p,dir,min,max] of [
        [center.x,ray.x,room.x,room.x+room.w],
        [center.y,ray.y,room.y,room.y+room.h]
      ] as const){
        if(Math.abs(dir)>.001)
          clearance=Math.min(clearance,Math.max(0,
            ((dir>0?max:min)-p)/dir));
      }
    }
    const score=Math.min(60,clearance)*.028-
      blockers*2.8-
      Math.abs(angleDelta(yaw,behind))*.5-
      Math.abs(angleDelta(yaw,currentYaw))*.25;
    if(score>bestScore){bestScore=score;bestYaw=yaw;}
  }
  return {
    focus:center,zoom,yaw:((bestYaw%TAU)+TAU)%TAU,
    pitch:Math.PI*(group?.containsAction?52:56)/180,
    roomId:group?.room.id??null,actorsFramed:framed.length,
    kind:group?.containsAction?'action':'squad'
  };
}
/** Framerate independent, wrap-safe cinematic motion; seeks can be instant. */
export function easeCinematicReplayShot(
  current:CinematicShot,target:CinematicShot,dt:number,instant=false
):CinematicShot{
  const f=instant?1:1-Math.exp(-clamp(dt,0,.1)*1.85);
  const z=instant?1:1-Math.exp(-clamp(dt,0,.1)*1.55);
  const r=instant?1:1-Math.exp(-clamp(dt,0,.1)*1.1);
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

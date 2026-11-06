/** Replay R3: deterministic camera framing derived from disclosed events.
 * This pure module knows nothing about the active simulation or renderer.
 * Callers pass ONLY events permissible under the selected intel policy.
 */
export type ReplayCameraMode='free'|'operator'|'squad'|'director';
export type ReplayCameraPoint={x:number;y:number};
export type ReplayCameraActor={
  id:string;p:ReplayCameraPoint;side:'blue'|'red';health:number
};
export type ReplayCameraEvent={
  t:number;kind:string;p?:ReplayCameraPoint;actor?:string
};
export type ReplayDirectorCue={
  t:number;kind:string;p:ReplayCameraPoint;weight:number
};
export type ReplayCameraTarget={
  focus:ReplayCameraPoint;zoom:number;kind:'operator'|'squad'|'action'
};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const priority=(kind:string)=>({
  down:9,wound:8,flash:7,objective:7,door:5,surrender:5,
  blocked:3,interaction:3,shot:2,completed:2
} as Record<string,number>)[kind]??0;

/** Precomputed event shots; repeated seeking does not change decisions. */
export function buildReplayDirectorCues(
  events:readonly ReplayCameraEvent[]
):ReplayDirectorCue[]{
  const sorted=events.filter(e=>e.p&&Number.isFinite(e.t)&&
    Number.isFinite(e.p.x)&&Number.isFinite(e.p.y)&&priority(e.kind)>0)
    .slice().sort((a,b)=>a.t-b.t);
  const result:ReplayDirectorCue[]=[];
  for(const e of sorted){
    const weight=priority(e.kind);
    const prev=result.at(-1);
    // Keep a single readable focal point for a rapid nearby volley.
    if(prev&&e.t-prev.t<=2.5&&
      Math.hypot(prev.p.x-e.p!.x,prev.p.y-e.p!.y)<130){
      if(weight>prev.weight){
        prev.kind=e.kind;prev.p={...e.p!};prev.weight=weight;
      }
      continue;
    }
    result.push({t:e.t,kind:e.kind,p:{...e.p!},weight});
  }
  return result;
}
function squadTarget(actors:readonly ReplayCameraActor[],
  aspect:number):ReplayCameraTarget|null{
  const squad=actors.filter(a=>a.side==='blue'&&a.health>0);
  if(!squad.length)return null;
  const minX=Math.min(...squad.map(a=>a.p.x));
  const maxX=Math.max(...squad.map(a=>a.p.x));
  const minY=Math.min(...squad.map(a=>a.p.y));
  const maxY=Math.max(...squad.map(a=>a.p.y));
  const spread=Math.max(maxX-minX,maxY-minY);
  // Portrait requires wider vertical framing than landscape.
  const aspectScale=clamp(aspect/1.05,.58,1);
  const zoom=clamp(1.8*aspectScale*clamp(165/(spread+80),.7,1.2),.8,2.1);
  return {focus:{x:(minX+maxX)/2,y:(minY+maxY)/2},zoom,kind:'squad'};
}
export function replayCameraTarget(
  mode:ReplayCameraMode,time:number,
  actors:readonly ReplayCameraActor[],
  selectedId:string,aspect:number,
  cues:readonly ReplayDirectorCue[]
):ReplayCameraTarget|null{
  if(mode==='free')return null;
  if(mode==='operator'){
    const a=actors.find(a=>a.id===selectedId&&a.health>0);
    if(a)return {focus:{...a.p},zoom:clamp(1.72*clamp(aspect, .6,1),.9,1.8),
      kind:'operator'};
  }
  const squad=squadTarget(actors,aspect);
  if(mode!=='director')return squad;
  let lo=0,hi=cues.length;
  while(lo<hi){
    const m=(lo+hi)>>>1;
    if(cues[m].t<=time)lo=m+1;else hi=m;
  }
  const cue=cues[lo-1];
  if(!cue||time-cue.t>4.5)return squad;
  return {focus:{...cue.p},zoom:clamp(1.65*clamp(aspect,.65,1),.85,1.85),
    kind:'action'};
}
/** Framerate-independent easing; instant=true for scrubbing/direct cuts. */
export function easeReplayCamera(
  current:ReplayCameraTarget,target:ReplayCameraTarget,dt:number,
  instant=false
):ReplayCameraTarget{
  const alpha=instant?1:1-Math.exp(-Math.max(0,dt)*4.8);
  return {
    focus:{
      x:current.focus.x+(target.focus.x-current.focus.x)*alpha,
      y:current.focus.y+(target.focus.y-current.focus.y)*alpha
    },
    zoom:current.zoom+(target.zoom-current.zoom)*alpha,
    kind:target.kind
  };
}

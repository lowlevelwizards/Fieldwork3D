/** Objective whereabouts are deliberately independent from architectural
 * blueprint/visibility settings. No enemy or mission truth is exposed here. */
import type {Site,Room} from './breach-site.ts';
import type {Pt} from './breach-core.ts';

export type ObjectiveIntelLevel='unknown'|'approximate'|'confirmed';
export type ObjectiveKnowledge={
 level:ObjectiveIntelLevel;
 /** Persistent knowledge acquired from real squad observation. */
 discovered:boolean;
 /** Broad room-group clue; no target point, no exact room highlight. */
 area?:{label:string;roomIds:string[]};
};
const center=(r:Room):Pt=>({x:r.x+r.w/2,y:r.y+r.h/2});
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

/** Avoid an exact-room clue by choosing >=3 candidate rooms (when possible).
 * The same geometry yields the same prebriefed estimate; no per-frame RNG.
 */
export function approximateObjectiveArea(site:Site|undefined):
 ObjectiveKnowledge['area']{
 if(!site)return undefined;
 const rooms=site.rooms.filter(r=>r.kind==='room');
 if(rooms.length<3)return undefined;
 const anchor=rooms.find(r=>site.objective.x>=r.x&&
   site.objective.x<=r.x+r.w&&site.objective.y>=r.y&&
   site.objective.y<=r.y+r.h);
 if(!anchor)return undefined;
 const nearby=[...rooms].sort((a,b)=>
   distance(center(a),center(anchor))-distance(center(b),center(anchor))||
   a.id.localeCompare(b.id)).slice(0,Math.min(5,rooms.length));
 const b=site.bounds??{minX:0,minY:0,maxX:640,maxY:740};
 const p=center(anchor),mx=(b.minX+b.maxX)/2,my=(b.minY+b.maxY)/2;
 const side=Math.abs(p.x-mx)>Math.abs(p.y-my)?
   (p.x<mx?'WEST':'EAST'):(p.y<my?'NORTH':'SOUTH');
 return {label:side+' SECTION · MULTIPLE POSSIBLE ROOMS',
   roomIds:nearby.map(r=>r.id)};
}
export function createObjectiveKnowledge(site:Site|undefined,
 level:ObjectiveIntelLevel='unknown'):ObjectiveKnowledge{
 return {level,discovered:false,
   ...(level==='approximate'&&approximateObjectiveArea(site)?
     {area:approximateObjectiveArea(site)}:{})};
}
export function setObjectiveIntelLevel(
 state:{site?:Site;scenario?:{objective:Pt};objectiveIntel?:ObjectiveKnowledge},
 level:ObjectiveIntelLevel
):void{
 const observed=state.objectiveIntel?.discovered===true;
 // Capture targets can be instantiated in another room after the authored
 // architectural objective was chosen. Clues track the physical target.
 const actualSite=state.site&&state.scenario?
   {...state.site,objective:state.scenario.objective}:state.site;
 state.objectiveIntel=createObjectiveKnowledge(actualSite,level);
 if(observed)state.objectiveIntel.discovered=true;
}
export function discoverObjective(
 state:{objectiveIntel?:ObjectiveKnowledge},observed:boolean):boolean{
 if(!observed||!state.objectiveIntel||state.objectiveIntel.discovered)return false;
 state.objectiveIntel.discovered=true;return true;
}
/** A blueprint's full-view mode never grants objective truth. */
export function objectiveLocationKnown(
 state:{objectiveIntel?:ObjectiveKnowledge},
 replaying=false,omniscientReplay=false
):boolean{
 return (replaying&&omniscientReplay)||
   state.objectiveIntel?.level==='confirmed'||
   state.objectiveIntel?.discovered===true;
}
/** Broad, non-interactive uncertainty envelope. Never a target pin or
 * newly disclosed individual room. Call only from presentation code. */
export function approximateObjectiveBounds(
 state:{site?:Site;objectiveIntel?:ObjectiveKnowledge}
):{minX:number;minY:number;maxX:number;maxY:number}|null{
 const info=state.objectiveIntel;
 if(info?.level!=='approximate'||info.discovered||!info.area||!state.site)
   return null;
 const ids=new Set(info.area.roomIds);
 const rooms=state.site.rooms.filter(r=>ids.has(r.id));
 if(rooms.length<3)return null;
 const pad=8;
 return {
   minX:Math.min(...rooms.map(r=>r.x))-pad,
   minY:Math.min(...rooms.map(r=>r.y))-pad,
   maxX:Math.max(...rooms.map(r=>r.x+r.w))+pad,
   maxY:Math.max(...rooms.map(r=>r.y+r.h))+pad
 };
}
export function objectiveIntelDescription(
 state:{objectiveIntel?:ObjectiveKnowledge}
):string{
 const info=state.objectiveIntel;
 if(!info)return 'OBJECTIVE LOCATION UNCONFIRMED';
 if(info.discovered)return 'OBJECTIVE LOCATED · SQUAD OBSERVATION';
 if(info.level==='confirmed')return 'OBJECTIVE LOCATION CONFIRMED · VERIFIED INTELLIGENCE';
 if(info.level==='approximate'&&info.area)
   return 'POSSIBLE OBJECTIVE AREA · '+info.area.label;
 return 'OBJECTIVE LOCATION UNKNOWN · SEARCH REQUIRED';
}

/** Confirmed hold area: use the accessible room's rectangular footprint,
 * capped to eight navigation cells per axis around the authored objective.
 * Legacy or exterior objectives retain their historical circular check. */
export type HoldObjectiveBounds={minX:number;minY:number;maxX:number;maxY:number};
export function holdObjectiveBounds(site:Site|undefined,p:Pt):HoldObjectiveBounds|null{
 const room=site?.rooms.find(r=>r.kind==='room'&&p.x>=r.x&&
   p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
 if(!room)return null;
 const inset=6,limit=128; // 8 x 16 world-unit navigation cells
 const x=room.x+inset,y=room.y+inset;
 const w=Math.min(limit,room.w-2*inset),h=Math.min(limit,room.h-2*inset);
 if(w<=0||h<=0)return null;
 const minX=Math.max(x,Math.min(p.x-w/2,x+room.w-2*inset-w));
 const minY=Math.max(y,Math.min(p.y-h/2,y+room.h-2*inset-h));
 return {minX,minY,maxX:minX+w,maxY:minY+h};
}
export function inHoldObjectiveBounds(p:Pt,b:HoldObjectiveBounds):boolean{
 return p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY;
}

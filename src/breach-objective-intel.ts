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
 state:{site?:Site;objectiveIntel?:ObjectiveKnowledge},
 level:ObjectiveIntelLevel
):void{
 const observed=state.objectiveIntel?.discovered===true;
 state.objectiveIntel=createObjectiveKnowledge(state.site,level);
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

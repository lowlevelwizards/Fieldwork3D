/** Mission-aware objective placement in the AUTHORITATIVE architectural
 * floor program, before furniture, doors and enemy positions are finalized.
 * This chooses only an existing room center; it NEVER cuts a shortcut,
 * relocates objects after deployment or uses undiscovered opponent positions.
 */
import type {Room} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
import type {OperationKind} from '../breach-operations.ts';

const roles:Record<OperationKind,readonly string[]>={
 clear:['office','study','storage','bedroom','guest','control','staff','stockroom','workshop','meeting','living'],
 intel:['office','study','control','staff','storage','stockroom','supply','parts','maintenance','meeting'],
 rescue:['bedroom','guest','treatment','staff','office','storage','living','workshop'],
 hold:['living','meeting','dining','sales','lobby','loading','bay','control','reception','workshop'],
 capture:['office','study','living','bedroom','guest','control','meeting','service','workshop']
};
const publicFront=new Set(['foyer','vestibule','waiting','reception','lobby','checkout']);
const center=(r:Room):Pt=>({x:r.x+r.w/2,y:r.y+r.h/2});
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const hash=(seed:number,s:string)=>{
 let n=(seed^0x9e3779b9)>>>0;
 for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619)>>>0;
 n^=n>>>16;n=Math.imul(n,2246822507)>>>0;
 n^=n>>>13;return (n>>>0)/4294967296;
};
export type ObjectiveCandidate={roomId:string;purpose:string;
 location:Pt;distance:number;score:number};
/** Retains safe distant rooms while avoiding identical top-row placement.
 * Role weighting varies by mission; the seeded component breaks repeated
 * ties and lets equal-purpose rooms produce different tactical problems.
 */
export function rankMissionObjectives(rooms:readonly Room[],entrance:Pt,
 seed:number,mission:OperationKind):ObjectiveCandidate[]{
 const habitable=rooms.filter(r=>r.kind==='room');
 const candidates=habitable.map(room=>{
  const location=center(room),travel=distance(location,entrance);
  const purpose=room.purpose??'untyped';
  const index=roles[mission].indexOf(purpose);
  const roleBonus=index>=0?57-Math.min(46,index*5):0;
  const publicPenalty=publicFront.has(purpose)?55:0;
  const closenessPenalty=travel<95?125:travel<150?42:0;
  const sizeBonus=mission==='hold'?
    Math.min(26,room.w*room.h/900):0;
  const score=roleBonus+Math.min(105,travel*.18)+sizeBonus-
    closenessPenalty-publicPenalty+hash(seed,room.id+'|'+mission)*62;
  return {roomId:room.id,purpose,location,distance:travel,score};
 });
 return candidates.sort((a,b)=>b.score-a.score||
   a.roomId.localeCompare(b.roomId));
}
export function chooseMissionObjective(rooms:readonly Room[],entrance:Pt,
 seed:number,mission:OperationKind):ObjectiveCandidate|null{
 return rankMissionObjectives(rooms,entrance,seed,mission)[0]??null;
}

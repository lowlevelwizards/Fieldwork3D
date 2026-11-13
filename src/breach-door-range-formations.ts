/** Q5: repeatable LAB INITIAL POSITIONS, never engine stack AI.
 * All presets use the SAME fixed door and ordinary collision/navigation.
 * "Left/right" describe sides of the door along the wall on the approach
 * face. "North/south" means which face of the physical threshold is entered.
 */
import type {Pt} from './breach-core.ts';
export const DOOR_RANGE_FORMATIONS=[
 {id:'center',label:'Straight · baseline',description:'Original perpendicular four-file'},
 {id:'left',label:'Stack left',description:'Four on left jamb flank'},
 {id:'right',label:'Stack right',description:'Four on right jamb flank'},
 {id:'split',label:'Split · 2 + 2',description:'Two on each side of door'},
 {id:'diagonal-left',label:'45° · left',description:'Oblique left-side line'},
 {id:'diagonal-right',label:'45° · right',description:'Oblique right-side line'}
] as const;
export type DoorRangeFormationId=(typeof DOOR_RANGE_FORMATIONS)[number]['id'];
export type DoorRangeApproachFace='north'|'south';
const p=(x:number,y:number):Pt=>({x,y});
const starting:Record<DoorRangeFormationId,readonly Pt[]>={
 center:[p(300,200),p(308,173),p(316,146),p(325,119)],
 left:[p(269,225),p(241,216),p(213,207),p(185,198)],
 right:[p(353,225),p(381,216),p(409,207),p(437,198)],
 split:[p(267,225),p(238,208),p(355,225),p(384,208)],
 'diagonal-left':[p(270,213),p(250,193),p(230,173),p(210,153)],
 'diagonal-right':[p(352,213),p(372,193),p(392,173),p(412,153)]
};
export function doorRangeFormationSpawns(
 id:DoorRangeFormationId='center',
 face:DoorRangeApproachFace='north'):Pt[]{
 const start=starting[id];
 if(!start)throw Error('Unknown Door Range formation: '+id);
 return start.map(point=>p(point.x,face==='north'?point.y:520-point.y));
}
export function doorRangeFormationDescription(id:DoorRangeFormationId,
 face:DoorRangeApproachFace):string{
 const preset=DOOR_RANGE_FORMATIONS.find(x=>x.id===id);
 return (preset?.label??id)+' · '+(face==='north'?'N → S':'S → N');
}
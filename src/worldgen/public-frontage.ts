/** Deterministic public frontage selection.
 * Every chosen door must touch the outdoor south perimeter in authored space;
 * the existing cardinal-site orientation then rotates both the room and door.
 * Never enter a private apartment unit or make a bedroom an entry lobby.
 */
import type {Blueprint} from './architectural-program.ts';
const publicEntries=new Set(['foyer','vestibule','living','lobby','reception',
 'waiting','sales','dining','checkout','aisle','loading','service']);
const preferred=new Set(['sales','dining','lobby','reception','waiting','living']);
export type FrontageChoice={row:number;col:number;fraction:number;purpose:string};
export function choosePublicFrontage(plan:Blueprint,seed:number):FrontageChoice{
 const row=plan.cells.length-1;
 const options=plan.cells[row].map((purpose,col)=>({row,col,purpose}))
  .filter((candidate):candidate is {row:number;col:number;purpose:string}=>
   !!candidate.purpose&&publicEntries.has(candidate.purpose)&&
   !plan.unitIds?.[row]?.[candidate.col]);
 const favored=options.filter(x=>preferred.has(x.purpose));
 const eligible=favored.length?favored:options;
 const fallback=plan.cells[plan.front.row]?.[plan.front.col]??'entry';
 if(!eligible.length)return {...plan.front,fraction:.5,purpose:fallback};
 // Deliberately use all public bays over successive seeds, not just the
 // one fixed authored corner or one overrepresented reception cell.
 const mixed=(Math.imul(seed>>>0,2654435761)>>>0);
 const choice=eligible[mixed%eligible.length];
 const fractions=[.29,.5,.71] as const;
 const fraction=fractions[Math.floor(mixed/eligible.length)%fractions.length];
 return {...choice,fraction};
}

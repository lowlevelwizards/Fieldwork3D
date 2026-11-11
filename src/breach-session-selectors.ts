/** Single, intentionally small Session lookup surface. Type-only game
 * contracts avoid a runtime cycle with the public tactical facade. */
import type {Session} from './breach-game.ts';

export const team=(s:Session)=>s.operators.filter(a=>a.side==='blue');
export const enemies=(s:Session)=>s.operators.filter(a=>a.side==='red');
export const actor=(s:Session,id:string)=>s.operators.find(a=>a.id===id);
export const party=(s:Session,id:string)=>team(s).find(a=>a.id===id&&a.health>0);
export const canEdit=(s:Session)=>s.phase==='planning';

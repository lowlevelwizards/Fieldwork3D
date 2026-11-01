/** Equipment 12: bounded, deterministic issue of finite flash inventory.
 * Every mission selects a maximum of two carried flashes from the unit stock.
 * Unthrown inventory stays in the campaign; only executed throws cost stock.
 */
export function allocateFlashSupply(need:readonly number[],stock:number,limit=2):number[]{
 let remaining=Math.max(0,Math.min(Math.floor(Number.isFinite(stock)?stock:0),
  Math.floor(Number.isFinite(limit)?Math.max(0,limit):0)));
 return need.map(value=>{
  const wanted=Math.max(0,Math.min(2,Math.floor(Number.isFinite(value)?value:0)));
  const assigned=Math.min(wanted,remaining);
  remaining-=assigned;
  return assigned;
 });
}
export const clampFlashUse=(used:unknown):number=>
 typeof used==='number'&&Number.isFinite(used)?
  Math.max(0,Math.min(2,Math.floor(used))):0;

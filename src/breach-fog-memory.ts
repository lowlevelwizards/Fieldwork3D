/** Shared immutable identifiers for fine explored floor memory.
 * Avoid allocating thousands of transient strings in each mobile render,
 * visibility sweep and replay recording. */
export const MICRO_COLS=64,MICRO_ROWS=74;
export const MICRO_KEYS=Array.from({length:MICRO_COLS*MICRO_ROWS},(_,i)=>
  'micro:'+(i%MICRO_COLS)+','+Math.floor(i/MICRO_COLS));

/** Expanded/negative world bounds must not alias the fixed 64x74 cache.
 * For example (64,0) is not the same observed tile as (0,1). */
export const microKeyAt=(col:number,row:number):string=>
 col>=0&&col<MICRO_COLS&&row>=0&&row<MICRO_ROWS?
   MICRO_KEYS[row*MICRO_COLS+col]:'micro:'+col+','+row;

/** Sparse fog painting: enumerate only remembered micro tiles, not every
 * 10-unit cell in a large procedural map on every texture refresh.
 * Keys outside the active site's envelope remain excluded just as before.
 */
export function forEachRememberedMicroCell(
 seen:ReadonlySet<string>,
 bounds:{minX:number;minY:number;maxX:number;maxY:number},
 visit:(col:number,row:number)=>void):number{
 const x0=Math.floor(bounds.minX/10),x1=Math.ceil(bounds.maxX/10);
 const y0=Math.floor(bounds.minY/10),y1=Math.ceil(bounds.maxY/10);
 let count=0;
 for(const id of seen){
  if(!id.startsWith('micro:'))continue;
  const comma=id.indexOf(',',6);
  if(comma<0)continue;
  const col=Number(id.slice(6,comma)),row=Number(id.slice(comma+1));
  if(!Number.isInteger(col)||!Number.isInteger(row)||
     col<x0||col>=x1||row<y0||row>=y1)continue;
  visit(col,row);
  count++;
 }
 return count;
}

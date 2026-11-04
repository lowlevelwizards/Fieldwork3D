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

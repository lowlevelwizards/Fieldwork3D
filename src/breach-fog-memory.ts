/** Shared immutable identifiers for fine explored floor memory.
 * Avoid allocating thousands of transient strings in each mobile render,
 * visibility sweep and replay recording. */
export const MICRO_COLS=64,MICRO_ROWS=74;
export const MICRO_KEYS=Array.from({length:MICRO_COLS*MICRO_ROWS},(_,i)=>
  'micro:'+(i%MICRO_COLS)+','+Math.floor(i/MICRO_COLS));

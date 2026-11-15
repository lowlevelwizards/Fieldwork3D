/** Sixth independently generated, frozen D3.14B physical squad cohort.
 * Fixed before any comparison results from this cohort were observed.
 * One small and one standard map per building archetype.
 */
export const D314B_HOLDOUT_ID='d3-14b-sixth-blind22-20261115';
const types=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D314B_HOLDOUT_22=Object.freeze(
 Array.from({length:22},(_,i)=>Object.freeze({
  index:i,seed:6870101+i*13931,
  archetype:types[i%11],scale:i<11?'small':'standard'
 }))
);

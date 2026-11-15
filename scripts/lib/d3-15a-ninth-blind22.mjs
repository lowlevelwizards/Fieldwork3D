/** D3.15A frozen ninth independent 22-map holdout.
 * 11 archetypes × two scales, authored+entry, four physical actors,
 * 2700 actual 60Hz ticks. Freeze before observing candidate results;
 * never retune these seeds to hide a negative physical case.
 */
export const D315A_HOLDOUT_ID='d3-15a-ninth-blind22-20261115';
const archetypes=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D315A_HOLDOUT_22=Object.freeze(Array.from(
 {length:22},(_,i)=>Object.freeze({
  index:i,seed:12234011+i*23917,archetype:archetypes[i%11],
  scale:i<11?'small':'standard'
 })
));

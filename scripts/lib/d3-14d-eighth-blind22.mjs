/** Eighth untouched 22-map D3.14D2 holdout, frozen before candidate run.
 * 11 archetypes x two scales, authored + entry, four real actors,
 * each simulated for 2700 fixed 60Hz ticks (45 seconds).
 * Do NOT retune seeds or maps after observing the results. */
export const D314D_HOLDOUT_ID='d3-14d-eighth-blind22-20261115';
const archetypes=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D314D_HOLDOUT_22=Object.freeze(Array.from(
 {length:22},(_,i)=>Object.freeze({
  index:i,seed:9340013+i*19031,archetype:archetypes[i%11],
  scale:i<11?'small':'standard'
 })
));

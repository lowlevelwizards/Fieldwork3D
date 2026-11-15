/** Seventh independent 22-map holdout, frozen before C2 comparison.
 * Same 11 archetypes × two scales, same authored and generated-entry
 * modes, four physical actors per run for 2700 fixed 60 Hz ticks.
 * Never change these seeds in response to test outcomes. */
export const D314C_HOLDOUT_ID='d3-14c-seventh-blind22-20261115';
const archetypes=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D314C_HOLDOUT_22=Object.freeze(Array.from(
 {length:22},(_,i)=>Object.freeze({
  index:i,seed:8030101+i*17317,
  archetype:archetypes[i%11],scale:i<11?'small':'standard'
 })
));

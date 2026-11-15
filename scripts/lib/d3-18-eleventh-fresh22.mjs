/** D3.18D: independent eleventh, previously untested deterministic seeds.
 * 22 new physical sites, 11 archetypes x small/standard; 4 real actors
 * in authored and generated entry, 2700 ticks at 60 Hz.
 * Never mutate this corpus in response to a failed trial.
 */
export const D318_FRESH_ID='d3-18-eleventh-fresh22-20261115';
const archetypes=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D318_FRESH_22=Object.freeze(Array.from(
 {length:22},(_,i)=>Object.freeze({
  index:i,seed:19001037+i*17779,archetype:archetypes[i%11],
  scale:i<11?'small':'standard'
 })
));

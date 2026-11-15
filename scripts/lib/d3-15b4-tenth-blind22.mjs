/** D3.15B4 tenth independent frozen holdout before candidate observation.
 * Eleven archetypes x small/standard, authored and squad ENTRY, four
 * operators, 45s at 60Hz, 176 physical arrivals to assess.
 */
export const D315B4_HOLDOUT_ID='d3-15b4-tenth-blind22-20261115';
const archetypes=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D315B4_HOLDOUT_22=Object.freeze(Array.from(
 {length:22},(_,i)=>Object.freeze({
  index:i,seed:13919313+i*27183,archetype:archetypes[i%11],
  scale:i<11?'small':'standard'
 })
));

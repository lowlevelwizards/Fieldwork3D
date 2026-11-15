/** Frozen, independent holdout corpus for D3 movement generalization.
 * Unseen before this test: NOT chosen to fix a failure, not part of the
 * old 31045+13*i (0..43) corpus or the 311xx authored incident fixtures.
 * Each of 11 building types appears twice, once in each map size.
 * This module contains NO engine/runtime state changes.
 */
export const D3_HOLDOUT_22_ID='d3-unseen-22-v1-20261114';
const buildingTypes=['house','townhouse','apartment','retail','office',
 'garage','warehouse','restaurant','motel','utility','clinic'];
export const D3_HOLDOUT_22=Object.freeze(Array.from({length:22},(_,i)=>
 Object.freeze({
  index:i,archetype:buildingTypes[i%11],
  scale:i<11?'small':'standard',
  seed:728413+i*11131
 })
));

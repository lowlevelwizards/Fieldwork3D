/** D3.13G2 independent fourth cohort. Fixed BEFORE comparing candidate
 * and unchanged movement baseline; never choose maps after observing a
 * candidate. One small and one standard building per archetype.
 */
export const D313G2_HOLDOUT_ID='d3-13g2-fresh-22-v1-20261115';
const archetypes=['house','townhouse','apartment','retail','office',
 'garage','warehouse','restaurant','motel','utility','clinic'];
export const D313G2_HOLDOUT_22=Object.freeze(
 Array.from({length:22},(_,i)=>Object.freeze({
  index:i,seed:4120451+i*11383,
  archetype:archetypes[i%11],scale:i<11?'small':'standard'
 }))
);

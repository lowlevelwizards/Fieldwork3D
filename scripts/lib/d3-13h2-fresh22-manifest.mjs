/** Fifth blind, paired D3 holdout. Frozen before the H2 candidate and
 * released G2C baseline are compared. No seed is selected by outcome. */
export const D313H2_HOLDOUT_ID='d3-13h2-fresh-22-v1-20261115';
const types=['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic'];
export const D313H2_HOLDOUT_22=Object.freeze(Array.from({length:22},(_,i)=>
 Object.freeze({index:i,archetype:types[i%11],
  scale:i<11?'small':'standard',seed:5372903+i*13331})
));

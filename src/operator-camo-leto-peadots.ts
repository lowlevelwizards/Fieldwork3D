/** Leto 7C — seeded miniature-scale pea dots over existing 7B oakleaf art.
 *
 * This is a *secondary print layer*, never another macro mask. Candidate
 * cells have irregular 4px spacing; marks only appear inside existing light
 * cloth fields, not on edges or dark undershadow silhouettes. We use the
 * finished 7B ink tile, so every previously approved oakleaf lobe survives.
 */
export type LetoPeaDotDensity='low'|'medium'|'high';

export const LETO_PEADOT_DENSITIES:Readonly<Record<LetoPeaDotDensity,number>>={
 low:0.42,medium:0.70,high:0.94
};
const WIDTH=64;

function hashCell(x:number,y:number,seed:number):number{
 let h=Math.imul((x+seed*137)^(Math.imul(y+31,7331)),0x45d9f3b);
 h=Math.imul(h^(h>>>16),0x119de1f3);
 return ((h^(h>>>15))>>>0)/4294967295;
}
function point(tile:Uint8Array,x:number,y:number):number{
 return tile[((y+WIDTH)&63)*WIDTH+((x+WIDTH)&63)];
}

/** Generate deterministic low/medium/high comparison masters for art QA.
 * Only MEDIUM is connected to the production pattern registry.
 */
export function letoPeaDotOverlay(source:Uint8Array,density:LetoPeaDotDensity='medium'):Uint8Array{
 if(source.length!==WIDTH*WIDTH)
  throw new Error('SS-Leto pea-dot overlay requires the approved 64px master');
 const out=source.slice();
 for(let row=0;row<WIDTH/4;row++)for(let col=0;col<WIDTH/4;col++){
  // Jittering each cell breaks dot rows without introducing costly noise
  // at draw time. Seed is stable across rerolls: phase remains UV-owned.
  const x=(col*4+Math.floor(hashCell(col,row,53)*4))&63;
  const y=(row*4+Math.floor(hashCell(col,row,71)*4))&63;
  const ink=point(source,x,y);
  if(ink===3||ink===5)continue; // Preserve deepest leaf shadows.
  // Only draw inside established ink regions. This retains the strong,
  // scalloped oakleaf borders introduced by 7B.
  let interior=0;
  if(point(source,x-1,y)===ink)interior++;
  if(point(source,x+1,y)===ink)interior++;
  if(point(source,x,y-1)===ink)interior++;
  if(point(source,x,y+1)===ink)interior++;
  if(interior<3)continue;
  const chance=hashCell(col,row,89);
  const bias=ink===0?1.0:ink===1?.92:ink===2?.98:.63;
  if(chance>LETO_PEADOT_DENSITIES[density]*bias)continue;
  const colorRoll=hashCell(col,row,109);
  // Contrast via palette-role cross-pollination (not random RGB noise):
  // dark moss/olive speckles on pale khaki, tiny pale seeds on green,
  // and rare pale punctures on loam.
  const dot=ink===0?(colorRoll<.76?2:5):
   ink===1?(colorRoll<.74?0:5):
   ink===2?(colorRoll<.79?0:5):
   (colorRoll<.82?0:2);
  out[y*WIDTH+x]=dot;
  // Some seeds form 2px pairs; occasional 3rd pixels are deliberately
  // rare. Never cross the original field boundary or create 2x2 blocks.
  const pair=hashCell(col,row,127);
  if(pair>.48){
   const dx=pair>.74?0:1,dy=pair>.74?1:0;
   if(point(source,x+dx,y+dy)===ink)
    out[((y+dy)&63)*WIDTH+((x+dx)&63)]=dot;
  }
  if(pair>.93 && point(source,x-1,y)===ink)
   out[y*WIDTH+((x-1+64)&63)]=dot;
 }
 return out;
}

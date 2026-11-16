/** Shared deterministic 32-bit site RNG: no dependency on the generator.
 * Preserve the LCG stream across geometry, furnishing, save and replay seeds. */
export const seeded=(seed:number)=>{
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;};
};

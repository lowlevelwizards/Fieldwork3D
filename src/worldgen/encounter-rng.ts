/** Independent deterministic streams: changing placement rolls must not
 * accidentally reshuffle encounter premise or group composition. */
export function encounterSeed(seed:number,lane:number):number{
 let n=(seed^Math.imul(lane+1,0x9e3779b9))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return (n^(n>>>16))>>>0;
}
export function encounterRng(seed:number,lane:number):()=>number{
 let n=encounterSeed(seed,lane);
 return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
   return n/4294967296;};
}

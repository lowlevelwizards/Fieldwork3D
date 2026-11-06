/** Narrative randomness is independent of architecture, encounter, and AI RNG. */
export function mixBriefingSeed(seed:number,salt:number):number{
  let n=(seed^salt)>>>0;
  n=Math.imul(n^(n>>>16),0x7feb352d);
  n=Math.imul(n^(n>>>15),0x846ca68b);
  return (n^(n>>>16))>>>0;
}
export function briefingRng(seed:number):()=>number{
  let n=(seed>>>0)||0x6d2b79f5;
  return ()=>{
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;
  };
}
export function weightedBriefingPick<T>(
  items:readonly T[],weight:(item:T)=>number,random:()=>number
):T|undefined{
  const total=items.reduce((s,i)=>s+Math.max(0,weight(i)),0);
  if(!items.length||total<=0)return undefined;
  let p=random()*total;
  for(const item of items){p-=Math.max(0,weight(item));if(p<0)return item;}
  return items[items.length-1];
}

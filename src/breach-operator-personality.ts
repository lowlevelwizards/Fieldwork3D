/** Stable, restrained operator-specific presentation variation.
 * Never change motor movement, anatomical reach, aim authority or contacts.
 */
export function operatorMotionTraits(id:string){
 let hash=2166136261;
 for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619)>>>0;
 const phase=(hash%4096)/4096*Math.PI*2;
 const looseness=.94+((hash>>>12)%1024)/1024*.12;
 const packScale=.93+((hash>>>21)%256)/256*.14;
 return {phase,looseness,packScale};
}

/** Auto-acquisition is permitted only among already confirmed live
 * contacts. Favor an actual safe firing opportunity over a nearer contact
 * hidden behind solid cover; preserve the current target when still valid.
 * The authoritative muzzle/shot safety gates MUST still run before ignition.
 */
export type ObservableTarget={id:string;p:{x:number;y:number}};
export function selectFireableContact<T extends ObservableTarget>(
 origin:{x:number;y:number},visible:readonly T[],currentId:string|null,
 clearLane:(target:T)=>boolean
):T|null{
 if(!visible.length)return null;
 const near=[...visible].sort((a,b)=>{
  const ad=Math.hypot(a.p.x-origin.x,a.p.y-origin.y);
  const bd=Math.hypot(b.p.x-origin.x,b.p.y-origin.y);
  return ad-bd||a.id.localeCompare(b.id);
 });
 if(near.length===1)return near[0];
 const valid=near.filter(clearLane);
 // If every known lane is obstructed, keep tracking the already observed
 // contact instead of snapping to a closer, equally unshootable target.
 // Actual muzzle/friendly fire gates remain the only fire authority.
 return valid.find(t=>t.id===currentId)??valid[0]??
   near.find(t=>t.id===currentId)??near[0];
}

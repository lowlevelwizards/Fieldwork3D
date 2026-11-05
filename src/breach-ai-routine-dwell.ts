/** Deterministic contextual dwell, without consuming global combat RNG. */
export function routineDwellSeconds(
 actorId:string,activity:string,stop:number,visit:number):number{
 let hash=2166136261;
 const key=actorId+'/'+activity+'/'+stop+'/'+Math.floor(visit/3);
 for(let i=0;i<key.length;i++)
  hash=Math.imul(hash^key.charCodeAt(i),16777619)>>>0;
 const variation=((hash>>>0)%1000)/1000;
 const base=activity==='patrolling'?1.1:
  activity==='inspecting'?1.8:activity==='working'?2.3:2;
 return Math.round((base+variation*1.55)*100)/100;
}

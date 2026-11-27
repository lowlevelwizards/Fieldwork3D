/** Deterministic contextual dwell, without consuming global combat RNG. */
export function routineDwellSeconds(
 actorId:string,activity:string,stop:number,visit:number,patience=.5):number{
 let hash=2166136261;
 const key=actorId+'/'+activity+'/'+stop+'/'+Math.floor(visit/3);
 for(let i=0;i<key.length;i++)
  hash=Math.imul(hash^key.charCodeAt(i),16777619)>>>0;
 const variation=((hash>>>0)%1000)/1000;
 const base=activity==='patrolling'?1.1:
  activity==='inspecting'?1.8:activity==='working'?2.3:2;
 return Math.round((base+variation*1.55)*(.8+.4*Math.max(0,Math.min(1,patience)))*100)/100;
}

/** EB8: quiet people keep their real assigned activity. Do not make an
 * idle occupant seek a fighting position in the absence of evidence. */
export function ambientStationary(activity:string|undefined,role:string|undefined):boolean{
 return activity==='idle'||activity==='inspecting'||activity==='working'||
   activity==='seated'||activity==='resting'||activity==='talking'||
   activity==='watching'&&role!=='patrol';
}
export function contextualRoutineDwell(actorId:string,activity:string,stop:number,visit:number,patience=.5):number{
 const dwell=routineDwellSeconds(actorId,activity,stop,visit,patience);
 return activity==='inspecting'||activity==='working'?dwell+1.5:
   activity==='patrolling'?dwell+.65:dwell+2;
}

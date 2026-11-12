/** Opt-in, offline observations of actual fixed-step Session behavior.
 * Never changes gameplay, perception, AI decisions or player disclosure.
 * Idle time without an opportunity is descriptive, not a failed reaction.
 */
import type {Session} from './breach-game.ts';

export class EncounterBehaviorSurvey{
 private samples=0;
 private hostileStart=new Map<string,{x:number;y:number}>();
 private civilianStart=new Map<string,{x:number;y:number}>();
 private lastAlert=new Map<string,string>();
 private lastCivilianState=new Map<string,string>();
 private investigatingSince=new Map<string,{time:number;x:number;y:number}>();
 private stalled=new Set<string>();
 private alerted=new Set<string>();
 private civilianChanged=new Set<string>();
 private investigationsStarted=0;
 private investigationsEnded=0;
 private investigationsNoProgress=0;
 private blockedEpisodes=0;
 private currentlyBlocked=new Set<string>();
 private hostileIdleSeconds=0;
 private civilianRoutineSeconds=0;
 private civilianFrozenSeconds=0;
 private alertSamples:Record<string,number>={};
 private civilianStates:Record<string,number>={};
 private shots=0;
 private injuries=0;
 private initialHealth=new Map<string,number>();
 private finalHostiles=0;
 private finalCivilians=0;
 private surrendered=0;
 readonly generatedHostiles:number;
 readonly generatedCivilians:number;
 readonly activeHostiles:number;
 readonly activeCivilians:number;
 readonly roomOccupancy:Record<string,number>={};
 constructor(s:Session){
  const hostiles=s.operators.filter(a=>a.side==='red');
  this.generatedHostiles=s.site?.encounter?.actors.length??hostiles.length;
  this.generatedCivilians=s.site?.encounter?.neutrals?.length??0;
  this.activeHostiles=hostiles.length;
  this.activeCivilians=s.civilians.length;
  for(const h of hostiles){
   this.hostileStart.set(h.id,{...h.p});
   this.lastAlert.set(h.id,h.alert);
   this.initialHealth.set(h.id,h.health);
  }
  for(const c of s.civilians){
   this.civilianStart.set(c.id,{...c.p});
   this.lastCivilianState.set(c.id,c.state);
   this.initialHealth.set(c.id,c.health);
  }
  for(const actor of s.site?.encounter?.actors??[]){
   this.roomOccupancy[actor.roomId]=(this.roomOccupancy[actor.roomId]??0)+1;
  }
  for(const c of s.civilians){
   this.roomOccupancy[c.homeRoomId]=(this.roomOccupancy[c.homeRoomId]??0)+1;
  }
 }
 sample(s:Session,dt:number){
  this.samples++;
  this.shots=Math.max(this.shots,s.shots.length+
   (s.nextShotId-s.shots.length-1)); // monotonic shot IDs survive capped buffers
  const hostiles=s.operators.filter(a=>a.side==='red');
  this.finalHostiles=hostiles.filter(a=>a.health>0).length;
  this.finalCivilians=s.civilians.filter(c=>c.health>0).length;
  this.surrendered=hostiles.filter(a=>a.surrendered).length;
  for(const h of hostiles){
   this.alertSamples[h.alert]=(this.alertSamples[h.alert]??0)+1;
   if(h.health>0&&h.alert==='idle')this.hostileIdleSeconds+=dt;
   const previous=this.lastAlert.get(h.id);
   if(h.alert==='investigating'&&previous!=='investigating'){
    this.investigationsStarted++;
    this.investigatingSince.set(h.id,{time:s.seconds,x:h.p.x,y:h.p.y});
   }
   if(h.alert!=='investigating'&&previous==='investigating'){
    this.investigationsEnded++;this.investigatingSince.delete(h.id);
    this.stalled.delete(h.id);
   }
   const start=this.investigatingSince.get(h.id);
   if(start&&!this.stalled.has(h.id)&&s.seconds-start.time>=2&&
      Math.hypot(h.p.x-start.x,h.p.y-start.y)<3){
    this.investigationsNoProgress++;this.stalled.add(h.id);
   }
   this.lastAlert.set(h.id,h.alert);
   if(h.alert!=='idle')this.alerted.add(h.id);
   const blocked=h.blockedTime>=1;
   if(blocked&&!this.currentlyBlocked.has(h.id))this.blockedEpisodes++;
   if(blocked)this.currentlyBlocked.add(h.id);
   else this.currentlyBlocked.delete(h.id);
  }
  for(const c of s.civilians){
   this.civilianStates[c.state]=(this.civilianStates[c.state]??0)+1;
   if(c.health>0&&c.state==='routine')this.civilianRoutineSeconds+=dt;
   if(c.health>0&&c.state==='frozen')this.civilianFrozenSeconds+=dt;
   if(c.state!==this.lastCivilianState.get(c.id))this.civilianChanged.add(c.id);
   this.lastCivilianState.set(c.id,c.state);
  }
  this.injuries=[...hostiles,...s.civilians].filter(a=>
   a.health<(this.initialHealth.get(a.id)??a.health)).length;
 }
 finish(s:Session,stimulus:{injected:boolean;at:number|null}){
  const moved=(starts:Map<string,{x:number;y:number}>,
   actors:readonly {id:string;p:{x:number;y:number}}[])=>actors.filter(a=>{
    const p=starts.get(a.id);
    return !!p&&Math.hypot(a.p.x-p.x,a.p.y-p.y)>5;
   }).length;
  const hostiles=s.operators.filter(a=>a.side==='red');
  return {
   seconds:Math.round(this.samples/60*100)/100,
   population:{plannedHostiles:this.generatedHostiles,activeHostiles:this.activeHostiles,
    generatedCivilians:this.generatedCivilians,activeCivilians:this.activeCivilians,
    survivingHostiles:this.finalHostiles,survivingCivilians:this.finalCivilians},
   roomOccupancy:this.roomOccupancy,
   stimulus,
   hostiles:{alertSamples:this.alertSamples,
    alertedActors:this.alerted.size,movedActors:moved(this.hostileStart,hostiles),
    idleActorSeconds:Math.round(this.hostileIdleSeconds*100)/100,
    investigationsStarted:this.investigationsStarted,
    investigationsEnded:this.investigationsEnded,
    investigationsOpen:this.investigatingSince.size,
    investigationsWithoutProgress:this.investigationsNoProgress,
    blockedEpisodes:this.blockedEpisodes},
   civilians:{stateSamples:this.civilianStates,
    changedStateActors:this.civilianChanged.size,
    movedActors:moved(this.civilianStart,s.civilians),
    routineActorSeconds:Math.round(this.civilianRoutineSeconds*100)/100,
    frozenActorSeconds:Math.round(this.civilianFrozenSeconds*100)/100},
   combat:{shots:this.shots,injuredActors:this.injuries,
    surrenderedHostiles:this.surrendered},
   caveat:'Scripted stimulus is diagnostic; no reaction without perceived evidence is not a failure.'
  };
 }
}

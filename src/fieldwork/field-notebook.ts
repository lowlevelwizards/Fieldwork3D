import type { StationId, Inspection } from '../systems/power-network.ts';
import type { CrewMission } from '../crew/crew-mission.ts';
import type { NetworkJob } from './network-job.ts';

export type Observer = 'ROOK' | 'MICA';
export type Evidence = { station: StationId; voltage: number; description: string; observer: Observer; sequence: number };
export const stationLabel: Record<StationId,string> = {
 generator:'Generator',switchgear:'Switchgear',relay:'Relay cabinet',junction:'Junction box',mast:'Radio mast'
};
const nextStation: Record<StationId,StationId> = {
 generator:'switchgear',switchgear:'relay',relay:'junction',junction:'mast',mast:'generator'
};
/**
 * A shared notebook stores only actually witnessed measurements or radio reports.
 * The hypothetical next lead is derived from those observations. It has no
 * access to the network's hidden fault until an operator has diagnosed it.
 */
export class FieldNotebook {
 readonly readings = new Map<StationId,Evidence>();
 private sequence = 0;
 readonly events:string[] = [];
 record(reading:Inspection,observer:Observer) {
   const item:Evidence={...reading,observer,sequence:++this.sequence};
   this.readings.set(reading.station,item);
   return item;
 }
 note(event:string) {
   if(this.events[this.events.length-1] !== event) this.events.push(event);
   if(this.events.length>12)this.events.shift();
 }
 sorted(): Evidence[] {return [...this.readings.values()].sort((a,b)=>a.sequence-b.sequence);}
 lead(job:NetworkJob):string {
   if(job.finished)return job.phase==='complete'?'Supply restored. Return to truck.':'Unresolved. Return visit required.';
   if(job.diagnosed)return 'Identified worksite: '+stationLabel[job.target]+'.';
   const r=this.readings.get('relay');
   const g=this.readings.get('generator');
   const s=this.readings.get('switchgear');
   if(g?.voltage===0)return 'Source offline. Inspect or restart the generator.';
   if(s?.voltage===0&&g?.voltage===120)return 'Power stops before switchgear. Check the breaker.';
   if(r?.voltage===0&&s?.voltage===120)return 'Switchgear energized; inspect feeder and relay.';
   if(r?.voltage===0)return 'No voltage at relay. Trace upstream through switchgear.';
   if(g?.voltage===120)return 'Generator good. Test the next downstream station.';
   if(this.readings.size) {
     const last=this.sorted().at(-1)!;
     return 'Trace onward to '+stationLabel[nextStation[last.station]]+'.';
   }
   return 'Inspect a machine to collect the first reading.';
 }
}
export function crewActivity(crew:CrewMission,surveying:boolean):string {
 switch(crew.stage){
  case 'standby':return surveying?'Mica · checking generator':'Mica · standing by';
  case 'fetching':return crew.assignment==='isolation'?'Mica · heading to disconnect':'Mica · heading to supplies';
  case 'retrieving':return crew.assignment==='isolation'?'Mica · isolating supply':'Mica · collecting part';
  case 'delivering':return 'Mica · carrying replacement to Rook';
  case 'handoff':return 'Mica · handing over part';
  case 'delivered':return crew.powerIsolated?'Circuit isolated · ready for repair':'Mica · available';
  case 'energizing':return 'Mica · restoring supply';
  case 'returning':return 'Crew · returning to truck';
  case 'finished':return 'Crew · at truck';
 }
}

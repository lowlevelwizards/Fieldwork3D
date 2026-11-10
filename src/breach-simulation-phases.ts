/** The sole ordered phase director for authoritative fixed-tick simulation.
 * The runtime owns the 60 Hz schedule; stepSession owns phase entry and clamp.
 * No rendering/replay code may tick this director independently.
 */
import type {Session,StepPhaseProbe} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {captureMotionFrameOrigins} from './breach-motion-frame-input.ts';
import {executionStatus} from './breach-execution-state.ts';
import {executionTransition} from './breach-execution-events.ts';
export function simulationPhaseMark(probe?:StepPhaseProbe):(phase:string)=>void{
  let perfStart=probe?performance.now():0;
  return (phase:string)=>{
    if(!probe)return;
    const now=performance.now();
    probe(phase,now-perfStart);
    perfStart=now;
  };

}
export function advanceTransientSimulationEffects(s:Session,h:number):void{
  // Effects are usually empty between firefights; the old filters
  // allocated five fresh empty arrays on every authoritative 60Hz tick.
  // Nonempty collections retain the same age increments and expiry gates.
  if(s.sparks.length)s.sparks=s.sparks.filter(a=>(a.age+=h)<.20);
  if(s.shots.length)s.shots=s.shots.filter(a=>(a.age+=h)<.40);
  if(s.noise.length)s.noise=s.noise.filter(n=>s.seconds-n.time<4);
  for(const magazine of s.dropped)magazine.age+=h;
  if(s.impactMarks.length)
    s.impactMarks=s.impactMarks.filter(mark=>(mark.age+=h)<24);
  if(s.flashBursts.length)
    s.flashBursts=s.flashBursts.filter(b=>(b.age+=h)<.70);
}
export function recordSimulationExecutionOutcomes(s:Session):void{
  // Record only changed player-visible states after the authoritative tick.
  // This is observational: no actor motion or tactical orders are changed.
  const friendly=s.operators.filter(a=>a.side==='blue');
  for(const unit of friendly){
    const status=executionStatus(unit,{
      phase:s.phase,doors:s.doors,peers:friendly
    });
    const change=executionTransition(unit.executionLastStatus,status,unit.name);
    unit.executionLastStatus=status;
    if(!change)continue;
    s.executionEvents.push({
      id:s.nextExecutionId++,t:s.seconds,actor:unit.id,
      p:{...unit.p},...change
    });
    if(s.executionEvents.length>240)s.executionEvents.shift();
  }
}

/** Explicit schedule, append-only event drain LAST. Changing this order is
 * gameplay-affecting and requires reviewing the frozen outcome fingerprints.
 * The final event drain is intentionally outside the performance labels.
 */
export const SIMULATION_PHASE_SEQUENCE=Object.freeze([
 'doors','aging-effects','visual-awareness','belief-aging','actor-loop',
 'civilian-motion','contacts','reports','observe-intel','fire','mission',
 'execution-events'
] as const);

export type SimulationPhasePort={
 medicalDoors:(s:Session,h:number)=>void;
 flashbangs:(s:Session,h:number)=>void;
 visualAwareness:(s:Session,h:number)=>void;
 beliefAging:(s:Session,h:number)=>void;
 actorActions:(s:Session,h:number,markActor?:((id:string)=>void))=>void;
 motion:(s:Session,h:number,origins:ReadonlyMap<string,Pt>)=>void;
 contacts:(s:Session)=>void;
 reports:(s:Session)=>void;
 observe:(s:Session)=>void;
 fire:(s:Session,h:number)=>void;
 mission:(s:Session,h:number)=>void;
};
/** One clock advance, one deterministic sequence. The actor origin snapshot
 * is taken AFTER medical/door/belief phases and BEFORE any actor movement.
 * Reports precede observation; observation precedes firing; mission outcomes
 * precede execution-status events and external recorder capture.
 */
export function advanceSimulationTick(s:Session,h:number,
 port:SimulationPhasePort,probe?:StepPhaseProbe):void{
 const mark=simulationPhaseMark(probe);
 s.seconds+=h;
 port.medicalDoors(s,h);
 mark('doors');
 advanceTransientSimulationEffects(s,h);
 port.flashbangs(s,h);
 mark('aging-effects');
 port.visualAwareness(s,h);
 mark('visual-awareness');
 port.beliefAging(s,h);
 mark('belief-aging');
 const motionStart=captureMotionFrameOrigins(s.operators,s.civilians);
 port.actorActions(s,h,probe?id=>mark('operator-'+id):undefined);
 mark('actor-loop');
 port.motion(s,h,motionStart);
 mark('civilian-motion');
 port.contacts(s);
 mark('contacts');
 port.reports(s);
 mark('reports');
 port.observe(s);
 mark('observe-intel');
 port.fire(s,h);
 mark('fire');
 port.mission(s,h);
 mark('mission');
 recordSimulationExecutionOutcomes(s);
}

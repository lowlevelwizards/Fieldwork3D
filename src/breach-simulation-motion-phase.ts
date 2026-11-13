/** Shared fixed-tick physical frame after actor intents, before contacts.
 * Proposals capture pre-movement positions. A single arbiter decides hard
 * actor/civilian collisions; rejected motion is restored deterministically.
 */
import {type Pt,OPERATOR_RADIUS} from './breach-core.ts';
import {length} from './breach-plan.ts';
import {proposedCivilianTransportStep,reconcileCivilianTransportFrame}
 from './breach-civilian-transport.ts';
import {civilianSenseDue,stepCivilianResponse} from './breach-civilian-response.ts';
import {stepCivilianMovement} from './breach-civilian-movement.ts';
import {buildMotionFrameProposals} from './breach-motion-frame-input.ts';
import {resolveMovementFrame} from './breach-movement-authority.ts';
import {sweptBodyClear,sweptProfileClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {motorTraversalWorld} from './breach-motor-traversal.ts';
import {traversalStepClear,sampleTraversal} from './breach-mantle.ts';
import type {Session,TeamActor} from './breach-game.ts';
const d=length;
const clone=(p:Pt):Pt=>({...p});
/** Civilian crowd/occupancy uses fixed positive radii and a strict
 * inequality. Compare squared distance to avoid sqrt for each live body
 * on every 60Hz candidate; retain live sequential actor positions. */
const withinSquared=(a:Pt,b:Pt,radiusSq:number)=>{
 const dx=a.x-b.x,dy=a.y-b.y;
 return dx*dx+dy*dy<radiusSq;
};
export type MotionSimulationPhasePort={
 canSee:(from:Pt,to:Pt,s:Session,lowBlocks:boolean)=>boolean;
 routeTo:(s:Session,from:Pt,to:Pt)=>Pt[];
};
export function advanceSimulationMotion(s:Session,h:number,
 motionStart:ReadonlyMap<string,Pt>,port:MotionSimulationPhasePort,
 profile?:((name:string,elapsedMs:number)=>void)):void{
 // Detail is observational, enabled only by ?perf=1. Parent fixed tick,
 // iteration order, RNG and authoritative collision outcomes stay intact.
 const cpuMark=()=>profile?performance.now():0;
 const cpuEnd=(name:string,start:number)=>{
   if(profile)profile('civilian-motion/'+name,performance.now()-start);
 };
 // One snapshot of session geometry for this authoritative motion phase.
 // The civilian motor and body arbitration read the same real world,
 // rather than looking up the already-validated context for each proposal.
 const world=sessionWorldGeometry(s);
 const carryStart=cpuMark();
  // Authoritative coupled body proposal, before hard-actor resolution.
  const coupledBodyStarts=new Map<string,Pt>();
  for(const carrier of s.operators){
    if(!carrier.carryingId)continue;
    const civil=s.civilians.find(c=>c.id===carrier.carryingId&&
      c.carriedById===carrier.id);
    if(!civil)continue;
    const from=motionStart.get(carrier.id)??carrier.p;
    const bodyFrom=motionStart.get(civil.id)??civil.p;
    const others=[
      ...s.operators.filter(o=>o!==carrier&&o.health>0).map(o=>o.p),
      ...s.civilians.filter(c=>c!==civil).map(c=>c.p)
    ];
    const next=proposedCivilianTransportStep(bodyFrom,from,carrier.p,
      carrier.heading,civil.transportMode??carrier.plan[0]?.transportMode??'drag',
      (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),others,h*36);
    if(!next){
      carrier.p=clone(from);carrier.velocity=0;carrier.nav=[];
      civil.p=clone(bodyFrom);civil.velocity=0;
      continue;
    }
    coupledBodyStarts.set(carrier.id,clone(bodyFrom));
    civil.priorP=clone(bodyFrom);civil.p=next;civil.velocity=0;
  }
  cpuEnd('carried',carryStart);
  // Propose civilian motion before the shared fixed-tick authority pass.
  // Both teams see the same original pre-motion positions for hard bodies.
  if(s.civilians.length){
    // One ordered live-body collection for all civilian occupancy queries.
    // No chained filter/spread arrays per authoritative 60Hz tick. Read
    // positions live, so earlier civilians moving this tick still matter.
    const nearby:Array<{id:string;p:Pt}>=[];
    for(const a of s.operators)if(a.health>0)nearby.push(a);
    for(const c of s.civilians)if(c.health>0)nearby.push(c);
    // These callbacks do not capture an individual civilian and can be
    // reused across their fixed-tick movement and observer evaluations.
    // The underlying geometry and actor positions remain live at call time.
    const clear=(from:Pt,to:Pt)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world);
    let routeWorkMs=0;
    const routeTo=(from:Pt,to:Pt)=>{
      if(!profile)return port.routeTo(s,from,to);
      const started=performance.now();
      // The route itself remains synchronous and authoritative; only the
      // optional instrumentation reads a wall clock.
      try{return port.routeTo(s,from,to);}
      finally{routeWorkMs+=performance.now()-started;}
    };
    const occupied=(p:Pt,id:string)=>nearby.some(a=>
      a.id!==id&&withinSquared(a.p,p,400));
    const sensoryCommon={
      noise:s.noise,people:s.operators,doors:s.doors,walls:world.walls,
      windows:s.windows,
      canSee:(from:Pt,to:Pt)=>port.canSee(from,to,s,false),
      canReach:clear,routeTo
    };
    let responseTime=0,movementTime=0;
    for(const civil of s.civilians){
      const responseStart=cpuMark();
      // Most 60Hz frames fall between 120ms civilian observation ticks.
      // Do not allocate an actor-specific sensory port just to early-return;
      // the authoritative stepCivilianResponse still enforces the same gate.
      if(civilianSenseDue(civil,s.seconds)){
        stepCivilianResponse(civil,s.seconds,h,{
          ...sensoryCommon,
          // Crowd awareness also includes incapacitated bodies, unlike
          // physical occupancy. Keep these independent exact contracts.
          isCrowded:p=>s.operators.some(o=>o.health>0&&
            withinSquared(o.p,p,484))||
            s.civilians.some(c=>c.id!==civil.id&&
            withinSquared(c.p,p,484))
        });
      }
      if(profile){
        const elapsed=performance.now()-responseStart;
        responseTime+=elapsed;
        profile('civilian-motion/response-'+civil.id,elapsed);
      }
      const civilianStepStart=cpuMark();
      stepCivilianMovement(civil,s.seconds,h,clear,occupied,routeTo);
      if(profile){
        const elapsed=performance.now()-civilianStepStart;
        movementTime+=elapsed;
        profile('civilian-motion/step-'+civil.id,elapsed);
      }
    }
    // Child actor costs sum to these category totals. Neither total adds
    // to the enclosing 'civilian-motion' parent measured by the phase probe.
    if(profile){
      profile('civilian-motion/response',responseTime);
      profile('civilian-motion/step',movementTime);
      // Nested within response/step; do NOT sum it into the parent.
      profile('civilian-motion/route-search',routeWorkMs);
    }
  }
  const arbitrationStart=cpuMark();
  const proposals=buildMotionFrameProposals(
    s.operators,s.civilians,motionStart);
  // Repeated identifier searches inside each moving proposal and blocked
  // resolution become one linear index. We use live actor references: the
  // collision resolver still processes the original ordered proposals.
  const actorById=new Map<string,TeamActor>();
  for(const actor of s.operators)actorById.set(actor.id,actor);
  const civilianById=new Map<string,(typeof s.civilians)[number]>();
  const transportLinks:{carrierId:string;bodyId:string}[]=[];
  for(const civil of s.civilians){
    civilianById.set(civil.id,civil);
    if(civil.carriedById)transportLinks.push({
      carrierId:civil.carriedById,bodyId:civil.id
    });
  }
  const decisions=resolveMovementFrame(proposals,p=>{
    if(p.side==='neutral')return sweptBodyClear(p.from,p.to,s.doors,OPERATOR_RADIUS,world);
    const a=actorById.get(p.id)!;
    return a.traversal?
      traversalStepClear(p.from,p.to,a.traversal,motorTraversalWorld(s,a)):
      a.squeeze?sweptProfileClear(p.from,p.to,s.doors,a.squeezeYaw,'squeeze',world):
        sweptBodyClear(p.from,p.to,s.doors,OPERATOR_RADIUS,world);
  });
  // No transport arbitration or sorted link copies on the common path.
  if(transportLinks.length)
    reconcileCivilianTransportFrame(proposals,decisions,transportLinks);
  for(const decision of decisions){
    if(!decision.blocked)continue;
    const civil=civilianById.get(decision.id);
    if(civil){
      civil.p=clone(decision.point);civil.priorP=clone(decision.point);
      civil.velocity=0;civil.blockedTime+=h;
      continue;
    }
    const a=actorById.get(decision.id)!;
    a.p=clone(decision.point);
    const start=coupledBodyStarts.get(a.id);
    if(start&&a.carryingId){
      const body=civilianById.get(a.carryingId);
      if(body&&body.carriedById===a.id){
        body.p=clone(start);body.priorP=clone(start);
      }
    }
    a.priorP=clone(decision.point);a.velocity=0;
    if(a.traversal){
      a.traversalElapsed=Math.min(a.traversal.duration,Math.max(0,
        a.traversalElapsed+(a.traversalRetreating?h*1.15:-h)));
      a.traversalElevation=sampleTraversal(a.traversal,
        a.traversalElapsed).elevation;
    }
    a.blockedTime+=h;a.lastBlocker=decision.blocked==='actor'?'actor':'route';
  }
  for(const a of s.operators)a.stride+=d(a.p,a.priorP);
  cpuEnd('authority',arbitrationStart);
}

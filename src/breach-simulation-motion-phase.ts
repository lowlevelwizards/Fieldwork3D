/** Shared fixed-tick physical frame after actor intents, before contacts.
 * Proposals capture pre-movement positions. A single arbiter decides hard
 * actor/civilian collisions; rejected motion is restored deterministically.
 */
import {type Pt,OPERATOR_RADIUS} from './breach-core.ts';
import {length} from './breach-plan.ts';
import {proposedCivilianTransportStep,reconcileCivilianTransportFrame}
 from './breach-civilian-transport.ts';
import {stepCivilianResponse} from './breach-civilian-response.ts';
import {stepCivilianMovement} from './breach-civilian-movement.ts';
import {buildMotionFrameProposals} from './breach-motion-frame-input.ts';
import {resolveMovementFrame} from './breach-movement-authority.ts';
import {sweptBodyClear,sweptProfileClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {motorTraversalWorld} from './breach-motor-traversal.ts';
import {traversalStepClear,sampleTraversal} from './breach-mantle.ts';
import type {Session} from './breach-game.ts';
const d=length;
const clone=(p:Pt):Pt=>({...p});
export type MotionSimulationPhasePort={
 canSee:(from:Pt,to:Pt,s:Session,lowBlocks:boolean)=>boolean;
 routeTo:(s:Session,from:Pt,to:Pt)=>Pt[];
};
export function advanceSimulationMotion(s:Session,h:number,
 motionStart:ReadonlyMap<string,Pt>,port:MotionSimulationPhasePort):void{
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
      (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s)),others,h*36);
    if(!next){
      carrier.p=clone(from);carrier.velocity=0;carrier.nav=[];
      civil.p=clone(bodyFrom);civil.velocity=0;
      continue;
    }
    coupledBodyStarts.set(carrier.id,clone(bodyFrom));
    civil.priorP=clone(bodyFrom);civil.p=next;civil.velocity=0;
  }
  // Propose civilian motion before the shared fixed-tick authority pass.
  // Both teams see the same original pre-motion positions for hard bodies.
  if(s.civilians.length){
    const nearby=[...s.operators.filter(a=>a.health>0),
      ...s.civilians.filter(c=>c.health>0)];
    for(const civil of s.civilians){
      stepCivilianResponse(civil,s.seconds,h,{
        noise:s.noise,people:s.operators,doors:s.doors,walls:sessionWorldGeometry(s).walls,
        windows:s.windows,
        canSee:(from,to)=>port.canSee(from,to,s,false),
        canReach:(from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s)),
        routeTo:(from,to)=>port.routeTo(s,from,to),
        isCrowded:p=>s.operators.some(o=>o.health>0&&d(o.p,p)<22)||
          s.civilians.some(c=>c.id!==civil.id&&d(c.p,p)<22)
      });
      stepCivilianMovement(civil,s.seconds,h,
        (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s)),
        (p,id)=>nearby.some(a=>a.id!==id&&d(a.p,p)<20),
        (from,to)=>port.routeTo(s,from,to));
    }
  }
  const proposals=buildMotionFrameProposals(
    s.operators,s.civilians,motionStart);
  const decisions=resolveMovementFrame(proposals,p=>{
    if(p.side==='neutral')return sweptBodyClear(p.from,p.to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s));
    const a=s.operators.find(unit=>unit.id===p.id)!;
    return a.traversal?
      traversalStepClear(p.from,p.to,a.traversal,motorTraversalWorld(s,a)):
      a.squeeze?sweptProfileClear(p.from,p.to,s.doors,a.squeezeYaw,'squeeze',sessionWorldGeometry(s)):sweptBodyClear(p.from,p.to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s));
  });
  reconcileCivilianTransportFrame(proposals,decisions,
    s.civilians.filter(c=>!!c.carriedById).map(c=>({
      carrierId:c.carriedById!,bodyId:c.id
    })));
  for(const decision of decisions){
    if(!decision.blocked)continue;
    const civil=s.civilians.find(unit=>unit.id===decision.id);
    if(civil){
      civil.p=clone(decision.point);civil.priorP=clone(decision.point);
      civil.velocity=0;civil.blockedTime+=h;
      continue;
    }
    const a=s.operators.find(unit=>unit.id===decision.id)!;
    a.p=clone(decision.point);
    const start=coupledBodyStarts.get(a.id);
    if(start&&a.carryingId){
      const body=s.civilians.find(c=>c.id===a.carryingId&&
        c.carriedById===a.id);
      if(body){body.p=clone(start);body.priorP=clone(start);}
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
}

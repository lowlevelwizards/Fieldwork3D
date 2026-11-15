/** D3.13G2C — a purely local, fully swept staging route around a currently
 * OPEN leaf. This is NOT an authored destination or a second movement motor.
 * Every leg, including the first intel continuation join, is checked against
 * the real physical world. Closed doors later in the route remain solid
 * when the original motor actually reaches them.
 */
import {doorLeafSegment,OPERATOR_RADIUS,type Door,type Pt}
 from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt)=>({...p});
const dot=(a:Pt,b:Pt)=>a.x*b.x+a.y*b.y;
export function joinedLocalOpenLeafStage(
 from:Pt,goal:Pt,door:Door,
 canSweep:(a:Pt,b:Pt)=>boolean,
 canStand:(p:Pt)=>boolean,
 knownTail:(from:Pt,goal:Pt)=>Pt[],
 witness?:(reason:string)=>void,
 /** At most two COLD, world-truth approaches to a near-side frame point. */
 physicalApproach?:(from:Pt,to:Pt)=>Pt[]
):Pt[]{
 if(!door.open||door.wedged||door.kind==='sliding'||
    door.kind==='shutter'||(door.openFraction??0)<.82||
    Math.abs(door.angularVelocity??0)>.16)return [];
 const leaf=doorLeafSegment(door);
 const length=dist(leaf.a,leaf.b);
 if(length<12)return [];
 const tangent={x:(leaf.b.x-leaf.a.x)/length,
   y:(leaf.b.y-leaf.a.y)/length};
 const normal={x:-tangent.y,y:tangent.x};
 const fromSide=Math.sign(dot({x:from.x-leaf.a.x,y:from.y-leaf.a.y},
   normal))||1;
 const goalSide=Math.sign(dot({x:goal.x-leaf.a.x,y:goal.y-leaf.a.y},
   normal))||fromSide;
 // Stage outside the PHYSICAL tip, not across the solid panel. All
 // proposals remain near this leaf and use fixed, deterministic ordering.
 const paths:Pt[][]=[];
 for(const forward of [OPERATOR_RADIUS+11,OPERATOR_RADIUS+23]){
  for(const lateral of [OPERATOR_RADIUS+12,OPERATOR_RADIUS+22]){
   const at=(side:number):Pt=>({
    x:leaf.b.x+tangent.x*forward+normal.x*side*lateral,
    y:leaf.b.y+tangent.y*forward+normal.y*side*lateral
   });
   const before=at(fromSide),after=at(goalSide);
   paths.push([before]);
   if(fromSide!==goalSide)paths.push([before,after]);
  }
 }
 const width=dist(door.a,door.b);
 const frameTangent={x:(door.b.x-door.a.x)/(width||1),
   y:(door.b.y-door.a.y)/(width||1)};
 const portalNormal={x:-frameTangent.y,y:frameTangent.x};
 const frameMid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
 const side=Math.sign(dot({x:goal.x-frameMid.x,
   y:goal.y-frameMid.y},portalNormal))||1;
 for(const offset of [0,OPERATOR_RADIUS*1.5,-OPERATOR_RADIUS*1.5]){
  const center={x:frameMid.x+frameTangent.x*offset,
    y:frameMid.y+frameTangent.y*offset};
  paths.push([{x:center.x+portalNormal.x*side*(OPERATOR_RADIUS+20),
    y:center.y+portalNormal.y*side*(OPERATOR_RADIUS+20)}]);
 }
 // H2: A person standing BELOW the frame-side hinge cannot always
 // sweep straight to the LEAF TIP, even with a wide open panel. Approach
 // on the CURRENT side of the actual door frame first, then cross the
 // aperture as two separate ordinary physical legs. These are local
 // waypoints only; the tail still ends at the original authored GO.
 // Never propose positions outside the frame's usable shoulder width.
 const firstFrameCandidate=paths.length;
 const ownSide=Math.sign(dot({x:from.x-frameMid.x,
   y:from.y-frameMid.y},portalNormal))||1;
 const halfLane=Math.max(0,width/2-OPERATOR_RADIUS-3);
 const offsets=[0,halfLane*.7,-halfLane*.7];
 for(const offset of offsets)
  for(const nearDepth of [OPERATOR_RADIUS+14,OPERATOR_RADIUS+27]){
   const lane={x:frameMid.x+frameTangent.x*offset,
     y:frameMid.y+frameTangent.y*offset};
   const before={x:lane.x+portalNormal.x*ownSide*nearDepth,
     y:lane.y+portalNormal.y*ownSide*nearDepth};
   const beyond={x:lane.x+portalNormal.x*side*(OPERATOR_RADIUS+18),
     y:lane.y+portalNormal.y*side*(OPERATOR_RADIUS+18)};
   if(ownSide===side)paths.push([before]);
   else paths.push([before,beyond]);
  }
 let best:Pt[]=[],bestCost=Infinity;
 let tailProbes=0,physicalApproachProbes=0;
 // Read-only rejection counters, populated only when the audit supplies
 // a witness. No extra route, path or full-body sweep is ever attempted.
 let unsafeLeg=0,failedJoin=0,missingTail=0,longStage=0,tooLong=0;
 for(let index=0;index<paths.length;index++){
  const stage=paths[index];
  let previous=from,travel=0,valid=true;
  let physicalPrefix:Pt[]=[];
  for(let legIndex=0;legIndex<stage.length;legIndex++){
   const point=stage[legIndex],leg=dist(previous,point);
   if(leg<2||leg>108||!canStand(point)){
    unsafeLeg++;valid=false;break;
   }
   if(!canSweep(previous,point)){
    // H2B: a nearby FRAME-SIDE approach may lie around an immovable
    // jamb. One bounded world-truth connector to that first local
    // waypoint is legal, even when a straight full-width chord is not.
    // Never apply this to the old leaf-tip or remote goal proposals.
    if(legIndex!==0||index<firstFrameCandidate||
       !physicalApproach||physicalApproachProbes>=2){
      unsafeLeg++;valid=false;break;
    }
    physicalApproachProbes++;
    const approach=physicalApproach(from,point);
    if(!approach.length||dist(approach.at(-1)!,point)>3){
      unsafeLeg++;valid=false;break;
    }
    let at=from,total=0,verified=true;
    for(const wp of approach){
      if(!canStand(wp)||!canSweep(at,wp)){
       verified=false;break;
      }
      total+=dist(at,wp);at=wp;
    }
    if(!verified||total>145||total>leg*2.6+22){
      unsafeLeg++;valid=false;break;
    }
    physicalPrefix=approach.map(clone);
    travel+=total;previous=point;
    continue;
   }
   travel+=leg;previous=point;
  }
  if(!valid)continue;
  if(travel>155||dist(previous,goal)>dist(from,goal)+18){
   longStage++;continue;
  }
  // At most three known-intel tail searches on one cold, repeated escape
  // episode. A first-leg join into the leaf is never accepted.
  if(++tailProbes>3)break;
  const tail=knownTail(previous,goal);
  if(!tail.length||dist(tail[tail.length-1],goal)>3){
   missingTail++;continue;
  }
  if(!canSweep(previous,tail[0])){
   failedJoin++;continue;
  }
  let total=travel,at=previous;
  for(const node of tail){total+=dist(at,node);at=node;}
  if(total>dist(from,goal)*1.7+40||total>=bestCost){
   tooLong++;continue;
  }
  const routeStage=physicalPrefix.length?
    [...physicalPrefix,...stage.slice(1).map(clone)]:stage.map(clone);
  bestCost=total;best=[...routeStage,...tail.map(clone)];
 }
 if(!best.length&&witness)
  witness('unsafe-leg='+unsafeLeg+',too-far='+longStage+
   ',no-tail='+missingTail+',blocked-join='+failedJoin+
   ',long-tail='+tooLong+',searched-tail='+tailProbes+
   ',physical-approach='+physicalApproachProbes);
 return best;
}

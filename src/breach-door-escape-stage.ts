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
 knownTail:(from:Pt,goal:Pt)=>Pt[]
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
 const portalNormal={x:-(door.b.y-door.a.y)/(width||1),
   y:(door.b.x-door.a.x)/(width||1)};
 const side=Math.sign(dot({x:goal.x-(door.a.x+door.b.x)/2,
   y:goal.y-(door.a.y+door.b.y)/2},portalNormal))||1;
 for(const offset of [0,OPERATOR_RADIUS*1.5,-OPERATOR_RADIUS*1.5]){
  const center={x:(door.a.x+door.b.x)/2+
       (door.b.x-door.a.x)/(width||1)*offset,
    y:(door.a.y+door.b.y)/2+
       (door.b.y-door.a.y)/(width||1)*offset};
  paths.push([{x:center.x+portalNormal.x*side*(OPERATOR_RADIUS+20),
    y:center.y+portalNormal.y*side*(OPERATOR_RADIUS+20)}]);
 }
 let best:Pt[]=[],bestCost=Infinity;
 let tailProbes=0;
 for(const stage of paths){
  let previous=from,travel=0,valid=true;
  for(const point of stage){
   const leg=dist(previous,point);
   if(leg<2||leg>108||!canStand(point)||!canSweep(previous,point)){
    valid=false;break;
   }
   travel+=leg;previous=point;
  }
  if(!valid||travel>155||dist(previous,goal)>dist(from,goal)+18)
   continue;
  // At most three known-intel tail searches on one cold, repeated escape
  // episode. A first-leg join into the leaf is never accepted.
  if(++tailProbes>3)break;
  const tail=knownTail(previous,goal);
  if(!tail.length||dist(tail[tail.length-1],goal)>3||
     !canSweep(previous,tail[0]))continue;
  let total=travel,at=previous;
  for(const node of tail){total+=dist(at,node);at=node;}
  if(total>dist(from,goal)*1.7+40||total>=bestCost)continue;
  bestCost=total;best=[...stage.map(clone),...tail.map(clone)];
 }
 return best;
}

/** R7.2b — physical footwork around an outward swinging leaf.
 * Bounded analytic candidate probes; no per-tick A*, teleport, collision
 * relaxation or authored MOVE/LOOK/WATCH mutation. A temporary doorway
 * staging point is allowed even when the far room needs a later normal
 * pathfind. The authoritative motor validates EVERY swept segment.
 */
import {OPERATOR_RADIUS,doorLeafSegment,doorCenter,pointToSegment,
 type Door,type Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);

export function doorLeafBypass(from:Pt,goal:Pt,door:Door,
 sweptClear:(a:Pt,b:Pt)=>boolean,radius=OPERATOR_RADIUS):Pt[]{
 if(!door.open||door.kind==='sliding'||door.kind==='shutter'||
    (door.openFraction??0)<.32||dist(from,goal)<8)return [];
 const leaf=doorLeafSegment(door),length=dist(leaf.a,leaf.b);
 if(length<12||pointToSegment(from,leaf)>radius+56)return [];
 const frameLength=dist(door.a,door.b)||1;
 const acrossFrame={x:(door.b.x-door.a.x)/frameLength,
  y:(door.b.y-door.a.y)/frameLength};
 const through={x:-acrossFrame.y,y:acrossFrame.x};
 const center=doorCenter(door);
 const goalSide=(goal.x-center.x)*through.x+
  (goal.y-center.y)*through.y>=0?1:-1;
 const forward={x:(leaf.b.x-leaf.a.x)/length,
  y:(leaf.b.y-leaf.a.y)/length};
 const acrossLeaf={x:-forward.y,y:forward.x};
 const ownSide=(from.x-leaf.a.x)*acrossLeaf.x+
  (from.y-leaf.a.y)*acrossLeaf.y>=0?1:-1;
 const direct=dist(from,goal);
 const choices:{path:Pt[];score:number;complete:boolean}[]=[];
 const append=(path:Pt[])=>{
   let previous=from,cost=0;
   for(const p of path){
     if(!sweptClear(previous,p))return;
     cost+=dist(previous,p);previous=p;
   }
   const complete=sweptClear(previous,goal);
   if(complete){cost+=dist(previous,goal);path=[...path,{...goal}];}
   // A safe interior staging position is valuable even if the next room
   // segment needs ordinary route acquisition after we clear the doorway.
   if(cost>direct*2.7+100)return;
   choices.push({path,score:cost+(complete?0:25),complete});
 };
 for(const depth of [radius+12,radius+26]){
   for(const lateral of [0,-7,7]){
     const portal={x:center.x+through.x*depth*goalSide+
        acrossFrame.x*lateral,
       y:center.y+through.y*depth*goalSide+
        acrossFrame.y*lateral};
     // First try a natural shoulder path through the opening. No need to
     // travel around the tip if the current hinge already gives clearance.
     append([portal]);
     for(const beyond of [radius+6,radius+18]){
       for(const clearance of [radius+6,radius+18]){
         const tipBeyond={x:leaf.b.x+forward.x*beyond,
           y:leaf.b.y+forward.y*beyond};
         const before={x:tipBeyond.x+acrossLeaf.x*clearance*ownSide,
           y:tipBeyond.y+acrossLeaf.y*clearance*ownSide};
         const after={x:tipBeyond.x-acrossLeaf.x*clearance*ownSide,
           y:tipBeyond.y-acrossLeaf.y*clearance*ownSide};
         append([before,after,portal]);
       }
     }
   }
 }
 choices.sort((a,b)=>Number(b.complete)-Number(a.complete)||
   a.score-b.score||a.path.length-b.path.length);
 return choices[0]?.path??[];
}

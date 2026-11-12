/** R7.2b — crossing an outward-swinging, physically solid door.
 * Move the BODY around the actual free edge instead of pushing the wrong
 * face toward its frame. Analytic, bounded and full-radius swept: no A*
 * per tick, no fake collision radius and no authored route mutation.
 */
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,
 type Door,type Pt} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function doorLeafBypass(from:Pt,goal:Pt,door:Door,
 sweptClear:(a:Pt,b:Pt)=>boolean,radius=OPERATOR_RADIUS):Pt[]{
 if(!door.open||door.kind==='sliding'||door.kind==='shutter'||
    (door.openFraction??0)<.32||dist(from,goal)<8)return [];
 const leaf=doorLeafSegment(door),length=dist(leaf.a,leaf.b);
 if(length<12||pointToSegment(from,leaf)>radius+34||
    sweptClear(from,goal))return [];
 const forward={x:(leaf.b.x-leaf.a.x)/length,
  y:(leaf.b.y-leaf.a.y)/length};
 const across={x:-forward.y,y:forward.x};
 const side=(from.x-leaf.a.x)*across.x+
  (from.y-leaf.a.y)*across.y>=0?1:-1;
 const direct=dist(from,goal);
 let best:Pt[]=[];let bestCost=Infinity;
 for(const beyond of [radius+5,radius+11,radius+19]){
  for(const clearance of [radius+5,radius+12,radius+20]){
   // First approach the actor's own face of the leaf. Go beyond the
   // FREE TIP, then cross behind it on the far face. Never cross the panel.
   const around={x:leaf.b.x+forward.x*beyond,
    y:leaf.b.y+forward.y*beyond};
   const before={x:around.x+across.x*clearance*side,
    y:around.y+across.y*clearance*side};
   const after={x:around.x-across.x*clearance*side,
    y:around.y-across.y*clearance*side};
   const cost=dist(from,before)+dist(before,after)+dist(after,goal);
   if(cost>=bestCost||cost>direct*2.4+75||
      !sweptClear(from,before)||!sweptClear(before,after)||
      !sweptClear(after,goal))continue;
   best=[before,after,{...goal}];bestCost=cost;
  }
 }
 return best;
}

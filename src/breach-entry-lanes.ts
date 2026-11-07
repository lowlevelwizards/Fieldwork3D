/** Build 149: four distinct, deterministic clearing lanes.
 * Doors form a physical threshold; the template does not know enemies
 * or change the player's chosen orders until the user invokes it. */
import {doorCenter,type Pt,type Door} from './breach-core.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type EntrySlot={point:Pt;look:Pt;side:'left'|'right';depth:number};
export function entryLanes(door:Door,from:Pt,count:number,
 canStand:(p:Pt)=>boolean):EntrySlot[]{
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const size=Math.hypot(dx,dy)||1;
 const tangent={x:dx/size,y:dy/size};
 const normal={x:-tangent.y,y:tangent.x};
 const side=Math.sign((from.x-center.x)*normal.x+
   (from.y-center.y)*normal.y)||1;
 const inward={x:-normal.x*side,y:-normal.y*side};
 // Try paired room-clearing sectors first. A genuine narrow gallery or
 // corridor needs a depth-staggered stack, not four simultaneous lateral
 // positions in a room that's only ~60 units wide.
 const layouts=[
  {depths:[62,62,111,111],offsets:[22,15,30,8,37,0]},
  {depths:[52,88,124,160,198,236],offsets:[0,8,15,22,30]},
  {depths:[66,105,144,183,222,261],offsets:[0,10,18,25]}
 ];
 for(const layout of layouts){
  const slots:EntrySlot[]=[];
  for(let i=0;i<count;i++){
   const sign=i%2===0?-1:1;
   const depth=layout.depths[i]??layout.depths.at(-1)!+(i-layout.depths.length+1)*38;
   let chosen:Pt|null=null;
   for(const lateral of layout.offsets){
    for(const direction of [sign,-sign]){
     const p={x:center.x+inward.x*depth+tangent.x*lateral*direction,
      y:center.y+inward.y*depth+tangent.y*lateral*direction};
     if(!canStand(p)||slots.some(s=>dist(s.point,p)<23))continue;
     chosen=p;break;
    }
    if(chosen)break;
   }
   if(!chosen)break;
   // When geometry blocks the preferred flank, this slot can land on
   // the opposite side. The clearing sector MUST follow its real position,
   // not the requested alternating index (which would point across a
   // teammate and leave the occupied flank unwatched).
   const lateral=(chosen.x-center.x)*tangent.x+
     (chosen.y-center.y)*tangent.y;
   const assignedSign=Math.abs(lateral)>.01?Math.sign(lateral):sign;
   const look={x:chosen.x+inward.x*84+tangent.x*assignedSign*70,
    y:chosen.y+inward.y*84+tangent.y*assignedSign*70};
   slots.push({point:chosen,look,
    side:assignedSign<0?'left':'right',depth});
  }
  // A row of positions on a two-unit line is not a four-person entry.
  const laterals=slots.map(s=>(s.point.x-center.x)*tangent.x+
    (s.point.y-center.y)*tangent.y);
  const span=Math.max(...laterals)-Math.min(...laterals);
  if(slots.length===count&&(count<=2||span>=18))return slots;
 }
 // The fast greedy template handles ordinary rooms. For cramped
 // corner-fed entrances, it can choose a locally valid first slot that
 // prevents four valid positions, even though another assignment exists.
 // Use bounded backtracking only after ALL fast layouts fail. This happens
 // on explicit player authoring, never per simulation frame.
 const canStandCache=new Map<string,boolean>();
 const available=(p:Pt)=>{
  const key=p.x.toFixed(3)+':'+p.y.toFixed(3);
  let ok=canStandCache.get(key);
  if(ok===undefined){ok=canStand(p);canStandCache.set(key,ok);}
  return ok;
 };
 let examined=0;
 const BUDGET=360;
 for(const layout of layouts){
  const candidates:EntrySlot[][]=[];
  for(let i=0;i<count;i++){
   const intended=i%2===0?-1:1;
   const depth=layout.depths[i]??layout.depths.at(-1)!+
     (i-layout.depths.length+1)*38;
   const options:EntrySlot[]=[];
   for(const lateral of layout.offsets){
    for(const direction of [intended,-intended]){
     const p={x:center.x+inward.x*depth+tangent.x*lateral*direction,
      y:center.y+inward.y*depth+tangent.y*lateral*direction};
     if(options.some(option=>dist(option.point,p)<.01))continue;
     const lateralActual=(p.x-center.x)*tangent.x+
       (p.y-center.y)*tangent.y;
     const assignedSign=Math.abs(lateralActual)>.01?
       Math.sign(lateralActual):intended;
     options.push({point:p,
      look:{x:p.x+inward.x*84+tangent.x*assignedSign*70,
       y:p.y+inward.y*84+tangent.y*assignedSign*70},
      side:assignedSign<0?'left':'right',depth});
    }
   }
   candidates.push(options);
  }
  const chosen:EntrySlot[]=[];
  const visit=(index:number):boolean=>{
   if(index===count){
    if(count<=2)return true;
    const laterals=chosen.map(s=>(s.point.x-center.x)*tangent.x+
      (s.point.y-center.y)*tangent.y);
    return Math.max(...laterals)-Math.min(...laterals)>=18;
   }
   for(const slot of candidates[index]){
    if(++examined>BUDGET)return false;
    if(chosen.some(x=>dist(x.point,slot.point)<23)||
       !available(slot.point))continue;
    chosen.push(slot);
    if(visit(index+1))return true;
    chosen.pop();
   }
   return false;
  };
  if(visit(0))return chosen;
  if(examined>BUDGET)break;
 }
 return [];
}

/** Q5: practiced handle-side footwork BEFORE swinging a door into
 * the opener. Tiny finite choices, no route rewrite or collision bypass.
 * Only used when the actor's actual body is in the opening leaf's arc.
 */
import {doorCenter,OPERATOR_RADIUS,type Door,type Pt}
 from './breach-core.ts';
import {doorReachable,doorWouldStrikeActors} from './breach-door.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const MAX_HANDLE_STANCE_TRAVEL=58;
export function openerThreatensLeaf(door:Door,from:Pt):boolean{
 if(door.kind==='sliding'||door.kind==='shutter'||door.wedged||
    door.open||(door.openFraction??0)>.02)return false;
 return doorWouldStrikeActors({...door,openFraction:0},1.03,
   [from],OPERATOR_RADIUS+1);
}
export function selectOpeningStance(door:Door,from:Pt,
 canStep:(from:Pt,to:Pt)=>boolean,occupied:readonly Pt[]):Pt|null{
 if(!openerThreatensLeaf(door,from))return null;
 const center=doorCenter(door);
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy)||1;
 const t={x:dx/width,y:dy/width},n={x:-t.y,y:t.x};
 const side=Math.sign((from.x-center.x)*n.x+
  (from.y-center.y)*n.y)||1;
 const lateralBase=width/2+OPERATOR_RADIUS+5;
 const preferred=((from.x-center.x)*t.x+(from.y-center.y)*t.y)>=0?1:-1;
 let best:Pt|null=null,shortest=Infinity;
 // The two free jamb sides at three standard stand-offs. Never choose
 // a stance which needs crossing the closed leaf or another body.
 for(const lateral of [preferred,-preferred]){
  for(const offset of [0,6,12]){
   for(const depth of [22,29,36]){
    const pos={x:center.x+t.x*lateral*(lateralBase+offset)+n.x*side*depth,
     y:center.y+t.y*lateral*(lateralBase+offset)+n.y*side*depth};
    const travel=dist(from,pos);
    if(travel<2||travel>MAX_HANDLE_STANCE_TRAVEL||
       !doorReachable(pos,door)||
       doorWouldStrikeActors({...door,openFraction:0},1.03,
        [pos],OPERATOR_RADIUS+1)||
       occupied.some(p=>dist(p,pos)<OPERATOR_RADIUS*2+3)||
       !canStep(from,pos))continue;
    if(travel<shortest){best=pos;shortest=travel;}
   }
  }
 }
 return best;
}

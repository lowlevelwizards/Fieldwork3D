/** R1: deterministic physical escort behind the real operator path.
 * No wall/door bypass or instantaneous follower teleport is permitted. */
import type {Pt} from './breach-core.ts';
export type RescueEscort={p:Pt;following:string|null;trail?:Pt[]};
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(p:Pt):Pt=>({x:p.x,y:p.y});
export function advanceRescueEscort(state:RescueEscort,escort:Pt,dt:number,
 canStep:(from:Pt,to:Pt)=>boolean,speed=54):RescueEscort{
 if(!state.following||!Number.isFinite(dt)||dt<=0)return state;
 const trail=(state.trail??[state.p]).map(point);
 if(!trail.length)trail.push(point(state.p));
 const last=trail[trail.length-1],jump=dist(last,escort);
 // A teleport discontinuity or extreme separation breaks the escort.
 if(jump>35||dist(state.p,escort)>170||trail.length>240)
   return {...state,following:null,trail:[]};
 if(jump>=4.5)trail.push(point(escort));
 let p=point(state.p),remaining=Math.min(4,dt*speed);
 // Keep approximately one human body-length behind. All motion is swept.
 while(remaining>.001&&trail.length&&dist(p,escort)>18){
   const target=trail[0],gap=dist(p,target);
   if(gap<3){trail.shift();continue;}
   const move=Math.min(remaining,gap,dist(p,escort)-18);
   if(move<=.001)break;
   const to={x:p.x+(target.x-p.x)*move/gap,
     y:p.y+(target.y-p.y)*move/gap};
   if(!canStep(p,to))break;
   p=to;remaining-=move;
   if(move>=gap-.001)trail.shift();
 }
 return {...state,p,trail};
}

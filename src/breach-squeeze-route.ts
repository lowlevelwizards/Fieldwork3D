/** Normal routes win when available. Narrow fallback remains constrained
 * by the known map: never reveal hidden walls or furniture while planning. */
import {type Pt,route,passable,type Door,OPERATOR_RADIUS,
  pointToSegment,doorLeafSegment} from './breach-core.ts';
import {type IntelState,intelPassable,routeWithIntel} from './breach-intel.ts';
import {profileSamples,squeezeFacing,sweptProfileClear,SQUEEZE_RADIUS}
  from './breach-navigation.ts';
import {localDetour} from './breach-cooperation.ts';

const narrowPassable=(at:Pt,canStand:(p:Pt,r:number)=>boolean)=>
  canStand(at,SQUEEZE_RADIUS);
/** Preview a real, oriented continuous squeeze through a visible gap.
 * A shorter squeeze can beat a long normal detour; it isn't only a fallback
 * after every other path has failed. Still checks every torso sample.
 */
function directSqueeze(from:Pt,to:Pt,
  canStand:(p:Pt,r:number)=>boolean):boolean{
 const length=Math.hypot(to.x-from.x,to.y-from.y);
 if(length<20||length>310||!canStand(to,SQUEEZE_RADIUS))return false;
 const angle=squeezeFacing(Math.atan2(to.y-from.y,to.x-from.x));
 const steps=Math.max(1,Math.ceil(length/2.4));
 for(let i=0;i<=steps;i++){
   const t=i/steps,at={x:from.x+(to.x-from.x)*t,
     y:from.y+(to.y-from.y)*t};
   if(!profileSamples(at,angle,'squeeze').every(sample=>
     canStand(sample.position,sample.radius)))return false;
 }
 return true;
}
const courseLength=(from:Pt,points:readonly Pt[])=>{
 let length=0,prev=from;
 for(const p of points){length+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}
 return length;
};

/** Extra breathing room is a preference, NEVER extra collision clearance.
 * It keeps the operator off furniture edges, where the body may technically
 * fit but the shoulders and gun would scrape or short-stock. */
export const COMFORT_RADIUS=OPERATOR_RADIUS+5;
const routeSwept=(from:Pt,path:readonly Pt[],
 canTraverse:(a:Pt,b:Pt)=>boolean):boolean=>{
 let previous=from;
 for(const point of path){
   if(!canTraverse(previous,point))return false;
   previous=point;
 }
 return true;
};
/** No extra A* for a clear normal route. Only search a roomier lane when
 * the ordinary route brushes known geometry; reject gross detours. */
function preferRoomyPath(from:Pt,to:Pt,ordinary:Pt[],
 canStand:(p:Pt,r:number)=>boolean,
 canSweep:(a:Pt,b:Pt,r:number)=>boolean):Pt[]{
 const normal=smoothTraversalRoute(from,ordinary,
   (a,b)=>canSweep(a,b,OPERATOR_RADIUS));
 if(!canStand(from,COMFORT_RADIUS)||!canStand(to,COMFORT_RADIUS)||
    routeSwept(from,normal,(a,b)=>canSweep(a,b,COMFORT_RADIUS)))
   return normal;
 const roomy=route(from,to,p=>canStand(p,COMFORT_RADIUS));
 if(!roomy.length||courseLength(from,roomy)>
    courseLength(from,ordinary)*1.20+14)return normal;
 const smoothed=smoothTraversalRoute(from,roomy,
   (a,b)=>canSweep(a,b,COMFORT_RADIUS));
 return routeSwept(from,smoothed,
   (a,b)=>canSweep(a,b,COMFORT_RADIUS))?smoothed:normal;
}
/** Eliminate short grid zigzags only when the entire skipped body sweep
 * is lawful. Keep a tiny lookahead: this is motor smoothing, not a shortcut
 * through hidden geometry, a new authored waypoint, or a search expansion.
 */
export function smoothTraversalRoute(from:Pt,path:readonly Pt[],
 canTraverse:(a:Pt,b:Pt)=>boolean,maxSkip=4):Pt[]{
 if(path.length<2)return path.map(p=>({...p}));
 const result:Pt[]=[];
 let current=from;
 for(let i=0;i<path.length;){
  let chosen=i;
  for(let j=Math.min(path.length-1,i+Math.max(0,maxSkip));j>i;j--){
   if(canTraverse(current,path[j])){chosen=j;break;}
  }
  result.push({...path[chosen]});
  current=path[chosen];
  i=chosen+1;
 }
 return result;
}
/** The briefed path may use only its own known collision geometry. */
function intelSweep(from:Pt,to:Pt,
 canStand:(p:Pt,r:number)=>boolean,radius=OPERATOR_RADIUS){
 const length=Math.hypot(to.x-from.x,to.y-from.y);
 const steps=Math.max(1,Math.ceil(length/2.5));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(!canStand({x:from.x+(to.x-from.x)*t,
    y:from.y+(to.y-from.y)*t},radius))return false;
 }
 return true;
}

function narrowRoute(from:Pt,to:Pt,
  canStand:(p:Pt,r:number)=>boolean):Pt[]{
  if(!narrowPassable(to,canStand))return [];
  const course=route(from,to,p=>narrowPassable(p,canStand));
  let prior=from;
  for(const point of course){
    const direction=Math.atan2(point.y-prior.y,point.x-prior.x);
    const angle=squeezeFacing(direction);
    const length=Math.hypot(point.x-prior.x,point.y-prior.y);
    const samples=Math.max(1,Math.ceil(length/2.5));
    for(let step=1;step<=samples;step++){
      const t=step/samples;
      const at={x:prior.x+(point.x-prior.x)*t,
        y:prior.y+(point.y-prior.y)*t};
      if(!profileSamples(at,angle,'squeeze').every(sample=>
        canStand(sample.position,sample.radius)))return [];
    }
    prior=point;
  }
  return course;
}
export function routeWithSqueezeIntel(intel:IntelState,from:Pt,to:Pt):Pt[]{
 const canStand=(p:Pt,r:number)=>intelPassable(p,intel,r);
 const standard=routeWithIntel(intel,from,to);
 // A normal-body path always wins, even when the narrow shortcut is
 // shorter. Favor a few units of breathing room when it costs little.
 if(standard.length)return preferRoomyPath(from,to,standard,canStand,
   (a,b,r)=>intelSweep(a,b,canStand,r));
 // Only a genuinely inaccessible normal route may ask for narrow shoulders.
 return directSqueeze(from,to,canStand)?[{...to}]:
   narrowRoute(from,to,canStand);
}
/** Collision-truth replan after contact or a known obstruction.
 * Open door leaves use the same rule as the ordinary motor. */
const worldCanStand=(doors:Door[])=>(p:Pt,r:number)=>
  passable(p,r)&&!doors.some(d=>d.open&&(d.openFraction??0)>=.72&&
    pointToSegment(p,doorLeafSegment(d))<r+1);
/** For motor recovery: a true full-body detour, never a narrow fallback.
 * Its result is transient navigation, not an authored path change. */
export function routeWithNormalWorld(from:Pt,to:Pt,doors:Door[]):Pt[]{
 const canStand=worldCanStand(doors);
 if(!canStand(to,OPERATOR_RADIUS))return [];
 const physical=(a:Pt,b:Pt)=>sweptProfileClear(a,b,doors,0,'normal');
 const standard=route(from,to,p=>canStand(p,OPERATOR_RADIUS));
 if(standard.length&&routeSwept(from,standard,physical))
   return preferRoomyPath(from,to,standard,canStand,
     (a,b,r)=>intelSweep(a,b,canStand,r)&&physical(a,b));
 // An 8-unit grid may legally visit each cell but cut a solid corner
 // between cells. Do not mistake that coarse-grid miss for a genuinely
 // narrow corridor: first try a padded route, then one safe lateral step.
 const padded=route(from,to,p=>canStand(p,COMFORT_RADIUS));
 if(padded.length&&routeSwept(from,padded,physical))
   return smoothTraversalRoute(from,padded,physical);
 // At a furniture corner a diagonal micro-step may be unsafe even when
 // coarse 4-unit collision samples pass. Favor a short SIDE step before
 // moving ahead: it lets the full shoulders clear the prop without an
 // artificial short-stock / squeeze transition. Fine sweep only the small
 // number of local proposals, not the whole A* grid each tick.
 const fineSweep=(a:Pt,b:Pt)=>{
   if(!physical(a,b))return false;
   const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/1.25));
   for(let i=1;i<=steps;i++){
     const t=i/steps;
     if(!canStand({x:a.x+(b.x-a.x)*t,
       y:a.y+(b.y-a.y)*t},OPERATOR_RADIUS))return false;
   }
   return true;
 };
 const travel=Math.atan2(to.y-from.y,to.x-from.x);
 const side={x:-Math.sin(travel),y:Math.cos(travel)};
 for(const offset of [8,12,18,26]){
   for(const sign of [1,-1]){
     const lateral={x:from.x+side.x*offset*sign,
       y:from.y+side.y*offset*sign};
     if(canStand(lateral,OPERATOR_RADIUS)&&
        fineSweep(from,lateral)&&fineSweep(lateral,to))
       return [lateral,{...to}];
   }
 }
 const relief=localDetour(from,to,doors,[]);
 if(!relief||!fineSweep(from,relief))return [];
 if(fineSweep(relief,to))return [relief,{...to}];
 const tail=route(relief,to,p=>canStand(p,OPERATOR_RADIUS));
 if(!tail.length||!routeSwept(relief,tail,fineSweep))return [];
 return [relief,...smoothTraversalRoute(relief,tail,physical)];
}
/** At a grazing prop edge, the coarse A* start cell can be blocked even
 * though the actor itself has a perfectly legal full-size sidestep. Search a
 * few short, swept local escapes before authorizing a squeeze. Each recovery
 * then rejoins a real normal-body route; no waypoint/goal is modified.
 * Bounded to avoid route-search spikes in genuine narrow corridors. */
export function recoverNormalLane(from:Pt,to:Pt,doors:Door[]):Pt[]{
 const direct=routeWithNormalWorld(from,to,doors);
 if(direct.length)return direct;
 const dist=Math.hypot(to.x-from.x,to.y-from.y);
 if(dist<12)return [];
 const fx=(to.x-from.x)/dist,fy=(to.y-from.y)/dist;
 const sx=-fy,sy=fx;
 // Sideways first, then a modest retreat if the shoulder is at a corner.
 // Maximum twelve route probes; direct sweep gates reject most immediately.
 for(const lateral of [16,28,40]){
   for(const back of [0,12]){
     for(const sign of [1,-1]){
       const escape={x:from.x+sx*lateral*sign-fx*back,
         y:from.y+sy*lateral*sign-fy*back};
       if(!sweptProfileClear(from,escape,doors,0,'normal'))continue;
       const onward=routeWithNormalWorld(escape,to,doors);
       if(!onward.length)continue;
       if(Math.hypot(escape.x-from.x,escape.y-from.y)+
          courseLength(escape,onward)>dist*1.75+40)continue;
       return [escape,...onward];
     }
   }
 }
 return [];
}
export function routeWithSqueezeWorld(from:Pt,to:Pt,doors:Door[]):Pt[]{
 // Open hinged leaves are pushable; ordinary motion must remain eligible.
 const normal=routeWithNormalWorld(from,to,doors);
 if(normal.length)return normal;
 const canStand=worldCanStand(doors);
 const narrow=narrowRoute(from,to,canStand);
 let previous=from;
 for(const point of narrow){
   const heading=squeezeFacing(Math.atan2(
     point.y-previous.y,point.x-previous.x));
   if(!sweptProfileClear(previous,point,doors,heading,'squeeze'))
     return [];
   previous=point;
 }
 return narrow;
}

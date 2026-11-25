/** V20 deterministic visual flight. Every path is resolved once at emission;
 * replay samples immutable segments, never current doors/cover or gameplay RNG. */
export type CasingPoint=Readonly<{x:number;y:number;z:number}>;
export type CasingLeg=Readonly<{from:CasingPoint;to:CasingPoint;duration:number;rise:number}>;
export type CasingFlight=Readonly<{legs:readonly CasingLeg[];yaw:number;spin:number;roll:number;restYaw:number}>;
export type CasingTrace=(from:CasingPoint,to:CasingPoint)=>number;
export type CasingSample={x:number;y:number;z:number;settled:boolean;rotation:number;tiltX?:number;tiltZ?:number};
export const casingSeed=(id:number,channel:number)=>{
 let x=(id^Math.imul(channel+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
};
const point=(x:number,y:number,z:number):CasingPoint=>Object.freeze({x,y,z});
const mix=(a:CasingPoint,b:CasingPoint,u:number,rise=0)=>
 point(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u+4*rise*u*(1-u),a.z+(b.z-a.z)*u);
const clearTrace:CasingTrace=()=>1;
export function casingLanding(f:CasingFlight):CasingPoint{
 return f.legs[f.legs.length-1].to;
}
export function planCasingFlight(id:number,origin:CasingPoint,heading:number,
 trace:CasingTrace=clearTrace,occupied:readonly CasingPoint[]=[],floor=.56,
 friction=.65):CasingFlight{
 const random=(channel:number)=>casingSeed(id,channel);
 const legs:CasingLeg[]=[];
 let at=point(origin.x,Math.max(floor,origin.y),origin.z);
 const add=(to:CasingPoint,duration:number,rise:number)=>{
  legs.push(Object.freeze({from:at,to,duration:Math.max(.015,duration),rise}));
  at=to;
 };
 let angle=heading+Math.PI/2+(random(0)-.5)*1.45;
 let vx=Math.cos(angle)*(16+random(1)*28),vz=Math.sin(angle)*(16+random(1)*28);
 const gravity=108,up=8+random(2)*20;
 const duration=(up+Math.sqrt(up*up+2*gravity*Math.max(0,at.y-floor)))/gravity;
 const end=point(at.x+vx*duration,floor,at.z+vz*duration);
 const rise=gravity*duration*duration/8;
 // Sweep two chord halves of the parabola, avoiding low-cover false hits.
 const midpoint=mix(at,end,.5,rise);
 const first=Math.max(0,Math.min(1,trace(at,midpoint)));
 const second=first<1?0:Math.max(0,Math.min(1,trace(midpoint,end)));
 const hit=first<1?first*.5:second<1?.5+second*.5:1;
 if(hit<1){
  const u=Math.max(.001,hit-.018);
  const impact=mix(at,end,u,rise);
  add(impact,duration*u,rise*u*u);
  // A cheap, damped reverse deflection stays on the near side of the
  // barrier. No second collision engine or material damage.
  vx*=-.28;vz*=-.28;
  const fall=Math.sqrt(2*Math.max(0,at.y-floor)/gravity);
  const target=point(at.x+vx*fall,floor,at.z+vz*fall);
  const fraction=Math.max(0,Math.min(1,trace(at,target)));
  const safe=Math.max(0,fraction<1?fraction-.025:1);
  add(point(at.x+(target.x-at.x)*safe,floor,at.z+(target.z-at.z)*safe),fall,gravity*fall*fall/8);
 }else add(end,duration,rise);
 // One visible, ballistic bounce, then a bounded friction slide.
 const bounce=.12+random(3)*.13;
 const advance=(dx:number,dz:number,duration:number,rise:number)=>{
  const to=point(at.x+dx,floor,at.z+dz);
  const f=Math.max(0,Math.min(1,trace(at,to)));
  const safe=f<1?Math.max(0,f-.035):1;
  add(point(at.x+dx*safe,floor,at.z+dz*safe),duration,rise);
 };
 advance(vx*bounce*.32,vz*bounce*.32,bounce,gravity*bounce*bounce/8);
 const cell=2.2,grid=new Map<string,CasingPoint[]>();
 const key=(x:number,z:number)=>Math.floor(x/cell)+','+Math.floor(z/cell);
 for(const p of occupied){const k=key(p.x,p.z);const bucket=grid.get(k);if(bucket)bucket.push(p);else grid.set(k,[p]);}
 const clearance=(p:CasingPoint)=>{
  let min=Infinity;
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)
   for(const other of grid.get(key(p.x+x*cell,p.z+z*cell))??[])
    min=Math.min(min,Math.hypot(other.x-p.x,other.z-p.z));
  return min;
 };
 const slide=(3+random(4)*5)*Math.max(.2,Math.min(1,friction));
 let best=point(at.x,floor,at.z),bestClear=clearance(best);
 // First candidate follows momentum; bounded alternatives scatter only
 // when a nearby retained casing would otherwise occupy the same spot.
 angle=Math.atan2(vz,vx);
 for(let i=0;i<9;i++){
  const a=angle+(i===0?0:(i%2?1:-1)*Math.ceil(i/2)*.57);
  const len=slide*(i===0?1:1+Math.floor(i/3)*.23);
  const target=point(at.x+Math.cos(a)*len,floor,at.z+Math.sin(a)*len);
  const f=Math.max(0,Math.min(1,trace(at,target)));
  const candidate=mix(at,target,f<1?Math.max(0,f-.04):1);
  const score=clearance(candidate);
  if(i===0||score>bestClear){best=candidate;bestClear=score;}
  if(score>=cell)break;
 }
 add(best,.20+random(5)*.19,0);
 return Object.freeze({legs:Object.freeze(legs),yaw:random(6)*Math.PI*2,
  spin:(random(7)<.5?-1:1)*(7+random(8)*13),roll:random(9)*Math.PI*2,
  restYaw:random(10)*Math.PI*2});
}
export function sampleCasingFlight(f:CasingFlight,t:number):CasingSample{
 let time=Math.max(0,t),elapsed=0;
 for(let i=0;i<f.legs.length;i++){
  const l=f.legs[i];
  if(time<l.duration){
   const u=time/l.duration;
   const last=i===f.legs.length-1;
   // Exponent-free ease out during the final friction slide.
   const travel=last?1-(1-u)*(1-u):u;
   const x=l.from.x+(l.to.x-l.from.x)*travel;
   const y=l.from.y+(l.to.y-l.from.y)*travel+4*l.rise*u*(1-u);
   const z=l.from.z+(l.to.z-l.from.z)*travel;
   const spin=f.yaw+(elapsed+time)*f.spin;
   const roll=f.roll+(elapsed+time)*f.spin*.71;
   const angleDelta=Math.atan2(Math.sin(f.restYaw-spin),Math.cos(f.restYaw-spin));
   return {x,y,z,settled:false,rotation:last?spin+angleDelta*u:spin,
    tiltX:last?Math.sin(roll)*(1-u):Math.sin(roll),
    tiltZ:last?roll+(Math.PI/2-roll)*u:roll};
  }
  time-=l.duration;elapsed+=l.duration;
 }
 const p=casingLanding(f);
 return {...p,settled:true,rotation:f.restYaw,tiltX:0,tiltZ:Math.PI/2};
}

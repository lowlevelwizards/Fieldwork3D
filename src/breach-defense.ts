/** Build 098: room defense positions, spacing and threat-oriented watches. */
import {COVER,WALLS,activeSite,passable,route,doorCenter,type Door,type Pt} from './breach-core.ts';
import {assessFireLane} from './breach-fire-safety.ts';
import {nearCover} from './breach-combat.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type Defender={id:string;p:Pt;health:number;defense:Pt|null};
export function defenseCandidates(origin:Pt,threat:Pt,doors:Door[]):Pt[]{
  void threat;
  const options:Pt[]=[];
  const candidates=new Set<string>();
  const consider=(p:Pt,max=220)=>{
    const key=Math.round(p.x)+','+Math.round(p.y);
    if(candidates.has(key)||dist(origin,p)>max||!passable(p))return;
    if(!route(origin,p).length)return;
    candidates.add(key);options.push(p);
  };
  for(const c of COVER){
    for(const q of [{x:c.x-c.w/2-19,y:c.y},{x:c.x+c.w/2+19,y:c.y},
      {x:c.x,y:c.y-c.h/2-19},{x:c.x,y:c.y+c.h/2+19}]){
      consider(q);
    }
  }
  // Derive actual room corners rather than assuming a fixed 640x740
  // floor-plan. This also works with corridor and archetype sites.
  const site=activeSite();
  const rooms=site?.rooms??[{x:112,y:100,w:478,h:432}];
  for(const room of rooms){
    const margin=29;
    for(const x of [room.x+margin,room.x+room.w-margin])
      for(const y of [room.y+margin,room.y+room.h-margin])
        consider({x,y},240);
    // Slightly offset wall overlooks create alternative watched approaches.
    for(const x of [room.x+margin,room.x+room.w-margin])
      consider({x,y:room.y+room.h/2},215);
    for(const y of [room.y+margin,room.y+room.h-margin])
      consider({x:room.x+room.w/2,y},215);
  }
  for(const door of doors){
    const p=doorCenter(door);
    for(const x of [-38,38])for(const y of [-38,38]){
      const q={x:p.x+x,y:p.y+y};
      consider(q,195);
    }
  }
  if(passable(origin))consider(origin);
  return options;
}
export function chooseDefense(origin:Pt,threat:Pt,doors:Door[],
  others:Defender[],selfId:string):Pt|null{
  const options=defenseCandidates(origin,threat,doors);
  let best:Pt|null=null,score=-Infinity;
  for(const p of options){
    const occupancy=others.filter(a=>a.id!==selfId&&a.health>0)
      .reduce((n,a)=>n+(dist(p,a.defense??a.p)<35?190:0),0);
    const protectedSpot=nearCover(p,threat)?125:0;
    // Cover is only useful if the defender can still bring the muzzle
    // above or around it. Eye-level sight does not guarantee a firing lane.
    const lane=assessFireLane(p,26,threat,32,COVER,WALLS,doors,
      others.filter(o=>o.id!==selfId&&o.health>0).map(o=>o.p));
    const firingValue=lane.blocker==='clear'?70:-175;
    const span=others.filter(a=>a.id!==selfId&&a.health>0)
      .reduce((n,a)=>n+(dist(p,a.p)>55&&dist(p,a.p)<160?15:0),0);
    const doorHazard=doors.reduce((penalty,door)=>{
      const distance=dist(p,doorCenter(door));
      return penalty+(distance<24?45:distance<45?10:0);
    },0);
    // Choose watchable positions while favoring actual directional cover.
    const facing=dist(p,threat)>15?8:0;
    const value=protectedSpot+firingValue+span+facing-dist(origin,p)*.30-
      dist(p,threat)*.035-occupancy-doorHazard;
    if(value>score){score=value;best=p;}
  }
  return best;
}
export function watchPoint(p:Pt,doors:Door[]):Pt|null{
  const room=activeSite()?.rooms.find(r=>
    p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
  const adjacent=room?doors.filter(door=>{
    const center=doorCenter(door);
    return center.x>=room.x-3&&center.x<=room.x+room.w+3&&
      center.y>=room.y-3&&center.y<=room.y+room.h+3;
  }):[];
  const choices=adjacent.length?adjacent:doors;
  const best=choices.slice().sort((a,b)=>
    dist(p,doorCenter(a))-dist(p,doorCenter(b)))[0];
  return best?doorCenter(best):null;
}
/** Search a few legal points around a noisy estimate, never omniscient
 * access to the hidden source. Avoid pursuing a location inside cover. */
export function reachableInvestigation(origin:Pt,target:Pt):Pt|null{
  const options=[target];
  for(const distance of [17,35,55])
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      options.push({x:target.x+Math.cos(angle)*distance,
        y:target.y+Math.sin(angle)*distance});
    }
  for(const point of options){
    if(!passable(point))continue;
    if(route(origin,point).length)return point;
  }
  return null;
}

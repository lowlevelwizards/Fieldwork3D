/** Build 098: room defense positions, spacing and threat-oriented watches. */
import {COVER,WALLS,passable,route,doorCenter,type Door,type Pt} from './breach-core.ts';
import {nearCover} from './breach-combat.ts';
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export type Defender={id:string;p:Pt;health:number;defense:Pt|null};
export function defenseCandidates(origin:Pt,threat:Pt,doors:Door[]):Pt[]{
  const options:Pt[]=[];
  for(const c of COVER){
    for(const q of [{x:c.x-c.w/2-19,y:c.y},{x:c.x+c.w/2+19,y:c.y},
      {x:c.x,y:c.y-c.h/2-19},{x:c.x,y:c.y+c.h/2+19}]){
      if(dist(origin,q)<220&&passable(q)&&route(origin,q).length)
        options.push(q);
    }
  }
  // Deep room corners, with a safe distance from geometric wall segments.
  for(const corner of [{x:146,y:144},{x:550,y:144},{x:146,y:487},{x:550,y:487}]){
    if(dist(origin,corner)<200&&passable(corner)&&route(origin,corner).length)
      options.push(corner);
  }
  for(const door of doors){
    const p=doorCenter(door);
    for(const x of [-38,38])for(const y of [-38,38]){
      const q={x:p.x+x,y:p.y+y};
      if(dist(origin,q)<195&&passable(q)&&route(origin,q).length)
        options.push(q);
    }
  }
  if(passable(origin))options.push(origin);
  void WALLS;
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
    const span=others.filter(a=>a.id!==selfId&&a.health>0)
      .reduce((n,a)=>n+(dist(p,a.p)>55&&dist(p,a.p)<160?15:0),0);
    const value=protectedSpot+span-dist(origin,p)*.30-
      dist(p,threat)*.035-occupancy;
    if(value>score){score=value;best=p;}
  }
  return best;
}
export function watchPoint(p:Pt,doors:Door[]):Pt|null{
  return doors.slice().sort((a,b)=>
    dist(p,doorCenter(a))-dist(p,doorCenter(b)))[0]?
    doorCenter(doors.slice().sort((a,b)=>
      dist(p,doorCenter(a))-dist(p,doorCenter(b)))[0]):null;
}

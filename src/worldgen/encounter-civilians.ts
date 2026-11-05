/** E5-B2: spatially credible civilian population, never an armed actor.
 * No fallbacks that force someone into an unsafe room or door opening.
 * Uses a distinct RNG lane so adding civilians does not re-roll hostiles. */
import type {Site,Room} from '../breach-site.ts';
import {activeSite,activateSite,passable,pointToSegment,route,type Pt}
 from '../breach-core.ts';
import type {OperationKind} from '../breach-operations.ts';
import type {CivilianSpec,EncounterActorSpec,EncounterPremise}
 from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
import {clearOfInsertion,roomOccupancyCapacity}
 from './encounter-spawn-safety.ts';

const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const fixtureRoles=new Set(['desk','reception-desk','transaction-counter',
  'checkout','workbench','prep-table','counter','tool-chest',
  'shelf','rack','storage-shelf','bookcase','display-rack',
  'dining-table','table','seat','chair','sofa']);
const workerRoles=new Set(['desk','reception-desk','checkout',
  'workbench','prep-table','counter','tool-chest']);
const seatingRoles=new Set(['chair','seat','sofa','dining-table','table']);
/** One fixture determines both persona role and believable resting state. */
export function civilianStation(
 archetype:Site['archetype'],fixture:string|undefined,
 fallback:CivilianSpec['role']
):{role:CivilianSpec['role'];activity:CivilianSpec['activity']}{
 const working=workerRoles.has(fixture??'');
 const seated=seatingRoles.has(fixture??'');
 const service=['retail','restaurant','garage','clinic'].includes(archetype??'');
 const role:CivilianSpec['role']=service?
  working?'employee':archetype==='clinic'?'patient':'customer':fallback;
 const activity:CivilianSpec['activity']=working?'working':
  seated?'seated':fixture?'inspecting':
  role==='patient'||role==='customer'?'waiting':'idle';
 return {role,activity};
}
const visitRole=(site:Site):CivilianSpec['role']=>{
  const type=site.archetype??'house';
  if(['house','townhouse','apartment'].includes(type))return 'resident';
  if(type==='motel')return 'guest';
  if(type==='clinic')return 'patient';
  if(['retail','restaurant'].includes(type))return 'customer';
  return 'employee';
};
const maxScale=(scale:Site['scale'])=>
  scale==='small'?2:scale==='expanded'||scale==='large'?6:4;
export function civilianBudget(site:Site,seed:number,
  premise:EncounterPremise,mission:OperationKind):number{
  // Real rescue targets will be migrated from their legacy marker in B7.
  // Do not create a duplicate objective person in this early batch.
  if(site.training||mission==='rescue'||
    premise==='vacant'||premise==='defensive'||premise==='after-hours')
    return 0;
  const rng=encounterRng(seed,34),cap=maxScale(site.scale);
  const occupancy=site.identity?.activity==='busy'?3:
    site.identity?.activity==='quiet'?1:2;
  // Zero is a normal seeded outcome; even a busy site has a strict cap.
  return Math.min(cap,Math.floor(rng()*(occupancy+1))+
    (site.identity?.activity==='busy'&&rng()>.76?1:0));
}
function within(p:Pt,r:Room):boolean{
  return p.x>=r.x+22&&p.x<=r.x+r.w-22&&
    p.y>=r.y+22&&p.y<=r.y+r.h-22;
}
function localLegClear(from:Pt,to:Pt,
  legal:(p:Pt)=>boolean):boolean{
  const length=dist(from,to),steps=Math.max(1,Math.ceil(length/6));
  for(let i=1;i<=steps;i++){
    const t=i/steps;
    if(!legal({x:from.x+(to.x-from.x)*t,
      y:from.y+(to.y-from.y)*t}))return false;
  }
  return true;
}
export function planCivilians(site:Site,
  hostiles:readonly EncounterActorSpec[],seed:number,
  premise:EncounterPremise,mission:OperationKind):CivilianSpec[]{
  const desired=civilianBudget(site,seed,premise,mission);
  if(desired<=0)return [];
  const rng=encounterRng(seed,35);
  const occupied=hostiles.map(a=>a.position);
  const usedRoom=new Map<string,number>();
  const neutrals:CivilianSpec[]=[];
  const rooms=site.rooms.filter(r=>r.kind==='room')
    .map(r=>({
      room:r,order:rng()*3+
        Math.min(3,site.cover.filter(c=>fixtureRoles.has(c.fixture??'')&&
          c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h).length)
    }))
    .sort((a,b)=>b.order-a.order||a.room.id.localeCompare(b.room.id))
    .map(x=>x.room);
  const prior=activeSite();
  activateSite(site);
  try{
    let checkedRoutes=0;
    for(const room of rooms){
      if(neutrals.length>=desired||checkedRoutes>=Math.max(8,desired*4))break;
      const inRoom=hostiles.filter(a=>within(a.position,room)).length;
      const capacity=roomOccupancyCapacity(room,site.cover);
      if(inRoom+(usedRoom.get(room.id)??0)>=capacity)continue;
      const fixtures=site.cover.filter(c=>fixtureRoles.has(c.fixture??'')&&
        c.x>=room.x&&c.x<=room.x+room.w&&
        c.y>=room.y&&c.y<=room.y+room.h)
        .map(c=>({c,order:rng()})).sort((a,b)=>a.order-b.order);
      // Workplace seating/service areas may hold two people; cramped
      // domestic rooms generally hold one. Every additional occupant
      // still passes identical wall, route, door and spacing gates.
      const sharedRoom=site.archetype==='restaurant'||
        site.archetype==='retail'||site.archetype==='office'||
        site.archetype==='clinic';
      const roomQuota=Math.min(capacity-inRoom,sharedRoom&&
        fixtures.length>1?2:1);
      const candidates:Pt[]=[];
      for(const {c} of fixtures.slice(0,6)){
        candidates.push({x:c.x-c.w/2-24,y:c.y},
          {x:c.x+c.w/2+24,y:c.y},
          {x:c.x,y:c.y-c.h/2-24},
          {x:c.x,y:c.y+c.h/2+24});
      }
      for(const [u,v] of [[.5,.5],[.34,.50],[.66,.5],[.5,.34],[.5,.66]]){
        candidates.push({x:room.x+room.w*u,y:room.y+room.h*v});
      }
      const legal=(p:Pt)=>
        within(p,room)&&clearOfInsertion(site,p)&&passable(p)&&
        dist(p,site.objective)>=32&&
        site.walls.every(w=>pointToSegment(p,w)>=16)&&
        site.doors.every(door=>dist(p,{x:(door.a.x+door.b.x)/2,
          y:(door.a.y+door.b.y)/2})>=38)&&
        site.cover.every(c=>
          Math.abs(p.x-c.x)>=c.w/2+15||
          Math.abs(p.y-c.y)>=c.h/2+15)&&
        occupied.every(other=>dist(p,other)>=43);
      for(let occupant=0;occupant<roomQuota&&
          neutrals.length<desired;occupant++){
       let placed=false;
       for(const p of candidates){
        if(checkedRoutes>=Math.max(8,desired*4))break;
        if(!legal(p))continue;
        checkedRoutes++;
        if(site.spawn[0]&&!route(site.spawn[0],p).length)continue;
        const adjacent=candidates.filter(q=>dist(p,q)>=35&&
          dist(p,q)<=135&&legal(q)&&localLegClear(p,q,legal))
          .slice(0,2);
        const fixture=fixtures.find(x=>dist(p,{x:x.c.x,y:x.c.y})<85);
        const station=civilianStation(site.archetype,
          fixture?.c.fixture,visitRole(site));
        const {role,activity}=station;
        const index=neutrals.length;
        const persona:CivilianSpec['persona']=
          (['cautious','steady','startled'] as const)[
            Math.floor(rng()*3)];
        // Spend the same RNG sample whether or not a fixture exists.
        const randomHeading=rng()*Math.PI*2;
        const heading=fixture?
          Math.atan2(fixture.c.y-p.y,fixture.c.x-p.x):randomHeading;
        neutrals.push({id:'civ:'+seed+':'+index,role,persona,
          activity,position:{...p},heading,
          roomId:room.id,zoneId:room.zoneId??room.id,
          // Workstations need planted bodies; only browsing residents
          // walk a locally verified short routine.
          routine:activity==='seated'||activity==='working'?undefined:
            adjacent.length?[{...p},...adjacent]:undefined,
          appearanceSeed:Math.floor(rng()*0x7fffffff)});
        occupied.push(p);
        usedRoom.set(room.id,(usedRoom.get(room.id)??0)+1);
        placed=true;
        break;
       }
       if(!placed)break;
      }
    }
  }finally{activateSite(prior);}
  return neutrals;
}

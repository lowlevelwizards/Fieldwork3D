/** Optional physically valid exterior occupancy: no free teleport, no
 * automatic front-door ambush, and no off-map spawn. */
import type {Site,ExteriorZone} from '../breach-site.ts';
import {activateSite,activeSite,passable,route,type Pt} from '../breach-core.ts';
import type {EncounterActorSpec,EncounterPremise} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function assignExteriorOccupants(site:Site,actors:EncounterActorSpec[],
 premise:EncounterPremise,seed:number):EncounterActorSpec[]{
 const zones=site.exteriorZones??[];
 if(!zones.length||actors.length<3||premise==='vacant')return actors;
 const rng=encounterRng(seed,9);
 const industrial=['garage','warehouse','utility'].includes(site.archetype??'house');
 const chance=premise==='guarded'||premise==='defensive'? .66 :
   industrial? .38 :premise==='after-hours'? .27 : .15;
 if(rng()>chance)return actors;
 const exterior:EncounterActorSpec[]=actors.map(a=>({...a}));
 const preferred=zones.filter(z=>['service','yard','patio','parking','driveway'].includes(z.kind))
  .map(z=>({z,k:rng()+((industrial&&z.kind==='service')? .4 : 0)}))
  .sort((a,b)=>b.k-a.k).slice(0,3);
 const maxExterior=Math.min(2,Math.max(1,Math.floor(actors.length/4)));
 const candidates=(z:ExteriorZone):Pt[]=>[
  {x:z.x,y:z.y},{x:z.x+z.w*.22,y:z.y},
  {x:z.x-z.w*.22,y:z.y},{x:z.x,y:z.y+z.h*.22},
  {x:z.x,y:z.y-z.h*.22}
 ];
 const previous=activeSite();
 activateSite(site);
 try{
  let count=0,attempts=0;
  for(const {z} of preferred){
   if(count>=maxExterior||attempts>=7)break;
   for(const p of candidates(z)){
    if(++attempts>7)break;
    if(!passable(p)||distance(p,site.spawn[0])<85||
       distance(p,site.extract)<52||
       site.rooms.some(r=>p.x>=r.x&&p.x<=r.x+r.w&&
        p.y>=r.y&&p.y<=r.y+r.h)||
       exterior.some(a=>distance(a.position,p)<32))continue;
    if(!route(site.spawn[0],p).length)continue;
    const index=exterior.findIndex(a=>a.role!=='target'&&a.roomId&&
      a.role!=='leader'&&a.role!=='reserve');
    if(index<0)break;
    exterior[index]={...exterior[index],position:p,roomId:undefined,
      zoneId:'exterior:'+z.id,role:'lookout',activity:'watching',
      readiness:premise==='guarded'||premise==='defensive'?'prepared':'attentive'};
    count++;break;
   }
  }
 }finally{activateSite(previous);}
 return exterior;
}

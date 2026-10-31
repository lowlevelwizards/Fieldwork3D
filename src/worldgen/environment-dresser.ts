/** Deterministic decorative dressing. Only authored physical props block play. */
import {type Site,seeded} from '../breach-site.ts';
import {propDefinition} from './asset-catalog.ts';
export type SiteCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type DecorativeDetail={
  id:string;roomId:string;kind:'mug'|'books'|'papers'|'tools'|'plant'|'lamp'|'packages';
  x:number;y:number;elevation:number;angle:number;
};
const styles:readonly SiteCondition[]=['occupied','busy','neglected','vacant','renovation','disturbed'];
const choices:Record<string,readonly DecorativeDetail['kind'][]>={
 living:['books','mug','plant','lamp'],bedroom:['books','lamp','plant'],
 kitchen:['mug','papers'],dining:['mug','plant'],studio:['books','mug'],
 office:['papers','mug','lamp'],reception:['papers','plant'],cubicles:['papers','mug'],
 meeting:['papers','mug'],sales:['packages','papers'],checkout:['papers','mug'],
 storage:['packages','papers'],stockroom:['packages','tools'],
 bay:['tools','papers'],workshop:['tools','mug'],loading:['packages','tools'],
 packing:['packages','papers'],equipment:['tools','papers'],control:['papers','mug'],
 guest:['books','lamp'],waiting:['papers','plant'],
};
export function dressSite(site:Site,seed:number):Site{
 const random=seeded(seed^0x1d7e5a5a);
 const condition=styles[(seed>>>0)%styles.length];
 const density:Record<SiteCondition,number>={
  occupied:.64,busy:.89,neglected:.42,vacant:.15,renovation:.49,disturbed:.70
 };
 const dressing:DecorativeDetail[]=[];
 for(const room of site.rooms){
  if(room.kind==='hall')continue;
  const vocab=choices[room.purpose??'']??['papers'];
  const supports=site.cover.filter(c=>c.fixture&&
   c.x>=room.x&&c.x<=room.x+room.w&&c.y>=room.y&&c.y<=room.y+room.h&&
   (propDefinition(c.fixture)?.solid??false)&&c.w>=18&&c.h>=16);
  for(const [i,item] of supports.entries()){
   if(random()>density[condition])continue;
   const kind=vocab[Math.floor(random()*vocab.length)];
   const h=propDefinition(item.fixture??'')?.height??(item.low?12:27);
   dressing.push({
    id:room.id+':detail:'+i,roomId:room.id,kind,
    x:item.x+(random()-.5)*Math.min(item.w*.40,15),
    y:item.y+(random()-.5)*Math.min(item.h*.40,12),
    elevation:h+.5,angle:random()*Math.PI*2
   });
  }
 }
 return {...site,condition,dressing};
}

/** Data-driven operational and privacy relationships for physical room connections.
 * The architectural compiler uses these preferences BEFORE doors are cut;
 * diagnostic output remains independent of the solver.
 */
import type {BuildingArchetype,Room,Site} from '../breach-site.ts';

const pair=(a:string,b:string)=>[a,b].sort().join('|');
type Rules={preferred:readonly string[];discouraged:readonly string[]};
const relationships:Record<BuildingArchetype,Rules>={
 house:{preferred:['foyer|living','dining|kitchen','hallway|bedroom','hallway|bathroom','kitchen|living','dining|living'],
  discouraged:['bathroom|kitchen','bedroom|kitchen','bathroom|dining']},
 townhouse:{preferred:['foyer|living','dining|kitchen','hallway|bedroom','hallway|bathroom','hallway|living'],
  discouraged:['bathroom|kitchen','bedroom|kitchen']},
 apartment:{preferred:['hallway|lobby','hallway|living','bedroom|living','kitchen|living'],
  discouraged:['bathroom|lobby','bedroom|lobby','bedroom|hallway']},
 retail:{preferred:['sales|vestibule','checkout|sales','sales|stockroom','service|stockroom','office|service'],
  discouraged:['sales|storage','office|sales','checkout|stockroom']},
 office:{preferred:['reception|vestibule','hallway|office','hallway|meeting','lobby|reception','cubicles|hallway','meeting|reception'],
  discouraged:['break|reception','lobby|storage']},
 garage:{preferred:['bay|workshop','parts|workshop','bay|aisle','office|reception','reception|waiting'],
  discouraged:['bay|waiting','parts|waiting','bay|office']},
 warehouse:{preferred:['aisle|storage','loading|storage','loading|packing','office|service'],
  discouraged:['office|loading','packing|office']},
 restaurant:{preferred:['dining|vestibule','dining|reception','kitchen|pantry','kitchen|service','dining|service','restroom|dining'],
  discouraged:['dining|kitchen','kitchen|restroom','pantry|restroom']},
 motel:{preferred:['guest|hallway','laundry|maintenance','lobby|reception','hallway|reception'],
  discouraged:['guest|guest','guest|laundry','guest|maintenance','guest|reception']},
 utility:{preferred:['equipment|service','control|equipment','maintenance|service','hallway|control'],
  discouraged:['equipment|storage']},
 clinic:{preferred:['vestibule|waiting','waiting|reception','hallway|exam','hallway|treatment','hallway|staff','hallway|supply','reception|hallway'],
  discouraged:['exam|waiting','treatment|waiting','exam|reception','supply|waiting','treatment|reception']}
};
const publicRoles=new Set(['waiting','sales','checkout','reception','lobby','dining']);
const sensitiveRoles=new Set(['exam','treatment','bedroom','bathroom','restroom','guest']);
/** Negative is desirable; positive is undesirable. */
export function relationshipScore(kind:BuildingArchetype,a:string,b:string):number{
 const rules=relationships[kind],p=pair(a,b);
 if(rules.preferred.some(v=>pair(...(v.split('|') as [string,string]))===p))return -34;
 if(rules.discouraged.some(v=>pair(...(v.split('|') as [string,string]))===p))return 75;
 if(a==='hallway'||b==='hallway')return -12;
 if(publicRoles.has(a)&&sensitiveRoles.has(b)||
    publicRoles.has(b)&&sensitiveRoles.has(a))return 38;
 return 0;
}
/** Never create a decorative optional shortcut through a sensitive room. */
export function allowSecondaryConnection(kind:BuildingArchetype,a:string,b:string):boolean{
 return relationshipScore(kind,a,b)<=0&&!sensitiveRoles.has(a)&&!sensitiveRoles.has(b);
}
const adjacent=(a:Room,b:Room)=>(
 Math.abs((a.x+a.w)-b.x)<.1||Math.abs((b.x+b.w)-a.x)<.1?
   Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>5:
 Math.abs((a.y+a.h)-b.y)<.1||Math.abs((b.y+b.h)-a.y)<.1?
   Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>5:false
);
export type SpatialRelationshipDiagnostic={a:string;b:string;roles:string;cost:number};
/** Reports undesirable *existing* doorway links; not a blocker for old seeds. */
export function auditRoomRelationships(site:Pick<Site,'rooms'|'doors'|'archetype'>):
 SpatialRelationshipDiagnostic[]{
 if(!site.archetype)return [];
 const out:SpatialRelationshipDiagnostic[]=[];
 for(const door of site.doors){
  if(door.id==='FRONT'||door.id==='SERVICE'||door.id==='SHUTTER')continue;
  const p={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const touching=site.rooms.filter(r=>
   p.x>=r.x-.1&&p.x<=r.x+r.w+.1&&p.y>=r.y-.1&&p.y<=r.y+r.h+.1);
  if(touching.length!==2||!adjacent(touching[0],touching[1]))continue;
  const [a,b]=touching;
  const cost=relationshipScore(site.archetype,a.purpose??'hallway',b.purpose??'hallway');
  if(cost>0)out.push({a:a.id,b:b.id,roles:(a.purpose??'')+' / '+(b.purpose??''),cost});
 }
 return out;
}

/** Coarse shape-aware cover for NEW static vehicles. Movement remains
 * the full existing obstacle footprint; no mesh raycasts, physics, or
 * changes to old archived vehicle records. */
import type {Obstacle,Pt} from '../breach-core.ts';
import {vehicleFamily,VEHICLE_DIMENSIONS,type VehicleFamily} from './vehicle-catalog.ts';
import {legacyVehicleShape,vehicleShape,type VehicleSideProfile} from './vehicle-shape.ts';
type Volume={profile:VehicleSideProfile;halfWidth:number;roofWidth?:number};
const rect=(a:number,b:number,lo:number,hi:number):VehicleSideProfile=>[[a,lo],[b,lo],[b,hi],[a,hi]];
const cache=new Map<string,readonly Volume[]>();
function volumes(family:VehicleFamily,configuration:string,version:1|2):readonly Volume[]{
 const key=version+':'+family+':'+configuration,known=cache.get(key);if(known)return known;
 const legacy=version===1;
 const {body,cabin,cw,belt}=legacy?legacyVehicleShape(family):vehicleShape(family);
 // Ground-to-belt body is deliberately coarse: wheel wells are not
 // separate tactical apertures. The cabin follows the rendered roof rake.
 const base=body.map(([x,y],i)=>[x,i<2?0:y] as const);
 const out:Volume[]=[{profile:base,halfWidth:.43},{profile:cabin,halfWidth:cw,...(legacy?{}:{roofWidth:vehicleShape(family).roofWidth})}];
 if(family==='pickup'){
  if(configuration==='covered'||configuration==='cargo')out.push({profile:rect(legacy?-.43:-.445,legacy?-.12:-.105,belt,configuration==='covered'?(legacy?.89:.92):(legacy?.73:.79)),halfWidth:legacy?.32:.33});
  else out.push({profile:rect(legacy?-.47:-.48,legacy?-.435:-.445,belt,belt+(legacy?.13:.115)),halfWidth:.43});
 }
 if(family==='light-truck'&&configuration!=='flatbed')out.push({profile:rect(-.47,.075,belt,.98),halfWidth:.46});
 cache.set(key,out);return out;
}
/** Clip a normalized line against a convex side profile and width slab. */
function clip(p:readonly number[],q:readonly number[],v:Volume):number|null{
 let lo=0,hi=1;
 const test=(a:number,b:number)=>{
  if(a>=0&&b>=0)return true;
  if(a<0&&b<0)return false;
  const t=a/(a-b);if(a<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
  return lo<=hi;
 };
 const width=(y:number)=>{if(v.roofWidth===undefined)return v.halfWidth;
  const lo=v.profile[0][1],hi=v.profile[2][1];return v.halfWidth+(v.roofWidth-v.halfWidth)*(y-lo)/(hi-lo);};
 if(!test(width(p[1])+p[2],width(q[1])+q[2])||!test(width(p[1])-p[2],width(q[1])-q[2]))return null;
 for(let i=0;i<v.profile.length;i++){
  const a=v.profile[i],b=v.profile[(i+1)%v.profile.length];
  const side=(x:readonly number[])=>(b[0]-a[0])*(x[1]-a[1])-(b[1]-a[1])*(x[0]-a[0]);
  if(!test(side(p),side(q)))return null;
 }
 return lo;
}
/** undefined = not eligible; null = clear trajectory; number = first hit. */
export function vehicleCoverImpact(from:Pt,to:Pt,fromZ:number,toZ:number,c:Obstacle):number|null|undefined{
 if(!c.vehicleProfile||![1,2].includes(c.vehicleProfile.version)||c.destroyed||c.toppled||c.topHeight!==undefined)return undefined;
 const family=vehicleFamily(c.fixture??'');if(!family||c.w<=0||c.h<=0)return undefined;
 const turn=c.orientation??0,co=[1,0,-1,0][turn],si=[0,1,0,-1][turn];
 const w=turn%2?c.h:c.w,d=turn%2?c.w:c.h,h=VEHICLE_DIMENSIONS[family][2];
 const local=(p:Pt,y:number)=>{const x=p.x-c.x,z=p.y-c.y;return [(co*x-si*z)/w,y/h,(si*x+co*z)/d];};
 const a=local(from,fromZ),b=local(to,toZ);
 if(Math.min(a[0],b[0])>.5||Math.max(a[0],b[0])<-.5||Math.min(a[2],b[2])>.5||Math.max(a[2],b[2])<-.5)return null;
 let hit:number|null=null;
 for(const v of volumes(family,c.vehicleProfile.configuration,c.vehicleProfile.version)){
  const t=clip(a,b,v);if(t!==null&&(hit===null||t<hit))hit=t;
 }
 return hit;
}

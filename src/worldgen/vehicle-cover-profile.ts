/** Coarse shape-aware cover for NEW static vehicles. Movement remains
 * the full existing obstacle footprint; no mesh raycasts, physics, or
 * changes to old archived vehicle records. */
import type {Obstacle,Pt} from '../breach-core.ts';
import {vehicleFamily,VEHICLE_DIMENSIONS,type VehicleFamily} from './vehicle-catalog.ts';
import {vehicleShape,type VehicleSideProfile} from './vehicle-shape.ts';
type Volume={profile:VehicleSideProfile;halfWidth:number};
const rect=(a:number,b:number,lo:number,hi:number):VehicleSideProfile=>[[a,lo],[b,lo],[b,hi],[a,hi]];
const cache=new Map<string,readonly Volume[]>();
function volumes(family:VehicleFamily,configuration:string):readonly Volume[]{
 const key=family+':'+configuration,known=cache.get(key);if(known)return known;
 const {body,cabin,cw,belt}=vehicleShape(family);
 // Ground-to-belt body is deliberately coarse: wheel wells are not
 // separate tactical apertures. The cabin follows the rendered roof rake.
 const base=body.map(([x,y],i)=>[x,i<2?0:y] as const);
 const out:Volume[]=[{profile:base,halfWidth:.43},{profile:cabin,halfWidth:cw}];
 if(family==='pickup'){
  if(configuration==='covered'||configuration==='cargo')out.push({profile:rect(-.43,-.12,belt,configuration==='covered'?.89:.73),halfWidth:.32});
  else out.push({profile:rect(-.47,-.435,belt,belt+.13),halfWidth:.43});
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
 if(!test(v.halfWidth+p[2],v.halfWidth+q[2])||!test(v.halfWidth-p[2],v.halfWidth-q[2]))return null;
 for(let i=0;i<v.profile.length;i++){
  const a=v.profile[i],b=v.profile[(i+1)%v.profile.length];
  const side=(x:readonly number[])=>(b[0]-a[0])*(x[1]-a[1])-(b[1]-a[1])*(x[0]-a[0]);
  if(!test(side(p),side(q)))return null;
 }
 return lo;
}
/** undefined = not eligible; null = clear trajectory; number = first hit. */
export function vehicleCoverImpact(from:Pt,to:Pt,fromZ:number,toZ:number,c:Obstacle):number|null|undefined{
 if(c.vehicleProfile?.version!==1||c.destroyed||c.toppled||c.topHeight!==undefined)return undefined;
 const family=vehicleFamily(c.fixture??'');if(!family||c.w<=0||c.h<=0)return undefined;
 const turn=c.orientation??0,co=[1,0,-1,0][turn],si=[0,1,0,-1][turn];
 const w=turn%2?c.h:c.w,d=turn%2?c.w:c.h,h=VEHICLE_DIMENSIONS[family][2];
 const local=(p:Pt,y:number)=>{const x=p.x-c.x,z=p.y-c.y;return [(co*x-si*z)/w,y/h,(si*x+co*z)/d];};
 const a=local(from,fromZ),b=local(to,toZ);
 if(Math.min(a[0],b[0])>.5||Math.max(a[0],b[0])<-.5||Math.min(a[2],b[2])>.5||Math.max(a[2],b[2])<-.5)return null;
 let hit:number|null=null;
 for(const v of volumes(family,c.vehicleProfile.configuration)){
  const t=clip(a,b,v);if(t!==null&&(hit===null||t<hit))hit=t;
 }
 return hit;
}

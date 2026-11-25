/** Shared cosmetic debris poses, using the pre-existing window shard batch.
 * No new collision geometry, simulated rigid bodies, or inferred break time.
 * Older recordings without complete origin data deliberately omit debris. */
import type {Door,Obstacle} from '../breach-core.ts';
import {MATERIALS,materialForFixture} from '../breach-materials.ts';
import {windowShardPoseInto,settledWindowShardPose,type SettledWindowShardPose} from './window-shatter-presentation.ts';
export type DebrisSource={id:string;x:number;y:number;width:number;vertical:boolean;sillHeight:number;headHeight:number;shattered:true;shatteredAt:number;yaw:number;kind:'glass'|'wood'|'stone'|'metal'|'dust';color:number};
const tint={glass:0xd9f4ef,wood:0xb99a74,stone:0xbcb3a1,metal:0x9da9a8,dust:0xb8ab92} as const;
export function doorDebrisSource(d:Door):DebrisSource|null{
 const x=d.glassBreakX,y=d.glassBreakY,width=d.glassBreakWidth,yaw=d.glassBreakYaw,at=d.glassShatteredAt;
 if(!d.glassShattered||!['glazed','french'].includes(d.style??'')||
  x===undefined||y===undefined||width===undefined||yaw===undefined||at===undefined||
  ![x,y,width,yaw,at].every(Number.isFinite)||width<1)return null;
 return {id:'door:'+d.id,x,y,width,vertical:false,sillHeight:4,headHeight:44,shattered:true,shatteredAt:at,yaw,kind:'glass',color:tint.glass};
}
export function coverDebrisSource(c:Obstacle,index:number):DebrisSource|null{
 const x=c.collapseX,y=c.collapseY,w=c.collapseW,d=c.collapseD,h=c.collapseHeight,at=c.destroyedAt;
 if(!c.destroyed||x===undefined||y===undefined||w===undefined||d===undefined||h===undefined||at===undefined||
  ![x,y,w,d,h,at].every(Number.isFinite)||w<=0||d<=0||h<=0)return null;
 // Aperture-owned glass barriers are already represented by their pane.
 if(c.fixture==='glass-barrier'||c.fixture==='window-pane')return null;
 const kind=MATERIALS[c.material??materialForFixture(c.fixture)].impact;
 return {id:'cover:'+(c.id??index),x,y,width:Math.max(w,d),vertical:false,sillHeight:0,headHeight:h,
  shattered:true,shatteredAt:at,yaw:d>w?Math.PI/2:0,kind,color:tint[kind]};
}
function orient(source:DebrisSource,out:SettledWindowShardPose){
 const x=out.x-source.x,z=out.z-source.y,co=Math.cos(source.yaw),si=Math.sin(source.yaw);
 out.x=source.x+x*co-z*si;out.z=source.y+x*si+z*co;out.ry-=source.yaw;
}
export function fractureDebrisPose(source:DebrisSource,time:number,index:number,settled:boolean,out:SettledWindowShardPose):boolean{
 if(settled){if(!settledWindowShardPose(source,time,index,out))return false;}
 else{if(!windowShardPoseInto(source,time,index,out))return false;
  out.heightScale=1;}
 orient(source,out);
 if(source.kind!=='glass'){
  // Larger angular pieces around the collapsed authored footprint.
  out.scale*=source.kind==='wood'?1.18:1.10;
  out.heightScale=source.kind==='stone'?1.8:source.kind==='metal'?.8:1.05;
 }
 return true;
}

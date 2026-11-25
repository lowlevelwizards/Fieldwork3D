/** Shared cosmetic debris poses, using the pre-existing window shard batch.
 * No new collision geometry, simulated rigid bodies, or inferred break time.
 * Older recordings without complete origin data deliberately omit debris. */
import type {Door,Obstacle,Pt,Segment} from '../breach-core.ts';
import {groundDistanceToSegment} from '../breach-ground-geometry.ts';
import type {SessionWorldGeometry} from '../breach-world-context.ts';
import {MATERIALS,materialForFixture} from '../breach-materials.ts';
import {windowShardPoseInto,settledWindowShardPose,type SettledWindowShardPose} from './window-shatter-presentation.ts';
export type DebrisSource={id:string;x:number;y:number;width:number;vertical:boolean;sillHeight:number;headHeight:number;shattered:true;shatteredAt:number;yaw:number;kind:'glass'|'wood'|'stone'|'metal'|'dust';color:number};
const tint={glass:0xd9f4ef,wood:0xb99a74,stone:0xbcb3a1,metal:0x9da9a8,dust:0xb8ab92} as const;
function blankSource():DebrisSource{
 return {id:'',x:0,y:0,width:0,vertical:false,sillHeight:0,headHeight:0,shattered:true,shatteredAt:0,yaw:0,kind:'glass',color:tint.glass};
}
/** Site-owned high-water scratch. Only accepted descriptors enter the active
 * list. Rejected candidates reuse the next slot; reset releases site data. */
export class FractureSourceScratch{
 private readonly slots:DebrisSource[]=[];
 readonly active:DebrisSource[]=[];
 beginFrame(){this.active.length=0;}
 next():DebrisSource{
  const index=this.active.length;
  return this.slots[index]??(this.slots[index]=blankSource());
 }
 accept(source:DebrisSource){this.active.push(source);}
 reset(){this.active.length=0;this.slots.length=0;}
}
export function doorDebrisSource(d:Door,out?:DebrisSource):DebrisSource|null{
 const x=d.glassBreakX,y=d.glassBreakY,width=d.glassBreakWidth,yaw=d.glassBreakYaw,at=d.glassShatteredAt;
 if(!d.glassShattered||(d.style!=='glazed'&&d.style!=='french')||
  x===undefined||y===undefined||width===undefined||yaw===undefined||at===undefined||
  !Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(width)||!Number.isFinite(yaw)||!Number.isFinite(at)||width<1)return null;
 const s=out??blankSource();
 s.id='door:'+d.id;s.x=x;s.y=y;s.width=width;s.vertical=false;
 s.sillHeight=4;s.headHeight=44;s.shattered=true;s.shatteredAt=at;s.yaw=yaw;s.kind='glass';s.color=tint.glass;
 return s;
}
export function coverDebrisSource(c:Obstacle,index:number,out?:DebrisSource):DebrisSource|null{
 const x=c.collapseX,y=c.collapseY,w=c.collapseW,d=c.collapseD,h=c.collapseHeight,at=c.destroyedAt;
 if(!c.destroyed||x===undefined||y===undefined||w===undefined||d===undefined||h===undefined||at===undefined||
  !Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(w)||!Number.isFinite(d)||!Number.isFinite(h)||!Number.isFinite(at)||w<=0||d<=0||h<=0)return null;
 // Aperture-owned glass barriers are already represented by their pane.
 if(c.fixture==='glass-barrier'||c.fixture==='window-pane')return null;
 const kind=MATERIALS[c.material??materialForFixture(c.fixture)].impact;
 const s=out??blankSource();
 s.id='cover:'+(c.id??index);s.x=x;s.y=y;s.width=Math.max(w,d);s.vertical=false;
 s.sillHeight=0;s.headHeight=h;s.shattered=true;s.shatteredAt=at;s.yaw=d>w?Math.PI/2:0;s.kind=kind;s.color=tint[kind];
 return s;
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
  out.scale*=source.kind==='wood'?2.36:2.20;
  out.heightScale=source.kind==='stone'?1.35:source.kind==='metal'?.28:source.kind==='dust'?1.15:.48;
  if(settled)out.y=Math.max(out.y,out.scale*out.heightScale*.45);
 }
 return true;
}

/** Conservative presentation-only containment. Source-to-sample crossing
 * catches fragments tunneling past walls; the final bounding disc catches
 * oversized chips overlapping wall thickness or a jamb. No door physics
 * or visibility policy is inferred here. A source exactly on a wall may
 * leave its plane, but a crossing after departure (including an endpoint)
 * is rejected. The real aperture is a gap in the session wall segments.
 */
export type DebrisWallWorld=Pick<SessionWorldGeometry,'bounds'|'someWallNearPoint'>;
const WALL_SHELL=5; // same 4.5 + .5 clearance as confinedGroundRadius
const SHARD_DISC=2.4; // conservative radius of the centered shard mesh
function crossesAfterDeparture(a:Pt,b:Pt,wall:Segment):boolean{
 const dx=b.x-a.x,dy=b.y-a.y,sx=wall.b.x-wall.a.x,sy=wall.b.y-wall.a.y;
 const det=dx*sy-dy*sx;
 if(Math.abs(det)<1e-8)return false;
 const ox=wall.a.x-a.x,oy=wall.a.y-a.y;
 const t=(ox*sy-oy*sx)/det,u=(ox*dy-oy*dx)/det;
 return t>1e-6&&t<=1&&u>=-1e-6&&u<=1+1e-6;
}
export function debrisPoseContained(
 world:DebrisWallWorld,source:Readonly<Pt>,pose:Readonly<Pick<SettledWindowShardPose,'x'|'z'|'scale'>>,heightScale=1
):boolean{
 if(!Number.isFinite(source.x)||!Number.isFinite(source.y)||
  !Number.isFinite(pose.x)||!Number.isFinite(pose.z)||
  !Number.isFinite(pose.scale)||pose.scale<=0||!Number.isFinite(heightScale)||heightScale<=0)return false;
 const radius=SHARD_DISC*pose.scale*Math.max(1,heightScale);
 const b=world.bounds,x=pose.x,y=pose.z;
 if(x-radius<b.minX||x+radius>b.maxX||y-radius<b.minY||y+radius>b.maxY)return false;
 const end={x,y};
 const dx=x-source.x,dy=y-source.y;
 // One indexed query covering the entire source-to-pose chord plus shell.
 const center={x:source.x+dx*.5,y:source.y+dy*.5};
 const reach=Math.hypot(dx,dy)*.5+WALL_SHELL+radius;
 return !world.someWallNearPoint(center,reach,wall=>
  groundDistanceToSegment(end,wall)<WALL_SHELL+radius||
  crossesAfterDeparture(source,end,wall));
}

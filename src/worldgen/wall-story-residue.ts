/** W6: fixture-local architectural history, evaluated once per atlas build.
 * Source geometry only: no runtime decal, actor, RNG or simulation ownership. */
import type {Site} from '../breach-site.ts';
import type {SurfaceEvent} from './wall-surface-recipe.ts';
import {coverHeight} from '../breach-cover-height.ts';
export type FixtureWallResidue=Map<number,Map<-1|1,SurfaceEvent[]>>;
const grease={kind:'grease',rooms:['kitchen'],width:36,height:16,threshold:24,priority:96} as const;
const splash={kind:'splash',rooms:['kitchen','bathroom','restroom','half-bath','laundry','break','utility','service'],width:28,height:12,threshold:24,priority:94} as const;
const medicalSplash={...splash,rooms:['exam','treatment','staff','utility','service','restroom']} as const;
const workgrime={kind:'workgrime',rooms:['bay','workshop','service','maintenance','parts','utility','packing'],width:36,height:10,threshold:32,priority:95} as const;
const rules={
 stove:grease,'commercial-range':{...grease,width:44,height:20},
 sink:splash,'dish-station':{...splash,width:38,rooms:['kitchen','service']},
 'utility-sink':splash,'handwash-station':medicalSplash,
 workbench:workgrime,'packing-station':workgrime,
} as const;
const facing=[[0,1],[1,0],[0,-1],[-1,0]] as const;
const inside=(x:number,y:number,r:Site['rooms'][number])=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h;
export function planFixtureWallResidue(site:Site,height:number):FixtureWallResidue{
 const out:FixtureWallResidue=new Map();
 // Reuse normalized segment geometry for all eligible fixtures.
 const walls=site.walls.flatMap((w,index)=>{
  const dx=w.b.x-w.a.x,dy=w.b.y-w.a.y,length=Math.hypot(dx,dy);
  return length<12?[]:[{w,index,length,tx:dx/length,ty:dy/length,nx:-dy/length,ny:dx/length}];
 });
 for(const [fixtureIndex,o] of site.cover.entries()){
  if(!o.fixture||!Object.hasOwn(rules,o.fixture)||o.destroyed||o.toppled)continue;
  const rule=rules[o.fixture as keyof typeof rules];
  const room=site.rooms.find(r=>r.kind==='room'&&inside(o.x,o.y,r)&&(rule.rooms as readonly string[]).includes(r.purpose??''));
  if(!room)continue;
  const top=coverHeight(o);
  if(!Number.isFinite(top)||top<4||top>=height-4)continue;
  const h=Math.min(rule.height,height-top);
  const front=o.orientation===undefined?undefined:facing[o.orientation];
  let best:{index:number;face:-1|1;along:number;gap:number;span:number;rear:number}|undefined;
  for(const {w,index,length,tx,ty,nx,ny} of walls){
   const along=(o.x-w.a.x)*tx+(o.y-w.a.y)*ty,signed=(o.x-w.a.x)*nx+(o.y-w.a.y)*ny;
   const face:-1|1=signed<0?-1:1;
   const halfNormal=(Math.abs(nx)*o.w+Math.abs(ny)*o.h)/2;
   const halfAlong=(Math.abs(tx)*o.w+Math.abs(ty)*o.h)/2;
   const gap=Math.abs(signed)-halfNormal;
   // Placement reserves an approximately 12-unit perimeter inset.
   if(gap< -3||gap>16||along<2||along>length-2)continue;
   const rear=front?front[0]*nx*face+front[1]*ny*face:0;
   // Never paint the user's approach wall when an authored front faces it.
   if(rear<-.5)continue;
   const wx=w.a.x+tx*along+nx*face*9,wy=w.a.y+ty*along+ny*face*9;
   if(!inside(wx,wy,room)&&!(room.zoneId&&site.rooms.some(r=>r.zoneId===room.zoneId&&r.purpose===room.purpose&&inside(wx,wy,r))))continue;
   const span=Math.min(rule.width,halfAlong*2+6,along*2,(length-along)*2);
   if(span<8)continue;
   // Explicit opening protection also covers authored sites that retain a
   // planar wall segment behind a raised sill or window head.
   if((site.windows??[]).some(v=>{
    if(v.vertical!==(Math.abs(ty)>Math.abs(tx)))return false;
    const d=Math.abs((v.x-w.a.x)*nx+(v.y-w.a.y)*ny);
    const x=(v.x-w.a.x)*tx+(v.y-w.a.y)*ty;
    return d<=6&&Math.abs(x-along)<(v.width+span)/2&&top<(v.headHeight??height)&&top+h>(v.sillHeight??14);
   }))continue;
   if(!best||rear>best.rear+.01||Math.abs(rear-best.rear)<=.01&&Math.abs(gap)<Math.abs(best.gap))best={index,face,along,gap,span,rear};
  }
  if(!best)continue;
  const event:SurfaceEvent={kind:rule.kind,cause:'fixture:'+o.fixture+':'+(o.id??fixtureIndex),
   x:best.along,y:height-top-h/2,width:best.span,height:h,threshold:rule.threshold,priority:rule.priority};
  let faces=out.get(best.index);if(!faces){faces=new Map();out.set(best.index,faces);}
  const events=faces.get(best.face)??[];events.push(event);faces.set(best.face,events);
 }
 return out;
}

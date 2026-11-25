/** W6: fixture-local architectural history. Only static authored geometry
 * is read, once at atlas construction. No runtime actor, damage or RNG state. */
import type {Site} from '../breach-site.ts';
import type {SurfaceEvent} from './wall-surface-recipe.ts';
import {coverHeight} from '../breach-cover-height.ts';
export type FixtureWallResidue=Map<number,Map<-1|1,SurfaceEvent[]>>;
const rules={
 stove:{kind:'grease',rooms:['kitchen'],width:36,height:16,threshold:24,priority:96},
 sink:{kind:'splash',rooms:['kitchen','bathroom','restroom','laundry','break','utility'],width:28,height:12,threshold:24,priority:94},
 workbench:{kind:'workgrime',rooms:['bay','workshop','service','maintenance','parts','utility'],width:36,height:10,threshold:32,priority:95},
} as const;
export function planFixtureWallResidue(site:Site,height:number):FixtureWallResidue{
 const out:FixtureWallResidue=new Map();
 for(const [fixtureIndex,o] of site.cover.entries()){
  if(!o.fixture||!Object.hasOwn(rules,o.fixture)||o.destroyed||o.toppled)continue;
  const rule=rules[o.fixture as keyof typeof rules];
  const room=site.rooms.find(r=>o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h&&
   (rule.rooms as readonly string[]).includes(r.purpose??''));
  if(!room)continue;
  const top=coverHeight(o);
  if(top<4||top>=height-4)continue;
  let best:{index:number;face:-1|1;along:number;length:number;gap:number;span:number}|undefined;
  for(const [index,w] of site.walls.entries()){
   const dx=w.b.x-w.a.x,dy=w.b.y-w.a.y,length=Math.hypot(dx,dy);
   if(length<12)continue;
   const tx=dx/length,ty=dy/length,nx=-ty,ny=tx;
   const along=(o.x-w.a.x)*tx+(o.y-w.a.y)*ty,signed=(o.x-w.a.x)*nx+(o.y-w.a.y)*ny;
   const face:-1|1=signed<0?-1:1;
   const halfNormal=(Math.abs(nx)*o.w+Math.abs(ny)*o.h)/2;
   const halfAlong=(Math.abs(tx)*o.w+Math.abs(ty)*o.h)/2;
   const gap=Math.abs(signed)-halfNormal;
   // Fixture must abut the solid wall, not a gap or a distant opposite face.
   if(gap< -3||gap>12||along<2||along>length-2)continue;
   const wx=w.a.x+tx*along+nx*face*9,wy=w.a.y+ty*along+ny*face*9;
   if(wx<room.x||wx>room.x+room.w||wy<room.y||wy>room.y+room.h)continue;
   const span=Math.min(rule.width,halfAlong*2+6,along*2,(length-along)*2);
   if(span<8)continue;
   if(!best||Math.abs(gap)<Math.abs(best.gap))best={index,face,along,length,gap,span};
  }
  if(!best)continue;
  const h=Math.min(rule.height,height-top);
  // Residue is above the actual fixture top, not under it or on the reverse face.
  const event:SurfaceEvent={kind:rule.kind,cause:'fixture:'+o.fixture+':'+(o.id??fixtureIndex),
   x:best.along,y:height-top-h/2,width:best.span,height:h,threshold:rule.threshold,priority:rule.priority};
  let faces=out.get(best.index);if(!faces){faces=new Map();out.set(best.index,faces);}
  const events=faces.get(best.face)??[];events.push(event);faces.set(best.face,events);
 }
 return out;
}

import {sessionWorldGeometry} from './breach-world-context.ts';
/** Ordered physical projectile ray resolution: one authoritative world query
 * shared by firing lane checks and committed projectile impacts.
 * This module never spends ammo, selects targets, or mutates the Session.
 */
import {doorLeafSegment,type Pt} from './breach-core.ts';
import type {Session,ShotEvent} from './breach-game.ts';
import {coverImpactFraction} from './breach-cover-height.ts';
import {resolvePenetration,type BarrierHit} from './breach-penetration.ts';
import {MATERIALS,materialForFixture,type MaterialId} from './breach-materials.ts';
import {windowPaneSegment} from './breach-windows.ts';
export function segmentImpact(from:Pt,to:Pt,segment:{a:Pt;b:Pt}):number|null{
  const dx=to.x-from.x,dy=to.y-from.y;
  const ex=segment.b.x-segment.a.x,ey=segment.b.y-segment.a.y;
  const determinant=dx*ey-dy*ex;
  if(Math.abs(determinant)<1e-7)return null;
  const fx=segment.a.x-from.x,fy=segment.a.y-from.y;
  const t=(fx*ey-fy*ex)/determinant;
  const u=(fx*dy-fy*dx)/determinant;
  return t>=0&&t<=1&&u>=0&&u<=1?t:null;
}
/** One ordered hit query for both collision and actual projectiles.
 * energy=0 preserves original rigid muzzle/cover obstruction checks.
 */
export function strikeSurface(from:Pt,aimed:Pt,s:Session,
  fromZ=22,toZ=22,energy=0):{
  end:Pt;surface:ShotEvent['surface'];penetrated:number[];remaining:number;
  paneHits:number[];glassDoorHits:{index:number;fraction:number}[];
  coverHits:{index:number;fraction:number}[];
  materialHits:{fraction:number;material:MaterialId}[]}{
  const {walls:WALLS,cover:COVER}=sessionWorldGeometry(s);
  const hits:BarrierHit[]=[];
  const glassDoorHits:{index:number;fraction:number}[]=[];
  for(const wall of WALLS){
    const t=segmentImpact(from,aimed,wall);
    if(t!==null)hits.push({fraction:t,material:'brick',thickness:10});
  }
  for(const [index,door] of s.doors.entries()){
    if(door.style==='mesh-gate'||door.style==='screen')continue; // fine mesh transmits most bullets
    const isGlass=['glazed','french'].includes(door.style??'');
    if(isGlass&&door.glassShattered)continue;
    const leaf=doorLeafSegment(door);
    const t=segmentImpact(from,aimed,leaf);
    if(t!==null&&isGlass)glassDoorHits.push({index,fraction:t});
    if(t!==null)hits.push({fraction:t,
      material:door.kind==='shutter'?'steel':
        ['glazed','french'].includes(door.style??'')?'glass':'hardwood',
      thickness:door.kind==='shutter'?10:
        ['glazed','french'].includes(door.style??'')?1:3});
  }
  for(const [index,box] of COVER.entries()){
    if(['chain-link-fence','iron-fence'].includes(box.fixture??''))continue;
    // Full-height window glass has both a body collider and a pane event.
    // Counting both would make thin glass absorb bullet energy twice.
    if(box.fixture==='glass-barrier'&&s.windows.some(w=>
      w.sillHeight===0&&Math.hypot(w.x-box.x,w.y-box.y)<1))continue;
    const t=coverImpactFraction(from,aimed,fromZ,toZ,box);
    if(t===null)continue;
    hits.push({fraction:t,
      material:box.material??materialForFixture(box.fixture),
      thickness:Math.min(4,Math.max(1,Math.min(box.w,box.h)*.08)),
      coverIndex:index});
  }
  const paneHits:{index:number;fraction:number}[]=[];
  for(const [index,window] of s.windows.entries()){
    if(window.shattered||window.open)continue;
    const t=segmentImpact(from,aimed,windowPaneSegment(window));
    if(t===null)continue;
    const height=fromZ+(toZ-fromZ)*t;
    if(height<(window.sillHeight??14)||height>(window.headHeight??32))continue;
    hits.push({fraction:t,material:'glass',thickness:1});
    paneHits.push({index,fraction:t});
  }
  const outcome=resolvePenetration(hits,energy);
  const t=outcome.stoppedAt??1;
  const surface=outcome.stoppedMaterial?
    MATERIALS[outcome.stoppedMaterial].impact:'dust';
  return {end:{x:from.x+(aimed.x-from.x)*t,
    y:from.y+(aimed.y-from.y)*t},surface,
    penetrated:outcome.penetrated,remaining:outcome.remaining,
    paneHits:paneHits.filter(p=>p.fraction<=t+.00001).map(p=>p.index),
    glassDoorHits:glassDoorHits.filter(p=>p.fraction<=t+.00001),
    coverHits:hits.filter(h=>h.coverIndex!==undefined&&
      h.fraction<=t+.00001).map(h=>({index:h.coverIndex!,fraction:h.fraction})),
    materialHits:hits.filter(h=>h.fraction<=t+.00001)
      .sort((a,b)=>a.fraction-b.fraction).map(h=>({fraction:h.fraction,
      material:h.material}))};
}


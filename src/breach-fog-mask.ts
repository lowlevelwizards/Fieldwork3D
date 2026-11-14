/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H,WALLS,COVER,type Pt} from './breach-core.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Site,WorldBounds} from './breach-site.ts';
import {team,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {exteriorKnownFogRects} from './breach-fog-domain.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
import {NEAR_FINE_SIGHT_RANGE,sightRangeForSite} from './breach-visibility-range-policy.ts';
import {forEachRememberedMicroCell} from './breach-fog-memory.ts';
import {traceFogCellContours,appendSmoothFogContours,type FogCell}
  from './breach-fog-contours.ts';
export const FOG_WIDTH=320,FOG_HEIGHT=370;
/** Display-only supersampling. Cap expanded sites to protect mobile VRAM. */
export const MAX_FOG_TEXTURE_EDGE=1280;
export const maskBounds=(site?:Site|null):WorldBounds=>
  site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
export const maskSize=(site?:Site|null)=>{
  // Preserve historical authored training map dimensions; procedural sites
  // receive the extra precision needed for smooth mobile isometric fog.
  if(!site)return {width:FOG_WIDTH,height:FOG_HEIGHT};
  const b=maskBounds(site);
  const worldW=b.maxX-b.minX,worldH=b.maxY-b.minY;
  const worldUnitsPerPixel=Math.max(1,worldW/MAX_FOG_TEXTURE_EDGE,
    worldH/MAX_FOG_TEXTURE_EDGE);
  return {width:Math.ceil(worldW/worldUnitsPerPixel),
    height:Math.ceil(worldH/worldUnitsPerPixel)};
};
const prepare=(ctx:CanvasRenderingContext2D,site?:Site|null)=>{
  const bounds=maskBounds(site),size=maskSize(site);
  if(ctx.canvas&&(ctx.canvas.width!==size.width||ctx.canvas.height!==size.height)){
    ctx.canvas.width=size.width;ctx.canvas.height=size.height;
  }
  const w=ctx.canvas?.width??size.width,h=ctx.canvas?.height??size.height;
  return {bounds,w,h};
};
/** A deep charcoal concealment field, not an accidental pitch-black hole.
 * Fully unknown cells are still opaque and disclose no underlying floor. */
export const UNKNOWN_FOG_COLOR='#122022';
export type FogDiagnostic='normal'|'palette';
export function paintFogMemory(ctx:CanvasRenderingContext2D,s:Session,
  diagnostic:FogDiagnostic='normal'){

  const {bounds,w,h}=prepare(ctx,s.site);
  const sx=w/(bounds.maxX-bounds.minX),sy=h/(bounds.maxY-bounds.minY);
  ctx.save();
  ctx.setTransform(sx,0,0,sy,-bounds.minX*sx,-bounds.minY*sy);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(bounds.minX,bounds.minY,
    bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  ctx.filter='none';
  ctx.fillStyle=diagnostic==='palette'?'#b2226f':UNKNOWN_FOG_COLOR;
  // Paint ONLY the precomputed indoor/enclosed-court footprint in Exterior
  // Known. Outside stays transparent from clearRect; there is no giant full-
  // world temporary fog fill, no outdoor grid scan and no erase/re-cover pass.
  // The same cached site footprint builds the static 3D fog mesh.
  if(s.intel.mode==='exterior-known'&&s.site){
    for(const rect of exteriorKnownFogRects(s.site))
      ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
  }else{
    ctx.fillRect(bounds.minX,bounds.minY,
      bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  }
  ctx.globalCompositeOperation='destination-out';
  // Public façades/windows do not reveal indoor floors. Only remembered
  // knowledge and genuine live LOS can erase indoor opacity.
  // Full View must clear the map outright, not leave a translucent tint
  // in 2D while 3D hides its fog mesh. It grants no new gameplay knowledge.
  if(s.intel.mode==='full-view'){
    ctx.globalCompositeOperation='destination-out';
    ctx.filter='none';ctx.fillStyle='#fff';
    ctx.fillRect(bounds.minX,bounds.minY,
      bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
    ctx.restore();
    return;
  }
  // Fog states: unknown = opaque, blueprint = 60% tint, explored = 45%
  // tint, live LOS = clear. Fine (20u) and micro (10u) exploration overlap
  // heavily. They MUST be drawn in ONE destination-out path: drawing each
  // as a separate 55%-erase pass multiplies their alpha and leaves nearly
  // all previously visited interiors transparent.
  const EXPLORED_ERASE=.55,BLUEPRINT_ERASE=.40;
  const exploredFine:Pt[]=[];
  const blueprint:Pt[]=[];
  for(let row=Math.floor(bounds.minY/20);row<Math.ceil(bounds.maxY/20);row++)
    for(let col=Math.floor(bounds.minX/20);col<Math.ceil(bounds.maxX/20);col++){
      const p={x:col*20+10,y:row*20+10};
      const fineSeen=s.seenGround.has('fine:'+col+','+row);
      const level=intelFogLevel(s.intel,s.site,p,false,fineSeen);
      if(level===2)continue;
      // Floor-plan briefing is a separate *lower* information level; the
      // exploration pass compensates for its retained tint below.
      if(s.intel.mode==='floor-plan')blueprint.push({x:col*20,y:row*20});
      if(fineSeen)exploredFine.push({x:col*20,y:row*20});
  }
  // Briefed plan geometry is readable but never equivalent to sight.
  if(blueprint.length){
    ctx.filter='blur(2.8px)';
    ctx.fillStyle='rgba(255,255,255,'+BLUEPRINT_ERASE+')';
    ctx.beginPath();
    for(const p of blueprint)ctx.rect(p.x,p.y,20,20);
    ctx.fill();
  }
  // Merge every fine + micro tile into a single filled path, so overlapping
  // exploration cannot repeatedly erase fog. On Floor Plan the prebriefed
  // 40% erase already happened; a further 25% erase produces the SAME final
  // 45%-opaque explored tint as the other modes (.60 * .75 = .45).
  // Exact cell membership remains authoritative; round only the displayed
  // contour instead of blurring unknown ground into explored ground.
  ctx.filter='none';
  const exploredErase=s.intel.mode==='floor-plan'?.25:EXPLORED_ERASE;
  ctx.fillStyle='rgba(255,255,255,'+exploredErase+')';
  const microCells:FogCell[]=[];
  const microCount=forEachRememberedMicroCell(s.seenGround,bounds,
    (col,row)=>microCells.push({col,row}));
  if(exploredFine.length||microCount){
    // Reconstruct the outer boundary from the SAME fine/micro cells. This
    // affects presentation alone: original rectangular knowledge clips the
    // rounded shape, so an interpolated concavity cannot reveal unknown tiles.
    const canSmooth=typeof ctx.clip==='function'&&
      typeof ctx.quadraticCurveTo==='function'&&
      microCount+exploredFine.length*4<=12000;
    let smoothed=false;
    if(canSmooth){
      const cells:FogCell[]=microCells.slice();
      for(const p of exploredFine){
        const col=p.x/10,row=p.y/10;
        cells.push({col,row},{col:col+1,row},
          {col,row:row+1},{col:col+1,row:row+1});
      }
      const contours=traceFogCellContours(cells);
      if(contours.length){
        ctx.save();
        ctx.beginPath();
        for(const p of exploredFine)ctx.rect(p.x,p.y,20,20);
        for(const p of microCells)ctx.rect(p.col*10,p.row*10,10,10);
        ctx.clip();
        ctx.beginPath();
        appendSmoothFogContours(ctx,contours);
        ctx.fill('evenodd');
        ctx.restore();
        smoothed=true;
      }
    }
    if(!smoothed){
      // Old exact-mask fallback for limited canvas implementations or huge
      // maps; it never changes explored memory or LOS behavior.
      ctx.beginPath();
      for(const p of exploredFine)ctx.rect(p.x,p.y,20,20);
      for(const p of microCells)ctx.rect(p.col*10,p.row*10,10,10);
      ctx.fill();
    }
  }
  ctx.restore();
}
/** Live directional sight is the only high-frequency fog component. It
 * subtracts opacity from an already prepared static memory canvas. */
export function paintFogVisibility(ctx:CanvasRenderingContext2D,s:Session){
  const {bounds,w,h}=prepare(ctx,s.site);
  const sx=w/(bounds.maxX-bounds.minX),sy=h/(bounds.maxY-bounds.minY);
  ctx.save();
  ctx.setTransform(sx,0,0,sy,-bounds.minX*sx,-bounds.minY*sy);
  ctx.globalCompositeOperation='destination-out';
  // Live directional LOS is already vector geometry. Native raster
  // antialiasing keeps its edge crisp; no Gaussian halo through walls.
  ctx.filter='none';
  // The physical sight range reaches the map edge, but rendering the
  // entire far cone as completely transparent creates enormous black/clear
  // shadow wedges behind small fixtures. Grade only VISIBLE ground by
  // distance: near geometry is clear; far geometry remains subdued. Unknown
  // ground OUTSIDE each exact LOS polygon stays fully opaque. This changes
  // presentation, not actors, detection, exploration or ray occlusion.
  // There are at most the living squad's few polygons per changed fog paint;
  // gradients are native Canvas paints, not extra point/visibility queries.
  const range=sightRangeForSite(s.site);
  const canGrade=typeof ctx.createRadialGradient==='function';
  // Both 2D floor plan and 3D fog use the SAME session-owned optical
  // geometry. Global WALLS/COVER can belong to another active session.
  const world=s.coverState?sessionWorldGeometry(s):null;
  const walls=world?.walls??s.site?.walls??WALLS;
  const cover=world?.cover??s.site?.cover??COVER;
  for(const a of team(s)){
    if(a.health<=0)continue;
    const poly=visionPolygon(a.p,a.heading,range,walls,s.doors,
      a.posture==='crouch',cover);
    if(poly.length<3)continue;
    if(canGrade&&range>NEAR_FINE_SIGHT_RANGE){
      const ramp=ctx.createRadialGradient(a.p.x,a.p.y,
        NEAR_FINE_SIGHT_RANGE*.75,a.p.x,a.p.y,range);
      ramp.addColorStop(0,'rgba(255,255,255,1)');
      ramp.addColorStop(.35,'rgba(255,255,255,.82)');
      ramp.addColorStop(.7,'rgba(255,255,255,.58)');
      ramp.addColorStop(1,'rgba(255,255,255,.38)');
      ctx.fillStyle=ramp;
    }else ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.moveTo(poly[0].x,poly[0].y);
    for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter='none';
  ctx.restore();
}
/** Legacy one-shot path retained for deterministic visual comparison and
 * as a safe fallback if incremental presentation fails on a device. */
export function paintFogMask(ctx:CanvasRenderingContext2D,s:Session,
  diagnostic:FogDiagnostic='normal'){
  paintFogMemory(ctx,s,diagnostic);
  paintFogVisibility(ctx,s);
}

/** Room occupancy is used only to cut away camera roofs where appropriate.
 * It must NEVER erase any fog: discovery is strictly cone/LOS-driven. */
export function occupiedFogRooms(s:Session){
 if(!s.site)return [];
 const friendly=team(s).filter(a=>a.health>0);
 return s.site.rooms.filter(room=>friendly.some(a=>
   a.p.x>room.x+4&&a.p.x<room.x+room.w-4&&
   a.p.y>room.y+4&&a.p.y<room.y+room.h-4));
}

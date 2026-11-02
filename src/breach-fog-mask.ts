/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H} from './breach-core.ts';
import type {Site,WorldBounds} from './breach-site.ts';
import {team,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {exteriorBriefedAt} from './breach-site-footprint.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
import {MICRO_KEYS,MICRO_COLS} from './breach-fog-memory.ts';
export const FOG_WIDTH=320,FOG_HEIGHT=370;
export const maskBounds=(site?:Site|null):WorldBounds=>
  site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
export const maskSize=(site?:Site|null)=>{
  const b=maskBounds(site);return {width:Math.ceil((b.maxX-b.minX)/2),
    height:Math.ceil((b.maxY-b.minY)/2)};
};
const prepare=(ctx:CanvasRenderingContext2D,site?:Site|null)=>{
  const bounds=maskBounds(site),size=maskSize(site);
  if(ctx.canvas&&(ctx.canvas.width!==size.width||ctx.canvas.height!==size.height)){
    ctx.canvas.width=size.width;ctx.canvas.height=size.height;
  }
  const w=ctx.canvas?.width??size.width,h=ctx.canvas?.height??size.height;
  return {bounds,w,h};
};
export function paintFogMask(ctx:CanvasRenderingContext2D,s:Session){
  const {bounds,w,h}=prepare(ctx,s.site);
  const sx=w/(bounds.maxX-bounds.minX),sy=h/(bounds.maxY-bounds.minY);
  ctx.save();
  ctx.setTransform(sx,0,0,sy,-bounds.minX*sx,-bounds.minY*sy);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(bounds.minX,bounds.minY,
    bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  // Neutral-black blind space: no blue tint or translucent cyan wash.
  ctx.fillStyle='#000';
  ctx.fillRect(bounds.minX,bounds.minY,
    bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  ctx.globalCompositeOperation='destination-out';
  // The 20-unit tile centers used to erase entire tiles at exterior walls,
  // leaking 'exterior known' across the actual building boundary. Reveal the
  // accessible exterior under an exact room-footprint clip instead. The
  // exterior clipping pass never clears an unknown interior.
  if(s.intel.mode==='exterior-known'&&s.site){
    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.minX,bounds.minY,
      bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
    for(const room of s.site.rooms)ctx.rect(room.x,room.y,room.w,room.h);
    ctx.clip('evenodd');
    ctx.filter='blur(1.5px)';
    ctx.fillStyle='rgba(255,255,255,.76)';
    for(let row=Math.floor(bounds.minY/20);row<Math.ceil(bounds.maxY/20);row++)
      for(let col=Math.floor(bounds.minX/20);col<Math.ceil(bounds.maxX/20);col++){
        const p={x:col*20+10,y:row*20+10};
        if(exteriorBriefedAt(s.site,p))ctx.fillRect(col*20,row*20,20,20);
      }
    ctx.restore();
  }
  // Exploration gets a short feather rather than 40-unit hard rectangles.
  // This is presentation only: intel and hidden actor visibility are
  // still checked in the authoritative simulation every tick.
  ctx.filter='blur(1.5px)';
  for(let row=Math.floor(bounds.minY/20);row<Math.ceil(bounds.maxY/20);row++)
    for(let col=Math.floor(bounds.minX/20);col<Math.ceil(bounds.maxX/20);col++){
    const p={x:col*20+10,y:row*20+10};
    const fineSeen=s.seenGround.has('fine:'+col+','+row);
    // Sight is cleared only by the continuous occluded polygons below.
    // A center-pixel sample clearing a whole 20-unit cell was the source
    // of square holes through walls, and inconsistent live/fog states.
    const level=intelFogLevel(s.intel,s.site,p,false,fineSeen);
    if(level===2)continue;
    // Exterior briefing has already been clipped to the exact footprint;
    // never erase an entire partially-interior tile from its center sample.
    if(s.intel.mode==='exterior-known'&&!fineSeen&&level===1)continue;
    // Blueprint outlines are briefed, but unseen interiors must read as
    // distinctly unobserved rather than nearly as bright as explored rooms.
    const blueprintUnknown=s.intel.mode==='floor-plan'&&!fineSeen;
    ctx.fillStyle=level===1?
      (blueprintUnknown?'rgba(255,255,255,.34)':'rgba(255,255,255,.76)'):'#fff';
    ctx.fillRect(col*20,row*20,20,20);
  }
  // Small explored footprints fill the gaps left by coarse center samples,
  // while preserving the existing 20-unit replay memory and intelligence.
  ctx.filter='blur(1.5px)';
  ctx.fillStyle='rgba(255,255,255,.76)';
  for(let row=Math.floor(bounds.minY/10);row<Math.ceil(bounds.maxY/10);row++)
    for(let col=Math.floor(bounds.minX/10);col<Math.ceil(bounds.maxX/10);col++)
    if(s.seenGround.has(MICRO_KEYS[row*MICRO_COLS+col]??
      'micro:'+col+','+row))
      ctx.fillRect(col*10,row*10,10,10);
  // Continuous sight polygons are eased along their outline without
  // changing target detection, opacity or LOS blockers.
  ctx.filter='blur(1.2px)';
  ctx.fillStyle='#fff';
  for(const a of team(s)){
    if(a.health<=0)continue;
    const poly=visionPolygon(a.p,a.heading,240,undefined,s.doors,
      a.posture==='crouch');
    if(poly.length<3)continue;
    ctx.beginPath();
    ctx.moveTo(poly[0].x,poly[0].y);
    for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

/** Only the room actually occupied by an operator gains structural context.
 * Tactical sight, enemy detection and unseen cover remain authoritative. */
export function occupiedFogRooms(s:Session){
  if(!s.site)return [];
  const friendly=team(s).filter(a=>a.health>0);
  return s.site.rooms.filter(room=>friendly.some(a=>
    a.p.x>room.x+4&&a.p.x<room.x+room.w-4&&
    a.p.y>room.y+4&&a.p.y<room.y+room.h-4));
}
/** 3D-only presentation pass. The shared 2D LOS mask is unchanged.
 * Current-room floor/wall context must never vanish behind a directional
 * black wedge just because an operator turns their head. */
export function paintOccupiedRoomContext(ctx:CanvasRenderingContext2D,s:Session){
  const rooms=occupiedFogRooms(s);
  if(!rooms.length)return;
  const {bounds,w,h}=prepare(ctx,s.site);
  const sx=w/(bounds.maxX-bounds.minX),sy=h/(bounds.maxY-bounds.minY);
  ctx.save();
  ctx.setTransform(sx,0,0,sy,-bounds.minX*sx,-bounds.minY*sy);
  ctx.filter='none';
  ctx.globalCompositeOperation='destination-out';
  ctx.fillStyle='rgba(255,255,255,.86)';
  for(const room of rooms)
    ctx.fillRect(room.x+4,room.y+4,room.w-8,room.h-8);
  ctx.restore();
}

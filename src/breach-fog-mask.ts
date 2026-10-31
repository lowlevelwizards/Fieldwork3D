/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H} from './breach-core.ts';
import {team,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
import {MICRO_KEYS,MICRO_COLS} from './breach-fog-memory.ts';
export const FOG_WIDTH=320,FOG_HEIGHT=370;
export function paintFogMask(ctx:CanvasRenderingContext2D,s:Session){
  ctx.save();
  ctx.setTransform(FOG_WIDTH/W,0,0,FOG_HEIGHT/H,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(0,0,W,H);
  // Neutral-black blind space: no blue tint or translucent cyan wash.
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='destination-out';
  // Exploration gets a short feather rather than 40-unit hard rectangles.
  // This is presentation only: intel and hidden actor visibility are
  // still checked in the authoritative simulation every tick.
  ctx.filter='blur(1.5px)';
  for(let row=0;row<37;row++)for(let col=0;col<32;col++){
    const p={x:col*20+10,y:row*20+10};
    const fineSeen=s.seenGround.has('fine:'+col+','+row);
    // Sight is cleared only by the continuous occluded polygons below.
    // A center-pixel sample clearing a whole 20-unit cell was the source
    // of square holes through walls, and inconsistent live/fog states.
    const level=intelFogLevel(s.intel,s.site,p,false,fineSeen);
    if(level===2)continue;
    ctx.fillStyle=level===1?'rgba(255,255,255,.76)':'#fff';
    ctx.fillRect(col*20,row*20,20,20);
  }
  // Small explored footprints fill the gaps left by coarse center samples,
  // while preserving the existing 20-unit replay memory and intelligence.
  ctx.filter='blur(1.5px)';
  ctx.fillStyle='rgba(255,255,255,.76)';
  for(let row=0;row<74;row++)for(let col=0;col<64;col++)
    if(s.seenGround.has(MICRO_KEYS[row*MICRO_COLS+col]))
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
  ctx.save();
  ctx.setTransform(FOG_WIDTH/W,0,0,FOG_HEIGHT/H,0,0);
  ctx.filter='none';
  ctx.globalCompositeOperation='destination-out';
  ctx.fillStyle='rgba(255,255,255,.86)';
  for(const room of rooms)
    ctx.fillRect(room.x+4,room.y+4,room.w-8,room.h-8);
  ctx.restore();
}

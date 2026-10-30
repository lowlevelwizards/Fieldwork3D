/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H} from './breach-core.ts';
import {team,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
export const FOG_WIDTH=320,FOG_HEIGHT=370;
export function paintFogMask(ctx:CanvasRenderingContext2D,s:Session){
  ctx.save();
  ctx.setTransform(FOG_WIDTH/W,0,0,FOG_HEIGHT/H,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(0,0,W,H);
  // Neutral-black blind space: no blue tint or translucent cyan wash.
  ctx.fillStyle='rgba(0,0,0,.985)';
  ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='destination-out';
  // Exploration gets a short feather rather than 40-unit hard rectangles.
  // This is presentation only: intel and hidden actor visibility are
  // still checked in the authoritative simulation every tick.
  ctx.filter='blur(5px)';
  for(let row=0;row<37;row++)for(let col=0;col<32;col++){
    const p={x:col*20+10,y:row*20+10};
    const fineSeen=s.seenGround.has('fine:'+col+','+row);
    const level=intelFogLevel(s.intel,s.site,p,false,fineSeen);
    if(level===2)continue;
    ctx.fillStyle=level===1?'rgba(255,255,255,.76)':'#fff';
    ctx.fillRect(col*20,row*20,20,20);
  }
  // Continuous sight polygons are eased along their outline without
  // changing target detection, opacity or LOS blockers.
  ctx.filter='blur(2.5px)';
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

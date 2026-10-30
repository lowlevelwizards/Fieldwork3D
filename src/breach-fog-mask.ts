/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H} from './breach-core.ts';
import {team,knownAt,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
export const FOG_WIDTH=320,FOG_HEIGHT=370;
export function paintFogMask(ctx:CanvasRenderingContext2D,s:Session){
  ctx.save();
  ctx.setTransform(FOG_WIDTH/W,0,0,FOG_HEIGHT/H,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(7,18,20,.97)';
  ctx.fillRect(0,0,W,H);
  // Legacy explored-ground persistence remains authoritative. The low-res
  // texture and filtering remove hard screen-pixel tiles while directional
  // current visibility is polygonal and occlusion-aware.
  for(let row=0;row<19;row++)for(let col=0;col<16;col++){
    const p={x:col*40+20,y:row*40+20};
    const level=intelFogLevel(s.intel,s.site,p,false,knownAt(s,p.x,p.y));
    if(level===2)continue;
    ctx.clearRect(col*40,row*40,40,40);
    ctx.fillStyle=level===1?'rgba(7,18,20,.23)':'rgba(7,18,20,.97)';
    ctx.fillRect(col*40,row*40,40,40);
  }
  ctx.globalCompositeOperation='destination-out';
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

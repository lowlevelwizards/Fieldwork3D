/** One low-resolution, softly filtered fog mask shared by 2D and 3D.
 * The fog presentation never changes detection or player intelligence. */
import {W,H,WALLS,type Pt} from './breach-core.ts';
import type {Site,WorldBounds} from './breach-site.ts';
import {team,type Session} from './breach-game.ts';
import {intelFogLevel} from './breach-intel.ts';
import {exteriorBriefedAt,accessibleExteriorWall} from './breach-site-footprint.ts';
import {visionPolygon} from './breach-vision-polygon.ts';
import {microKeyAt} from './breach-fog-memory.ts';
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
  // Exterior Known is an exterior *region*, not a collection of room
  // rectangles to alternate with even/odd clipping. Those rectangles may
  // overlap at joints: even/odd produces unintended holes inside buildings.
  // Erase reachable exterior first, then re-cover the UNION of all interior
  // modules at their exact physical boundaries before applying real sight.
  if(s.intel.mode==='exterior-known'&&s.site){
    ctx.filter='none';
    ctx.fillStyle='#fff';
    for(let row=Math.floor(bounds.minY/10);row<Math.ceil(bounds.maxY/10);row++)
      for(let col=Math.floor(bounds.minX/10);col<Math.ceil(bounds.maxX/10);col++){
        const p={x:col*10+5,y:row*10+5};
        if(exteriorBriefedAt(s.site,p))ctx.fillRect(col*10,row*10,10,10);
      }
    // All interior modules use source-over compositing, so overlaps stay
    // covered instead of turning into false exterior as parity flips.
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#000';
    for(const room of s.site.rooms)
      ctx.fillRect(room.x,room.y,room.w,room.h);
    ctx.globalCompositeOperation='destination-out';
    // The upper 3D fog curtain must not hide publicly known facade walls,
    // glazing and front doors. A slim perimeter aperture displays their
    // physical silhouettes without opening up the rooms behind them.
    ctx.strokeStyle='#fff';
    ctx.lineWidth=11;
    for(const wall of WALLS){
      if(!accessibleExteriorWall(s.site,wall))continue;
      ctx.beginPath();ctx.moveTo(wall.a.x,wall.a.y);
      ctx.lineTo(wall.b.x,wall.b.y);ctx.stroke();
    }
    for(const door of s.doors){
      if(!accessibleExteriorWall(s.site,door))continue;
      ctx.beginPath();ctx.moveTo(door.a.x,door.a.y);
      ctx.lineTo(door.b.x,door.b.y);ctx.stroke();
    }
    // Window openings are gaps in WALLS, so their exterior frames need
    // their own narrow aperture in the high concealment layer.
    for(const window of s.site.windows??[]){
      if(window.interior)continue;
      const half=window.width/2;
      const a=window.vertical?
        {x:window.x,y:window.y-half}:{x:window.x-half,y:window.y};
      const b=window.vertical?
        {x:window.x,y:window.y+half}:{x:window.x+half,y:window.y};
      if(!accessibleExteriorWall(s.site,{a,b}))continue;
      ctx.beginPath();ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  // Group every remembered tile into one combined path per knowledge
  // level. Blurring each rect separately caused visible staircase corners,
  // overlapping alpha seams and checkerboard patterns after zooming.
  // These visual paths do NOT modify actual sight or persistent knowledge.
  const fineVisible:Pt[]=[];
  const blueprint:Pt[]=[];
  for(let row=Math.floor(bounds.minY/20);row<Math.ceil(bounds.maxY/20);row++)
    for(let col=Math.floor(bounds.minX/20);col<Math.ceil(bounds.maxX/20);col++){
      const p={x:col*20+10,y:row*20+10};
      const fineSeen=s.seenGround.has('fine:'+col+','+row);
      const level=intelFogLevel(s.intel,s.site,p,false,fineSeen);
      if(level===2)continue;
      // Exterior Known is already clipped by exact building footprints.
      if(s.intel.mode==='exterior-known'&&s.site&&!fineSeen&&level===1)continue;
      if(s.intel.mode==='floor-plan'&&!fineSeen)blueprint.push({x:col*20,y:row*20});
      else fineVisible.push({x:col*20,y:row*20});
    }
  ctx.filter='blur(2.8px)';
  ctx.fillStyle='rgba(255,255,255,.76)';
  if(fineVisible.length){
    ctx.beginPath();
    for(const p of fineVisible)ctx.rect(p.x,p.y,20,20);
    ctx.fill();
  }
  ctx.fillStyle='rgba(255,255,255,.34)';
  if(blueprint.length){
    ctx.beginPath();
    for(const p of blueprint)ctx.rect(p.x,p.y,20,20);
    ctx.fill();
  }
  // Micro-memory is a continuous union before feathering, not hundreds
  // of independently blurred pixel blocks.
  ctx.filter='blur(3px)';
  ctx.fillStyle='rgba(255,255,255,.76)';
  ctx.beginPath();
  let microCount=0;
  for(let row=Math.floor(bounds.minY/10);row<Math.ceil(bounds.maxY/10);row++)
    for(let col=Math.floor(bounds.minX/10);col<Math.ceil(bounds.maxX/10);col++)
      if(s.seenGround.has(microKeyAt(col,row))){
        ctx.rect(col*10,row*10,10,10);microCount++;
      }
  if(microCount)ctx.fill();
  // Keep actual directional line-of-sight polygons exact; a light edge
  // feather is display-only and cannot grant tactical information.
  ctx.filter='blur(2px)';
  ctx.fillStyle='#fff';
  ctx.beginPath();
  let polygonCount=0;
  for(const a of team(s)){
    if(a.health<=0)continue;
    const poly=visionPolygon(a.p,a.heading,240,undefined,s.doors,
      a.posture==='crouch');
    if(poly.length<3)continue;
    ctx.moveTo(poly[0].x,poly[0].y);
    for(let i=1;i<poly.length;i++)ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath();polygonCount++;
  }
  if(polygonCount)ctx.fill();
  ctx.restore();
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

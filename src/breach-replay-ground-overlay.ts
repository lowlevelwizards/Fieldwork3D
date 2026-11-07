/** R4.2b: display ONLY the operator's historically recorded ground cells.
 * This is a transparent evidence tint, NOT an operator-specific fog renderer:
 * buildings, civilians, door state, and briefing memory remain squad-wide.
 * No LOS or visibility is computed during playback or scrubbing.
 */
import type {Site} from './breach-site.ts';
import {maskBounds,maskSize} from './breach-fog-mask.ts';

export function paintReplayPersonalGround(
  ctx:CanvasRenderingContext2D,site:Site|null|undefined,
  recorded:ReadonlySet<string>
):number{
  const bounds=maskBounds(site),size=maskSize(site);
  if(ctx.canvas.width!==size.width||ctx.canvas.height!==size.height){
    ctx.canvas.width=size.width;ctx.canvas.height=size.height;
  }
  const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  ctx.save();
  ctx.setTransform(size.width/width,0,0,size.height/height,
    -bounds.minX*size.width/width,-bounds.minY*size.height/height);
  ctx.clearRect(bounds.minX,bounds.minY,width,height);
  ctx.beginPath();
  let count=0;
  for(const key of recorded){
    const micro=key.startsWith('micro:');
    const fine=key.startsWith('fine:');
    // Do not draw coarse keys: they only signify approximate team intel,
    // and would imply a falsely precise personally-observed footprint.
    if(!micro&&!fine)continue;
    const match=/^(?:micro|fine):(-?\d+),(-?\d+)$/.exec(key);
    if(!match)continue;
    const col=Number(match[1]),row=Number(match[2]);
    if(!Number.isSafeInteger(col)||!Number.isSafeInteger(row))continue;
    const cell=micro?10:20,x=col*cell,y=row*cell;
    if(x>=bounds.maxX||x+cell<=bounds.minX||
      y>=bounds.maxY||y+cell<=bounds.minY)continue;
    ctx.rect(x,y,cell,cell);count++;
  }
  ctx.fillStyle='rgba(222,185,113,.26)';
  if(count)ctx.fill();
  ctx.restore();
  return count;
}

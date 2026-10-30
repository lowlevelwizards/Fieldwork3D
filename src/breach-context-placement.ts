/** Side-first contextual UI placement in screen pixels.
 * Keep map selection and the projected actors/paths clear on narrow phones.
 * Pure geometry: safe to test without DOM, WebGL or a browser.
 */
export type ScreenPoint={x:number;y:number};
export type ScreenRect={x:number;y:number;w:number;h:number};
export type AvoidRect=ScreenRect&{weight?:number};
export type ScreenPath={a:ScreenPoint;b:ScreenPoint};
export type MenuSide='left'|'right';
export type ContextMenuPlacement=ScreenPoint&{side:MenuSide};

const clamp=(n:number,lo:number,hi:number)=>Math.min(Math.max(n,lo),hi);
const area=(a:ScreenRect,b:ScreenRect)=>
  Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
  Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));

/** Line/rectangle intersection including crossing segments with both ends outside. */
export function pathOverlapsRect(path:ScreenPath,rect:ScreenRect,pad=6){
  const minX=rect.x-pad,maxX=rect.x+rect.w+pad;
  const minY=rect.y-pad,maxY=rect.y+rect.h+pad;
  const {a,b}=path,dx=b.x-a.x,dy=b.y-a.y;
  let start=0,end=1;
  for(const [p,q] of [[-dx,a.x-minX],[dx,maxX-a.x],
    [-dy,a.y-minY],[dy,maxY-a.y]]){
    if(p===0){if(q<0)return false;continue;}
    const t=q/p;
    if(p<0)start=Math.max(start,t);
    else end=Math.min(end,t);
    if(start>end)return false;
  }
  return true;
}

export function placeContextMenu({
  anchor,width,height,viewportWidth,top,bottom,avoid=[],paths=[],preferredSide,
}:{
  anchor:ScreenPoint;
  width:number;height:number;
  viewportWidth:number;top:number;bottom:number;
  avoid?:AvoidRect[];
  paths?:ScreenPath[];
  preferredSide?:MenuSide|null;
}):ContextMenuPlacement{
  const margin=8,gap=48;
  const safeWidth=Math.max(0,viewportWidth-width-2*margin);
  const xMin=margin,xMax=margin+safeWidth;
  const yMin=top,yMax=Math.max(top,bottom-height);
  // Prefer beside the interaction rather than hovering above/below it.
  // Edge rails help on small phones where a full floating panel doesn't fit.
  const xs=viewportWidth<=600?[
    // Edge rails leave the middle of a phone free for camera gestures.
    {x:xMin,side:'left' as const},
    {x:xMax,side:'right' as const},
  ]:[
    {x:anchor.x-width-gap,side:'left' as const},
    {x:anchor.x+gap,side:'right' as const},
    {x:xMin,side:'left' as const},
    {x:xMax,side:'right' as const},
  ];
  const ys=[anchor.y-height/2,anchor.y-height-58,anchor.y+58,
    yMin,yMax];
  let best:ContextMenuPlacement={x:xMin,y:yMin,side:'left'};
  let bestScore=Infinity;
  for(const [ix,choice] of xs.entries())for(const [iy,originalY] of ys.entries()){
    const x=clamp(choice.x,xMin,xMax),y=clamp(originalY,yMin,yMax);
    const rect={x,y,w:width,h:height};
    let score=0;
    for(const obstacle of avoid)
      score+=area(rect,obstacle)*14*(obstacle.weight??1);
    for(const path of paths)
      if(pathOverlapsRect(path,rect))score+=1400;
    // Clamped side proposals are allowed only as fallbacks. Prefer stable
    // edge rails to panels that drift across the selected operator.
    score+=Math.abs(x-choice.x)*4+Math.abs(y-originalY)*.65;
    score+=Math.abs(y+height/2-anchor.y)*.32;
    score+=Math.abs(x+width/2-anchor.x)*.07;
    if(preferredSide===choice.side)score-=280;
    // Adjacent side positions before rails when both are equally clear.
    score+=ix*2+iy*.1;
    if(score<bestScore){
      bestScore=score;
      best={x,y,side:choice.side};
    }
  }
  return best;
}

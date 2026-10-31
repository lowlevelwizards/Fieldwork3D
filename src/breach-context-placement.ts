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

/** Empty-space-first placement: protect reachable editing space before proximity. */
function pointRectDistance(p:ScreenPoint,r:ScreenRect){
  const dx=Math.max(r.x-p.x,0,p.x-r.x-r.w);
  const dy=Math.max(r.y-p.y,0,p.y-r.y-r.h);
  return Math.hypot(dx,dy);
}
export function placeContextMenu({
  anchor,width,height,viewportWidth,top,bottom,avoid=[],paths=[],
  preferredSide,authoring=[],corridor,minClearance=102,preferredPosition,
}:{
  anchor:ScreenPoint;width:number;height:number;viewportWidth:number;
  top:number;bottom:number;avoid?:AvoidRect[];paths?:ScreenPath[];
  preferredSide?:MenuSide|null;
  authoring?:ScreenRect[];corridor?:ScreenPath|null;
  minClearance?:number;preferredPosition?:ScreenPoint|null;
}):ContextMenuPlacement{
  const margin=8,xMin=margin,xMax=Math.max(margin,viewportWidth-width-margin);
  const yMin=top,yMax=Math.max(yMin,bottom-height);
  // Candidate screen pockets, not merely the nearest side/edge.
  const xs=[xMin,xMax,anchor.x-width-120,anchor.x+120,
    viewportWidth*.25-width/2,viewportWidth*.5-width/2,
    viewportWidth*.75-width/2];
  const ys=[yMin,yMax,anchor.y-height*.5,anchor.y-height-140,
    anchor.y+140];
  for(let k=0;k<=12;k++)ys.push(yMin+(yMax-yMin)*k/12);
  let best:ContextMenuPlacement={x:xMin,y:yMin,side:'left'};
  let bestScore=Infinity;
  const seen=new Set<string>();
  for(const proposedX of xs)for(const proposedY of ys){
    const x=clamp(proposedX,xMin,xMax),y=clamp(proposedY,yMin,yMax);
    const key=Math.round(x)+':'+Math.round(y);
    if(seen.has(key))continue;
    seen.add(key);
    const rect={x,y,w:width,h:height};
    const side:MenuSide=x+width*.5<anchor.x?'left':'right';
    let score=0;
    // Hard exclusion around the selected point and valuable future tap locations.
    const clearance=pointRectDistance(anchor,rect);
    if(clearance<minClearance)score+=(minClearance-clearance)**2*26;
    for(const zone of authoring)score+=area(rect,zone)*32;
    if(corridor&&pathOverlapsRect(corridor,rect,70))score+=21000;
    for(const zone of avoid)score+=area(rect,zone)*15*(zone.weight??1);
    for(const path of paths)if(pathOverlapsRect(path,rect,10))score+=1700;
    // Once clear, prefer a reasonably near pocket with persistent side choice.
    score+=Math.hypot(x+width*.5-anchor.x,y+height*.5-anchor.y)*.09;
    if(preferredSide===side)score-=320;
    if(preferredPosition){
      const delta=Math.hypot(x-preferredPosition.x,y-preferredPosition.y);
      if(delta<28)score-=850;
      else if(delta<65)score-=400;
    }
    if(score<bestScore){bestScore=score;best={x,y,side};}
  }
  return best;
}

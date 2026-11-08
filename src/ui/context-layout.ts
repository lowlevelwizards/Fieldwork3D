/** Alternate presentations of the same contextual tactical actions. */
export type ContextLayout='dock'|'bubbles'|'floating';
export const DEFAULT_CONTEXT_LAYOUT:ContextLayout='dock';
export const BUBBLE_WIDTH=320;
export const BUBBLE_HEIGHT=286;

export function parseContextLayout(value:string|null):ContextLayout{
  return value==='dock'||value==='bubbles'||value==='floating'?
    value:DEFAULT_CONTEXT_LAYOUT;
}
export type BubblePoint={x:number;y:number};
/** Absolute offsets from the menu center, independent of tactical state. */
export function bubbleSlots(count:number):BubblePoint[]{
  if(count<=0)return [];
  if(count===1)return [{x:0,y:-101}];
  if(count===2)return [{x:-86,y:-77},{x:86,y:-77}];
  const n=Math.min(16,count);
  return Array.from({length:n},(_,index)=>{
    const angle=-Math.PI/2+index*2*Math.PI/n;
    return {x:Math.round(124*Math.cos(angle)),
      y:Math.round(107*Math.sin(angle))};
  });
}
export type BubbleBounds={anchorX:number;anchorY:number;
  viewportWidth:number;top:number;hudTop:number};
/** Do not pin a radial UI to an off-screen actor or overlap header/HUD. */
export function bubblePlacement(bounds:BubbleBounds):{x:number;y:number}|null{
  const {anchorX,anchorY,viewportWidth,top,hudTop}=bounds;
  if(viewportWidth<BUBBLE_WIDTH+16||hudTop-top<BUBBLE_HEIGHT+16||
    anchorX< -24||anchorX>viewportWidth+24||
    anchorY<top-65||anchorY>hudTop+45)return null;
  return {
    x:Math.max(8,Math.min(viewportWidth-BUBBLE_WIDTH-8,
      anchorX-BUBBLE_WIDTH/2)),
    y:Math.max(top,Math.min(hudTop-BUBBLE_HEIGHT-8,
      anchorY-BUBBLE_HEIGHT/2)),
  };
}

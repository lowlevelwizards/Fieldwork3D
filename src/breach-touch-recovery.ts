/** Map active touch contacts to their PointerEvent counterparts without
 * assuming Touch.identifier and PointerEvent.pointerId share a numbering scheme.
 * Most accurate when called on each touchstart/touchmove/touchend: a real
 * contact's last coordinates closely match its corresponding tracked pointer. */
export type TouchPoint={x:number;y:number};
export function matchActiveTouchPointers<T extends TouchPoint>(
  pointers:ReadonlyMap<number,T>,touches:readonly TouchPoint[]):Set<number>{
  const candidates=[...pointers];
  const retained=new Set<number>();
  for(const touch of touches){
    if(!candidates.length)break;
    let nearest=0,bestDistance=Infinity;
    for(let i=0;i<candidates.length;i++){
      const p=candidates[i][1];
      const gap=(p.x-touch.x)**2+(p.y-touch.y)**2;
      if(gap<bestDistance){bestDistance=gap;nearest=i;}
    }
    retained.add(candidates[nearest][0]);
    candidates.splice(nearest,1);
  }
  return retained;
}

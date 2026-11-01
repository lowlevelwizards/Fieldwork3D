/** Cuts a real opening in authoritative wall geometry. No render-only apertures. */
import type {Pt,Segment} from '../breach-core.ts';
export type Aperture={id:string;a:Pt;b:Pt;width:number};
export function cutWallAperture(walls:readonly Segment[],index:number,id:string,
 width:number,fraction=.5,minPier=18):{walls:Segment[];aperture:Aperture}|null{
 const host=walls[index];if(!host||!Number.isFinite(width)||!Number.isFinite(fraction)||
  width<=0||minPier<0||fraction<=0||fraction>=1)return null;
 const length=Math.hypot(host.b.x-host.a.x,host.b.y-host.a.y);
 const start=length*fraction-width/2,end=start+width;
 if(!length||start<minPier||end>length-minPier)return null;
 const point=(distance:number):Pt=>({x:host.a.x+(host.b.x-host.a.x)*distance/length,
  y:host.a.y+(host.b.y-host.a.y)*distance/length});
 const a=point(start),b=point(end),result=walls.slice();
 result.splice(index,1,{a:host.a,b:a},{a:b,b:host.b});
 return {walls:result,aperture:{id,a,b,width}};
}

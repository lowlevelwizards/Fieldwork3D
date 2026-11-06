/** AK R4.4 — curved ribbon magazine silhouettes in weapon-local XY.
 * Profile width is defined across the NORMAL of the centerline, never as
 * independent hand-authored toe vertices. Exterior art only: no ammo data.
 */
export type Pt=readonly [number,number];
export type AKMagazineStyle='762'|'545'|'rpk45';
export type AKMagazineCurve={
 style:AKMagazineStyle;topX:number;topY:number;
 width:number;depth:number;length:number;sweep:number;power:number;
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function akMagazineCurve(style:AKMagazineStyle,
 topX=.95,topY=-2.1,width=3.05,depth=2.2):AKMagazineCurve{
 const dimensions={
  '762':{length:6.05,sweep:2.65,power:1.50},
  '545':{length:5.55,sweep:1.44,power:1.48},
  'rpk45':{length:8.25,sweep:2.78,power:1.55}
 } as const;
 return {style,topX,topY,width,depth,...dimensions[style]};
}
/** Unit tangent and perpendicular at t — normal always points muzzleward. */
export function akMagazineSample(c:AKMagazineCurve,t:number){
 const s=clamp(t),dx=c.sweep*c.power*Math.pow(s,c.power-1),
  dy=-c.length,len=Math.hypot(dx,dy);
 return {
  x:c.topX+c.sweep*Math.pow(s,c.power),y:c.topY-c.length*s,
  nx:-dy/len,ny:dx/len
 };
}
export function akMagazineWidthPoints(c:AKMagazineCurve,t:number):[Pt,Pt]{
 const p=akMagazineSample(c,t),h=c.width/2;
 return [[p.x-p.nx*h,p.y-p.ny*h],[p.x+p.nx*h,p.y+p.ny*h]];
}
/** Always <= 12 vertices: consistent-width side profile, rotated toe. */
export function akMagazineOutline(c:AKMagazineCurve):Pt[]{
 const ts=c.style==='rpk45'?[0,.2,.4,.6,.8,1]:
  [0,.25,.5,.75,1];
 const pair=ts.map(t=>akMagazineWidthPoints(c,t));
 return [...pair.map(p=>p[0]),...pair.reverse().map(p=>p[1])];
}
/** Exactly two curved, thick side-surface ribs on 7.62 magazines.
 * Uses four longitudinal cross-sections per rib => one 8-vertex outline.
 * Cross section is normal-offset, so the rib follows magazine bend.
 */
export function akMagazineRibOutlines(c:AKMagazineCurve):Pt[][]{
 if(c.style!=='762')return [];
 return [-.17,.17].map(offset=>{
  const ts=[.055,.32,.58,.90];
  const half=.205;
  const left:Pt[]=[],right:Pt[]=[];
  for(const t of ts){
   const p=akMagazineSample(c,t);
   left.push([p.x+p.nx*(offset*c.width-half),
    p.y+p.ny*(offset*c.width-half)]);
   right.push([p.x+p.nx*(offset*c.width+half),
    p.y+p.ny*(offset*c.width+half)]);
  }
  return [...left,...right.reverse()];
 });
}

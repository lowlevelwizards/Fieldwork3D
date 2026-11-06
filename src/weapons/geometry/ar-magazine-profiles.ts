/** Stylized STANAG profile ribbons using the same centerline/normal
 * construction as the successful AK silhouette family.
 * All lengths are WEAPON-LOCAL game art, not physical magazine specifications.
 */
export type Point2=readonly [number,number];
export type ARMagazineStyle='20'|'30'|'poly';
export type ARMagazineCurve={
 style:ARMagazineStyle;topX:number;topY:number;width:number;depth:number;
 length:number;sweep:number;power:number;
};
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
export function arMagazineCurve(style:ARMagazineStyle,topX=1,topY=-2.15,
 width=3.38,depth=1.83):ARMagazineCurve{
 const profile={
  '20':{length:4.10,sweep:.10,power:1.48},
  '30':{length:5.30,sweep:.80,power:1.48},
  'poly':{length:5.20,sweep:.75,power:1.48}
 } as const;
 return {style,topX,topY,width,depth,...profile[style]};
}
/** Tangent-derived normal; front and rear edges share one width at each t. */
export function arMagazineSample(c:ARMagazineCurve,t:number){
 const s=clamp(t),dx=c.sweep*c.power*Math.pow(s,c.power-1);
 const dy=-c.length,len=Math.hypot(dx,dy);
 return {
  x:c.topX+c.sweep*Math.pow(s,c.power),y:c.topY-c.length*s,
  nx:-dy/len,ny:dx/len
 };
}
export function arMagazineWidthPoints(c:ARMagazineCurve,t:number,extra=0):[Point2,Point2]{
 const p=arMagazineSample(c,t),half=(c.width+extra)/2;
 return [[p.x-p.nx*half,p.y-p.ny*half],[p.x+p.nx*half,p.y+p.ny*half]];
}
/** Ten contour vertices, leaving one shared smooth width definition. */
export function arMagazineOutline(c:ARMagazineCurve):Point2[]{
 const pairs=[0,.25,.5,.75,1].map(t=>arMagazineWidthPoints(c,t));
 return [...pairs.map(x=>x[0]),...pairs.reverse().map(x=>x[1])];
}
/** Two thick contour-following press lines on metal STANAGs only. */
export function arMagazineRibOutlines(c:ARMagazineCurve):Point2[][]{
 if(c.style==='poly')return [];
 const half=c.style==='20'?.12:.17,starts=[-.18,.18];
 return starts.map(offset=>{
  const left:Point2[]=[],right:Point2[]=[];
  for(const t of [.06,.32,.62,.94]){
   const p=arMagazineSample(c,t),x=offset*c.width;
   left.push([p.x+p.nx*(x-half),p.y+p.ny*(x-half)]);
   right.push([p.x+p.nx*(x+half),p.y+p.ny*(x+half)]);
  }
  return [...left,...right.reverse()];
 });
}
/** Integrated heavy polymer toe; its forward bias is purely art geometry. */
export function arMagazinePolyBaseplate(c:ARMagazineCurve):Point2[]{
 const a=arMagazineWidthPoints(c,.83,.13);
 const b=arMagazineWidthPoints(c,1,.13);
 const bias=.12;
 return [
  [a[0][0]+bias,a[0][1]],[b[0][0]+bias,b[0][1]],
  [b[1][0]+bias,b[1][1]],[a[1][0]+bias,a[1][1]]
 ];
}

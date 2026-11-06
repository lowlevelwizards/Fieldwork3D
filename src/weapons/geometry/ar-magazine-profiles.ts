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
  // Keep the upper insertion region straight; concentrate gentle sweep
  // toward the bottom like the successful AK-derived centerline system.
  '30':{length:5.30,sweep:.80,power:1.78},
  'poly':{length:5.20,sweep:.75,power:1.72}
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
 const half=c.style==='20'?.12:.15,starts=[-.20,.20];
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

/** Quiet lower-side molded facet, NOT the abandoned square panel decal.
 * Built from the same normal-offset geometry as the parent polymer body.
 */
export function arMagazinePolyLowerFacet(c:ARMagazineCurve):Point2[]{
 const a=arMagazineSample(c,.61),b=arMagazineSample(c,.94);
 return [
  [a.x+a.nx*c.width*.23,a.y+a.ny*c.width*.23],
  [b.x+b.nx*c.width*.23,b.y+b.ny*c.width*.23],
  [b.x+b.nx*c.width*.44,b.y+b.ny*c.width*.44],
  [a.x+a.nx*c.width*.39,a.y+a.ny*c.width*.39]
 ];
}

/** MA4: graphic, deterministic weathering shapes. Normalized coordinates
 * are clipped to existing physical event bounds by the caller. No geometry,
 * scene state, or per-pixel random sampling. */
import type {WallEffect,SurfaceEvent} from './wall-surface-recipe.ts';
type Point=readonly [number,number];
const sat=(x:number)=>Math.max(0,Math.min(1,x));
export function artHash(n:number){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967295;}
export function eventArtSeed(event:SurfaceEvent,seed=0){
 let n=seed^Math.round(event.x*31+event.y*113);
 for(let i=0;i<event.cause.length;i++)n=Math.imul(n^event.cause.charCodeAt(i),16777619);
 return n;
}
const lineDistance=(x:number,y:number,a:Point,b:Point)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],t=sat(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));
 return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
};
const lobe=(u:number,v:number,x:number,y:number,rx:number,ry:number)=>Math.abs((u-x)/rx)**1.45+Math.abs((v-y)/ry)**1.45;
export type ArtInk={coverage:number;tone:0|1|2};
const ink=(coverage:number,tone:0|1|2=1):ArtInk=>({coverage,tone});
/** Geometry changes with wear progress, but the underlying shape identity
 * stays fixed. Dark core, midtone and pale edge are separate color roles. */
export function prepareWallArt(kind:WallEffect,seed:number,progress:number,texelU:number,texelV:number,edgeSide?:1|-1){
 const flip=edgeSide??(artHash(seed+2)<.5?-1:1);
 const rand=(i:number)=>artHash(seed+Math.imul(i+1,0x9e3779b1));
 const edge=Array.from({length:9},(_,i)=>rand(i)*.32-.16);
 const contour=(u:number)=>edge[Math.min(8,Math.max(0,Math.floor((u+1)*4)))];
 const growth=.64+.36*progress;
 const splashPatches=[[-.46,.34,.34,.44],[.12,.56,.41,.34],[.51,.13,.23,.28],[-.10,-.43,.13,.22]];
 const phase=(rand(23)-.5)*.18;
 const points:Point[]=[[-.30,-.94],[-.18,-.66],[-.33,-.38],[.03,-.10],[-.07,.15],[.26,.38],[.16,.61],[.48,.91]].map(([x,y],i)=>[x+(rand(i+30)-.5)*.22,y] as Point);
 const main:Point[]=points.map(([x,y])=>[x,y]);
 const branches:Point[][]=[[main[3],[.49,-.25],[.78,-.19]],[main[5],[-.28,.50],[-.64,.77]]];
 // A continuous path even in the coarse 24-row atlas: use a conservative
 // raster footprint rather than a row-index zigzag or isolated dots.
 const stroke=Math.max(.075,.55*Math.hypot(texelU,texelV));
 const repairAngular=rand(51)<.5;
 const path=(u:number,v:number,ps:Point[],thickness:number)=>{for(let i=1;i<ps.length;i++)if(lineDistance(u,v,ps[i-1],ps[i])<thickness)return true;return false;};
 return (rawU:number,rawV:number):ArtInk=>{
  const u=rawU*flip,v=rawV,jag=contour(u);
  const x=u/growth,y=v/growth;
  switch(kind){
   case 'fade':{
    const bottom=.08+contour(u)*1.3+progress*.31;
    if(Math.abs(u)>.94||v>bottom||v<-.99)return ink(0);
    return ink(v>bottom-.20?.27:.47,v>bottom-.20?0:1);
   }
   case 'contact':{
    const body=Math.min(lobe(x,y,-.32,.12,.58,.55),lobe(x,y,.28,-.14,.48,.37));
    const upper=Math.abs(y+.22+x*.17+contour(x)*.5)<Math.max(.09,texelV*.37)&&x>-.72&&x<.18;
    const lower=Math.abs(y-.23+x*.13)<Math.max(.075,texelV*.32)&&x>-.16&&x<.67;
    if(upper||lower)return ink(.67,2);
    return body<1+jag?ink(.38,1):ink(0);
   }
   case 'chip':{
    const boundary=-.13+contour(v)*2.3+.13*Math.sin(v*5);
    const atEdge=u<boundary&&u>-.97&&v>-.88&&v<.93;
    if(atEdge)return ink(u<boundary-.19?.89:.64,u<boundary-.19?2:0);
    if(progress>.6&&lobe(x,y,.28,.36,.15,.19)<1)return ink(.77,1);
    return ink(0);
   }
   case 'damp':{
    const top=-.03-.43*progress+contour(u)*1.9+.28*Math.abs(u);
    const side=.91-.12*Math.max(0,-v);
    if(v<top||Math.abs(u)>side)return ink(0);
    if(v<top+.17)return ink(.34,0);
    if(v>.48+contour(u)*1.15)return ink(.77,2);
    return ink(.63,1);
   }
   case 'runoff':{
    const center=-.32+phase+.10*Math.max(0,v)+contour(v)*.23;
    const w=Math.max(texelU*.53,.19*(1-(v+1)*.30));
    if(v>-.99&&v<-.12+progress*1.05&&Math.abs(u-center)<w)return ink(.78,Math.abs(u-center)<w*.57?2:1);
    if(v>-.99&&v<-.50+progress*.91&&Math.abs(u-.35-phase)<Math.max(texelU*.48,.10))return ink(.60,1);
    return ink(0);
   }
   case 'crack':{
    if(v<-.98||v>-.2+1.16*progress)return ink(0);
    if(path(u,v,main,stroke*.85))return ink(.82,2);
    if(progress>.65&&path(u,v,branches[0],stroke*.63))return ink(.56,2);
    if(path(u-.10,v,main,stroke*.47))return ink(.29,0);
    return ink(0);
   }
   case 'repair':{
    const region=repairAngular?Math.max(Math.abs(x+.08)/.83,Math.abs(y)/.78):Math.max(Math.abs(x+.07)/.80,Math.abs(y+.08)/(.79+jag*.7));
    if(region>1+jag*.46)return ink(0);
    return ink(region>.80?.45:.73,region>.80?0:1);
   }
   case 'moss':{
    const top=-.14+contour(u)*2.4-.21*progress+.25*Math.abs(u);
    if(Math.abs(u)>.95||v<top)return ink(0);
    return ink(v>top+.49?.88:.71,v>top+.49?2:v<top+.20?0:1);
   }
   case 'rust':{
    const seam=phase*.32+contour(v)*.23;
    const bloom=Math.min(lobe(x,y,-.08,-.48,.36,.45),lobe(x,y,.10,-.03,.27,.44));
    if(bloom<.46+jag)return ink(.83,2);
    if(bloom<1+jag)return ink(.79,0);
    const trail=Math.max(.09,texelU*.52);
    if(v>-.68&&v<.16+progress*.79&&Math.abs(u-seam)<trail*(1.21-.30*v))return ink(.74,1);
    if(progress>.65&&v>.1&&v<.62&&Math.abs(u+.31)<trail*.58)return ink(.57,0);
    return ink(0);
   }
   case 'grease':{
    const body=Math.min(lobe(x,y,-.24,.40,.69,.51),lobe(x,y,.29,.33,.51,.54),lobe(x,y,.02,-.27,.35,.58));
    if(body>1+jag)return ink(0);
    return ink(body<.65&&v>.12?.76:.48,body<.65&&v>.12?2:1);
   }
   case 'splash':{
    let body=Infinity;for(const [a,b,c,d] of splashPatches)body=Math.min(body,lobe(x,y,a,b,c,d));
    if(body<1+jag)return ink(body>.62?.83:.45,body>.62?0:1);
    if(v>-.24&&v<.8&&Math.abs(u-.5)<Math.max(.08,texelU*.48))return ink(.59,1);
    return ink(0);
   }
   case 'workgrime':{
    const body=Math.min(lobe(x,y,-.30,.11,.65,.65),lobe(x,y,.35,-.06,.55,.48));
    if(body>1+jag)return ink(0);
    const rubbed=(x<.22&&Math.abs(y+x*.15+.12)<Math.max(.09,texelV*.39))||(x>-.20&&Math.abs(y-.34+x*.07)<Math.max(.08,texelV*.35));
    return ink(rubbed?.73:.44,rubbed?2:1);
   }
  }
 };
}

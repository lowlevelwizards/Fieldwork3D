/** MA4: graphic, deterministic weathering shapes. Normalized coordinates
 * are clipped to existing physical event bounds by the caller. No geometry,
 * scene state, or per-pixel random sampling. */
import type {WallEffect,SurfaceEvent} from './worldgen/wall-surface-recipe.ts';
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
export function prepareWallArt(kind:WallEffect,seed:number,progress:number,texelU:number,texelV:number){
 const flip=artHash(seed+2)<.5?-1:1;
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
 const path=(u:number,v:number,ps:Point[],thickness:number)=>{for(let i=1;i<ps.length;i++)if(lineDistance(u,v,ps[i-1],ps[i])<thickness)return true;return false;};
 return (rawU:number,rawV:number):ArtInk=>{
  const u=rawU*flip,v=rawV,jag=contour(u);
  const x=u/growth,y=v/growth;
  switch(kind){
   case 'fade':{
    const bottom=.23+contour(u)*1.8+progress*.41;
    if(Math.abs(u)>.89||v>bottom||v<-.95)return ink(0);
    return ink(v>bottom-.22?.34:.58,v>bottom-.22?0:1);
   }
   case 'contact':{
    const broad=lobe(x,y,-.15,.03,.93,.73);
    const upper=Math.abs(y+.31+x*.17+contour(x)*.5)<Math.max(.13,texelV*.6)&&x>-.81&&x<.60;
    const lower=Math.abs(y-.31+x*.13)<Math.max(.10,texelV*.5)&&x>-.45&&x<.88;
    if(upper||lower)return ink(.85,2);
    return broad<1+jag?ink(.45,1):ink(0);
   }
   case 'chip':{
    const body=lobe(x,y,-.2,.18,.76,.78);
    if(body<.64+jag)return ink(.95,2);
    if(body<1+jag)return ink(.92,0);
    if(progress>.6&&lobe(x,y,.68,-.52,.20,.24)<1)return ink(.88,1);
    return ink(0);
   }
   case 'damp':{
    const top=-.12-.51*progress+contour(u)*2.1+.20*Math.abs(u);
    if(v<top||Math.abs(u)>.96)return ink(0);
    if(v<top+.15)return ink(.62,0);
    if(v>.46+contour(u)*.9)return ink(.91,2);
    return ink(.74,1);
   }
   case 'runoff':{
    const center=-.32+phase+.11*Math.max(0,v)+contour(v)*.30;
    const w=Math.max(texelU*.57,.22*(1-(v+1)*.31));
    if(v>-.93&&v<-.1+progress*.99&&Math.abs(u-center)<w)return ink(.86,Math.abs(u-center)<w*.58?2:1);
    if(v>-.90&&v<-.45+progress*.76&&Math.abs(u-.41-phase)<Math.max(texelU*.48,.115))return ink(.66,1);
    return ink(0);
   }
   case 'crack':{
    if(v<-.98||v>-.2+1.16*progress)return ink(0);
    if(path(u,v,main,stroke))return ink(.94,2);
    if(progress>.65&&branches.some(b=>path(u,v,b,stroke*.74)))return ink(.73,2);
    if(path(u-.12,v,main,stroke*.5))return ink(.50,0);
    return ink(0);
   }
   case 'repair':{
    const region=lobe(x,y,0,0,.88,.86);
    if(region>1+jag*.8)return ink(0);
    return ink(region>.78?.70:.88,region>.78?0:1);
   }
   case 'moss':{
    const tops=[-.18,-.52,-.08,-.68,-.31,-.10,-.48,-.18,-.36];
    const top=tops[Math.min(8,Math.max(0,Math.floor((u+1)*4)))]+jag-.18*progress;
    if(Math.abs(u)>.95||v<top)return ink(0);
    return ink(v>top+.48?.96:.83,v>top+.48?2:v<top+.20?0:1);
   }
   case 'rust':{
    const bloom=lobe(x,y,-.05,-.40,.76,.51);
    if(bloom<.62+jag)return ink(.94,2);
    if(bloom<1+jag)return ink(.90,0);
    const trail=Math.max(.11,texelU*.55);
    if(v>-.48&&v<.2+progress*.74&&Math.abs(u-phase-contour(v)*.35)<trail*(1.28-.38*v))return ink(.83,1);
    if(progress>.65&&v>.0&&v<.76&&Math.abs(u+.37)<trail*.62)return ink(.72,0);
    return ink(0);
   }
   case 'grease':{
    const body=Math.min(lobe(x,y,-.24,.25,.64,.70),lobe(x,y,.35,.43,.50,.52),lobe(x,y,.06,-.35,.42,.54));
    if(body>1+jag)return ink(0);
    return ink(body<.62&&v>.10?.81:.54,body<.62&&v>.10?2:1);
   }
   case 'splash':{
    let body=Infinity;for(const [a,b,c,d] of splashPatches)body=Math.min(body,lobe(x,y,a,b,c,d));
    if(body<1+jag)return ink(.79,body>.61?0:1);
    if(v>-.24&&v<.8&&Math.abs(u-.5)<Math.max(.08,texelU*.48))return ink(.60,1);
    return ink(0);
   }
   case 'workgrime':{
    const body=Math.min(lobe(x,y,-.30,.11,.65,.65),lobe(x,y,.35,-.06,.55,.48));
    if(body>1+jag)return ink(0);
    const rubbed=Math.abs(y+x*.15+.12)<Math.max(.12,texelV*.48)||Math.abs(y-.34+x*.07)<Math.max(.09,texelV*.4);
    return ink(rubbed?.92:.55,rubbed?2:1);
   }
  }
 };
}

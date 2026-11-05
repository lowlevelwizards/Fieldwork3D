/** Camouflage 6A: eight original, periodically seamless 64px fabric illustrations.
 * Shapes and colors are stylized, NOT copies of licensed print masters.
 * This produces fixed tile bytes once, not animated or per-frame noise.
 */
export const CAMO6A_IDS=[
 'atacs-fg','ukrainian-mm14','aor2','multicam-tropic',
 'atacs-au','ss-leto','aor1','multicam-arid'
] as const;
export type Camo6AId=typeof CAMO6A_IDS[number];
type RGB=readonly [number,number,number];
type Motif=readonly [number,readonly number[]];
export type Camo6ARecipe={
 label:string;description:string;
 colors:readonly RGB[];targetCoverage:readonly number[];motifs:readonly Motif[];
};
type Camo6ABase=Camo6ARecipe & {seed:number;axis:'soft'|'pixel'|'vertical'|'horizontal'|'leaf'};
const p=(ink:number,...xy:number[]):Motif=>[ink,xy];
/** Ink ordering runs from lightest to deepest within each original illustration.
 * Ratios are authored pigment goals; rank-based cutoffs preserve them precisely.
 * Polygons influence the texture topology BEFORE the percentile boundaries.
 */
const MASTER:Readonly<Record<Camo6AId,Camo6ABase>>={
 'atacs-fg':{
  label:'A-TACS FG',description:'Soft lichen-green and bark-brown macro clouds with organic pixel microbreakup, not hard-edged woodland blotches',
  colors:[[170,173,137],[122,140,105],[94,108,82],[131,113,83],[52,66,54]],
  targetCoverage:[.19,.27,.25,.18,.11],seed:21,axis:'soft',
  motifs:[
   p(4,5,6,15,3,24,7,27,15,19,23,11,19,6,14),
   p(0,30,15,43,8,54,15,56,25,44,28,36,24),
   p(3,9,38,24,32,31,39,27,51,13,55,4,49),
   p(2,42,44,54,39,68,47,63,58,47,61,39,54),
   p(4,24,57,29,52,35,54,40,63,35,68,26,67)
  ]
 },
 'ukrainian-mm14':{
  label:'UKRAINIAN MM-14',description:'Large stepped khaki, gray-olive and brown digital islands over a sandy field',
  colors:[[204,194,162],[166,165,137],[131,137,113],[112,103,81],[76,87,72]],
  targetCoverage:[.28,.25,.23,.16,.08],seed:43,axis:'pixel',
  motifs:[
   p(3,4,7,22,7,22,13,30,13,30,23,20,23,20,19,8,19,8,15,4,15),
   p(4,40,0,53,0,53,11,61,11,61,22,50,22,50,17,40,17),
   p(1,7,38,24,38,24,47,31,47,31,56,15,56,15,50,7,50),
   p(2,37,31,54,31,54,37,63,37,63,50,50,50,50,45,37,45),
   p(3,26,57,39,57,39,64,27,64)
  ]
 },
 aor2:{
  label:'AOR2',description:'Cool sage and woodland-green stepped rectangles with vertical bias and restrained dark pixel accents',
  colors:[[169,175,151],[117,138,113],[78,107,83],[46,72,60]],
  targetCoverage:[.27,.33,.28,.12],seed:66,axis:'vertical',
  motifs:[
   p(3,5,5,12,5,12,22,16,22,16,28,7,28,7,19,5,19),
   p(1,22,12,31,12,31,31,36,31,36,38,25,38,25,28,22,28),
   p(2,43,1,54,1,54,14,59,14,59,29,48,29,48,19,43,19),
   p(3,9,44,18,44,18,60,25,60,25,64,11,64),
   p(0,40,42,53,42,53,57,60,57,60,63,46,63)
  ]
 },
 'multicam-tropic':{
  label:'MULTICAM TROPIC',description:'MultiCam-family long swept woodland fields, deep rainforest greens and sparse high-contrast dark branchlets',
  colors:[[134,145,88],[98,126,75],[78,102,63],[59,82,49],[40,60,42],[26,43,35],[171,164,108]],
  targetCoverage:[.16,.23,.21,.18,.12,.07,.03],seed:82,axis:'horizontal',
  motifs:[
   p(4,-4,6,13,1,26,7,39,11,51,9,66,15,55,20,40,19,27,15,10,12,-4,16),
   p(1,2,28,15,22,30,26,46,29,67,27,69,36,53,35,39,39,23,34,7,36),
   p(5,6,46,21,41,33,45,43,50,60,49,68,56,56,54,42,56,26,52,11,54),
   p(6,25,21,30,20,33,24,29,26),
   p(5,55,3,59,1,64,5,62,9,57,9),
   p(4,36,58,44,56,49,60,45,63,38,62)
  ]
 },
 'atacs-au':{
  label:'A-TACS AU',description:'Warm sand, muted stone and ochre-brown organic micro/macro clouds inspired by arid urban fabric',
  colors:[[216,202,174],[184,171,145],[156,150,130],[150,121,90],[104,98,83]],
  targetCoverage:[.25,.27,.21,.18,.09],seed:117,axis:'soft',
  motifs:[
   p(2,2,12,15,5,22,12,24,22,15,27,6,23),
   p(4,37,5,49,3,60,13,55,24,43,23,36,16),
   p(0,4,37,17,33,27,40,24,50,9,56,1,50),
   p(3,30,35,43,31,54,39,64,42,60,53,44,50,34,56),
   p(4,19,58,27,55,35,61,31,69,21,67)
  ]
 },
 'ss-leto':{
  label:'SS-LETO / PARTIZAN',description:'High-contrast summer oak-leaf clusters with irregular lobes, deep olive shadows and khaki negative space',
  colors:[[178,165,113],[133,140,82],[92,119,67],[74,84,53],[103,81,58],[41,54,42]],
  targetCoverage:[.21,.25,.21,.16,.11,.06],seed:132,axis:'leaf',
  motifs:[
   p(5,2,7,8,4,13,8,17,4,21,9,18,15,26,18,20,23,13,21,9,26,6,19,1,18),
   p(4,29,1,36,6,41,3,45,10,43,17,52,18,48,25,39,24,34,29,30,20,25,18,30,13),
   p(5,42,35,49,31,56,36,62,31,65,40,59,44,64,50,54,52,50,59,44,52,38,51,43,44),
   p(3,7,34,16,30,20,36,27,33,28,41,23,45,31,51,22,54,17,50,11,58,7,51,2,47),
   p(4,27,57,34,53,40,59,45,57,51,63,47,69,35,67),
   p(2,57,3,63,4,66,12,61,17,54,14,51,9)
  ]
 },
 aor1:{
  label:'AOR1',description:'Four-tone fine desert digital with cream and coyote fields, horizontal stepped breakup and sparse brown ink',
  colors:[[225,216,189],[196,178,146],[159,133,103],[112,92,76]],
  targetCoverage:[.33,.32,.26,.09],seed:173,axis:'pixel',
  motifs:[
   p(3,0,8,17,8,17,13,24,13,24,21,11,21,11,17,0,17),
   p(1,31,3,46,3,46,10,54,10,54,19,36,19,36,13,31,13),
   p(2,10,32,27,32,27,41,37,41,37,46,16,46,16,39,10,39),
   p(3,40,37,56,37,56,43,63,43,63,53,48,53,48,47,40,47),
   p(0,1,55,14,55,14,64,3,64)
  ]
 },
 'multicam-arid':{
  label:'MULTICAM ARID',description:'Pale cream, sand and camel MultiCam-family sweeping contours with tiny tawny chips and rare gray-sage flecks',
  colors:[[232,216,178],[209,188,147],[183,156,117],[148,121,89],[166,163,130],[242,230,202],[105,93,76]],
  targetCoverage:[.24,.24,.22,.15,.08,.05,.02],seed:207,axis:'horizontal',
  motifs:[
   p(1,-5,2,12,-2,25,3,42,7,60,4,68,12,53,15,34,13,20,11,7,14,-4,10),
   p(3,1,25,17,21,34,26,44,29,63,27,67,36,52,35,38,39,23,34,8,38),
   p(2,5,48,22,43,36,48,51,54,67,52,67,61,54,59,39,62,20,57,4,60),
   p(6,14,17,18,15,22,18,19,20),
   p(5,43,16,47,15,50,18,46,21),
   p(4,31,42,37,40,41,43,37,46),
   p(5,53,58,57,56,61,58,58,61)
  ]
 }
};
export const CAMO6A_RECIPES:Readonly<Record<Camo6AId,Camo6ARecipe>>=MASTER;
export function isCamo6AId(id:string):id is Camo6AId{
 return (CAMO6A_IDS as readonly string[]).includes(id);
}
const SIZE=64,PERIOD=Math.PI*2;
function hash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*103)^Math.imul(y+19,3571),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
function smooth(t:number):number{return t*t*(3-2*t);}
function noise(x:number,y:number,sx:number,sy:number,seed:number):number{
 const cols=SIZE/sx,rows=SIZE/sy;
 const ix=Math.floor(x/sx),iy=Math.floor(y/sy);
 const tx=smooth((x%sx)/sx),ty=smooth((y%sy)/sy);
 const a=hash(ix%cols,iy%rows,seed);
 const b=hash((ix+1)%cols,iy%rows,seed);
 const c=hash(ix%cols,(iy+1)%rows,seed);
 const d=hash((ix+1)%cols,(iy+1)%rows,seed);
 return (a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty;
}
function polygon(x:number,y:number,coords:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
  const ax=coords[i],ay=coords[i+1],bx=coords[j],by=coords[j+1];
  if((ay>y)!==(by>y)){
   if(x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
 }
 return inside;
}
function motifBias(x:number,y:number,recipe:Camo6ABase):number{
 let bias=0;
 for(const [tone,points] of recipe.motifs){
  let found=false;
  for(const dy of [-SIZE,0,SIZE]){
   for(const dx of [-SIZE,0,SIZE]){
    if(polygon(x-dx+.5,y-dy+.5,points)){found=true;break;}
   }
   if(found)break;
  }
  if(found)bias+=(tone-(recipe.colors.length-1)*.5)*.080;
 }
 return bias;
}
function score(id:Camo6AId,x:number,y:number):number{
 const r=MASTER[id],seed=r.seed;
 const pixel=r.axis==='pixel'||r.axis==='vertical';
 const xx=pixel?Math.floor(x/2)*2:x;
 const yy=pixel?Math.floor(y/2)*2:y;
 let s:number;
 switch(r.axis){
  case 'soft':
   s=.48*noise(xx,yy,16,16,seed)+.34*noise(xx,yy,8,8,seed+11)+
    .18*noise(xx,yy,4,4,seed+29);
   break;
  case 'pixel':
   s=.45*noise(xx,yy,16,8,seed)+.35*noise(xx,yy,8,8,seed+13)+
    .20*noise(xx,yy,4,4,seed+33)+.028*hash(xx/2,yy/2,seed+47);
   break;
  case 'vertical':
   s=.48*noise(xx,yy,4,16,seed)+.31*noise(xx,yy,8,16,seed+12)+
    .21*noise(xx,yy,2,4,seed+22)+.02*hash(xx/2,yy/2,seed+39);
   break;
  case 'horizontal':
   s=.45*noise(xx,yy,16,8,seed)+.32*noise(xx,yy,8,8,seed+14)+
    .23*noise(xx,yy,4,4,seed+31)+
    .075*Math.sin(PERIOD*(2*y+x)/SIZE);
   break;
  case 'leaf':
   s=.38*noise(xx,yy,16,16,seed)+.37*noise(xx,yy,8,8,seed+15)+
    .25*noise(xx,yy,4,4,seed+32);
   break;
 }
 return s+motifBias(xx,yy,r);
}
const tileCache=new Map<Camo6AId,Uint8Array>();
/** Same original byte-index tile for headgear and every body fabric channel.
 * All periodic boundaries and per-pattern coverage are stable across sessions.
 */
export function camo6AIndices(id:Camo6AId):Uint8Array{
 const cached=tileCache.get(id);
 if(cached)return cached.slice();
 const recipe=MASTER[id],size=SIZE,weights=recipe.targetCoverage;
 const scores=new Float64Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)
  scores[y*size+x]=score(id,x,y);
 const order=Array.from({length:size*size},(_,i)=>i);
 order.sort((a,b)=>scores[a]-scores[b]||a-b);
 const indices=new Uint8Array(size*size);
 let cursor=0;
 for(let ink=0;ink<weights.length;ink++){
  const until=ink===weights.length-1?order.length:
   Math.round(weights.slice(0,ink+1).reduce((a,b)=>a+b,0)*order.length);
  for(;cursor<until;cursor++)indices[order[cursor]]=ink;
 }
 tileCache.set(id,indices);
 return indices.slice();
}

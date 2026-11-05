/** Specialty 7A artwork: each 64px tile is an independently authored print,
 * not a hue-shift or shared field noise. Rasterize once per pattern.
 */
export type Specialty7AId='desert-night'|'kryptek-highlander'|'berezka'|'spectre-skwo';
type Shape=readonly [number,readonly number[]];
const p=(n:number,...points:number[]):Shape=>[n,points];
function inside(x:number,y:number,points:readonly number[]):boolean{
 let yes=false;
 for(let i=0,j=points.length-2;i<points.length;j=i,i+=2){
  const ax=points[i],ay=points[i+1],bx=points[j],by=points[j+1];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)yes=!yes;
 }
 return yes;
}
function wrapped(x:number,y:number,points:readonly number[]):boolean{
 for(const dy of [-64,0,64])for(const dx of [-64,0,64])
  if(inside(x+.5-dx,y+.5-dy,points))return true;
 return false;
}
function paint(shapes:readonly Shape[],fill:number):Uint8Array{
 const tile=new Uint8Array(4096).fill(fill);
 for(const [ink,points] of shapes){
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)
   if(wrapped(x,y,points))tile[y*64+x]=ink;
 }
 return tile;
}
function h(x:number,y:number,seed:number):number{
 let v=Math.imul((x+131*seed)^Math.imul(y+29,7357),0x45d9f3b);
 v=Math.imul(v^(v>>>16),0x119de1f3);
 return ((v^(v>>>15))>>>0)/4294967295;
}
const NIGHT_SHAPES:readonly Shape[]=[
 p(2,3,3,6,2,10,4,9,8,13,10,12,13,7,12,6,15,3,13,2,9),
 p(2,24,4,29,2,33,5,32,10,37,12,34,15,28,14,26,11,22,10),
 p(2,45,19,49,17,54,20,52,24,57,27,54,30,48,29,45,33,43,29),
 p(2,8,31,12,29,16,32,14,37,18,39,16,43,10,42,8,46,6,41),
 p(2,29,41,34,40,38,44,36,48,40,51,37,54,31,52,27,54,27,47),
 p(2,50,51,55,48,60,52,58,58,64,59,61,64,54,63,50,67,48,61),
 p(2,-5,56,1,54,6,58,5,63,1,68,-5,65)
];
const HIGHLANDER:readonly Shape[]=[
 p(1,-5,0,9,-2,18,5,31,7,35,15,22,13,14,20,3,17,-5,25),
 p(1,31,-4,46,-2,57,5,67,4,69,14,57,19,48,14,39,20,34,12),
 p(1,-5,29,7,23,19,27,29,34,37,35,32,42,22,44,14,52,2,49,-5,54),
 p(1,29,47,41,43,54,47,67,41,69,54,58,59,48,67,35,60),
 p(2,5,5,15,1,25,9,32,8,33,16,24,22,13,20,7,28,-5,24),
 p(2,39,2,52,-1,63,9,66,20,57,24,47,19,42,28,33,20),
 p(2,-6,36,9,30,20,35,27,42,20,50,12,48,4,56,-5,53),
 p(2,34,35,46,30,57,36,66,34,70,44,59,50,54,57,44,50,35,58),
 p(3,15,8,23,6,31,12,28,19,35,24,29,30,22,25,17,31,10,24),
 p(3,48,9,56,6,63,12,61,21,67,27,58,30,51,25,47,33,41,26),
 p(3,4,40,12,36,20,42,22,49,17,53,24,58,15,61,8,55,0,58),
 p(3,39,46,48,42,55,49,63,47,68,55,60,62,50,59,45,66,38,61),
 p(4,19,13,24,11,27,14,25,19,30,22,25,25,20,22,17,26,14,20),
 p(4,46,41,51,38,57,44,54,49,60,52,55,56,50,52,46,55,43,49)
];
/** 7B: Spectre SKWO must read as interlocked fractured forest-steppe,
 * not as SS-Leto's broad soft oak leaves. Breaks are authored at two scales:
 * irregular stepped midtone corridors and dark compact linking fragments.
 * Tan windows and brown are deliberately subordinate to the olives.
 */
const SPECTRE:readonly Shape[]=[
 // Connected olive/sage structure, with right-angle forks and short diagonal steps.
 p(1,-6,3,6,3,6,0,19,0,19,6,26,6,26,12,20,12,20,18,9,18,9,23,-6,23),
 p(1,29,-5,43,-5,43,2,55,2,55,8,66,8,66,18,58,18,58,23,45,23,45,16,35,16,35,10,29,10),
 p(1,-6,28,7,28,7,25,17,25,17,32,27,32,27,39,19,39,19,45,8,45,8,51,-6,51),
 p(1,30,28,41,28,41,25,54,25,54,31,69,31,69,42,61,42,61,49,48,49,48,43,37,43,37,37,30,37),
 p(1,-6,56,8,56,8,53,21,53,21,60,32,60,32,68,18,68,18,64,5,64,5,69,-6,69),
 p(1,37,51,49,51,49,48,61,48,61,55,69,55,69,66,60,66,60,63,44,63,44,70,37,70),
 // Mid olive corridors carry the actual break-up rather than separate leaf blobs.
 p(2,1,5,11,5,11,8,17,8,17,13,13,13,13,20,7,20,7,25,0,25),
 p(2,20,0,31,0,31,5,39,5,39,9,33,9,33,15,27,15,27,20,19,20,19,13,15,13,15,6,20,6),
 p(2,44,2,56,2,56,6,64,6,64,13,59,13,59,20,51,20,51,25,43,25,43,17,47,17,47,11,44,11),
 p(2,-5,34,8,34,8,31,20,31,20,36,31,36,31,41,23,41,23,48,12,48,12,53,-5,53),
 p(2,33,31,45,31,45,28,59,28,59,35,69,35,69,41,57,41,57,46,47,46,47,52,37,52,37,43,33,43),
 p(2,13,51,25,51,25,54,34,54,34,59,27,59,27,65,16,65,16,70,6,70,6,63,13,63),
 p(2,41,56,52,56,52,53,64,53,69,60,61,60,61,65,50,65,50,70,40,70),
 // Tiny khaki negative spaces cut through bands: no broad pale sheet.
 p(0,9,4,15,4,15,7,19,7,19,11,14,11,14,15,9,15),
 p(0,35,16,41,16,41,19,45,19,45,23,39,23,39,26,35,26),
 p(0,4,39,12,39,12,42,18,42,18,46,10,46,10,49,4,49),
 p(0,49,38,56,38,56,41,62,41,62,45,53,45,53,49,49,49),
 p(0,23,58,29,58,29,61,33,61,33,65,25,65,25,69,21,69),
 // Sparse brown pockets, never the largest standalone shapes.
 p(3,16,21,22,20,22,24,27,24,27,28,20,28,20,31,16,31),
 p(3,52,11,58,11,58,14,62,14,62,18,54,18,54,21,51,21),
 p(3,7,55,14,55,14,58,19,58,19,62,10,62,10,65,7,65),
 p(3,32,43,38,43,38,46,43,46,43,50,35,50,35,53,32,53),
 p(3,60,55,65,55,65,58,69,58,69,62,61,62),
 // Short dark branchlets connect existing midtone corridors; not random dots.
 p(4,6,10,12,10,12,13,17,13,17,17,10,17,10,21,6,21,6,17,3,17),
 p(4,26,6,32,6,32,9,37,9,37,12,34,12,34,17,28,17,28,13,24,13),
 p(4,46,8,52,8,52,11,57,11,57,15,51,15,51,20,46,20),
 p(4,9,34,15,34,15,37,20,37,20,41,14,41,14,45,8,45),
 p(4,37,32,43,32,43,35,49,35,49,39,43,39,43,43,36,43,36,47,33,47),
 p(4,54,39,60,39,60,42,66,42,66,46,59,46,59,50,53,50),
 p(4,18,54,24,54,24,57,29,57,29,61,23,61,23,66,17,66),
 p(4,44,57,50,57,50,60,55,60,55,64,49,64,49,68,42,68)
];
const cache=new Map<Specialty7AId,Uint8Array>();
export function specialty7AIndices(id:Specialty7AId):Uint8Array{
 const old=cache.get(id);if(old)return old.slice();
 let out:Uint8Array;
 if(id==='desert-night'){
  const dark=paint(NIGHT_SHAPES,0);
  out=new Uint8Array(4096);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)
   out[y*64+x]=dark[y*64+x]===2?2:(x%8===0||y%8===0)?1:0;
 }else if(id==='berezka'){
  // 7B: KLMK's repeated high-contrast stair-step sun-bunnies remain the
  // dominant motif, but 8x8 rigid horizontal wallpaper rows are gone.
  // Each 8px neighborhood gets a staggered / interrupted original leaflet.
  out=new Uint8Array(4096);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
   const variant=(row*13+col*7)%5;
   const jitter=((row*7+col*11)%5)-2;
   const cx=(col*8+(row%2)*3+jitter+64)&63;
   const cy=(row*8+((row*3+col*5)%5)-2+64)&63;
   const tone=(row*2+col)%5===0?2:1;
   const put=(dx:number,dy:number,ink:number)=>{
    const x=(cx+dx+64)&63,y=(cy+dy+64)&63;
    out[y*64+x]=ink;
   };
   // Angular, varying 3–5px horizontal frond, with a stepped side prong.
   const width=3+(variant%3);
   for(let dx=0;dx<width;dx++)put(dx,0,tone);
   for(let dx=0;dx<width-1;dx++)put(dx,1,tone);
   for(let dx=1;dx<width-1;dx++)put(dx,2,tone);
   if(variant===0||variant===3){
    put(-1,1,tone);put(-1,2,tone);put(-2,2,tone);
   }else if(variant===1||variant===4){
    put(width-1,-1,tone);put(width,-1,tone);
   }else{
    put(0,-1,tone);put(1,-1,tone);
   }
   // Occasional hairline breaks stop marks joining into an entire row.
   if((row*5+col*3)%7===0)put(width-1,0,0);
   if((row+2*col)%4===0)put(width-2,-2,2);
   // Sparse olive undershadows remain subordinate to light sunrays.
   if((row+col)%2===0){
    put(width-1,3,3);put(width,3,3);put(width,4,3);
    put(width-1,4,3);
   }
  }
 }else{
  const base=paint(id==='kryptek-highlander'?HIGHLANDER:SPECTRE,0);
  out=base.slice();
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const i=y*64+x,ink=base[i],r=h(x>>1,y>>1,id==='kryptek-highlander'?47:109);
   if(id==='kryptek-highlander'){
    // Broken oblique fracture net: a geometry overlay, never square pixels.
    const a=(x+Math.floor(y*.7)+128)%13;
    const b=(x-Math.floor(y*.7)+128)%13;
    if((a===0||b===0)&&r>.27&&ink>=1&&ink<=3)out[i]=4;
    else if((a===1||b===1)&&r>.78&&ink===2)out[i]=0;
    else if(ink===1&&r>.92)out[i]=2;
   }else{
    // Spectre 7B: compact paired 2px cells extend already-authored
    // fractured corridors. Brown stays sparse; most interruptions are
    // sage -> olive and olive -> deep charcoal, not random soil blobs.
    const cell=h(x>>1,y>>1,109);
    const neighbor=base[y*64+((x+2)&63)];
    if(ink===1&&cell>.87)out[i]=2;
    else if(ink===2&&cell>.88&&neighbor===4)out[i]=4;
    else if(ink===2&&cell<.075)out[i]=1;
    else if(ink===0&&cell>.90)out[i]=1;
    else if(ink===3&&cell>.91)out[i]=2;
   }
  }
 }
 cache.set(id,out);return out.slice();
}

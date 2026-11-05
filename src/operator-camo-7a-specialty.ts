/** Specialty 7A artwork: each 64px tile is an independently authored print,
 * not a hue-shift or shared field noise. Rasterize once per pattern.
 */
export type Specialty7AId='desert-night'|'kryptek-highlander'|'berezka'|'spectre-skwo';
type Shape=readonly [number,readonly number[]];
const p=(n:number,...points:number[]):Shape=>[n,points],SIZE=64;
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
const SPECTRE:readonly Shape[]=[
 p(1,-5,-4,9,-2,20,3,32,5,41,10,34,16,20,13,12,18,1,15,-5,21),
 p(1,39,-3,50,-1,63,5,70,11,65,21,53,18,48,26,39,20),
 p(1,-6,27,6,23,18,29,26,32,32,39,27,47,13,44,4,52,-5,48),
 p(1,31,43,44,38,55,45,68,43,70,55,60,61,49,59,39,68,30,62),
 p(2,7,4,20,0,30,9,28,17,19,22,13,18,7,26,-4,21),
 p(2,36,3,47,-1,56,8,64,9,61,19,52,23,45,31,37,25),
 p(2,-5,35,9,30,20,38,32,42,26,50,15,48,8,57,-5,54),
 p(2,32,48,44,43,51,46,63,41,69,52,61,56,57,63,47,60,39,67,29,61),
 p(3,16,10,24,7,31,13,27,20,35,24,28,30,19,25,13,28,8,20),
 p(3,44,17,53,12,61,19,66,27,58,32,52,37,42,31,40,25),
 p(3,2,44,12,39,22,45,27,51,20,57,12,56,7,62,0,58),
 p(3,35,55,44,51,54,56,58,64,47,68,41,65,32,68),
 p(0,28,1,36,0,40,6,34,12,30,10,25,13),
 p(0,51,35,58,32,64,37,61,42,53,43,49,48,45,42),
 p(4,8,13,13,11,18,15,17,20,21,22,18,26,12,24,9,28,5,21),
 p(4,40,7,46,5,51,9,49,15,54,17,52,22,44,20,41,15),
 p(4,24,38,29,35,34,40,32,46,38,49,34,54,27,50,23,54,20,47),
 p(4,49,54,55,51,61,56,58,63,51,64,45,59),
 p(0,13,58,20,55,26,60,23,65,15,67)
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
  out=new Uint8Array(4096);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
   const cx=(col*8+(row%2)*4+(row*3)%5)&63;
   const cy=(row*8+(col*5)%5)&63;
   const tone=(row+col)%5===0?2:1;
   const put=(dx:number,dy:number,ink:number)=>{
    out[((cy+dy+64)&63)*64+((cx+dx+64)&63)]=ink;
   };
   put(0,0,tone);put(1,0,tone);put(2,0,tone);put(0,1,tone);put(1,1,tone);
   if((row+2*col)%3===0){put(-1,1,tone);put(-1,2,tone);}
   else {put(2,-1,tone);put(3,-1,tone);}
   if((row+col)%4===0)put(1,-2,2);
   if((row*3+col)%3===0){put(3,3,3);put(3,4,3);put(4,3,3);}
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
    // Spectre SKWO: staggered 2px cell chips attached to layered fields.
    if(ink===1&&r>.86)out[i]=2;
    else if(ink===2&&r<.11)out[i]=3;
    else if(ink===3&&h(x>>2,y>>2,17)>.91)out[i]=4;
    else if(ink===0&&r>.96)out[i]=1;
   }
  }
 }
 cache.set(id,out);return out.slice();
}

/** R5B: deterministic, nearest-pixel national marks and organization labels.
 * Rendered from tiny authored geometry-like pixels; no external glyphs/assets.
 * These are legibility-focused insignia, not reproductions of embroidered unit badges.
 */
import {identityMarking} from './operator-identity-markings.ts';
export type MarkingBitmap={width:number;height:number;pixels:Uint8Array};
const P={w:0xf5f5f0,b:0x234773,r:0xc73a41,k:0x232c30,y:0xf4bf42,
 g:0x268451,u:0x375bb2,o:0xf39b38,d:0x23417b,n:0x151b1d,
 gold:0xe7ba35,blue:0x005bbb,ukYellow:0xffd500};
export function markingBitmap(id:string):MarkingBitmap|null{
 const mark=identityMarking(id);if(!mark)return null;
 const label=mark.kind==='label';
 const width=label?48:24,height=label?12:16;
 const bytes=new Uint8Array(width*height*4);
 const put=(x:number,y:number,color:number)=>{
  if(x<0||y<0||x>=width||y>=height)return;
  const n=(y*width+x)*4;
  bytes[n]=(color>>>16)&255;bytes[n+1]=(color>>>8)&255;
  bytes[n+2]=color&255;bytes[n+3]=255;
 };
 const rect=(x0:number,y0:number,x1:number,y1:number,c:number)=>{
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)put(x,y,c);
 };
 const fill=(c:number)=>rect(0,0,width,height,c);
 const horizontal=(colors:number[])=>{colors.forEach((c,i)=>
  rect(0,Math.floor(i*height/colors.length),width,
   Math.floor((i+1)*height/colors.length),c));};
 const vertical=(colors:number[])=>{colors.forEach((c,i)=>
  rect(Math.floor(i*width/colors.length),0,
   Math.floor((i+1)*width/colors.length),height,c));};
 const cross=(base:number,outer:number,inner?:number)=>{
  fill(base);rect(7,0,12,16,outer);rect(0,6,24,11,outer);
  if(inner!==undefined){rect(8,0,11,16,inner);rect(0,7,24,10,inner);}
 };
 const dot=(cx:number,cy:number,r:number,c:number)=>{
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)
   if((x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r)put(x,y,c);
 };
 if(label){
  fill(P.k);
  const letters:Record<string,string[]>={
   A:['0110','1001','1111','1001','1001'],C:['0111','1000','1000','1000','0111'],
   E:['1111','1000','1110','1000','1111'],I:['111','010','010','010','111'],
   L:['1000','1000','1000','1000','1111'],O:['0110','1001','1001','1001','0110'],
   P:['1110','1001','1110','1000','1000'],R:['1110','1001','1110','1010','1001'],
   S:['0111','1000','0110','0001','1110'],T:['11111','00100','00100','00100','00100'],
   U:['1001','1001','1001','1001','0110'],W:['10001','10001','10101','10101','01010'],
   Y:['10001','01010','00100','00100','00100']};
  const text=mark.graphic.toUpperCase();const glyphWidth=(c:string)=>letters[c]?.[0].length??4;
  const total=[...text].reduce((n,c)=>n+glyphWidth(c)+1,-1);
  let left=Math.max(1,Math.floor((width-total)/2));
  for(const ch of text){
   const rows=letters[ch]??['111','101','101','101','111'];
   for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)
    if(rows[y][x]==='1')put(left+x,y+3,P.w);
   left+=glyphWidth(ch)+1;
  }
 }else switch(mark.graphic){
 case 'us':{
  for(let i=0;i<13;i++)rect(0,Math.floor(i*16/13),24,Math.floor((i+1)*16/13),i%2?P.w:P.r);
  rect(0,0,11,9,P.d);
  for(let y=1;y<9;y+=2)for(let x=1+(y%3);x<11;x+=3)put(x,y,P.w);
  break;}
 case 'uk':{
  fill(P.d);
  for(let x=0;x<24;x++)for(let y=0;y<16;y++){
   const diagonal=y-x*16/24,other=y-(23-x)*16/24;
   if(Math.abs(diagonal)<2.2||Math.abs(other)<2.2)put(x,y,P.w);
   if(Math.abs(diagonal)<.85||Math.abs(other)<.85)put(x,y,P.r);
  }
  rect(9,0,15,16,P.w);rect(0,5,24,11,P.w);
  rect(11,0,13,16,P.r);rect(0,7,24,9,P.r);break;}
 case 'de':horizontal([P.n,P.r,P.gold]);break;
 case 'ua':horizontal([P.blue,P.ukYellow]);break;
 case 'pl':horizontal([P.w,P.r]);break;
 case 'fr':vertical([P.d,P.w,P.r]);break;
 case 'it':vertical([P.g,P.w,P.r]);break;
 case 'ru':horizontal([P.w,P.u,P.r]);break;
 case 'id':horizontal([P.r,P.w]);break;
 case 'be':vertical([P.n,P.y,P.r]);break;
 case 'se':cross(P.b,P.gold);break;
 case 'fi':cross(P.w,P.b);break;
 case 'no':cross(P.r,P.w,P.d);break;
 case 'ca':{
  vertical([P.r,P.w,P.r]);rect(0,0,6,16,P.r);rect(18,0,24,16,P.r);
  const maple=['0010100','0111110','1111111','0111110','0011100','0001000','0001000'];
  for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(maple[y][x]==='1')put(9+x,4+y,P.r);
  break;}
 case 'ch':fill(P.r);rect(10,3,14,13,P.w);rect(7,6,17,10,P.w);break;
 case 'gr':{
  for(let i=0;i<9;i++)rect(0,Math.floor(i*16/9),24,Math.floor((i+1)*16/9),i%2?P.w:P.u);
  rect(0,0,10,9,P.u);rect(4,0,6,9,P.w);rect(0,4,10,6,P.w);break;}
 case 'jp':fill(P.w);dot(12,8,4,P.r);break;
 case 'au':{
  fill(P.d);rect(0,0,11,8,P.w);
  for(let x=0;x<11;x++)for(let y=0;y<8;y++)
   if(Math.abs(y-x*8/11)<.7||Math.abs(y-(10-x)*8/11)<.7)put(x,y,P.r);
  rect(4,0,7,8,P.r);rect(0,3,11,5,P.r);
  for(const [x,y] of [[16,4],[20,9],[14,12],[9,13],[20,13]])dot(x,y,1,P.w);
  break;}
 case 'kr':{
  fill(P.w);dot(12,8,5,P.r);
  for(let y=8;y<13;y++)for(let x=7;x<18;x++)
   if((x-12)*(x-12)+(y-8)*(y-8)<=25)put(x,y,P.u);
  for(const [x,y] of [[3,2],[17,2],[3,12],[18,12]])rect(x,y,x+4,y+1,P.k);
  break;}
 case 'cn':fill(P.r);dot(6,5,2,P.y);for(const [x,y] of [[10,2],[12,5],[11,8],[8,10]])put(x,y,P.y);break;
 case 'in':horizontal([P.o,P.w,P.g]);dot(12,8,2,P.d);put(12,8,P.w);break;
 case 'za':{
  horizontal([P.r,P.w,P.b]);
  for(let y=0;y<16;y++)for(let x=0;x<24;x++){
   const line=Math.abs((y-8)-(x-6)*.44),mirror=Math.abs((y-8)+(x-6)*.44);
   if(x<12&&(line<4||mirror<4))put(x,y,P.w);
   if(x<12&&(line<2.5||mirror<2.5))put(x,y,P.g);
   if(x>=9&&Math.abs(y-8)<4)put(x,y,P.w);
   if(x>=9&&Math.abs(y-8)<2.5)put(x,y,P.g);
  }
  for(let x=0;x<8;x++)for(let y=0;y<16;y++)if(x<=8-Math.abs(y-8))put(x,y,P.n);
  break;}
 case 'ddr':horizontal([P.n,P.r,P.gold]);
  // State emblem is deliberately stylized at this resolution; no invented unit mark.
  for(let a=0;a<16;a++){const x=12+Math.round(3*Math.cos(a*Math.PI/8)),y=8+Math.round(3*Math.sin(a*Math.PI/8));put(x,y,P.gold);}
  rect(11,7,14,9,P.gold);break;
 case 'yellow':fill(P.y);break;
 case 'blue':fill(P.u);break;
 default:fill(P.k);break;
 }
 return {width,height,pixels:bytes};
}

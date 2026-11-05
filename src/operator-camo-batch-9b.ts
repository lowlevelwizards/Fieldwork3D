/** Camouflage 9B — CADPAT AR and USAF ABU.
 * Both belong to 64px pixel-first art families, but use DIFFERENT macro
 * topology: CADPAT AR 2px steppes & nested islands; ABU horizontal
 * tiger-stripe bands with angular digital fringes. No recolored TW/MARPAT.
 */
export const CAMO9B_IDS=['cadpat-ar','usaf-abu'] as const;
export type Camo9BId=typeof CAMO9B_IDS[number];
type RGB=readonly [number,number,number];
type Recipe={label:string;description:string;colors:readonly RGB[];
 targetCoverage:readonly number[];motifs:readonly (readonly [number,readonly number[]])[]};
const recipes={
 'cadpat-ar':{
  label:'CADPAT AR',
  description:'Canadian adopted three-ink AR: broad sand field and layered stepped clay/brown digital clusters with nested 2px crenellations, not trial four-color AR',
  colors:[[206,188,155],[161,137,106],[112,98,79]],
  targetCoverage:[.47,.32,.21],motifs:[]},
 'usaf-abu':{
  label:'USAF ABU',
  description:'Airman Battle Uniform digital tiger: directional, horizontal stepped sage-gray bands and subdued cool green, not woodland tiger or UCP confetti',
  colors:[[172,175,162],[132,145,136],[100,115,108],[73,87,83]],
  targetCoverage:[.32,.28,.23,.17],motifs:[]
 }
} satisfies Record<Camo9BId,Recipe>;
const SIZE=64;
function hash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*131)^(Math.imul(y+47,7357)),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
function fill(tile:Uint8Array,x:number,y:number,w:number,h:number,ink:number):void{
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)
  tile[((y+yy+SIZE*4)%SIZE)*SIZE+((x+xx+SIZE*4)%SIZE)]=ink;
}
/** Mosaic of connected 2px digital blocks; hooks remain attached to islands. */
function step(tile:Uint8Array,x:number,y:number,w:number,h:number,
 ink:number,seed:number):void{
 const bx=Math.round(x/2)*2,by=Math.round(y/2)*2;
 const nx=Math.max(1,Math.round(w/2)),ny=Math.max(1,Math.round(h/2));
 for(let row=-1;row<=ny;row++)for(let col=-1;col<=nx;col++){
  const r=hash(col+seed*7,row+seed*13,seed);
  if(col<0||row<0||col>=nx||row>=ny){
   if(r<.74)continue;
  }else if((row===0||col===0||row===ny-1||col===nx-1)&&r<.22)continue;
  fill(tile,bx+col*2,by+row*2,2,2,ink);
 }
}
// Digitally authored area locations include edge-crossing shapes for full
// wrap. Each mark is constructed from 2px cells rather than a scanned image.
const AR_FIELDS:readonly (readonly [number,number,number,number,number])[]=[
 [-4,1,16,15,1],[20,-3,19,13,1],[44,2,19,16,1],
 [8,19,18,13,1],[36,23,17,14,1],[-5,42,19,16,1],
 [24,46,17,15,1],[52,47,18,20,1],
 [8,5,9,9,2],[39,2,12,10,2],[57,12,9,11,2],
 [24,19,13,11,2],[2,33,12,11,2],[44,37,12,12,2],
 [17,51,11,11,2],[57,58,10,11,2]
];
function cadpatAr():Uint8Array{
 const tile=new Uint8Array(SIZE*SIZE);
 AR_FIELDS.forEach(([x,y,w,h,ink],i)=>step(tile,x,y,w,h,ink,i+37));
 for(let row=0;row<12;row++)for(let col=0;col<12;col++){
  const r=hash(col,row,1751);
  if(r<.71)continue;
  const x=col*5+Math.floor(hash(col,row,1771)*3);
  const y=row*5+Math.floor(hash(col,row,1777)*3);
  // Small attached 2px corners rather than uniform digital snow.
  const local=tile[(y&63)*SIZE+(x&63)];
  if(local!==0)fill(tile,x,y,2,2,r>.91?2:1);
 }
 return tile;
}
const ABU_BANDS:readonly (readonly [number,number,number,number,number])[]=[
 [-7,2,38,6,2],[26,-3,42,6,3],[-4,14,32,7,1],
 [27,14,46,7,2],[-8,26,42,5,3],[35,27,37,7,1],
 [1,38,38,7,2],[32,39,41,6,3],[-6,51,36,7,1],
 [24,51,47,6,2],[9,62,41,7,3]
];
/** One horizontal tiger ribbon built from connected stepped blocks.
 * At each 2px station, the centerline changes slowly, the tip thins and
 * occasionally a single attached 2x2 edge tooth fractures the outline.
 */
function horizontalTiger(tile:Uint8Array,x:number,y:number,
 length:number,width:number,ink:number,seed:number):void{
 for(let px=0;px<length;px+=2){
  const t=px/Math.max(1,length-2);
  const taper=px<4||px>length-6?2:0;
  const wave=Math.round(Math.sin((px/length)*Math.PI*2+seed*.7)*2/2)*2;
  const iy=y+wave+((px%8===0&&seed%2===0)?2:0);
  const h=Math.max(2,Math.round((width-taper)/2)*2);
  fill(tile,x+px,iy,2,h,ink);
  const r=hash(px,seed,811);
  if(r>.73&&t>.12&&t<.91)fill(tile,x+px,iy+h,2,2,ink);
  if(r<.13&&t>.16&&t<.83)fill(tile,x+px,iy-2,2,2,ink);
 }
}
function abu():Uint8Array{
 const tile=new Uint8Array(SIZE*SIZE);
 ABU_BANDS.forEach(([x,y,len,w,ink],i)=>
  horizontalTiger(tile,x,y,len,w,ink,i+3));
 // Short independent tonal fragments *follow* the horizontal axis.
 for(let row=0;row<9;row++)for(let col=0;col<6;col++){
  const r=hash(col,row,419);
  if(r<.43)continue;
  const x=col*11+Math.floor(hash(col,row,423)*5);
  const y=row*7+Math.floor(hash(col,row,431)*3);
  const ink=r>.79?3:r>.62?2:1;
  fill(tile,x,y,4+(r>.86?4:0),2,ink);
 }
 return tile;
}
const masters=new Map<Camo9BId,Uint8Array>();
export function camo9BIndices(id:Camo9BId):Uint8Array{
 const cached=masters.get(id);if(cached)return cached.slice();
 const tile=id==='cadpat-ar'?cadpatAr():abu();
 masters.set(id,tile);return tile.slice();
}
export const CAMO9B_RECIPES:Readonly<Record<Camo9BId,Recipe>>=
 Object.fromEntries(CAMO9B_IDS.map(id=>{
  const recipe=recipes[id],counts=recipe.colors.map(()=>0);
  for(const ink of camo9BIndices(id))counts[ink]++;
  return [id,{...recipe,targetCoverage:counts.map(n=>n/4096)}];
 })) as unknown as Record<Camo9BId,Recipe>;
export function isCamo9BId(id:string):id is Camo9BId{
 return (CAMO9B_IDS as readonly string[]).includes(id);
}

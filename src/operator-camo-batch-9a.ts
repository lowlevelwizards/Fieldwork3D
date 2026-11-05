/** Camouflage 9A — six independently authored 64px national print families.
 * Design priority: real-print silhouette > secondary structure > small accents.
 * Shared with 6A/7A/8A: opaque indexed palettes, deterministic periodic pixels,
 * nearest-neighbor materials, cached 64px master, no imported photograph.
 */
export const CAMO9A_IDS=[
 'french-cce','russian-vsr93','swiss-taz90','british-desert-dpm',
 'south-korean-granite-b','indonesian-kopassus-flowing-blood'
] as const;
export type Camo9AId=typeof CAMO9A_IDS[number];
type RGB=readonly [number,number,number];
type Motif=readonly [number,readonly number[]];
type Recipe={label:string;description:string;colors:readonly RGB[];
 targetCoverage:readonly number[];motifs:readonly Motif[]};
const p=(ink:number,...xy:number[]):Motif=>[ink,xy];
const recipes={
 'french-cce':{label:'FRENCH CCE',
  description:'French Centre-Europe: spacious horizontal rounded woodland lopes, brown interruptions and restrained black branches, not generic M81 forks',
  colors:[[92,111,85],[154,146,121],[111,81,69],[41,51,47]],
  targetCoverage:[.34,.24,.26,.16],motifs:[]},
 'russian-vsr93':{label:'RUSSIAN VSR-93',
  description:'Barvikha: three-color vertically trailing oak-leaf/spear swathes with narrow uneven gaps; unlike Russian Flora horizontal reeds',
  colors:[[156,155,113],[88,105,72],[63,76,55]],
  targetCoverage:[.43,.35,.22],motifs:[]},
 'swiss-taz90':{label:'SWISS TAZ 90',
  description:'Four-color restrained Swiss woodland: layered olive, brown, tan and black branching leaf clusters; not red Alpenflage or later TAZ16',
  colors:[[141,144,108],[76,103,72],[114,87,71],[36,46,41]],
  targetCoverage:[.30,.31,.24,.15],motifs:[]},
 'british-desert-dpm':{label:'BRITISH DESERT DPM',
  description:'Sparse broad two-color UK desert DPM brush fingers in clay brown on pale sand, sweeping and ragged rather than blobs',
  colors:[[206,187,151],[143,118,93]],
  targetCoverage:[.62,.38],motifs:[]},
 'south-korean-granite-b':{label:'SOUTH KOREAN GRANITE B',
  description:'Granite B: layered warm stone and olive/forest digital fracture, multi-pixel 90-degree stepped boundaries with restrained charcoal punctures',
  colors:[[150,155,133],[110,127,110],[103,97,83],[61,78,71],[42,52,49]],
  targetCoverage:[.28,.26,.19,.18,.09],motifs:[]},
 'indonesian-kopassus-flowing-blood':{label:'KOPASSUS FLOWING BLOOD',
  description:'Indonesian Kopassus: emphatic trailing oxblood and forest-green ribbons/branches over warm sand, with narrow dark links',
  colors:[[184,165,121],[85,105,66],[121,62,57],[40,54,44]],
  targetCoverage:[.36,.27,.23,.14],motifs:[]}
} satisfies Record<Camo9AId,Recipe>;
const SIZE=64;
function within(x:number,y:number,pts:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){
  const ax=pts[i],ay=pts[i+1],bx=pts[j],by=pts[j+1];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function paintOnto(tile:Uint8Array,motif:Motif):void{
 const [ink,poly]=motif;let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity;
 for(let i=0;i<poly.length;i+=2){
  loX=Math.min(loX,poly[i]);hiX=Math.max(hiX,poly[i]);
  loY=Math.min(loY,poly[i+1]);hiY=Math.max(hiY,poly[i+1]);
 }
 for(let y=Math.floor(loY);y<=Math.ceil(hiY);y++)
  for(let x=Math.floor(loX);x<=Math.ceil(hiX);x++)
   if(within(x+.5,y+.5,poly))
    tile[((y+SIZE)%SIZE)*SIZE+((x+SIZE)%SIZE)]=ink;
}
function paint(motifs:readonly Motif[],base=0):Uint8Array{
 const tile=new Uint8Array(SIZE*SIZE).fill(base);
 for(const motif of motifs)paintOnto(tile,motif);
 return tile;
}
function hash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*131)^(Math.imul(y+47,7357)),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
// Broad, horizontal, curving *different-length* French CCE regions.
// No pigment may be promoted into a fake outline around every patch.
const CCE:readonly Motif[]=[
 p(1,-10,-2,8,-5,19,1,24,7,19,13,7,13,3,18,-10,15),
 p(1,29,-5,40,-5,52,1,68,-2,75,9,62,14,51,12,41,18,31,11),
 p(1,-8,22,4,17,16,20,24,17,32,23,27,29,17,32,10,37,-7,34),
 p(1,37,29,49,24,62,25,73,21,74,36,61,41,55,45,43,42,35,36),
 p(1,-9,46,5,42,16,46,25,43,33,49,28,55,17,54,9,60,-7,60),
 p(2,12,3,24,0,33,5,40,11,37,15,28,17,21,14,10,17,4,11),
 p(2,44,17,56,14,67,18,74,24,68,31,57,29,48,34,36,27),
 p(2,-8,32,3,29,15,34,23,38,36,36,41,43,33,47,19,44,11,49,-8,44),
 p(2,27,52,38,49,49,52,60,47,75,54,67,64,51,61,43,69,31,64),
 p(2,-9,61,1,57,9,62,18,61,28,68,-8,73),
 p(0,8,22,19,19,26,23,31,31,23,35,14,33,8,38,1,31),
 p(0,40,0,48,0,53,5,59,4,65,10,57,16,49,15,40,20,35,13),
 p(0,43,43,53,40,64,43,70,48,61,53,52,51,46,56,36,51),
 p(3,-9,11,1,9,10,10,15,14,26,13,30,16,24,18,18,17,11,19,4,16,-7,17),
 p(3,35,21,46,19,53,20,64,23,73,21,72,26,61,27,54,30,44,27,35,29),
 p(3,11,47,22,46,31,48,38,53,50,52,54,56,49,59,38,57,30,60,19,55,8,53),
 p(3,53,-2,60,0,69,4,65,7,55,6,50,8,43,6),
 p(3,-8,34,1,35,11,39,20,37,24,39,16,42,8,41,-4,43)
];
// Highly vertical broken Barvikha trunks; no horizontal waves from Flora.
const VSR:readonly Motif[]=[
 p(1,-4,-7,5,-4,12,1,10,10,16,17,12,27,17,36,12,46,17,56,10,72,-3,68,2,56,-3,44,3,33,-3,22),
 p(1,24,-9,33,-4,39,5,35,15,40,26,34,37,39,48,33,58,38,73,22,73,29,58,24,51,28,36,22,25,27,12,21,4),
 p(1,51,-8,59,-5,66,7,61,20,68,30,61,44,68,57,59,74,46,73,53,60,47,53,52,39,46,28,52,15,45,5),
 p(2,11,-5,17,2,17,10,23,16,21,27,27,34,21,42,24,51,18,61,21,71,12,74,11,62,7,53,12,43,5,35,12,23,6,13),
 p(2,41,-6,47,3,47,11,53,20,50,31,54,39,49,51,53,59,46,72,36,69,43,57,37,51,42,39,36,28,41,19,35,10),
 p(2,-8,25,1,21,6,29,1,36,5,43,-1,52,6,62,-3,73,-8,68),
 p(2,62,-8,69,6,65,17,70,24,65,31,71,39,65,48,68,57,60,69,56,62,62,51,57,43),
 p(0,17,2,24,4,29,11,25,19,28,25,21,32,19,23,16,15),
 p(0,36,34,44,31,49,37,44,44,46,49,40,53,35,49),
 p(0,0,50,7,48,12,55,7,63,10,70,-1,69,-5,60)
];
// TAZ90: medium organic body marks, then many small branch tips placed on
// their *own* authored families. Never introduce Alpenflage red.
const TAZ:readonly Motif[]=[
 p(1,-7,0,7,-5,17,1,24,8,19,17,11,16,5,23,-8,17),
 p(1,24,-7,40,-4,49,1,61,-3,70,9,58,18,48,16,42,23,32,17),
 p(1,-7,25,6,22,17,28,28,25,37,32,32,40,21,43,17,51,2,48,-8,40),
 p(1,35,43,48,36,59,39,70,35,74,50,63,59,52,54,43,62,33,56),
 p(1,-8,54,6,51,18,57,23,68,10,74,-8,70),
 p(2,14,1,25,-2,33,5,30,13,22,15,18,23,9,18),
 p(2,46,18,57,12,67,18,73,25,65,29,61,37,49,33,43,39,36,31),
 p(2,0,38,11,36,20,40,26,48,20,53,16,63,5,58,-5,60),
 p(2,25,52,38,47,48,53,55,64,46,71,32,65,24,70,19,60),
 p(3,7,7,13,6,18,12,25,13,28,18,23,19,18,16,14,19,5,16),
 p(3,34,13,41,10,46,15,54,17,57,22,49,23,44,19,38,22,31,19),
 p(3,-7,42,2,39,9,42,14,48,20,48,24,53,17,54,12,50,6,51,-6,49),
 p(3,41,43,48,40,56,46,64,45,70,50,62,53,53,51,48,57,40,53),
 p(3,19,26,27,23,33,29,37,35,32,38,29,33,23,36,17,32)
];
// Two-color desert DPM, drawn from *authored* tapered brush positions.
const DPM_STROKES:readonly (readonly [number,number,number,number,number])[]=[
 [-8,3,34,8,0],[30,-5,36,8,1],[2,22,43,9,2],
 [42,19,31,8,3],[-9,43,32,9,4],[29,47,38,8,5],
 [9,59,26,7,6],[51,60,20,6,2]
];
function desertDpmStroke([x,y,len,h,b]:readonly [number,number,number,number,number]):Motif{
 const bend=(b%3)-1;
 return p(1,x-3,y+2,x+4,y,x+Math.floor(len*.27),y-2-bend,
  x+Math.floor(len*.42),y-2,x+Math.floor(len*.69),y+bend,
  x+len,y-1,x+len+3,y+2,x+len-5,y+3,
  x+Math.floor(len*.74),y+h-2,x+Math.floor(len*.58),y+h+2,
  x+Math.floor(len*.36),y+h,x+Math.floor(len*.18),y+h+1,
  x+3,y+h-2,x-4,y+h);
}
// Flowing Blood: vertical *ribbons* with long tapered side branches,
// not copied tiger-stripe rows or arbitrary small red flecks.
const KOPASSUS:readonly Motif[]=[
 p(1,1,-8,10,-3,16,3,13,13,21,21,15,28,20,34,13,42,18,49,11,58,13,73,0,73,4,59,-2,48,6,37,-1,27,5,16,-3,7),
 p(1,27,-6,37,-4,43,6,38,17,46,27,39,38,45,45,37,56,42,72,28,74,32,63,26,52,32,42,25,34,30,20,24,10),
 p(1,50,-8,62,-5,68,4,63,15,72,26,64,33,69,44,62,52,68,65,59,74,47,72,53,59,46,51,52,41,46,33,52,21,45,11),
 p(2,-9,10,1,7,8,12,13,18,9,24,16,30,11,35,16,43,10,49,12,57,4,66,-7,62,0,50,-6,43),
 p(2,18,-6,27,2,33,9,29,17,35,26,29,34,36,42,30,49,35,57,27,69,18,72,23,62,18,54,23,46,16,39,21,29,16,20,20,12),
 p(2,42,1,52,7,58,16,54,23,61,32,56,39,62,47,57,55,62,66,54,74,43,69,48,58,42,52,48,43,41,36,45,24,39,16),
 p(2,63,-4,74,5,70,15,76,24,68,30,72,43,62,50,67,62,61,73,57,62,60,50),
 p(3,6,4,11,2,16,9,14,15,19,23,16,27,11,21,10,14,4,11),
 p(3,31,18,36,16,42,22,39,30,44,36,40,42,35,35,32,29),
 p(3,50,34,56,31,61,40,57,46,63,55,59,60,52,52,49,44),
 p(3,-6,45,0,43,5,48,11,53,8,58,1,55,-7,56),
 p(3,22,57,29,53,33,60,40,63,36,69,28,66,22,73)
];
function cce():Uint8Array{return paint(CCE);}
function vsr():Uint8Array{return paint(VSR);}
function taz():Uint8Array{
 const tile=paint(TAZ);
 // Local leaflets, asymmetrical 2–4px extensions anchored to vegetation
 // or dark branches. This preserves broad color-block silhouette.
 for(let row=0;row<11;row++)for(let col=0;col<11;col++){
  const ink=tile[((row*6+3)&63)*64+((col*6+3)&63)];
  if(ink===0)continue;
  const x=col*6+Math.floor(hash(col,row,61)*4);
  const y=row*6+Math.floor(hash(col,row,79)*4);
  const rx=hash(col,row,83)>.5?3:2,ry=hash(col,row,89)>.55?2:3;
  paintOnto(tile,p(ink,x-rx,y,x-1,y-ry,x+1,y-ry,x+rx,y-1,
   x+rx-1,y+ry,x-2,y+ry,x-rx-1,y+1));
 }
 return tile;
}
function desert():Uint8Array{
 const tile=paint(DPM_STROKES.map(desertDpmStroke));
 // Deliberate brush-tip interruptions, never salt/pepper dots.
 for(const [x,y,len,h] of DPM_STROKES){
  const ax=x+Math.floor(len*.49),ay=y+Math.floor(h*.5);
  paintOnto(tile,p(0,ax-2,ay-2,ax+4,ay-2,ax+2,ay,ax+6,ay+2,
   ax-1,ay+2));
 }
 return tile;
}
function steppedIsland(tile:Uint8Array,x:number,y:number,
 w:number,h:number,ink:number,seed:number):void{
 // 2px cells and rectangular crenellation produce authored digital topology
 // without bitmap scaling, blur, or rotated texture copies.
 const x0=Math.floor(x/2)*2,y0=Math.floor(y/2)*2;
 const cols=Math.max(1,Math.floor(w/2)),rows=Math.max(1,Math.floor(h/2));
 for(let cy=-1;cy<=rows;cy++)for(let cx=-1;cx<=cols;cx++){
  const score=hash(cx+cols*seed,cy+rows*seed,seed*37);
  if(cx<0||cy<0||cx>=cols||cy>=rows){
   if(score<.69)continue;
  }else if((cx===0||cy===0||cx===cols-1||cy===rows-1)&&score<.18)continue;
  for(let by=0;by<2;by++)for(let bx=0;bx<2;bx++)
   tile[((y0+cy*2+by+SIZE*4)%SIZE)*SIZE+
    ((x0+cx*2+bx+SIZE*4)%SIZE)]=ink;
 }
}
function granite():Uint8Array{
 const tile=new Uint8Array(SIZE*SIZE);
 // 64 hand-spaced medium islands, with 2x2 hooked chips layered over them.
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const r=hash(col,row,809),ink=r<.34?1:r<.64?2:r<.89?3:4;
  const x=col*8-2+Math.floor(hash(col,row,811)*4);
  const y=row*8-2+Math.floor(hash(col,row,823)*4);
  steppedIsland(tile,x,y,5+Math.floor(hash(col,row,829)*8),
   5+Math.floor(hash(col,row,839)*7),ink,17+row*8+col);
 }
 // Dark 2px tactical fractures interrupt broad fields, not whole-pixel noise.
 for(let i=0;i<22;i++){
  const x=(Math.floor(hash(i,1,191)*32)*2)&63;
  const y=(Math.floor(hash(i,2,199)*32)*2)&63;
  steppedIsland(tile,x,y,4,2,4,137+i);
 }
 return tile;
}
function kopassus():Uint8Array{
 const tile=paint(KOPASSUS);
 // Isolated thin trailing veins bend alongside the principal vertical ribbons.
 for(const [x,y,len,h,ink] of [
  [7,7,3,17,3],[36,31,3,19,3],[60,6,3,21,2],
  [12,48,3,17,2],[48,45,3,18,3]
 ] as const)
  paintOnto(tile,p(ink,x,y,x+len,y+2,x+len-2,y+Math.floor(h*.48),
   x+len+1,y+h,x-2,y+h-2,x+1,y+Math.floor(h*.5)));
 return tile;
}
const masters=new Map<Camo9AId,Uint8Array>();
export function camo9AIndices(id:Camo9AId):Uint8Array{
 const prev=masters.get(id);if(prev)return prev.slice();
 const tile=id==='french-cce'?cce():id==='russian-vsr93'?vsr():
  id==='swiss-taz90'?taz():id==='british-desert-dpm'?desert():
  id==='south-korean-granite-b'?granite():kopassus();
 masters.set(id,tile);return tile.slice();
}
export const CAMO9A_RECIPES:Readonly<Record<Camo9AId,Recipe>>=
 Object.fromEntries(CAMO9A_IDS.map(id=>{
  const recipe=recipes[id],counts=recipe.colors.map(()=>0);
  for(const ink of camo9AIndices(id))counts[ink]++;
  return [id,{...recipe,targetCoverage:counts.map(n=>n/(SIZE*SIZE))}];
 })) as unknown as Record<Camo9AId,Recipe>;
export function isCamo9AId(id:string):id is Camo9AId{
 return (CAMO9A_IDS as readonly string[]).includes(id);
}

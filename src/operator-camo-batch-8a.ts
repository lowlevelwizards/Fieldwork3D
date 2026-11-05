/** Camouflage 8A — eight original Fieldwork 64px prints.
 * Same polygon-first and layered detail pipeline as 6A/7A. No imported
 * fabric images. 7A relatives reuse the EXACT indexed family masters.
 */
export const CAMO8A_IDS=[
 'russian-izlom','greek-lizard','urban-kamysh','jgsdf-type2',
 'pencott-metropolis','south-african-s2000','kryptek-typhon','norwegian-m98'
] as const;
export type Camo8AId=typeof CAMO8A_IDS[number];
type RGB=readonly [number,number,number];
type Motif=readonly [number,readonly number[]];
export type Camo8ARecipe={
 label:string;description:string;colors:readonly RGB[];
 targetCoverage:readonly number[];motifs:readonly Motif[];
};
const p=(tone:number,...xy:number[]):Motif=>[tone,xy];
const recipes={
 'russian-izlom':{
  label:'RUSSIAN IZLOM',
  description:'Skol/Izlom dark temperate print: tightly interlocked hard-edged short angular lozenges, tan sparks and rust fracture shards, without Leto leaf/pea-dot motifs',
  colors:[[46,56,49],[72,106,68],[181,154,105],[105,78,68],[30,39,38]],
  targetCoverage:[.26,.26,.16,.17,.15],motifs:[]
 },
 'greek-lizard':{
  label:'GREEK LIZARD',
  description:'Classic Greek Lizard: warm khaki ground beneath overlapping torn, tapered olive/russet horizontal brushstrokes with occasional stipple gaps, not Kamysh bars',
  colors:[[169,161,122],[67,88,62],[120,78,62],[42,58,49]],
  targetCoverage:[.36,.30,.21,.13],motifs:[]
 },
 'urban-kamysh':{
  label:'URBAN KAMYSH',
  description:'Russian urban blue Kamysh: cool blue-grey and navy-black reed/tiger bands, linked wavy silhouettes with rough stepped torn tips and open mist-blue negative space',
  colors:[[142,154,167],[91,111,136],[64,83,106],[27,36,51]],
  targetCoverage:[.29,.27,.23,.21],motifs:[]
 },
 'jgsdf-type2':{
  label:'JGSDF TYPE II',
  description:'Jieitai Dot: dense smaller rounded vegetation-data flecks in moss, rust brown, stone tan and restrained charcoal clusters, distinct from S2000 earth-ground spotting',
  colors:[[108,139,92],[61,104,74],[127,96,84],[179,181,149],[44,52,50]],
  targetCoverage:[.32,.25,.18,.12,.13],motifs:[]
 },
 'pencott-metropolis':{
  label:'PENCOTT METROPOLIS',
  description:'Identical PenCott macro/midi/micro geometry with concrete ash, slate, mineral charcoal and occasional low-chroma earth; distinctive industrial MetroPolis palette',
  colors:[[161,160,151],[115,121,116],[82,94,93],[43,49,51],[112,96,86]],
  targetCoverage:[.25,.27,.23,.16,.09],motifs:[]
 },
 'south-african-s2000':{
  label:'SOLDIER 2000',
  description:'SANDF Soldier 2000: exposed Kalahari earth-brown ground, broad irregular green islands and distinctive internal mint/forest pea-spots, unlike dense JGSDF flecks',
  colors:[[132,106,89],[61,101,86],[112,148,126],[167,184,159],[41,72,61]],
  targetCoverage:[.42,.21,.14,.13,.10],motifs:[]
 },
 'kryptek-typhon':{
  label:'KRYPTEK TYPHON',
  description:'Exact Highlander fracture and outlined Kryptek reptile-net master in dark neutral graphite/charcoal; remove blue-purple cast and limit bright grayscale',
  colors:[[119,123,125],[81,86,89],[61,65,67],[37,41,44],[21,24,27]],
  targetCoverage:[.29,.27,.22,.15,.07],motifs:[]
 },
 'norwegian-m98':{
  label:'NORWEGIAN M98',
  description:'Norwegian M98 big flowing rounded dark forest, yellow olive and warm tan disruption, strict three inks and no small chip noise',
  colors:[[109,130,70],[40,55,43],[180,149,102]],
  targetCoverage:[.34,.37,.29],motifs:[]
 }
} satisfies Record<Camo8AId,Camo8ARecipe>;
export const CAMO8A_RECIPES:Readonly<Record<Camo8AId,Camo8ARecipe>>=
 Object.fromEntries(CAMO8A_IDS.map(id=>{
  const recipe=recipes[id];
  return [id,{...recipe,get targetCoverage():readonly number[]{
   if(id==='pencott-metropolis'||id==='kryptek-typhon')return recipe.targetCoverage;
   const counts=recipe.colors.map(()=>0);
   for(const ink of camo8AIndices(id))counts[ink]++;
   return counts.map(c=>c/4096);
  }}];
 })) as unknown as Record<Camo8AId,Camo8ARecipe>;
export function isCamo8AId(id:string):id is Camo8AId{
 return (CAMO8A_IDS as readonly string[]).includes(id);
}
const SIZE=64;
function within(x:number,y:number,pts:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){
  const ax=pts[i],ay=pts[i+1],bx=pts[j],by=pts[j+1];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function wrapContains(x:number,y:number,pts:readonly number[]):boolean{
 for(const dy of [-64,0,64])for(const dx of [-64,0,64])
  if(within(x+.5-dx,y+.5-dy,pts))return true;
 return false;
}
function paint(shapes:readonly Motif[],base:number):Uint8Array{
 const pixels=new Uint8Array(SIZE*SIZE).fill(base);
 for(const [tone,shape] of shapes)
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)
   if(wrapContains(x,y,shape))pixels[y*64+x]=tone;
 return pixels;
}
function hash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*131)^(Math.imul(y+47,7357)),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
// Individually composed hooked/angular lozenges rather than Flecktarn circles.
const IZLOM:readonly Motif[]=[
 p(1,-8,0,5,-4,14,2,23,1,23,9,15,11,17,17,8,18,2,26,-7,24),
 p(1,25,-4,39,-5,42,2,54,0,60,7,69,11,64,21,52,19,50,28,39,22,34,29,26,20),
 p(1,-6,31,5,27,12,33,22,31,26,38,35,38,31,45,18,45,13,54,3,51,-7,61),
 p(1,30,48,40,42,52,48,60,42,72,50,64,62,52,57,45,68,32,64),
 p(2,2,4,9,1,14,5,10,9,17,12,12,17,6,15,3,20,-1,15),
 p(2,31,6,36,2,43,5,40,11,49,13,44,19,37,16,33,23,28,17),
 p(2,50,26,57,23,63,27,61,33,68,35,60,42,53,38,47,41,45,34),
 p(2,7,40,14,36,21,41,18,46,27,47,22,54,14,52,9,57,4,49),
 p(2,37,54,45,51,50,56,58,55,65,60,57,67,49,63,42,69,34,63),
 p(3,15,0,23,-2,26,5,33,7,28,12,23,11,20,17,14,12),
 p(3,49,2,55,0,59,5,67,6,64,13,57,12,54,18,47,13),
 p(3,18,25,25,21,29,28,36,26,34,32,41,34,35,40,27,37,22,44,17,36),
 p(3,-4,54,3,49,9,55,17,52,22,60,14,62,10,69,-5,65),
 p(3,44,41,50,38,55,43,63,41,67,48,61,52,55,50,48,59,41,54),
 p(4,5,15,12,12,16,18,22,19,18,25,10,23,6,29,1,23),
 p(4,36,17,42,14,47,20,53,20,50,26,43,24,40,32,35,27),
 p(4,25,36,32,33,37,38,43,37,47,43,39,47,35,45,31,53,24,47),
 p(4,53,55,61,52,66,59,71,63,62,69,55,65,49,69,45,63),
 p(4,0,0,4,0,5,3,9,4,6,7,1,6),
 p(2,58,14,63,13,64,18,69,20,64,24,58,21),
 p(3,0,29,6,26,8,32,14,34,10,38,3,36),
 p(4,13,57,18,54,20,59,26,61,20,65,14,64),
 p(2,27,55,32,51,35,57,39,58,33,64,26,61)
];
// Compose individualized thin ragged horizontal brushstroke polygons,
// with manual rhythm and tapered ends — never rotate the existing Tiger tile.
function brush(x:number,y:number,length:number,width:number,ink:number,shape:number):Motif{
 const a=(shape%4),b=((shape>>1)%3);
 return p(ink,x,y+Math.floor(width/2),
  x+3,y-1,x+Math.floor(length*.25),y-1-a,
  x+Math.floor(length*.52),y+(a%2),
  x+length-4,y-1+b,x+length,y+1,
  x+length-5,y+width-1,x+Math.floor(length*.73),y+width+a,
  x+Math.floor(length*.42),y+width-1+b,
  x+5,y+width+1,x-2,y+width-2);
}
const GREEK_STROKES:readonly [number,number,number,number,number,number][]=[
 [-6,2,30,4,1,0],[23,1,32,5,2,1],[45,8,24,3,3,2],
 [4,12,38,4,1,3],[29,15,33,3,3,1],[-9,21,33,4,2,0],
 [25,23,44,4,1,2],[4,30,30,4,3,3],[31,32,35,5,2,0],
 [-7,40,32,3,1,1],[21,43,35,4,3,2],[48,47,24,3,1,0],
 [3,51,37,4,2,1],[34,55,39,3,1,2],[-4,61,29,4,3,3],
 [14,8,19,2,3,0],[43,26,19,2,2,1],[11,37,18,2,2,2],
 [19,58,19,2,3,1],[52,2,17,2,1,3],[1,25,18,2,3,2]
];
const KAMYSH_STROKES:readonly [number,number,number,number,number,number][]=[
 [-10,0,39,6,2,1],[28,2,45,5,3,3],[1,10,34,5,1,0],
 [28,14,42,7,3,2],[-9,21,41,6,2,1],[35,25,39,7,1,0],
 [-7,34,39,6,3,3],[30,39,45,5,2,2],[-9,47,48,6,1,2],
 [30,51,41,7,3,0],[5,58,39,5,2,1],
 [2,5,19,3,3,1],[42,9,27,4,2,3],[16,20,20,3,3,2],
 [0,29,23,3,1,3],[50,35,23,3,3,0],[11,46,25,3,3,1],
 [48,61,21,4,1,2],[10,15,23,2,2,0],[20,57,26,3,1,1]
];
// Rounded JGSDF flecks. Flecktarn pipeline logic: lobe clusters at two
// scales plus small correlated dots, but not a Flecktarn tile recolor.
function fleck(cx:number,cy:number,rx:number,ry:number,ink:number,phase:number):Motif{
 return p(ink,cx-rx,cy-1,
  cx-rx+1,cy-ry+1,cx-2,cy-ry,cx+Math.floor(rx/3),cy-ry-1,
  cx+rx-2,cy-ry+2,cx+rx+1,cy,
  cx+rx-1,cy+ry-1,cx+Math.floor(rx/4),cy+ry+1,
  cx-2,cy+ry,cx-rx-1,cy+ry-2,
  cx-rx+(phase%2),cy+1);
}
// The JGSDF 8E print no longer has 22 giant fixed parent circles. Its
// 100 independent jittered families fill a periodic 64px master, with an
// asymmetric medium fleck plus overlapping smaller chips and satellites.
// Soldier 2000: undulating organic grass/sage forms on exposed brown ground.
const S2000:readonly Motif[]=[
 p(1,-6,1,6,-3,13,3,23,0,28,7,23,15,15,13,11,20,4,16,-5,23),
 p(1,30,-5,41,0,51,-3,59,4,69,3,69,14,61,18,54,14,48,21,39,17,32,22,26,14),
 p(1,-8,32,2,25,13,28,18,23,28,28,25,35,15,36,11,45,3,42,-7,52),
 p(1,32,34,40,29,51,33,57,29,65,37,72,45,65,52,56,48,47,56,38,51,30,57),
 p(1,1,56,10,49,21,56,28,54,34,61,25,67,12,64,1,71,-7,63),
 p(2,4,7,13,3,20,8,18,14,25,18,17,21,12,19,5,24,-2,18),
 p(2,37,4,44,0,52,7,59,5,64,12,59,19,49,17,43,25,35,18),
 p(2,11,29,21,26,28,33,34,30,40,37,31,43,23,40,17,48,9,42),
 p(2,44,48,53,43,64,48,69,56,57,60,51,66,41,59),
 p(3,0,14,7,10,11,14,16,12,20,18,15,23,9,22,5,28,-3,24),
 p(3,29,9,35,6,42,12,45,10,49,16,44,22,36,19,31,26,26,19),
 p(3,4,39,11,36,17,40,22,37,26,43,20,48,13,46,9,54,2,49),
 p(3,50,28,56,23,63,28,68,33,61,38,54,36,47,41,44,34),
 p(3,25,56,33,51,40,55,45,53,49,60,42,65,35,62,30,68,23,64),
 p(4,10,10,16,8,19,13,17,18,23,20,16,24,11,21,7,24,6,17),
 p(4,49,5,54,1,60,7,57,12,64,16,58,20,50,17,45,19),
 p(4,18,33,23,30,28,36,26,40,33,43,28,48,21,44,17,49,13,42),
 p(4,56,49,63,46,69,54,63,58,65,64,58,67,52,62,48,63),
 p(4,0,58,6,55,10,60,9,65,4,66,-3,64)
];
// Camouflage 8E: new authored Norwegian M98 master. Large rolling
// rounded three-color fields with deliberately interleaved *medium* lobes.
// These are independently drawn contours, not reduced flecks or M90 shards.
// The 64px atlas is cached by camo8AIndices and remains palette-indexed.
// M98 8F: a tileable, deterministic three-ink *organic contour master*.
// The old 27 polygon layers had balanced coverage globally but produced
// giant solid cutouts on individual trousers. Competing smooth fields at
// broad (5), medium (10), and edge (17) frequencies give interlocking curved
// lobes at multiple meaningful garment scales without sprinkling pixels.
// Locked seeds and smooth interpolation: no per-operator rerandomization.
const M98_8F_OCTAVES:readonly (readonly [number,number])[]=[
 [5,.43],[10,.50],[17,.07]
];
function m98Lattice(freq:number,seed:number):Float64Array{
 const grid=new Float64Array(freq*freq);
 for(let y=0;y<freq;y++)for(let x=0;x<freq;x++)
  grid[y*freq+x]=hash(x,y,seed)*2-1;
 return grid;
}
function m98GridValue(grid:Float64Array,freq:number,x:number,y:number):number{
 const gx=x*freq/SIZE+.17,gy=y*freq/SIZE+.17;
 const ix=Math.floor(gx),iy=Math.floor(gy);
 const smooth=(t:number)=>t*t*(3-2*t);
 const fx=smooth(gx-ix),fy=smooth(gy-iy);
 const left=ix%freq,right=(ix+1)%freq,top=iy%freq,bottom=(iy+1)%freq;
 const north=grid[top*freq+left]*(1-fx)+grid[top*freq+right]*fx;
 const south=grid[bottom*freq+left]*(1-fx)+grid[bottom*freq+right]*fx;
 return north*(1-fy)+south*fy;
}
function norwegianM98_8F():Uint8Array{
 const tile=new Uint8Array(SIZE*SIZE);
 const grids=Array.from({length:3},(_,ink)=>
  M98_8F_OCTAVES.map(([freq])=>m98Lattice(freq,211+ink*271+freq*53)));
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  let ink=0,peak=-Infinity;
  for(let candidate=0;candidate<3;candidate++){
   let field=0;
   for(let octave=0;octave<M98_8F_OCTAVES.length;octave++){
    const [freq,weight]=M98_8F_OCTAVES[octave];
    field+=weight*m98GridValue(grids[candidate][octave],freq,x,y);
   }
   if(field>peak){peak=field;ink=candidate;}
  }
  tile[y*SIZE+x]=ink;
 }
 return tile;
}

/** 8B reference pass: reuses 8A index-space polygons/period/wrap while
 * rendering each real print's own motif language. No new catalog IDs.
 * All geometry is baked once into the original cached 64px master.
 */
function scaleMotif(motif:Motif,amount:number):Motif{
 const [tone,coords]=motif;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i<coords.length;i+=2){
  minX=Math.min(minX,coords[i]);maxX=Math.max(maxX,coords[i]);
  minY=Math.min(minY,coords[i+1]);maxY=Math.max(maxY,coords[i+1]);
 }
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 return [tone,coords.map((n,i)=>Math.round((n-(i%2?cy:cx))*amount+(i%2?cy:cx)))];
}
function paintOnto(tile:Uint8Array,motif:Motif):void{
 const [tone,shape]=motif;
 // Clip to each small lozenge's local bounding box rather than scanning
 // the whole 64px atlas and all nine possible wrap copies per mark.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<shape.length;i+=2){
  minX=Math.min(minX,shape[i]);maxX=Math.max(maxX,shape[i]);
  minY=Math.min(minY,shape[i+1]);maxY=Math.max(maxY,shape[i+1]);
 }
 for(let y=Math.floor(minY);y<=Math.ceil(maxY);y++)
  for(let x=Math.floor(minX);x<=Math.ceil(maxX);x++)
   if(within(x+.5,y+.5,shape))
    tile[((y+64)&63)*64+((x+64)&63)]=tone;
}
function indexAt(tile:Uint8Array,x:number,y:number):number{
 return tile[((y+64)&63)*64+((x+64)&63)];
}
function izlom8C():Uint8Array{
 // Reduce inherited overly large tan islands: Skol's light shapes are
 // *short fracture sparks* among dark moss and rust, not Leto-like leaves.
 const tile=paint(IZLOM.map(m=>m[0]===2?scaleMotif(m,.64):m),0);
 // Keep the larger 8B fracture skeleton, but fewer deliberate angular
 // overlays so the terrain-shaped patches read at mobile size.
 // 8x8 seeded cells replace 8B's near-wallpaper 10x10 field.
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const a=hash(col,row,91),b=hash(col,row,109);
  if(a<.20)continue;
  const x=col*8-3+Math.floor(a*5);
  const y=row*8-3+Math.floor(b*5);
  const tone=a>.86?2:a>.63?4:a>.37?3:1;
  const len=4+Math.floor(hash(col,row,131)*3);
  const branch=b>.47?2:-2;
  paintOnto(tile,p(tone,
   x-2,y, x+1,y-2, x+len-1,y-1, x+len+1,y+1,
   x+len-1,y+2, x+Math.floor(len/2),y+1,
   x+Math.floor(len/2)-1,y+branch+2, x+Math.floor(len/2)-3,y+2,
   x-3,y+2));
 }
 return tile;
}
function greekLizard8C():Uint8Array{
 // Restore the continuous 8A horizontal painterly ribbons. The 8B
 // wholesale split made this look like small generic woodland shards.
 const shapes:Motif[]=GREEK_STROKES.map(([x,y,len,w,ink,phase])=>
  brush(x,y,len,w,ink,phase));
 for(let i=0;i<GREEK_STROKES.length;i++){
  if(i%5!==1)continue;
  const [x,y,len,,ink,phase]=GREEK_STROKES[i];
  // A few overlapping tapered sweeps, not a second full row of stripes.
  shapes.push(brush(x+Math.floor(len*.3),y+3,
    Math.max(8,Math.floor(len*.41)),2,ink,phase+2));
 }
 const base=paint(shapes,0);
 const out=base.slice();
 // Sparing 1px perimeter interruptions; never slice bands in half.
 // Critically preserves the long horizontal runs missing in 8B.
 for(let row=0;row<16;row++)for(let col=0;col<16;col++){
  const r=hash(col,row,239);if(r<.86)continue;
  const x=(col*4+Math.floor(hash(col,row,241)*4))&63;
  const y=(row*4+Math.floor(hash(col,row,251)*4))&63;
  const ink=indexAt(base,x,y);
  if(ink===0)continue;
  const above=indexAt(base,x,y-1),below=indexAt(base,x,y+1);
  if(above===0 && below===ink && r>.93)
   out[y*64+x]=0;
  else if(below===0 && r>.91)
   out[((y+1)&63)*64+x]=ink;
 }
 return out;
}
function urbanKamysh8C():Uint8Array{
 // The older Russian blue Kamysh is an aggressive, irregular tiger/reed
 // family, not the fine French/Greek Lizard strokes.
 const motifs:Motif[]=KAMYSH_STROKES.map(([x,y,len,w,ink,phase])=>
  brush(x,y,len,Math.min(9,w+1),ink,phase));
 for(const [x,y,len] of [[-5,8,30],[25,19,31],[3,33,24],[39,46,30],[9,56,28]])
  motifs.push(brush(x,y,len,2,3,3));
 // A few hairline offshoots on existing wide bands add reed tips while
 // retaining the successful 8B blue-black macro rhythm.
 for(const i of [1,4,7,10,16]){
  const [x,y,len,,ink,phase]=KAMYSH_STROKES[i];
  motifs.push(brush(x+len-11,y+2,12,1,ink,phase+3));
 }
 const tile=paint(motifs,0),original=tile.slice();
 // Salt the band edges with teeth; never repaint the light negative
 // space in flat blocks, preserving the familiar blue tiger identity.
 for(let row=0;row<16;row++)for(let col=0;col<16;col++){
  const r=hash(col,row,263);if(r<.41)continue;
  const x=(col*4+Math.floor(hash(col,row,269)*4))&63;
  const y=(row*4+Math.floor(hash(col,row,271)*4))&63;
  const ink=indexAt(original,x,y);
  if(ink===0)continue;
  const up=indexAt(original,x,y-1),down=indexAt(original,x,y+1);
  if(down===0 && r>.66)tile[((y+1)&63)*64+x]=ink;
  if(up===0 && r>.84)tile[y*64+x]=0;
  if(ink===2&&r>.92)tile[y*64+x]=3;
 }
 return tile;
}
function jgsdf8F():Uint8Array{
 // Full composition rebuild: Jieitai Type II uses many small vegetation
 // fleck *families*, never a few large red/charcoal woodland islands.
 // Jitter eliminates the obvious grid; all small marks attach to the same
 // ink family rather than scattering uncorrelated noise on bare ground.
 const tile=new Uint8Array(SIZE*SIZE);
 for(let row=0;row<10;row++)for(let col=0;col<10;col++){
  const role=hash(col,row,877);
  const ink=role<.47?1:role<.61?2:role<.81?3:4;
  const x=Math.floor((col+.5)*6.4+(hash(col,row,811)-.5)*5.6);
  const y=Math.floor((row+.5)*6.4+(hash(col,row,821)-.5)*5.6);
  const rx=2+Math.floor(hash(col,row,829)*2);
  const ry=2+Math.floor(hash(col,row,839)*2);
  paintOnto(tile,fleck(x,y,rx,ry,ink,row+col));
  // Narrow satellites overlap a 5–8px parent and sometimes an adjacent
  // family. Omitting one of the satellites in every other family restores
  // open leafy-green channels between dense groups.
  for(let k=0;k<3;k++){
   if(k===2&&(row+col)%3!==0)continue;
   const a=(hash(col*7+k,row,853)+k/3)*Math.PI*2;
   const sx=x+Math.round(Math.cos(a)*(rx+1));
   const sy=y+Math.round(Math.sin(a)*(ry+.5));
   const frx=k===0?2:1+(hash(col,row*3+k,859)>.7?1:0);
   const fry=k===2?1:2;
   paintOnto(tile,fleck(sx,sy,frx,fry,ink,k+col));
  }
  // Tiny bounded 1–3px flecks at the edge of a real parent cluster, not
  // carpeted full-field noise. Local bounding-box painting is O(mark size).
  if(hash(col,row,887)>.55){
   const a=hash(col,row,893)*Math.PI*2;
   const px=x+Math.round(Math.cos(a)*(rx+2));
   const py=y+Math.round(Math.sin(a)*(ry+1));
   paintOnto(tile,p(ink,px-1,py,px,py-1,px+2,py,
    px+1,py+2,px-1,py+1));
  }
 }
 return tile;
}
function soldier2000_8E():Uint8Array{
 // 8D: keep 8C's exposed Kalahari-brown ground and its authored organic
 // islands. Sparse attached tips make the green silhouettes branch rather
 // than resemble a handful of unrelated smooth ovals.
 const source=paint(S2000.map(m=>scaleMotif(m,.725)),0);
 const out=source.slice();
 const bare=source.reduce((n,ink)=>n+(ink===0?1:0),0);
 // Art budget: never trade away the recognizable 38% brown background.
 const growthBudget=Math.min(56,Math.max(0,bare-Math.ceil(4096*.38)));
 const anchors:[number,number][]=[];
 let grown=0;
 const dirs:readonly (readonly [number,number])[]=[[1,0],[0,1],[-1,0],[0,-1]];
 for(let y=0;y<64&&grown<growthBudget;y++)
  for(let x=0;x<64&&grown<growthBudget;x++){
   const ink=indexAt(source,x,y),r=hash(x,y,403);
   if((ink!==1&&ink!==2)||r<.82||anchors.length>=24)continue;
   const [dx,dy]=dirs[Math.floor(hash(x,y,409)*4)];
   if(indexAt(source,x+dx,y+dy)!==0)continue;
   if(anchors.some(([ax,ay])=>{
    const sx=Math.abs(ax-x),sy=Math.abs(ay-y);
    return Math.min(sx,64-sx)**2+Math.min(sy,64-sy)**2<36;
   }))continue;
   anchors.push([x,y]);
   const length=hash(x,y,419)>.38?3:2;
   for(let step=1;step<=length&&grown<growthBudget;step++){
    const bx=(x+dx*step+64)&63,by=(y+dy*step+64)&63;
    if(indexAt(source,bx,by)!==0)break;
    if(out[by*64+bx]===0){out[by*64+bx]=ink;grown++;}
    // A small bent end remains attached to the green parent, not a
    // detached island or an all-over tiny dot cloud.
    if(step===length&&hash(x,y,431)>.42&&grown<growthBudget){
     const turn=hash(x,y,433)>.5?1:-1;
     const tx=(bx-dy*turn+64)&63,ty=(by+dx*turn+64)&63;
     if(indexAt(source,tx,ty)===0&&out[ty*64+tx]===0){
      out[ty*64+tx]=ink;grown++;
     }
    }
   }
  }
 // Pea-size interior contrasts must land INSIDE established vegetation,
 // never scatter over bare brown or create independent JGSDF dot clouds.
 for(let row=0;row<21;row++)for(let col=0;col<21;col++){
  const r=hash(col,row,191);
  if(r<.37)continue;
  const x=(col*3+Math.floor(hash(col,row,199)*3))&63;
  const y=(row*3+Math.floor(hash(col,row,211)*3))&63;
  const ink=indexAt(source,x,y);
  if(ink===0||ink===4)continue;
  let same=0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])
   if(indexAt(source,x+dx,y+dy)===ink)same++;
  if(same<3)continue;
  const spot=ink===3?4:(r>.75?3:4);
  out[y*64+x]=spot;
  if(r>.68&&indexAt(source,x+1,y)===ink)
   out[y*64+((x+1)&63)]=spot;
  if(r>.95&&indexAt(source,x,y+1)===ink)
   out[((y+1)&63)*64+x]=spot;
 }
 // Paired pin-size spots punctuate large interior greens; patches have
 // significantly more texture than M98 but far less than JGSDF.
 for(let row=0;row<16;row++)for(let col=0;col<16;col++){
  const r=hash(col,row,457);
  if(r<.68)continue; // 8E: 14% fewer secondary pin marks, preserve island texture
  const x=(col*4+Math.floor(hash(col,row,461)*4))&63;
  const y=(row*4+Math.floor(hash(col,row,463)*4))&63;
  const ink=indexAt(source,x,y);
  if(ink!==1&&ink!==2)continue;
  if(indexAt(source,x+1,y)!==ink||indexAt(source,x,y+1)!==ink)continue;
  const tint=r>.84?3:4;
  out[y*64+x]=tint;
  if(r>.79&&indexAt(source,x+2,y)===ink)
   out[y*64+((x+2)&63)]=tint;
 }
 return out;
}

const masters=new Map<Camo8AId,Uint8Array>();
function ownTile(id:Camo8AId):Uint8Array{
 if(id==='russian-izlom')return izlom8C();
 if(id==='greek-lizard')return greekLizard8C();
 if(id==='urban-kamysh')return urbanKamysh8C();
 if(id==='jgsdf-type2')return jgsdf8F();
 if(id==='south-african-s2000')return soldier2000_8E();
 if(id==='norwegian-m98')return norwegianM98_8F();
 throw new Error('Only independent 8A pattern masters are authored');
}
export function camo8AIndices(id:Camo8AId,relatives?:{
 pencott?:Uint8Array;highlander?:Uint8Array;
}):Uint8Array{
 if(id==='pencott-metropolis'){
  if(!relatives?.pencott||relatives.pencott.length!==4096)
   throw new Error('PenCott MetroPolis needs original PenCott 64px index master');
  return relatives.pencott.slice();
 }
 if(id==='kryptek-typhon'){
  if(!relatives?.highlander||relatives.highlander.length!==4096)
   throw new Error('Kryptek Typhon needs original Highlander 64px index master');
  return relatives.highlander.slice();
 }
 const cached=masters.get(id);
 if(cached)return cached.slice();
 const tile=ownTile(id);
 masters.set(id,tile);
 return tile.slice();
}

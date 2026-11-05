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
  label:'UKRAINIAN MM-14',description:'Connected gray, pale-stone and taupe digital ribbons, with irregular stepped edges and charcoal chips',
  colors:[[211,207,192],[164,163,149],[128,128,115],[100,98,89],[61,64,61]],
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
  label:'AOR2',description:'Dense interlocked sage and woodland digital islands with broken dark tendrils and varied short stepped projections',
  colors:[[180,178,131],[120,140,96],[75,106,74],[43,57,42]],
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
  label:'MULTICAM TROPIC',description:'Original MultiCam index artwork with role-preserving deep olive, jungle, shadow and small pale lichen pigments',
  colors:[[75,100,60],[111,129,76],[54,86,49],[71,72,47],[30,51,37],[152,150,95],[94,108,67]],
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
  label:'AOR1',description:'Tight desert-digital clusters, disjointed chocolate pixel flecks, broken coyote ribbons and pale negative space',
  colors:[[225,210,181],[188,168,137],[146,118,90],[93,80,68]],
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
  label:'MULTICAM ARID',description:'Original MultiCam index artwork recolored into dry cream, tan, earth, gray-sage and restrained dark accents',
  colors:[[200,178,138],[225,208,169],[167,159,128],[146,114,83],[102,93,77],[241,226,194],[181,169,143]],
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

/** 6B fidelity rebuild. Digital and foliage prints are now COMPOSED ink masks:
 * connected, artist-placed fields, interlocking interrupted ribbons and
 * identity-specific pixel fragments. Neither the old shared noise scores nor
 * percentile assignments participate in the artwork.
 *
 * MultiCam variants use the exact existing MultiCam index topology; this
 * deliberately lets the established pattern do the visual work.
 */
type Camo6BArt=readonly Motif[];
const ART:Readonly<Partial<Record<Camo6AId,Camo6BArt>>>={
 'atacs-fg':[
  p(2,-6,3,7,-2,20,3,26,8,19,15,10,17,-5,11),
  p(1,13,15,25,8,34,11,36,22,29,28,20,26),
  p(3,34,0,43,-2,56,3,67,13,59,19,45,15,36,10),
  p(2,37,22,51,18,65,24,69,34,57,38,47,32,36,31),
  p(0,-6,29,7,25,17,31,20,40,11,45,1,42,-6,38),
  p(2,19,38,30,32,44,39,43,49,32,53,22,49),
  p(1,46,43,57,39,70,47,66,58,52,60,43,53),
  p(3,6,52,17,48,29,55,27,65,13,68,-5,63),
  p(4,18,6,23,4,28,7,27,12,23,14,19,11),
  p(4,48,15,54,12,59,16,58,22,53,24,49,20),
  p(3,28,57,33,53,39,56,38,63,31,68,26,64),
  p(0,51,4,58,1,64,5,60,11,53,12,49,8),
  p(1,6,5,11,3,17,5,16,9,9,12,4,10)
 ],
 'atacs-au':[
  p(2,-6,3,8,-1,20,4,26,10,23,17,12,22,-5,15),
  p(0,16,14,28,9,39,16,42,26,32,29,21,25),
  p(3,37,0,51,-3,63,6,69,15,58,19,43,13),
  p(1,42,27,57,19,69,26,68,39,56,44,42,38),
  p(2,-5,32,7,27,20,34,27,42,19,47,3,43,-5,40),
  p(3,20,43,31,37,43,43,42,54,30,57,19,52),
  p(0,44,53,57,48,69,53,67,65,53,69,43,62),
  p(1,3,53,12,49,24,55,26,65,10,69,-5,63),
  p(4,11,7,16,5,21,9,19,14,13,17,9,13),
  p(4,40,35,45,33,50,38,48,43,43,46,39,41),
  p(3,52,8,58,5,64,10,62,16,56,17,51,13),
  p(0,24,28,30,25,34,27,32,32,26,34),
  p(2,31,58,38,54,45,57,44,64,36,67)
 ],
 'ukrainian-mm14':[
  // MM-14: pale/silver gaps interrupt winding stone/taupe pixel masses.
  p(2,-4,2,13,-2,22,3,28,2,38,9,35,16,23,17,16,11,5,16,-5,13),
  p(3,33,-4,45,2,54,0,67,7,65,18,53,16,43,20,34,13),
  p(1,5,22,17,18,29,24,37,23,45,29,41,36,31,34,25,40,14,34,5,36),
  p(2,44,22,58,20,69,27,64,39,53,42,45,35,35,37),
  p(3,-7,45,6,42,15,46,26,43,33,50,28,58,17,57,11,63,-5,59),
  p(2,33,52,45,47,58,51,69,55,64,65,50,68,38,62,30,66),
  p(0,17,0,24,4,31,2,34,9,24,12,19,8),
  p(0,49,11,55,9,62,13,60,19,51,21,45,16),
  p(0,21,31,29,27,37,31,33,39,24,40,17,36),
  p(0,51,43,59,40,67,43,62,50,53,51,46,48),
  p(4,6,5,11,4,15,7,17,11,12,12,8,9,2,11),
  p(4,37,11,41,8,47,12,46,16,40,17,36,14),
  p(4,44,30,49,28,54,31,52,36,47,37),
  p(4,14,48,19,46,24,49,23,53,17,55,13,52),
  p(4,57,57,62,55,66,58,64,63,58,64,54,61),
  p(1,28,14,34,15,37,20,33,23,29,20,23,21),
  p(1,8,55,14,54,18,58,16,63,10,65)
 ],
 aor2:[
  // Broken multidirectional woodland islands, NOT long uniform bars.
  p(2,-6,2,11,-3,24,2,32,9,27,17,18,13,10,20,2,16,-5,18),
  p(0,16,3,27,1,38,8,42,19,34,24,26,20,22,15,13,17),
  p(2,40,-2,56,1,69,10,66,22,55,27,47,20,41,21,35,13),
  p(0,-6,29,6,25,18,29,25,36,22,44,12,43,4,50,-6,44),
  p(2,25,28,40,23,50,30,53,40,46,44,36,40,31,47,23,41),
  p(0,51,34,65,30,69,41,59,49,51,45,43,49,39,42),
  p(2,-4,56,10,52,21,58,27,67,13,69,-6,66),
  p(0,28,55,40,51,53,57,65,56,69,66,49,69,37,65),
  p(3,4,8,8,5,14,10,13,15,19,16,20,21,12,22,10,17,4,19),
  p(3,30,3,33,1,38,5,37,11,43,14,41,19,34,16,33,12,28,11),
  p(3,49,18,53,16,58,19,57,26,63,28,62,33,55,30,51,33,48,28),
  p(3,11,32,15,29,21,34,19,39,24,43,22,48,15,45,10,41,6,40),
  p(3,35,37,40,34,46,39,44,45,49,48,46,52,39,49,35,52,30,48),
  p(3,4,56,8,53,15,57,13,62,19,64,15,69,8,65,3,66),
  p(3,53,4,58,2,63,6,62,11,57,12),
  p(1,16,23,22,21,27,25,23,30,16,29),
  p(1,52,52,59,49,64,54,60,60,54,58)
 ],
 aor1:[
  // Small cream and coyote digital breakup; MARPAT-family scale, warmer inks.
  p(2,-5,2,10,-1,20,6,29,8,31,16,23,19,15,16,10,22,-5,16),
  p(0,22,-2,37,2,48,8,54,17,46,21,34,16,30,12,22,13),
  p(2,49,-2,62,1,69,12,64,21,54,19,49,13),
  p(0,-5,27,9,23,23,30,31,38,24,43,15,40,9,46,-6,39),
  p(2,29,27,42,24,55,28,67,35,65,44,54,43,44,39,34,45,27,38),
  p(0,49,42,62,38,69,47,62,56,52,53,43,58,40,51),
  p(2,-5,54,12,52,25,58,29,67,15,70,-5,65),
  p(0,27,57,40,54,53,60,66,57,70,67,42,69),
  p(3,8,9,14,7,19,10,19,14,13,16,8,14,4,15),
  p(3,38,12,44,10,49,14,47,19,41,20,37,16),
  p(3,21,30,26,28,31,32,29,37,24,38,21,35),
  p(3,52,31,58,29,62,34,60,39,54,40,51,36),
  p(3,7,51,13,49,18,53,16,58,10,59,6,55),
  p(3,34,58,39,55,44,59,43,64,36,66,32,63),
  p(1,15,20,23,17,28,22,24,26,18,27),
  p(1,47,47,53,45,58,49,54,53,48,52)
 ],
 'ss-leto':[
  // Partizan-inspired lobed oak leaves deliberately connected into clusters.
  p(3,-4,3,4,-1,10,4,15,1,21,8,17,15,23,19,16,24,9,21,6,29,1,23,-5,19),
  p(2,23,-2,30,2,35,-2,41,6,38,12,46,17,41,24,34,20,30,27,25,21,19,20,25,13),
  p(4,44,5,50,2,56,6,62,4,68,13,63,19,68,23,60,27,55,24,51,31,47,25,42,21,49,17),
  p(3,3,34,10,30,16,36,22,32,29,40,24,46,30,53,21,54,16,49,10,58,6,52,-2,49),
  p(5,31,31,37,28,43,33,49,30,57,36,53,42,61,46,54,51,48,49,44,57,39,51,32,54,35,46,28,43),
  p(2,51,54,58,50,65,54,70,61,63,66,55,63,49,69,45,62),
  p(0,17,5,21,3,26,8,22,12,17,11),
  p(0,35,25,40,23,44,27,41,31,36,29),
  p(0,4,58,10,55,15,60,11,64,5,65),
  p(4,19,45,23,42,28,46,26,51,21,52),
  p(5,57,13,60,11,63,15,61,19,57,19),
  p(2,10,16,14,13,19,17,17,21,12,22),
  p(5,31,57,35,54,41,58,39,63,33,66)
 ]
};
const SIZE=64;
function hash(x:number,y:number,seed:number):number{
 let n=Math.imul((x+seed*101)^Math.imul(y+23,3571),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x119de1f3);
 return ((n^(n>>>15))>>>0)/4294967295;
}
function polygon(x:number,y:number,points:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=points.length-2;i<points.length;j=i,i+=2){
  const ax=points[i],ay=points[i+1],bx=points[j],by=points[j+1];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function inWrappedPolygon(x:number,y:number,points:readonly number[]):boolean{
 for(const dy of [-SIZE,0,SIZE])for(const dx of [-SIZE,0,SIZE])
  if(polygon(x+.5-dx,y+.5-dy,points))return true;
 return false;
}
function fields(id:Camo6AId,x:number,y:number):number{
 const isATACS=id==='atacs-fg'||id==='atacs-au';
 const isDigi=id==='aor1'||id==='aor2'||id==='ukrainian-mm14';
 const isLeaf=id==='ss-leto';
 // No fixed anisotropic noise frequencies. Shapes control shape scale.
 const px=isDigi?Math.floor(x/2)*2:x;
 const py=isDigi?Math.floor(y/2)*2:y;
 const base=id==='ukrainian-mm14'?0:id==='aor1'?1:1;
 let ink=base;
 const masks=ART[id]??[];
 for(const [tone,points] of masks)
  if(inWrappedPolygon(px,py,points))ink=tone;
 if(isATACS){
  // Fine organic edge erosion creates deliberately chipped micro/macro
  // transitions, not global ranked noise or smooth hard-edged blotches.
  const seed=id==='atacs-fg'?61:117;
  const h=hash(Math.floor(x/2),Math.floor(y/2),seed);
  const near=fieldsPlain(id,(x+2)%SIZE,y);
  const below=fieldsPlain(id,x,(y+2)%SIZE);
  const above=fieldsPlain(id,(x+SIZE-2)%SIZE,y);
  if(h>.76&&near!==ink)ink=near;
  else if(h<.18&&below!==ink)ink=below;
  else if(h>.93&&above!==ink)ink=above;
  // Sparse lichen/stone micro-grains, confined to matching macro inks.
  const dust=hash(x,y,seed+37);
  if(dust>.97&&ink===1)ink=0;
  if(dust<.035&&ink===2)ink=3;
 }
 if(isDigi){
  // 2x2 squares dominate; 1-pixel "broken corner" steps give small-
  // frequency detail like MARPAT and CADPAT without forming vertical bars.
  const bx=Math.floor(x/2),by=Math.floor(y/2);
  const h=hash(bx,by,id==='aor2'?23:id==='aor1'?59:87);
  if(h>.935&&ink===1)ink=2;
  if(h<.065&&ink===2)ink=1;
  if(h>.983&&ink===2)ink=id==='ukrainian-mm14'?4:3;
  if((x%2===0&&y%2===0)&&h<.14&&ink===3)ink=2;
 }
 if(isLeaf){
  // Oak-leaf lobes are actual authored ink masses; small interior "holes"
  // and paired edge notches break up the solids without generic flecks.
  const chip=hash(Math.floor(x/2),Math.floor(y/2),47);
  if(chip>.93&&ink===3)ink=1;
  if(chip<.08&&ink===2)ink=0;
  if(chip>.97&&ink===4)ink=5;
 }
 return ink;
}
/** Unmodified authored color masks, used to sample adjacent A-TACS ink fields. */
function fieldsPlain(id:Camo6AId,x:number,y:number):number{
 let ink=1;
 for(const [tone,points] of ART[id]??[])
  if(inWrappedPolygon(x,y,points))ink=tone;
 return ink;
}
const tileCache=new Map<Camo6AId,Uint8Array>();
export function camo6AIndices(id:Camo6AId,multicamBase?:Uint8Array):Uint8Array{
 if(id==='multicam-tropic'||id==='multicam-arid'){
  if(!multicamBase||multicamBase.length!==1024)
   throw new Error('MultiCam variants require the original 32px MultiCam ink master');
  const result=new Uint8Array(SIZE*SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
   result[y*SIZE+x]=multicamBase[(y>>1)*32+(x>>1)];
  return result;
 }
 const cached=tileCache.get(id);
 if(cached)return cached.slice();
 const result=new Uint8Array(SIZE*SIZE);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
  result[y*SIZE+x]=fields(id,x,y);
 tileCache.set(id,result);
 return result.slice();
}
/** Measured authored percentages are diagnostic metadata, not a quota that
 * changes the geometry. MultiCam variants inherit the original ink ratios. */
export const CAMO6A_RECIPES:Readonly<Record<Camo6AId,Camo6ARecipe>>=
 Object.fromEntries(CAMO6A_IDS.map(id=>{
  const recipe=MASTER[id];
  const targetCoverage=(id==='multicam-tropic'||id==='multicam-arid')?
   [.22,.23,.25,.17,.05,.04,.04]:(()=>{
    const counts=recipe.colors.map(()=>0);
    for(const ink of camo6AIndices(id))counts[ink]++;
    return counts.map(n=>n/(SIZE*SIZE));
   })();
  return [id,{...recipe,targetCoverage,motifs:ART[id]??recipe.motifs}];
 })) as Record<Camo6AId,Camo6ARecipe>;
export function isCamo6AId(id:string):id is Camo6AId{
 return (CAMO6A_IDS as readonly string[]).includes(id);
}

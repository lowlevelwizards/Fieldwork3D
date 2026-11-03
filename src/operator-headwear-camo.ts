/** Phase 3A: authored 1:1 camouflage motifs for approved Fieldwork headgear.
 * Canonical 32px and 64px seamless tiles with individual print scaling. Each polygon is hand placed, with no
 * RNG/noise pixels or filtering. Palette colors are art-directed adaptations
 * of reference fabric, not claims of measured military color standards.
 */
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
export const HEADWEAR_CAMO_SIZE=32;
export const HEADWEAR_CAMO_TILE_SIZE:Readonly<Partial<Record<HeadwearCamoId,32|64>>>={'m81-woodland':64};
export function headwearCamoSize(id:HeadwearCamoId):32|64{return HEADWEAR_CAMO_TILE_SIZE[id]??HEADWEAR_CAMO_SIZE;}
/** Print detail is independent from the one-texel-per-unit structural stitching atlas.
 * 1x for large historic fields; 2x for directional, digital and multiscale cloth.
 * These are fabric pixels per model unit, not a global model-geometry rescale.
 */
export const HEADWEAR_CAMO_DENSITY:Readonly<Record<HeadwearCamoId,number>>={
 'm81-woodland':1,'three-color-desert':1,'tiger-stripe':2,ucp:2,multicam:2,
 flecktarn:2,'woodland-dpm':1,'swedish-m90':1,'six-color-desert':1,
 'woodland-marpat':2,alpenflage:1,'desert-marpat':2,
 'erdl-lowland':2,'finnish-m05':2,'polish-pantera':1,
 'russian-flora':1,'rhodesian-brushstroke':1,'desert-tropentarn':2
};
export const HEADWEAR_CAMO_IDS=[
 'm81-woodland','three-color-desert','tiger-stripe','ucp','multicam',
 'flecktarn','woodland-dpm','swedish-m90','six-color-desert',
 'woodland-marpat','alpenflage','desert-marpat',
 'erdl-lowland','finnish-m05','polish-pantera','russian-flora',
 'rhodesian-brushstroke','desert-tropentarn'
] as const;
export type HeadwearCamoId=typeof HEADWEAR_CAMO_IDS[number];
type RGB=readonly [number,number,number];
type Motif=readonly [number,readonly number[]];
type CamoRecipe={
 label:string;description:string;
 colors:readonly RGB[];targetCoverage:readonly number[];
 motifs:readonly Motif[];
};
const p=(index:number,...coords:number[]):Motif=>[index,coords];
/** Sequence is painter's order: visible background -> medium field -> identifying accents.
 * All coordinates are integer art pixels in a periodic 32x32 tile. Motifs
 * can cross its edge and are wrapped across both axes by the rasterizer.
 */
export const HEADWEAR_CAMO_RECIPES:Readonly<Record<HeadwearCamoId,CamoRecipe>>={
 'm81-woodland':{
  label:'M81 WOODLAND',
  description:'Interlocking tan, green and brown with long dark branching strokes; extended 64px repeat',
  colors:[[87,118,73],[118,85,60],[175,155,105],[48,55,39]],
  targetCoverage:[.42,.23,.25,.10],
  motifs:[
   p(1,-9,-4,8,-4,19,4,23,13,19,19,7,23,-4,18,-9,12),
   p(1,29,-5,43,-3,53,3,63,10,69,15,63,22,53,17,44,14,34,9),
   p(1,8,28,17,24,29,26,36,33,33,41,23,47,12,44,5,38),
   p(1,44,38,53,33,66,35,70,47,63,57,54,61,42,56,39,48),
   p(1,-9,51,1,48,12,53,18,61,12,71,-9,68),
   p(1,32,21,41,17,50,20,59,27,65,30,59,36,49,32,39,35,29,28),
   p(2,12,-8,20,-5,31,2,34,7,28,12,18,11,14,18,7,17,11,9),
   p(2,44,11,51,8,63,13,70,22,69,28,59,25,55,30,49,24,40,22),
   p(2,-8,21,1,18,11,22,18,26,21,33,15,36,8,32,1,34,-8,31),
   p(2,25,40,32,35,41,39,49,45,53,53,45,56,36,51,31,57,23,53),
   p(2,-7,43,1,39,10,44,20,49,23,56,17,61,7,58,-7,62),
   p(2,18,58,27,54,36,59,43,65,37,70,23,70,14,65),
   p(2,52,-5,59,-8,67,0,65,7,58,9,51,5),
   p(3,-6,6,3,5,11,8,16,11,20,14,17,16,10,12,4,11,-6,12),
   p(3,16,18,20,16,25,19,30,24,38,27,43,30,40,32,34,29,29,28,24,22,18,23),
   p(3,31,-5,34,2,39,6,44,11,48,15,45,16,40,12,36,9,31,6,28,1),
   p(3,52,23,58,20,64,25,69,29,67,33,61,29,56,29,52,33,46,35,43,39,45,34),
   p(3,3,36,10,34,17,37,24,42,29,44,27,47,22,45,15,41,8,40,1,42),
   p(3,38,48,41,44,46,45,51,49,56,50,60,54,58,55,52,53,46,52,41,55,37,58),
   p(3,10,60,17,57,23,62,30,68,26,69,19,65,14,63,8,64),
   p(3,-4,28,1,26,4,28,7,31,4,33,1,30,-5,33),
   p(3,57,7,60,5,64,8,67,12,63,13,59,10)
  ]
 },
 'three-color-desert':{
  label:'3-COLOR DESERT',
  description:'Open pale sand with large light-khaki islands and sparse brown branching accents',
  colors:[[193,173,133],[221,201,162],[145,105,73]],
  targetCoverage:[.45,.45,.10],
  motifs:[
   p(1,-3,3,4,0,10,3,11,8,6,12,-3,11),
   p(1,16,0,23,-2,30,2,29,9,23,11,17,8),
   p(1,5,18,13,14,18,17,17,22,11,27,4,25),
   p(1,23,24,29,20,35,22,35,30,28,34,22,30),
   p(2,8,5,11,4,13,7,11,9,8,10,7,13,5,12,6,8),
   p(2,21,13,24,11,26,12,26,17,23,19,24,16,21,16),
   p(2,-2,24,1,22,4,24,5,27,2,28,-1,27),
   p(2,15,28,18,26,19,28,21,29,18,31,15,34)
  ]
 },
 'tiger-stripe':{
  label:'TIGER STRIPE',
  description:'Broken dark tapered directional streaks over green, olive and tan fields',
  colors:[[124,135,91],[77,101,70],[147,122,84],[46,54,44]],
  targetCoverage:[.32,.16,.16,.36],
    motifs:[
   // Broken tapered strokes are NOT equally spaced horizontal bands. Each
   // crosses the tile edges seamlessly; body panels choose their own axis.
   p(1,-5,0,4,1,12,4,18,8,21,10,17,11,10,7,3,5,-5,6),
   p(2,13,-2,22,1,28,4,35,6,35,11,27,9,23,6,17,6,12,2),
   p(1,-4,15,5,12,12,15,17,20,24,22,28,20,34,19,35,24,25,27,17,24,11,20,3,18,-4,21),
   p(2,0,26,7,23,14,25,19,28,25,30,34,27,35,32,24,34,16,31,10,29,3,30,-4,33),
   p(3,-5,2,5,4,12,7,17,8,20,10,16,10,12,9,6,8,-5,7),
   p(3,9,-3,15,0,20,3,24,4,23,6,17,5,13,3,8,1),
   p(3,24,8,29,9,35,12,35,15,29,13,25,12,20,12,17,11),
   p(3,-4,18,3,16,11,18,18,23,25,24,29,23,35,22,35,24,26,26,18,25,10,21,2,20,-4,22),
   p(3,7,27,12,27,16,30,23,32,29,30,35,31,35,33,28,33,20,34,13,32)
  ]
 },
 ucp:{
  label:'UCP',
  description:'Dense 1–3 pixel stair-steps nested inside subdued gray, sage and sand fields',
  colors:[[166,171,158],[136,146,134],[188,188,169]],
  targetCoverage:[.45,.28,.27],
  motifs:[
   p(1,0,0,9,0,9,3,12,3,12,6,8,6,8,9,3,9,3,5,0,5),
   p(2,14,0,22,0,22,3,26,3,26,7,23,7,23,10,18,10,18,6,14,6),
   p(1,26,11,32,11,32,16,29,16,29,21,24,21,24,17,26,17),
   p(2,0,12,6,12,6,15,10,15,10,19,7,19,7,22,2,22,2,18,0,18),
   p(1,11,13,18,13,18,16,21,16,21,20,16,20,16,23,11,23),
   p(2,2,26,10,26,10,29,14,29,14,33,7,33,7,31,2,31),
   p(1,20,24,27,24,27,27,33,27,33,31,29,31,29,34,23,34,23,30,20,30),
   p(2,29,0,34,0,34,5,30,5,30,8,27,8,27,3,29,3),
   p(2,11,9,14,9,14,11,16,11,16,13,11,13),
   p(1,3,23,6,23,6,26,3,26),
   p(2,19,21,22,21,22,24,19,24)
  ]
 },
 multicam:{
  label:'MULTICAM',
  description:'Large muted fields, medium brown/green islands, dark hooks and tiny pale cream chips',
  colors:[[171,158,117],[206,189,149],[109,126,88],[129,102,74],[64,83,66],[228,213,177],[151,142,107]],
  targetCoverage:[.22,.23,.25,.17,.05,.04,.04],
  motifs:[
   p(1,-4,1,7,-2,13,1,10,5,4,8,-4,6),
   p(1,18,13,27,11,35,17,34,22,25,23,20,20),
   p(1,5,25,12,22,19,26,17,31,10,35,3,31),
   p(2,9,1,16,-1,23,4,21,9,14,11,8,8),
   p(2,23,23,30,20,35,25,34,31,26,34,22,30),
   p(2,-3,13,4,11,10,16,8,20,2,23,-4,20),
   p(3,15,7,21,5,26,9,25,14,19,15,14,12),
   p(3,2,19,8,17,13,21,11,25,5,27,0,24),
   p(3,28,0,33,-1,34,7,30,9,27,6),
   p(4,12,13,15,12,18,15,17,17,14,17),
   p(4,29,24,31,23,34,27,32,30,29,28),
   p(4,5,5,7,3,9,5,8,7,6,8),
   p(1,16,21,20,19,22,22,21,24,18,25),
   p(2,1,28,4,26,7,28,6,30,3,31),
   // Tiny cream glints and dry sage flecks are identity marks, not weathering.
   p(5,7,1,9,1,10,2,9,3,7,3),p(5,26,5,29,5,28,7,26,7),
   p(5,11,18,13,17,15,18,14,20,12,20),
   p(5,1,29,3,28,5,29,5,30,2,31),
   p(5,22,28,25,27,26,29,23,30),
   p(5,18,10,20,9,22,10,20,12),
   p(6,2,5,5,4,7,5,6,6,3,7),
   p(6,21,2,24,1,27,3,24,5),
   p(6,8,24,10,22,12,23,11,25),
   p(6,28,15,31,14,33,15,32,17,29,17)
  ]
 },
 // 3B auditions: each is an independently authored 32x32 periodic fabric cut.
 // RGB values are reused from the established five prints wherever possible.
 'flecktarn':{
  label:'FLECKTARN',
  description:'Broad woodland green and tan masses carrying dense clustered rust and ink droplets',
  colors:[[119,134,86],[54,83,55],[161,137,91],[129,77,53],[46,54,44]],
  targetCoverage:[0.144,0.244,0.248,0.177,0.188],
  motifs:[
   // Four generous underlying masses establish the pattern from a distance.
   // The 1-2px droplet clusters below survive on top of these long sweeps.
   p(1,-5,0,7,-3,17,4,18,9,10,15,-4,12),
   p(1,10,13,18,9,27,15,29,23,22,29,13,26,6,20),
   p(2,18,-3,26,-2,34,3,32,9,25,13,17,9,14,5),
   p(2,-5,13,2,10,11,13,17,20,13,24,6,23,-4,20),
   p(3,3,2,6,1,8,3,7,5,3,5),p(3,9,4,11,3,13,5,12,7,10,7),
   p(3,19,3,23,2,25,5,23,7,20,6),p(3,28,12,31,11,33,13,32,16,29,16),
   p(3,3,17,6,15,9,17,8,20,5,21),p(3,13,23,17,22,19,24,18,27,14,27),
   p(3,24,19,27,17,29,20,27,23,24,23),p(3,7,29,11,28,12,31,10,34,7,33),
   p(4,1,6,3,5,5,7,3,9,1,8),p(4,14,1,16,0,18,2,17,5,14,4),
   p(4,22,8,25,7,27,10,25,12,23,11),
   p(4,9,12,11,10,13,13,12,16,9,15),
   p(4,19,17,21,15,23,18,22,21,20,20),
   p(4,28,29,30,27,33,29,32,32,29,33),
   p(4,2,28,4,26,6,29,4,31)
  ]
 },
 'woodland-dpm':{
  label:'WOODLAND DPM',
  description:'British temperate brushstroke: warm khaki windows, broad oak-like green/brown strokes, thin hooked charcoal boughs and serrated edges',
  colors:[[175,155,105],[87,118,73],[118,85,60],[48,55,39]],
  targetCoverage:[0.218,0.293,0.306,0.184],
  motifs:[
   // Wide flat khaki openings between green and brown brush sweeps.
   p(1,-6,1,2,-2,8,1,13,5,17,8,14,11,10,9,7,7,3,7,-4,12),
   p(1,17,14,24,9,31,10,36,15,36,23,29,20,24,18,19,22,13,20),
   p(1,-4,25,2,22,7,24,13,29,16,36,11,34,6,30,2,29,-5,32),
   // Rounded flat-ended earthy brushstrokes, elongated and interleaved,
   // including unmistakable broad "fingers" into negative space.
   p(2,16,-4,22,-3,28,1,35,5,36,8,30,7,27,6,24,9,20,9,23,5,18,4,13,2),
   p(2,-5,12,3,10,6,12,11,14,14,17,21,18,19,23,15,22,12,20,7,20,4,18,0,19,-5,22),
   p(2,18,26,24,22,29,23,36,28,35,34,29,32,25,30,21,33,17,31),
   p(2,7,28,13,25,17,28,20,30,21,35,15,34,12,31,9,32),
   // The recognizable DPM negative spaces are broad khaki windows and
   // pointed green fingers interrupting the broad brown paint sweeps.
   p(1,17,2,20,1,23,3,22,6,19,7,16,6),
   p(1,3,12,7,11,12,14,17,14,15,17,10,17,7,15),
   p(1,22,24,25,23,30,25,31,27,26,27,23,30,21,29),
   p(0,12,2,16,4,18,7,16,9,13,7,11,4),
   p(0,5,18,9,17,12,19,10,21,7,21),
   p(0,23,15,26,14,29,16,28,19,25,20),
   // Small lobe shapes at stroke tips, not rounded M81 islands.
   p(2,4,5,8,4,10,7,9,10,6,10),
   p(1,22,0,26,-1,29,1,26,3,22,3),
   // Strong dark tapered zigzag branches cutting across fields.
   p(3,-5,8,1,8,4,9,8,11,13,13,17,15,18,16,14,15,9,13,4,11,0,10,-5,10),
   p(3,10,-4,12,0,16,3,21,6,24,9,23,10,18,7,15,5,12,4,10,0),
   p(3,25,9,28,9,33,11,36,13,31,12,28,11,23,14,19,17,18,18,22,15,26,12),
   p(3,-4,27,2,26,5,27,9,29,14,31,18,34,14,32,9,30,5,28,1,28,-4,29),
   p(3,21,23,24,20,26,20,30,22,33,24,30,23,27,22,25,23,22,26,20,29),
   // Fine branch junctions, tapering to one or two pixels.
   p(3,3,13,6,12,8,14,7,16,5,15),
   p(3,16,18,19,17,21,19,20,21,18,21),
   p(3,29,30,31,28,34,29,33,32,30,33)
  ]
 },
 'swedish-m90':{
  label:'SWEDISH M90',
  description:'Bold interlocking angular splinters in light green, olive, dark forest and near-black',
  colors:[[94,111,77],[143,159,101],[64,83,66],[46,54,44]],
  targetCoverage:[0.131,0.257,0.31,0.303],
  motifs:[
   p(1,-5,0,8,0,16,7,12,11,5,8,-5,13),
   p(1,16,19,23,12,35,12,35,21,29,21,24,29,18,27),
   p(1,-5,22,3,17,11,19,8,25,16,30,11,35,-5,34),
   p(2,12,-3,20,-3,29,7,24,13,18,8,15,13,8,6),
   p(2,3,11,11,8,17,14,13,19,20,24,14,28,6,22,-5,23),
   p(2,24,26,33,20,35,32,29,35),
   p(3,25,-4,35,-4,35,6,31,6,25,12,19,6),
   p(3,7,17,13,13,21,21,17,25,11,20,3,25,-4,19),
   p(3,21,30,26,25,33,29,35,35,28,35),
   p(0,3,29,6,26,11,31,8,35,0,35)
  ]
 },
 'six-color-desert':{
  label:'6-COLOR DESERT',
  description:'Chocolate-chip desert: large pale dunes, khaki islands and scattered dark-rimmed light pebbles',
  colors:[[193,173,133],[221,201,162],[145,105,73],[138,121,90],[228,213,177],[46,54,44]],
  targetCoverage:[0.228,0.305,0.277,0.1,0.022,0.068],
  motifs:[
   p(1,-4,1,5,-2,13,1,13,7,7,11,-4,9),
   p(1,16,13,23,9,35,12,35,19,28,22,21,20),
   p(1,-4,24,5,22,12,26,16,33,6,35,-4,31),
   p(2,18,-3,25,0,30,5,27,9,20,7,15,4),
   p(2,4,14,11,11,17,15,16,20,10,22,5,19),
   p(2,24,25,30,22,36,26,35,32,28,34,23,30),
   p(3,0,9,4,8,7,12,5,15,1,14),
   p(3,12,22,17,20,20,24,16,27,13,26),
   p(3,27,2,32,1,35,5,32,8,29,7),
   // Small broken pebble crescents: rare dark chips nested beside pale flecks.
   p(5,7,4,9,4,10,6,9,7,8,6,7,7),p(4,8,5,9,5,9,6,8,6),
   p(5,12,7,14,6,15,8,14,9,13,8),p(4,13,7,14,7,14,8,13,8),
   p(5,24,13,26,12,28,14,27,16,26,15,25,16),p(4,26,14,27,14,27,15,26,15),
   p(5,28,20,30,19,31,21,30,22,29,21),p(4,29,20,30,20,30,21,29,21),
   p(5,1,26,3,25,5,27,4,29,3,28,2,29),p(4,3,27,4,27,4,28,3,28),
   p(5,8,29,10,28,12,30,11,31,9,31),p(4,10,29,11,29,11,30,10,30),
   p(5,17,26,19,25,21,27,20,29,19,28,18,29),p(4,19,27,20,27,20,28,19,28),
   p(5,19,4,21,3,23,5,22,7,21,6),p(4,21,5,22,5,22,6,21,6),
   p(5,2,15,4,14,6,16,5,18,4,17),p(4,4,16,5,16,5,17,4,17),
   p(5,14,18,16,17,18,19,17,21,16,20),p(4,16,19,17,19,17,20,16,20),
   p(5,30,30,32,29,33,31,32,33,31,32),p(4,31,31,32,31,32,32,31,32)
  ]
 },
 'woodland-marpat':{
  label:'WOODLAND MARPAT',
  description:'Layered green and brown macro-fields assembled from uneven 1-3px digital fragments',
  colors:[[94,111,77],[138,121,90],[64,83,66],[46,54,44]],
  targetCoverage:[0.379,0.209,0.321,0.091],
  motifs:[
   p(1,0,1,7,1,7,4,11,4,11,8,14,8,14,12,8,12,8,10,3,10,3,7,0,7),
   p(1,17,19,23,19,23,16,28,16,28,20,33,20,33,26,29,26,29,30,22,30,22,27,17,27),
   p(1,2,24,9,24,9,27,13,27,13,31,9,31,9,34,2,34),
   p(2,19,0,26,0,26,3,31,3,31,9,27,9,27,12,20,12,20,9,16,9,16,5,19,5),
   p(2,-2,15,5,15,5,12,9,12,9,17,14,17,14,21,10,21,10,24,3,24,3,21,-2,21),
   p(2,14,28,19,28,19,25,23,25,23,32,17,32,17,35,14,35),
   p(3,10,3,13,3,13,6,16,6,16,10,12,10,12,8,10,8),
   p(3,29,11,32,11,32,14,35,14,35,17,31,17,31,15,28,15),
   p(3,3,22,7,22,7,25,10,25,10,28,6,28,6,26,3,26),
   p(3,17,15,20,15,20,18,23,18,23,21,19,21,19,19,16,19),
   p(1,14,14,16,14,16,16,18,16,18,18,14,18),
   p(2,25,30,28,30,28,32,31,32,31,34,25,34),
   p(3,0,0,2,0,2,2,4,2,4,4,0,4)
  ]
 },
 'alpenflage':{
  label:'SWISS ALPENFLAGE',
  description:'Bold brick-red islands among branching forest green, olive, black and small warm highlights',
  colors:[[94,111,77],[64,83,66],[138,121,90],[46,54,44],[160,64,52],[206,189,149]],
  targetCoverage:[0.228,0.242,0.233,0.099,0.163,0.035],
  motifs:[
   p(1,-5,0,3,-2,11,3,13,7,8,9,0,7,-5,11),
   p(1,19,13,24,9,32,13,35,20,29,24,22,21,16,17),
   p(1,1,23,9,21,15,27,15,34,7,35,-5,31),
   p(2,14,-3,22,-3,30,2,31,8,23,10,16,7),
   p(2,-4,13,2,10,9,12,14,17,11,21,4,19,-4,20),
   p(2,23,27,29,23,36,25,35,32,28,35),
   p(3,8,5,11,4,14,7,16,11,12,10,10,8),
   p(3,27,12,31,10,35,15,33,19,28,18),
   p(3,1,29,4,27,7,30,6,34,2,34),
   p(4,3,2,7,1,9,4,8,7,5,8,2,6),
   p(4,20,2,24,1,26,4,24,8,21,9,19,6),
   p(4,3,15,6,14,9,17,8,20,5,21,2,19),
   p(4,17,19,21,18,24,20,22,24,18,25,16,22),
   p(4,27,27,30,26,33,28,32,31,29,32,26,30),
   p(5,10,12,12,10,14,12,12,15),
   p(5,29,2,32,2,31,5,29,5),
   p(5,7,27,10,26,12,29,9,30),
   p(5,23,30,25,28,27,30,25,32)
  ]
 },
 'desert-marpat':{
  label:'DESERT MARPAT',
  description:'Bright tan digital fields with light coyote steps and sparse dark brown pixels',
  colors:[[221,201,162],[193,173,133],[171,158,117],[145,105,73]],
  targetCoverage:[0.422,0.368,0.163,0.047],
  motifs:[
   p(1,2,1,10,1,10,4,14,4,14,9,11,9,11,12,5,12,5,9,2,9),
   p(1,17,16,24,16,24,13,29,13,29,19,33,19,33,25,27,25,27,29,19,29,19,26,16,26),
   p(1,1,26,7,26,7,23,12,23,12,28,15,28,15,34,9,34,9,32,1,32),
   p(1,24,0,29,0,29,4,34,4,34,10,30,10,30,12,24,12),
   // Unprinted pale islands interrupt the mid-tan fields at macro scale.
   p(0,3,4,7,4,7,8,10,8,10,11,3,11),
   p(0,19,19,23,19,23,23,27,23,27,27,18,27,18,24,19,24),
   p(0,4,28,10,28,10,32,5,32),
   p(0,27,6,32,6,32,10,27,10),
   p(2,18,2,22,2,22,5,26,5,26,9,23,9,23,12,18,12,18,9,15,9,15,5,18,5),
   p(2,3,16,9,16,9,14,13,14,13,20,10,20,10,23,3,23,3,21,0,21,0,18,3,18),
   p(2,23,29,27,29,27,27,31,27,31,32,29,32,29,35,23,35),
   p(3,11,2,13,2,13,5,16,5,16,8,12,8,12,6,10,6),
   p(3,29,20,31,20,31,22,34,22,34,25,30,25,30,24,28,24),
   p(3,7,28,9,28,9,30,11,30,11,32,7,32),
   p(3,19,14,21,14,21,16,23,16,23,18,19,18),
   p(1,0,0,2,0,2,2,4,2,4,4,0,4),
   p(2,14,30,17,30,17,33,19,33,19,35,14,35)
  ]
 },
 // 4A: six separate historical pattern families. All motifs are independently authored.
 'erdl-lowland':{
  label:'ERDL LOWLAND',description:'Fine leaf-and-branch woodland with thin ink trails, green ground and small khaki breaks',
  colors:[[87,118,73],[119,134,86],[118,85,60],[175,155,105],[48,55,39]],
  targetCoverage:[.31,.22,.18,.18,.11],
  motifs:[
   p(1,-4,0,4,-2,12,2,16,7,11,11,4,9,-3,12),
   p(1,18,13,24,10,32,13,35,19,30,23,21,21,17,17),
   p(1,-4,23,4,20,11,24,15,30,11,35,2,33,-4,30),
   p(2,17,-4,26,-2,33,5,30,10,24,10,20,5,14,3),
   p(2,-4,13,3,11,10,15,13,21,8,24,1,22,-4,19),
   p(2,20,26,29,22,35,27,34,34,26,35,19,30),
   p(3,5,5,11,4,14,7,10,10,6,9),
   p(3,22,14,28,12,32,16,30,21,24,20),
   p(3,2,28,6,26,11,29,9,33,3,33),
   p(3,14,22,18,19,21,22,19,26,15,26),
   p(4,-3,7,3,7,7,9,11,13,14,14,12,15,7,12,1,11,-3,12),
   p(4,10,-3,12,2,16,6,19,8,20,12,18,10,13,7,11,3),
   p(4,25,3,29,5,33,9,34,11,30,9,27,7,24,8),
   p(4,16,13,19,12,23,16,27,18,30,21,27,20,22,18,18,17),
   p(4,1,19,4,18,8,20,11,24,16,28,14,29,10,25,5,22,1,23),
   p(4,23,27,27,25,31,28,35,30,33,32,29,31,25,29),
   p(3,4,15,6,14,8,16,7,18),
   p(3,14,3,16,2,18,4,17,6),
   p(3,28,23,30,22,32,24,31,26)
  ]
 },
 'finnish-m05':{
  label:'FINNISH M05',description:'Strong blocky Finnish forest bands with stepped woodland boundaries and high-contrast dark fractures',
  colors:[[94,111,77],[143,159,101],[64,83,66],[46,54,44]],
  targetCoverage:[.25,.22,.28,.25],
  motifs:[
   p(1,-4,1,5,1,5,4,9,4,9,9,13,9,13,13,7,13,7,10,2,10,2,7,-4,7),
   p(1,18,20,23,20,23,17,28,17,28,21,34,21,34,27,30,27,30,31,23,31,23,28,18,28),
   p(1,2,25,8,25,8,22,13,22,13,29,9,29,9,35,3,35),
   p(2,17,-3,24,-3,24,1,30,1,30,5,34,5,34,13,28,13,28,10,21,10,21,6,17,6),
   p(2,-3,14,4,14,4,11,9,11,9,16,14,16,14,24,9,24,9,20,3,20,3,23,-3,23),
   p(2,13,25,18,25,18,29,21,29,21,34,15,34,15,31,12,31),
   p(3,9,1,13,1,13,4,17,4,17,7,14,7,14,11,10,11,10,8,7,8,7,5,9,5),
   p(3,23,12,28,12,28,15,32,15,32,19,27,19,27,17,22,17,22,14,23,14),
   p(3,0,21,5,21,5,25,10,25,10,30,6,30,6,28,1,28),
   p(3,15,15,20,15,20,18,23,18,23,23,19,23,19,21,15,21),
   p(1,14,2,16,2,16,4,19,4,19,6,15,6),
   p(2,28,27,32,27,32,29,35,29,35,32,29,32),
   p(3,9,30,12,30,12,32,14,32,14,34,9,34)
  ]
 },
 'polish-pantera':{
  label:'POLISH WZ.93',description:'Broad Polish woodland amoeba lobes with irregular inward notches and warm khaki breaks',
  colors:[[87,118,73],[118,85,60],[175,155,105],[48,55,39]],
  targetCoverage:[.3,.29,.25,.16],
  motifs:[
   p(1,-5,0,4,-2,12,1,14,4,10,6,12,10,6,13,-2,11,-5,8),
   p(1,14,16,21,13,27,15,31,20,29,25,24,26,22,29,15,28,10,22),
   p(1,0,28,6,25,12,29,14,34,5,35,-4,32),
   p(1,22,-4,28,-3,34,3,33,9,26,11,20,7,19,2),
   p(2,-4,14,3,10,11,15,15,19,11,23,4,22,0,25,-4,22),
   p(2,17,1,23,-1,31,3,33,8,26,12,22,10,18,12,13,7),
   p(2,24,25,29,22,35,25,35,33,29,35,23,30),
   p(2,6,28,12,25,18,29,18,33,13,35,8,32),
   p(3,3,5,7,4,9,7,7,11,3,10,1,8),
   p(3,26,11,30,10,33,13,31,17,28,16,25,14),
   p(3,4,21,7,18,11,20,10,24,7,26,5,24),
   p(3,18,28,22,27,25,31,22,34,19,32),
   p(3,16,10,19,9,21,12,18,14,15,13),
   p(3,31,28,34,27,35,31,32,33)
  ]
 },
 'russian-flora':{
  label:'VSR-98 FLORA',description:'Horizontal Russian Flora brush bands, broken wavy reeds and olive-to-brown alternating corridors',
  colors:[[77,101,70],[124,135,91],[138,121,90],[46,54,44]],
  targetCoverage:[.28,.24,.25,.23],
  motifs:[
   p(1,-4,0,6,1,13,3,21,3,28,6,35,5,35,9,26,8,19,7,12,8,4,5,-4,5),
   p(1,-4,16,5,14,12,17,19,17,26,20,34,19,34,23,26,23,18,21,11,22,3,19,-4,20),
   p(1,-3,29,6,27,14,30,22,29,30,31,35,29,35,35,-4,35),
   p(2,-5,7,2,8,9,10,16,10,24,12,30,12,35,14,35,17,27,16,19,14,12,14,5,12,-5,12),
   p(2,-4,22,4,21,11,24,19,23,26,25,34,24,35,29,28,29,21,27,14,28,6,26,-4,27),
   p(2,12,-4,19,-2,26,-2,35,1,35,5,27,4,21,2,15,2),
   p(3,-4,12,4,12,12,14,20,15,27,16,35,17,35,19,26,18,18,18,10,17,3,15,-4,16),
   p(3,1,25,7,24,15,26,23,27,30,28,35,28,35,31,27,30,19,30,13,29,5,28,-3,29),
   p(3,10,6,16,5,22,7,29,7,35,9,35,11,28,10,20,9,13,9),
   p(3,21,0,27,-1,34,1,35,3,27,2,22,3),
   p(2,3,2,8,1,14,3,13,5,6,5),
   p(1,20,25,24,23,30,25,28,27,22,27)
  ]
 },
 'rhodesian-brushstroke':{
  label:'RHODESIAN BRUSH',description:'Oversized slashing brush strokes with feathered spear tips across a dry khaki field',
  colors:[[193,173,133],[87,118,73],[118,85,60],[48,55,39]],
  targetCoverage:[.32,.29,.27,.12],
  motifs:[
   p(1,-5,1,2,-2,10,2,18,8,25,13,27,17,20,14,14,12,5,7,-5,7),
   p(1,14,20,18,16,25,17,33,25,36,31,29,28,23,25,17,24,10,21),
   p(1,-5,23,2,21,8,26,14,31,15,35,5,32,-5,29),
   p(2,16,-4,22,0,29,4,35,9,35,16,28,13,24,10,18,7,12,6),
   p(2,-4,11,4,11,12,17,19,22,25,24,23,28,17,25,11,21,3,16,-4,16),
   p(2,21,27,28,24,35,29,35,35,27,35),
   p(2,6,1,9,0,14,4,15,7,11,6),
   p(3,-4,7,2,7,9,10,17,14,24,18,28,20,24,20,16,16,10,14,3,10,-4,11),
   p(3,10,-4,15,0,21,5,28,10,35,15,34,17,26,12,19,8,12,3),
   p(3,-4,25,3,23,10,26,18,30,25,34,21,34,13,29,7,28,0,27,-4,29),
   p(3,24,12,28,11,34,15,35,18,30,16,25,15),
   p(1,3,17,8,15,14,18,18,21,16,23,10,21,5,20)
  ]
 },
 'desert-tropentarn':{
  label:'GERMAN TROPENTARN',description:'Pale sand islands interrupted by compact rust-brown and restrained olive droplet clusters',
  colors:[[221,201,162],[193,173,133],[145,105,73],[109,126,88],[46,54,44]],
  targetCoverage:[.36,.31,.19,.11,.03],
  motifs:[
   p(1,-5,0,4,-2,12,2,17,6,13,11,5,11,-4,7),
   p(1,15,14,21,11,29,14,35,19,32,25,23,25,17,21),
   p(1,-4,24,3,21,11,25,16,31,12,35,3,34,-4,31),
   p(1,21,-4,29,-2,35,3,33,10,25,12,19,7),
   p(2,3,4,6,3,8,5,7,7,4,7),
   p(2,12,2,15,1,17,3,16,6,13,6),
   p(2,24,4,27,3,29,6,27,9,24,8),
   p(2,30,13,33,12,35,15,33,18,30,17),
   p(2,4,17,7,15,10,18,9,21,5,22),
   p(2,14,18,17,16,20,19,19,22,15,23),
   p(2,23,21,26,19,29,22,28,25,24,25),
   p(2,2,28,5,27,8,29,6,32,3,32),
   p(2,13,29,16,27,19,30,17,33,14,33),
   p(2,28,28,31,26,34,29,32,32,29,33),
   p(3,8,9,11,8,13,10,12,12,9,12),
   p(3,19,7,22,6,24,9,22,11,19,10),
   p(3,27,17,30,16,32,19,30,21,28,20),
   p(3,9,24,12,23,14,25,12,28,9,27),
   p(4,5,13,7,12,9,14,8,16,5,15),
   p(4,20,27,22,26,24,28,23,30,21,29),
   p(4,30,2,32,1,34,3,33,5,31,4)
  ]
 }
};
export const HEADWEAR_CAMO_ELIGIBILITY:Readonly<Record<HeadSilhouetteId,readonly HeadwearCamoId[]>>={
 'patrol-cap':[...HEADWEAR_CAMO_IDS],
 boonie:[...HEADWEAR_CAMO_IDS],
 beanie:[],
 ach:['m81-woodland','three-color-desert','ucp','multicam','flecktarn',
  'woodland-dpm','swedish-m90','six-color-desert','woodland-marpat','desert-marpat',
  'erdl-lowland','finnish-m05','polish-pantera','russian-flora','rhodesian-brushstroke','desert-tropentarn'],
 'high-cut':['m81-woodland','ucp','multicam','flecktarn','swedish-m90',
  'woodland-marpat','desert-marpat','finnish-m05','polish-pantera','desert-tropentarn'],
 pasgt:['m81-woodland','three-color-desert','woodland-dpm','six-color-desert',
  'erdl-lowland','polish-pantera','russian-flora','rhodesian-brushstroke'],
 'soviet-steel':[]
};
export function headwearCamoChoices(model:string):readonly HeadwearCamoId[]{
 const id=model==='high-cut-rails'?'high-cut':model as HeadSilhouetteId;
 return HEADWEAR_CAMO_ELIGIBILITY[id]??[];
}
export function isHeadwearCamoId(value:unknown):value is HeadwearCamoId{
 return typeof value==='string'&&(HEADWEAR_CAMO_IDS as readonly string[]).includes(value);
}
export function resolvedHeadwearCamo(model:string,value:unknown):HeadwearCamoId|null{
 return isHeadwearCamoId(value)&&headwearCamoChoices(model).includes(value)?value:null;
}
/**
 * Flecktarn's silhouette comes from hundreds of tiny droplets rather than a
 * handful of large polygons. Each cluster center is an intentional art mark.
 * Satellite offsets produce uneven 1-2 px dot constellations within that center,
 * with size/spacing guided by the surrounding broad color mass.
 */
type FleckCluster=readonly [number,number,number,number];
const FLECKTARN_CLUSTERS:readonly FleckCluster[]=[
 // ink, center X, center Y, cluster type: deliberately staggered, not a lattice
 [4,2,3,0],[4,10,4,1],[4,17,2,2],[4,25,4,0],[4,31,6,1],
 [4,6,10,2],[4,14,10,0],[4,22,12,1],[4,30,14,2],
 [4,2,19,1],[4,11,18,2],[4,18,21,0],[4,27,22,1],
 [4,5,27,0],[4,14,28,1],[4,21,29,2],[4,30,30,0],
 [3,7,3,1],[3,20,6,2],[3,29,2,1],[3,2,13,0],
 [3,12,15,1],[3,25,16,0],[3,6,23,2],[3,17,25,1],[3,29,28,2],
 [2,13,5,0],[2,28,9,1],[2,5,16,1],[2,18,14,2],[2,24,26,0],
 [0,2,8,2],[0,16,17,2],[0,31,21,0],[0,11,30,2],
 [1,8,7,0],[1,23,3,1],[1,8,21,0],[1,20,30,1]
];
const FLECKTARN_SATELLITES:readonly (readonly (readonly [number,number])[])[]=[
 [[0,0],[2,0],[-2,1],[1,2],[-1,-2],[3,-2],[-3,-1]],
 [[0,0],[2,-1],[-1,2],[-2,-1],[1,-2],[3,2],[-3,2]],
 [[0,0],[1,-2],[-2,0],[2,2],[-1,2],[3,0],[-3,-2]]
];
/** 1-2 pixel blobs; little linked speckle pairs are more readable than noise. */
function applyFlecktarnSpeckle(x:number,y:number,ink:number):number{
 for(const [tone,cx,cy,kind] of FLECKTARN_CLUSTERS){
  const offsets=FLECKTARN_SATELLITES[kind];
  for(let j=0;j<offsets.length;j++){
   const [dx,dy]=offsets[j];
   const px=(cx+dx+32)&31,py=(cy+dy+32)&31;
   const xx=(x-px+32)&31,yy=(y-py+32)&31;
   if((xx===0&&yy===0)||(j%4===0&&xx===1&&yy===0))ink=tone;
  }
 }
 return ink;
}
/** Digital MARPAT uses small 1-3 texel step motifs within larger authored
 * fields, similar in density to UCP but with independent woodland/desert tone
 * decisions. Coordinates wrap periodically so repeat seams remain identical.
 */
function applyMarpatFragments(x:number,y:number,ink:number,desert:boolean):number{
 const cx=Math.floor(x/2),cy=Math.floor(y/2);
 const gate=(cx*7+cy*13+Math.floor(x/8)*5+Math.floor(y/8)*3)%17;
 if(gate===1||gate===4||gate===7||gate===10||gate===14){
  const corner=((x&1)+2*(y&1)+(cx&1))%4;
  if(corner<3){
   if(desert){
    // Light sand remains the prevailing mass; dark coyote is kept rare.
    ink=ink===0?1:ink===1?0:ink===2?1:2;
   }else{
    ink=ink===0?2:ink===2?0:ink===1?0:2;
   }
  }
 }
 return ink;
}

function inPolygon(x:number,y:number,coords:readonly number[]):boolean{
 let inside=false;
 for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
  const ax=coords[i],ay=coords[i+1],bx=coords[j],by=coords[j+1];
  if(((ay>y)!==(by>y))&&(x<(bx-ax)*(y-ay)/(by-ay)+ax))inside=!inside;
 }
 return inside;
}
/** Exposes raw indices for tests and the inspection UI; the same data is
 * used for the actual garment map, rather than a separate fake preview.
 */
export function headwearCamoIndices(id:HeadwearCamoId):Uint8Array{
 const data=new Uint8Array(HEADWEAR_CAMO_SIZE**2);
 const shapes=HEADWEAR_CAMO_RECIPES[id].motifs;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const px=x+.5,py=y+.5;let ink=0;
  for(const [tone,polygon] of shapes){
   let marked=false;
   for(const dy of [-32,0,32])for(const dx of [-32,0,32]){
    if(!marked&&inPolygon(px-dx,py-dy,polygon))marked=true;
   }
   if(marked)ink=tone;
  }
  if(id==='ucp'){
   // Restrained interlocking digital bits, most 1–3 source pixels wide.
   // Deterministic periodic arithmetic (no RNG, blur or subpixel marks).
   const cellX=Math.floor(x/3),cellY=Math.floor(y/3);
   const gate=(cellX*11+cellY*7+Math.floor(x/8)*3+Math.floor(y/8)*5)%13;
   if(gate===1||gate===5||gate===9){
    const corner=((x%3)+(2*(y%3))+(cellX%2))%5;
    if(corner<3)ink=(ink+1+(cellY%2))%3;
   }
  }
  if(id==='flecktarn')ink=applyFlecktarnSpeckle(x,y,ink);
  if(id==='woodland-marpat'||id==='desert-marpat')
   ink=applyMarpatFragments(x,y,ink,id==='desert-marpat');
  data[y*32+x]=ink;
 }
 return data;
}
const pixelCache=new Map<HeadwearCamoId,Uint8Array>();
export function headwearCamoPixels(id:HeadwearCamoId):Uint8Array{
 const cached=pixelCache.get(id);if(cached)return cached;
 const recipe=HEADWEAR_CAMO_RECIPES[id],indices=headwearCamoIndices(id);
 const bytes=new Uint8Array(32*32*4);
 for(let k=0;k<1024;k++){
  const c=recipe.colors[indices[k]],o=k*4;
  bytes[o]=c[0];bytes[o+1]=c[1];bytes[o+2]=c[2];bytes[o+3]=255;
 }
 pixelCache.set(id,bytes);return bytes;
}
export function headwearCamoCoverage(id:HeadwearCamoId):number[]{
 const counts=HEADWEAR_CAMO_RECIPES[id].colors.map(()=>0);
 for(const i of headwearCamoIndices(id))counts[i]++;
 return counts.map(n=>n/1024);
}
/** Stable pixel-phase selection. No UV rescaling, mirroring or randomness at
 * pose time. All parts of a cut item share the same phase (in tile texels).
 * The M81 placement gate avoids a monolithic brown front-facing 8x10 sample.
 */
export type HeadwearCamoPlacement={offsetX:number;offsetY:number};
export const HEADWEAR_CAMO_ROLL_LIMIT=4096;
export function nextHeadwearCamoRoll(value:unknown):number{
 const current=Number.isInteger(value)&&Number(value)>=0&&Number(value)<HEADWEAR_CAMO_ROLL_LIMIT?
  Number(value):0;
 return (current+1)%HEADWEAR_CAMO_ROLL_LIMIT;
}
function camoHash(value:string):number{
 let hash=2166136261;
 for(let i=0;i<value.length;i++){
  hash=Math.imul(hash^value.charCodeAt(i),16777619);
 }
 return hash>>>0;
}
const m81BrownIndices=headwearCamoIndices('m81-woodland');
const placementCache=new Map<string,HeadwearCamoPlacement>();
export function headwearCamoFrontBrownFraction(phase:HeadwearCamoPlacement):number{
 const indices=m81BrownIndices;
 let brown=0;
 // UV1 maps the forward side onto the first eighth of the 32-pixel
 // circumference. The crown/side front shares this uninterrupted print.
 for(let y=15;y<25;y++)for(let x=0;x<8;x++){
  const xx=(x+phase.offsetX)&31,yy=(y+phase.offsetY)&31;
  if(indices[yy*32+xx]===1)brown++;
 }
 return brown/80;
}
export function headwearCamoPlacement(operatorId:string,slot:string,
 camo:HeadwearCamoId,roll=0):HeadwearCamoPlacement{
 const validRoll=Number.isInteger(roll)&&roll>=0&&roll<HEADWEAR_CAMO_ROLL_LIMIT?roll:0;
 const key=operatorId+'|'+slot+'|'+camo+'|'+validRoll;
 const cached=placementCache.get(key);if(cached)return cached;
 const hash=camoHash(key);
 const remember=(value:HeadwearCamoPlacement):HeadwearCamoPlacement=>{
  // Bound CPU memoization without destroying any GPU textures still on rigs.
  if(placementCache.size>=256)placementCache.delete(placementCache.keys().next().value!);
  placementCache.set(key,value);return value;
 };
 let best:HeadwearCamoPlacement={offsetX:hash&31,offsetY:(hash>>>8)&31};
 if(camo!=='m81-woodland')return remember(best);
 let bestScore=Infinity;
 for(let i=0;i<48;i++){
  const phase={offsetX:((hash&31)+i*11)&31,
   offsetY:(((hash>>>8)&31)+i*7+Math.floor(i/4))&31};
  const brown=headwearCamoFrontBrownFraction(phase);
  if(brown<bestScore){bestScore=brown;best=phase;}
  if(brown<=.34)return remember(phase);
 }
 return remember(best);
}

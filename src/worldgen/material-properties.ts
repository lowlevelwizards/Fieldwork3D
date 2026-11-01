/** Visual reaction rules only. Ballistic physics remain in breach-materials.ts. */
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export type WearEffect='dust'|'stain'|'scrape'|'scuff'|'oil'|'grease'|'rust'|
 'chip'|'crack'|'scratch'|'drip'|'mud'|'footprint'|'fade'|'mineral'|
 'soot'|'moss'|'abrade'|'fray'|'puddle'|'paint-peel';
export type Substrate='steel'|'wood'|'mineral'|'ceramic'|'plastic'|'textile'|'organic';
export type MaterialProperties={substrate:Substrate;coating:'paint'|'varnish'|'glaze'|'none';
 porosity:number;corrosion:number;scratch:number;moisture:number;
 dirtRetention:number;roughness:number;allowed:readonly WearEffect[]};
const shared=['dust','stain','scuff','scratch','fade'] as const;
const steel=['dust','scuff','scratch','chip','rust','drip','oil','grease','paint-peel','fade','soot'] as const;
const timber=['dust','scuff','scratch','chip','crack','stain','drip','fade','abrade'] as const;
const stone=['dust','stain','scuff','scratch','chip','crack','oil','mud','drip','mineral','moss','soot'] as const;
const textile=['dust','stain','scuff','fade','fray','mud'] as const;
const organic=['dust','mud','footprint','puddle','abrade','stain'] as const;
const kind=(surface:PixelSurface):Substrate=>{
 if(['painted-metal','industrial-steel','corrugated-metal','enamel-metal','metal','panel'].includes(surface))return 'steel';
 if(['wood','door-wood','painted-wood','furniture-wood','rough-wood'].includes(surface))return 'wood';
 if(['tile','porcelain'].includes(surface))return 'ceramic';
 if(['fabric','woven-fabric','carpet'].includes(surface))return 'textile';
 if(['grass','scruffy-grass','foliage','earth','packed-earth','gravel'].includes(surface))return 'organic';
 if(['rubber','tire-rubber','plastic','molded-plastic'].includes(surface))return 'plastic';
 return 'mineral';
};
export function materialProperties(surface:PixelSurface):MaterialProperties{
 const substrate=kind(surface);
 const coating=surface==='painted-metal'||surface==='painted-wood'||surface==='plaster'?'paint':
  surface==='furniture-wood'||surface==='door-wood'?'varnish':
  substrate==='ceramic'?'glaze':'none';
 const allowed:readonly WearEffect[]=substrate==='steel'?steel:substrate==='wood'?timber:
  substrate==='mineral'?stone:substrate==='ceramic'?['dust','scuff','stain','chip','crack','mineral']:
  substrate==='textile'?textile:substrate==='organic'?organic:shared;
 return {substrate,coating,
  porosity:substrate==='textile'?.85:substrate==='organic'?.8:substrate==='mineral'?.55:.12,
  corrosion:substrate==='steel'?1:0,
  scratch:substrate==='steel'?.75:substrate==='wood'?.65:.35,
  moisture:substrate==='wood'||substrate==='organic'?.8:substrate==='steel'?.7:.3,
  dirtRetention:substrate==='textile'?.85:substrate==='organic'?.8:.48,
  roughness:substrate==='ceramic'?.27:substrate==='textile'?.97:.82,
  allowed};
}
export function canWear(surface:PixelSurface,effect:WearEffect):boolean{
 return materialProperties(surface).allowed.includes(effect);
}
export function wearSubstrateColor(surface:PixelSurface):number{
 const p=materialProperties(surface);
 return p.substrate==='steel'?0x5b6260:p.substrate==='wood'?0xb99972:
  p.substrate==='mineral'?0xaaa69b:p.substrate==='ceramic'?0xe7e6da:
  p.substrate==='plastic'?0x8b8b80:0x756b58;
}

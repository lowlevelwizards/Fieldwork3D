/** Semantic material lookup: no collision, cover or ballistic mutations. */
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export function roomPixelSurface(archetype:string|undefined,
 purpose:string|undefined):PixelSurface{
 const p=purpose??'';
 // Smooth washable commercial finishes, rather than a tiled dungeon.
 if(archetype==='clinic')return ['bathroom','restroom'].includes(p)?'tile':'linoleum';
 if(archetype==='garage'&&['bay','workshop','maintenance','service','parking'].includes(p))
  return 'sealed-concrete';
 if(['kitchen','bathroom','restroom','pantry','laundry','exam','treatment',
 'waiting','reception','checkout','service','utility','lobby'].includes(p))return 'tile';
 if(['bay','workshop','loading','storage','equipment','maintenance','aisle',
 'parking','packing','control'].includes(p))return 'concrete';
 if(['office','cubicles','meeting','staff'].includes(p))return 'carpet';
 if(p==='hall'||p==='hallway')return archetype==='clinic'?'tile':
  archetype==='office'?'carpet':archetype==='warehouse'?'concrete':'wood';
 if(['living','bedroom','guest','dining','studio'].includes(p))return 'wood';
 return ['warehouse','garage','utility'].includes(archetype??'')?'concrete':
  ['clinic','restaurant','retail'].includes(archetype??'')?'tile':'wood';
}
export function zonePixelSurface(zone:string,condition?:string):PixelSurface{
 switch(zone){
  case 'yard':case 'garden':return ['vacant','neglected'].includes(condition??'')?'scruffy-grass':'grass';
  case 'driveway':case 'parking':return ['neglected','disturbed'].includes(condition??'')?'worn-asphalt':'asphalt';
  case 'service':return condition==='disturbed'?'packed-earth':'concrete';
  case 'patio':return 'tile';
  default:return 'grass';
 }
}
/** Component-level overrides; the body material is never assumed from shape. */
export type FixtureMaterialRole='body'|'lid'|'frame'|'hardware'|'label'|'wheel';
export const FIXTURE_MATERIAL_OVERRIDES:Readonly<Record<string,Partial<Record<FixtureMaterialRole,PixelSurface>>>>={
 dumpster:{body:'painted-metal',lid:'plastic',frame:'industrial-steel',hardware:'metal',label:'paper',wheel:'rubber'},
 'shipping-container':{body:'corrugated-metal',frame:'industrial-steel',hardware:'metal'},
 'trash-bin':{body:'plastic',lid:'plastic',frame:'metal'},
 shed:{body:'rough-wood',frame:'rough-wood'},
 'window-boards':{body:'rough-wood',hardware:'metal'},
 pallet:{body:'rough-wood',frame:'rough-wood'},
 crate:{body:'rough-wood',frame:'rough-wood'},
 'filing-cabinet':{body:'painted-metal',hardware:'metal'},
 locker:{body:'painted-metal',hardware:'metal'},
 'tool-chest':{body:'painted-metal',hardware:'metal'},
 generator:{body:'painted-metal',frame:'industrial-steel'},
 'utility-cabinet':{body:'painted-metal',frame:'industrial-steel'},
};
export function fixtureComponentSurface(fixture:string,role:FixtureMaterialRole):PixelSurface{
 const override=FIXTURE_MATERIAL_OVERRIDES[fixture]?.[role];
 if(override)return override;
 if(role==='body')return fixturePixelSurface(fixture);
 if(role==='wheel')return 'rubber';
 if(role==='label')return 'paper';
 if(role==='lid')return 'plastic';
 return 'metal';
}
export function fixturePixelSurface(fixture:string|undefined):PixelSurface{
 const id=fixture??'crate';
 if(FIXTURE_MATERIAL_OVERRIDES[id]?.body)return FIXTURE_MATERIAL_OVERRIDES[id].body;
 if(['toilet','bathtub','sink','shower'].includes(id))return 'porcelain';
 if(['printer','computer','cash-register','microwave','cooler'].includes(id))
  return 'plastic';
 if(['cabinet','wardrobe','dresser','tv-stand','desk','nightstand',
  'side-table','dining-table','coffee-table','meeting-table','bookcase',
  'picnic-table','pallet','window-boards','crate'].includes(id))return 'furniture-wood';
 if(['rug','patio-chair'].includes(id))return 'fabric';
 if(['sofa','armchair','chair','office-chair','bed','exam-bed','mattress',
 'rug'].includes(id))return 'fabric';
 if(['fridge','cooler','locker','filing-cabinet','stove','laundry-machine',
 'microwave','generator','control-panel','tool-chest','vehicle','sedan',
 'pickup','van','suv','tank','barrel','vehicle-lift','compressor',
 'shopping-cart'].includes(id))return 'metal';
 if(['tree','tree-broadleaf','tree-conifer','tree-scrub','shrub-round',
 'shrub-tall','hedge','bush','plant'].includes(id))return 'foliage';
 if(['tire-stack','tire','parking-block'].includes(id))return 'rubber';
 if(['cardboard-box','package','product-box','box'].includes(id))return 'paper';
 if(['fence','bollard','hydrant','utility-cabinet','street-lamp',
 'mailbox','trash-bin','parking-sign','bike-rack'].includes(id))
 return 'metal';
 // Unknown assets are neutral metal for visibility, never misleading lumber.
 return 'metal';
}

/** Render-side classification, never a substitute for wall physics. */
export function wallPixelSurface(archetype:string|undefined):PixelSurface{
 switch(archetype){
  case 'garage':case 'utility':return 'cinderblock';
  case 'warehouse':return 'panel';
  case 'motel':return 'siding';
  // Residential and medical *interiors* are painted, not raw masonry.
  default:return 'plaster';
 }
}

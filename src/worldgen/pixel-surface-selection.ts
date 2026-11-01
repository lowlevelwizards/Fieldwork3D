/** Semantic material lookup: no collision, cover or ballistic mutations. */
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export function roomPixelSurface(archetype:string|undefined,
 purpose:string|undefined):PixelSurface{
 const p=purpose??'';
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
export function zonePixelSurface(zone:string):PixelSurface{
 switch(zone){
  case 'yard':case 'garden':return 'earth';
  case 'driveway':case 'parking':return 'asphalt';
  case 'service':return 'concrete';
  case 'patio':return 'tile';
  default:return 'earth';
 }
}
export function fixturePixelSurface(fixture:string|undefined):PixelSurface{
 const id=fixture??'crate';
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
 'mailbox','trash-bin','parking-sign','bike-rack','window-boards'].includes(id))
 return 'metal';
 return 'wood';
}

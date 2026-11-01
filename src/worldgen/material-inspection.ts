/** The showroom reports material roles from the same registry as live fixtures. */
import type {AssetLibraryEntry} from './asset-library.ts';
import {fixturePixelSurface,FIXTURE_MATERIAL_OVERRIDES} from './pixel-surface-selection.ts';
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export function assetPrimarySurface(item:Pick<AssetLibraryEntry,'id'|'origin'>):PixelSurface{
 if(item.origin==='fixture')return fixturePixelSurface(item.id);
 if(item.origin==='dressing')return 'paper';
 if(item.id==='door'||item.id==='door:wood')return 'door-wood';
 if(item.id==='door:steel'||item.id==='door:reinforced'||item.id==='shutter')
  return 'industrial-steel';
 if(item.id==='door:exit')return 'painted-metal';
 if(item.id.startsWith('wall')||item.id==='baseboard')return 'plaster';
 if(item.id==='floor')return 'wood';
 if(item.id.startsWith('window'))return 'painted-metal';
 return 'metal';
}
export function assetMaterialDescription(item:Pick<AssetLibraryEntry,'id'|'origin'>):string{
 const base=assetPrimarySurface(item);
 const overrides=item.origin==='fixture'?FIXTURE_MATERIAL_OVERRIDES[item.id]:undefined;
 const roles=overrides?Object.entries(overrides)
  .map(([role,material])=>role+': '+material).join(' · '):'';
 return 'Primary: '+base+(roles?'\nComponents: '+roles:'');
}

/** Appearance-only sidearm preview dispatch. Live loadout/ballistics still
 * authorize Glock alone; preview IDs are never accepted as issued weapons.
 */
import * as THREE from 'three';
import {GLOCK_APPEARANCE_REFERENCES,isGlockAppearanceId,
 buildGlockAppearance,clearGlockAppearance,
 type GlockAppearanceId} from './glock-family-silhouettes.ts';
import {M9_APPEARANCE_REFERENCES,isM9AppearanceId,
 buildM9Appearance,clearM9Appearance,
 type M9AppearanceId} from './beretta-m9-silhouettes.ts';
import type {GlockCustomization} from './glock-customization.ts';
export type SidearmPreviewId=GlockAppearanceId|M9AppearanceId;
export const SIDEARM_PREVIEW_REFERENCES=[
 ...GLOCK_APPEARANCE_REFERENCES.map(r=>({...r,family:'glock' as const})),
 ...M9_APPEARANCE_REFERENCES.map(r=>({...r,family:'beretta' as const}))
] as const;
export function buildSidearmPreview(id:SidearmPreviewId,
 options:{monochrome?:boolean;customization?:GlockCustomization}={}):THREE.Group{
 return isM9AppearanceId(id)?buildM9Appearance(id,{monochrome:options.monochrome}):
  buildGlockAppearance(id,{monochrome:options.monochrome,
   customization:options.customization});
}
export function clearSidearmPreview(id:SidearmPreviewId,model:THREE.Group):void{
 if(isM9AppearanceId(id))clearM9Appearance(model);
 else clearGlockAppearance(model);
}
export {isM9AppearanceId,isGlockAppearanceId};

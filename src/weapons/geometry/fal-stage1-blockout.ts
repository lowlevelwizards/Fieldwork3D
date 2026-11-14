/** S1/S1B/S1C visual experiment now delegates to the exact production core.
 * This keeps the original comparison lab and its tests reproducible.
 */
import * as THREE from 'three';
import {FAL_ART,buildFALCoreSilhouette,type FALCoreOptions}
 from './fal-core-silhouette.ts';
export const FAL_STAGE1=FAL_ART;
export type FALStage1Options=FALCoreOptions;
export function buildFALStage1Silhouette(
 material:THREE.Material,options:FALStage1Options={}
):THREE.Group{
 return buildFALCoreSilhouette({
  stock:material,receiver:material,grip:material,magazine:material,
  handguard:material,barrel:material
 },{
  stock:'fal-stage1-stock',receiver:'fal-stage1-receiver',
  grip:'fal-stage1-grip',magazine:'fal-stage1-magazine',
  handguard:'fal-stage1-handguard',barrel:'fal-stage1-barrel'
 },options);
}

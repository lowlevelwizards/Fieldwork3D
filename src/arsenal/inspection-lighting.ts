/** Arsenal full-screen Workbench and Gallery thumbnails use the SAME
 * approved in-mission lighting direction, tint and strength as tactical
 * gameplay. Only the background differs: retain the charcoal-green studio
 * backdrop for isolated weapon readability. No second Studio lighting lab.
 *
 * These are static scene lights, created only once per viewport/thumbnail,
 * not on orbit frames. No new shader variants or shadow passes.
 */
import * as THREE from 'three';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION,studioShadowPalette}
 from '../operator-studio-lighting.ts';

export const ARSENAL_INSPECTION_BACKGROUND=0x182824;
export function addArsenalInspectionLighting(scene:THREE.Scene):void{
 scene.background=new THREE.Color(ARSENAL_INSPECTION_BACKGROUND);
 // Match TacticalScene3D graphic mode: sky/ground 1.20, warm key 2.35,
 // restrained plum-plus fill 0.60. Never use the old inspection-specific
 // 2.65/3.25/1.95 overexposure that flattened weapon materials.
 const accent=studioShadowPalette('plum-plus');
 const hemisphere=new THREE.HemisphereLight(
  STUDIO_INSPECTION_LIGHT.sky,accent.ground,1.20);
 const key=new THREE.DirectionalLight(STUDIO_INSPECTION_LIGHT.key,2.35);
 key.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(300);
 const fill=new THREE.DirectionalLight(accent.fill,.60);
 fill.position.set(-35,23,30);
 scene.add(hemisphere,key,fill);
}

/** Shared Arsenal inspection lights for actual Gallery thumbnails and the
 * full-screen Workbench. The tactical/Studio KEY direction remains the
 * reference, while a soft sky/side bounce exposes dark weapon faces seen
 * almost edge-on to that key. Background deliberately stays charcoal-green.
 *
 * Static light objects per viewport/thumbnail scene, not per render frame.
 * No new shader variants, shadows or asset/material recoloring.
 */
import * as THREE from 'three';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION}
 from '../operator-studio-lighting.ts';

export const ARSENAL_INSPECTION_BACKGROUND=0x182824;
/** A presentation-only ambient supplement, NOT another gameplay light rig.
 * A very dark plum ground and a nearly horizontal gameplay key leave the
 * near-facing flat sides of black AR/HK rifles darker than #182824. Lift
 * the sky and ground neutrally; a broad cool side fill gives every face
 * a readable value without adding another shadow or changing the palette.
 */
export const ARSENAL_SKY_FILL=Object.freeze({
 sky:0xf0f5eb,
 ground:0x7c9488,
 hemisphereIntensity:2.30,
 fill:0xd6ebe0,
 fillIntensity:1.75
});
export function addArsenalInspectionLighting(scene:THREE.Scene):void{
 scene.background=new THREE.Color(ARSENAL_INSPECTION_BACKGROUND);
 const hemisphere=new THREE.HemisphereLight(
  ARSENAL_SKY_FILL.sky,ARSENAL_SKY_FILL.ground,
  ARSENAL_SKY_FILL.hemisphereIntensity);
 const key=new THREE.DirectionalLight(STUDIO_INSPECTION_LIGHT.key,2.35);
 key.position.copy(STUDIO_KEY_DIRECTION).multiplyScalar(300);
 const fill=new THREE.DirectionalLight(
  ARSENAL_SKY_FILL.fill,ARSENAL_SKY_FILL.fillIntensity);
 fill.position.set(-42,24,64);
 scene.add(hemisphere,key,fill);
}

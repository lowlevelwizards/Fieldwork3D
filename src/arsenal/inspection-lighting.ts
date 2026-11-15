/** Shared Arsenal inspection lights for actual Gallery thumbnails and the
 * full-screen Workbench. The tactical/Studio KEY direction remains the
 * reference, while a soft sky/side bounce exposes dark weapon faces seen
 * almost edge-on to that key. A LIGHT, neutral sage-gray inspection matte
 * lets both black receivers and olive furniture read against the backdrop.
 *
 * Static light objects per viewport/thumbnail scene, not per render frame.
 * No new shader variants, shadows or asset/material recoloring.
 */
import * as THREE from 'three';
import {STUDIO_INSPECTION_LIGHT,STUDIO_KEY_DIRECTION}
 from '../operator-studio-lighting.ts';

export const ARSENAL_INSPECTION_BACKGROUND=0xa1aaa0;
/** A presentation-only ambient supplement, NOT another gameplay light rig.
 * Dark furniture was nearly invisible against the previous charcoal matte.
 * This neutral sky/side bounce remains unchanged: the matte supplies the
 * contrast, not brighter weapon materials or additional lights.
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

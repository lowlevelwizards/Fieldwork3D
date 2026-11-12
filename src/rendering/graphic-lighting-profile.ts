/** F1: shared artistic numeric contract, not a second renderer/controller.
 * The world and Studio keep their own material pipelines; this file aligns
 * light direction, graphic bands, fill restraint and color output.
 * Never persist these presentation values in missions, weapons or kits.
 */
import * as THREE from 'three';

export const GRAPHIC_LIGHT_PROFILE=Object.freeze({
 keyDirection:[.46,.88,.07] as readonly [number,number,number],
 lowCutoff:.60,
 highCutoff:.86,
 levels:Object.freeze({shadow:.43,mid:.72,light:1.14}),
 // The geometric band is dominant; indirect light must not wash out shadows.
 indirectShadow:.88,
 indirectLight:1.03,
 // Restrained plum fill maintains form contrast without a violet wash.
 plumFillBoost:1.15,
 // Only the lower portion of opaque world geometry gets the dusty rose tint.
 lowerWorldShade:.205
});

export const GRAPHIC_RENDER_OUTPUT=Object.freeze({
 exposure:1.05,
 toneMapping:THREE.ACESFilmicToneMapping,
 colorSpace:THREE.SRGBColorSpace
});

/** No extra pass or GPU resources. Equal display treatment in gameplay,
 * Arsenal and Studio; actual source materials retain their authored colors.
 */
export function configureGraphicRendererOutput(renderer:THREE.WebGLRenderer):void{
 renderer.outputColorSpace=GRAPHIC_RENDER_OUTPUT.colorSpace;
 renderer.toneMapping=GRAPHIC_RENDER_OUTPUT.toneMapping;
 renderer.toneMappingExposure=GRAPHIC_RENDER_OUTPUT.exposure;
}

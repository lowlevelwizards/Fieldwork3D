/**
 * Render-only water tint/opacity, derived from the actual depth below
 * the pond's horizontal surface. No ripples, crosshatched textures,
 * screen-space patterns, or independently animated visual clocks.
 * Colors are SRGB hex values interpreted by THREE.Color.
 */
export const WATER_SHORE_COLOR = 0x6b8178;
export const WATER_DEEP_COLOR = 0x416c79;

export type WaterAppearance = { depthMix:number; opacity:number };

export function waterAppearanceAtDepth(depthMeters:number):WaterAppearance {
  const depth=Math.max(0,depthMeters);
  const smooth=(edge0:number,edge1:number,value:number):number=>{
    const t=Math.max(0,Math.min(1,(value-edge0)/(edge1-edge0)));
    return t*t*(3-2*t);
  };
  // Color deepens slowly; shoreline alpha fades entirely at the exact edge,
  // revealing the underlying ground that produced the physical catchment.
  const depthMix=smooth(.004,.09,depth);
  const opacity=.05+.76*smooth(0,.028,depth);
  return { depthMix, opacity };
}

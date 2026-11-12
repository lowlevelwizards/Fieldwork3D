/** F2: material *presentation* roles. Authored colors, camo UVs, ballistic
 * substrates and wear permissions remain owned by their existing systems.
 * Roles are deliberately few, deterministic and shader-cache friendly.
 */
import type * as THREE from 'three';
import type {PixelSurface} from './pixel-recipes.ts';

export type VisualMaterialRole=
 'steel'|'polymer'|'wood'|'fabric'|'armor'|'paint'|'mineral'|
 'ceramic'|'organic'|'neutral';
export type MaterialResponse=Readonly<{
 shadow:number;highlight:number;minRoughness:number;maxRoughness:number;
 metalness:number;
}>;
/** Relative diffuse separation is deliberately restrained: no outlines or
 * material-dependent emissive light, especially in dark gameplay conditions.
 */
export const MATERIAL_RESPONSES:Readonly<Record<VisualMaterialRole,MaterialResponse>>={
 steel:{shadow:.94,highlight:1.065,minRoughness:.72,maxRoughness:.86,metalness:.12},
 polymer:{shadow:.98,highlight:1.00,minRoughness:.89,maxRoughness:1,metalness:.015},
 wood:{shadow:.97,highlight:1.035,minRoughness:.82,maxRoughness:.95,metalness:0},
 fabric:{shadow:.98,highlight:1.00,minRoughness:.94,maxRoughness:1,metalness:0},
 armor:{shadow:.955,highlight:1.035,minRoughness:.86,maxRoughness:.97,metalness:.025},
 paint:{shadow:.985,highlight:1.015,minRoughness:.87,maxRoughness:.98,metalness:.015},
 mineral:{shadow:.985,highlight:1.005,minRoughness:.91,maxRoughness:1,metalness:0},
 ceramic:{shadow:.99,highlight:1.015,minRoughness:.77,maxRoughness:.92,metalness:0},
 organic:{shadow:.99,highlight:1.00,minRoughness:.95,maxRoughness:1,metalness:0},
 neutral:{shadow:1,highlight:1,minRoughness:0,maxRoughness:1,metalness:0}
} as const;

export function surfaceVisualRole(surface:PixelSurface):VisualMaterialRole{
 switch(surface){
  case 'metal':case 'industrial-steel':case 'corrugated-metal':return 'steel';
  case 'painted-metal':case 'enamel-metal':case 'panel':case 'siding':
  case 'painted-wood':case 'plaster':return 'paint';
  case 'plastic':case 'molded-plastic':case 'rubber':case 'tire-rubber':return 'polymer';
  case 'wood':case 'door-wood':case 'furniture-wood':case 'rough-wood':return 'wood';
  case 'fabric':case 'woven-fabric':case 'carpet':return 'fabric';
  case 'tile':case 'porcelain':case 'linoleum':return 'ceramic';
  case 'concrete':case 'sealed-concrete':case 'brick':case 'cinderblock':
  case 'asphalt':case 'worn-asphalt':case 'gravel':return 'mineral';
  case 'grass':case 'scruffy-grass':case 'foliage':case 'earth':
  case 'packed-earth':return 'organic';
  case 'paper':return 'neutral';
 }
}
export function tagVisualMaterial<T extends THREE.MeshStandardMaterial>(
 material:T,role:VisualMaterialRole):T{
 material.userData.fieldworkVisualMaterialRole=role;
 return material;
}
export function visualMaterialRole(material:THREE.Material):VisualMaterialRole{
 const role=material.userData.fieldworkVisualMaterialRole;
 return role&&Object.prototype.hasOwnProperty.call(MATERIAL_RESPONSES,role)?
  role as VisualMaterialRole:'neutral';
}
/** One-time setup for existing opaque, cached world Standard materials.
 * Do not re-tune from a previous modifier; inputs must be authored sources.
 */
export function applyWorldSurfaceResponse(
 material:THREE.MeshStandardMaterial,surface:PixelSurface):void{
 const role=surfaceVisualRole(surface),p=MATERIAL_RESPONSES[role];
 tagVisualMaterial(material,role);
 material.roughness=Math.max(p.minRoughness,Math.min(p.maxRoughness,material.roughness));
 material.metalness=p.metalness;
}

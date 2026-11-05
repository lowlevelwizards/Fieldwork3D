/**
 * Canonical *solid* operator color families.
 *
 * Shared RGB identities are not shared texture/roughness/lighting decisions:
 * nylon, ripstop, cloth covers, painted shells and rubber retain independent
 * physical construction. Camouflage RGB/indexed masters are never routed here.
 *
 * Stable wardrobe IDs are mapped by the existing headwear/garment catalogs.
 * They must never be rewritten in serialized saved appearance data.
 */
export const OPERATOR_SOLID_FAMILIES={
  black:0x292f2d,
  charcoal:0x535958,
  slate:0x727b7a,
  navy:0x354355,
  'urban-gray':0x7c8787,
  'olive-drab':0x646c49,
  'ranger-green':0x566a57,
  'forest-green':0x43563e,
  'field-green':0x737b59,
  sage:0x87907d,
  foliage:0x8a9388,
  'soviet-4bo':0x555e3e,
  'postwar-green':0x80864f,
  khaki:0xaa9978,
  sand:0xc5b38d,
  tan:0xb59d77,
  coyote:0x927557,
  brown:0x66513d,
  'nutria-brown':0x937b58,
  'off-white':0xd6d3bc,
  'winter-white':0xd9d8c9
} as const;

export type OperatorSolidFamilyId=keyof typeof OPERATOR_SOLID_FAMILIES;
export const OPERATOR_SOLID_FAMILY_IDS=
  Object.keys(OPERATOR_SOLID_FAMILIES) as OperatorSolidFamilyId[];

export function operatorSolidHex(id:OperatorSolidFamilyId):number{
  return OPERATOR_SOLID_FAMILIES[id];
}

/** A *material treatment*, not an extra independent color identity.
 * Multipliers may be used for small, unlit cloth trim or face fabric.
 * Do not apply them over indexed camouflage textures or painted color maps.
 */
export function tonedOperatorSolid(id:OperatorSolidFamilyId,lum=1):number{
  const color=operatorSolidHex(id);
  const channel=(shift:number)=>Math.min(255,Math.max(0,
    Math.round(((color>>shift)&255)*lum)));
  return channel(16)<<16|channel(8)<<8|channel(0);
}

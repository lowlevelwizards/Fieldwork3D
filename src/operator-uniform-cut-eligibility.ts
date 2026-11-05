/** Fieldwork silhouette-family camouflage audit — Stage 3C.
 *
 * BDU and ACU are INTERNAL construction identifiers, not assertions that
 * every print was ever issued by the United States. These two shape families
 * are visual abstractions for comparable field blouse/trouser configurations.
 * The actual per-country sewing details remain a subject for future models.
 *
 * A print's presence on fabric does NOT authorize matching nylon webbing,
 * plate carriers or helmets (separate frozen policies own those channels).
 */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
export const UNIFORM_COMPARE_CUTS=['bdu-shirt','acu-shirt'] as const;
export type UniformCompareCut=typeof UNIFORM_COMPARE_CUTS[number];
export const UNIFORM_GARMENT_CUTS=[
 'bdu-shirt','acu-shirt','bdu-trousers','acu-trousers'
] as const;
export type UniformGarmentCut=typeof UNIFORM_GARMENT_CUTS[number];
export type FieldUniformFamily='classic'|'modern';
export const UNIFORM_CUT_FAMILY:Readonly<Record<UniformGarmentCut,
 FieldUniformFamily>>={
 'bdu-shirt':'classic','bdu-trousers':'classic',
 'acu-shirt':'modern','acu-trousers':'modern'
};
/** Evidence-weighted analogy based on field garment construction, rather than
 * one-to-one national issue. Exact pockets/collar can differ considerably. */
export const FIELD_UNIFORM_FAMILY_CAMO:Readonly<Record<FieldUniformFamily,
 readonly HeadwearCamoId[]>>={
 classic:[
  'm81-woodland','three-color-desert','tiger-stripe','flecktarn',
  'woodland-dpm','swedish-m90','six-color-desert','erdl-lowland',
  'polish-pantera','russian-flora','rhodesian-brushstroke',
  'desert-tropentarn','belgian-jigsaw','east-german-strichtarn',
  'australian-dpcu','ss-leto','atacs-fg','atacs-au',
  'desert-night','berezka','spectre-skwo','pencott-greenzone',
  'pencott-badlands','kryptek-highlander'
 ],
 modern:[
  'ucp','multicam','woodland-marpat','desert-marpat',
  'finnish-m05','polish-pantera','italian-vegetato',
  'scorpion-w2','russian-emr','pla-xingkong','cadpat-tw',
  'british-mtp','indian-digital-2022',
  'atacs-fg','ukrainian-mm14','aor2','multicam-tropic','atacs-au','aor1','multicam-arid',
  'multicam-black','multicam-alpine','pencott-greenzone','pencott-badlands',
  'kryptek-highlander','spectre-skwo'
 ]
};
export const UNIFORM_CUT_CAMO:Readonly<Record<UniformGarmentCut,
 readonly HeadwearCamoId[]>>={
 'bdu-shirt':FIELD_UNIFORM_FAMILY_CAMO.classic,
 'bdu-trousers':FIELD_UNIFORM_FAMILY_CAMO.classic,
 'acu-shirt':FIELD_UNIFORM_FAMILY_CAMO.modern,
 'acu-trousers':FIELD_UNIFORM_FAMILY_CAMO.modern
};
export const UNIFORM_CUT_NOTES:Readonly<Record<UniformGarmentCut,string>>={
 'bdu-shirt':'Classic field blouse silhouette, covering analogous looser, conventionally pocketed international field uniforms; not literal U.S. BDU issue in every pattern.',
 'bdu-trousers':'Classic field trousers silhouette, wider straight legs and full thigh bellows; many analogous national field-pant cuts, not exact historical reproductions.',
 'acu-shirt':'Modern utility blouse silhouette, articulated utility pockets and practical layering; includes modern analogous foreign cuts, not just U.S. ACU issue.',
 'acu-trousers':'Modern utility trousers silhouette, stronger shaped leg and calf details; individual nations and years may omit specific calf pockets.'
};
export function uniformCutCamoChoices(cut:UniformGarmentCut):
 readonly HeadwearCamoId[]{
 return UNIFORM_CUT_CAMO[cut];
}
export function uniformCutCamoCompatible(cut:UniformGarmentCut,
 id:HeadwearCamoId):boolean{
 return UNIFORM_CUT_CAMO[cut].includes(id);
}

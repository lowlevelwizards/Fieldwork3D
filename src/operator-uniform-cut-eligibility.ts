/** Historically evidenced camouflage for the two Stage 3B comparison cuts.
 * This is narrower than the generic Stage 2 top textile policy. A print
 * existing somewhere on field clothing does not make a U.S. BDU or ACU cut
 * appropriate. Never fabricate a pattern or change approved artwork.
 */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
export const UNIFORM_COMPARE_CUTS=['bdu-shirt','acu-shirt'] as const;
export type UniformCompareCut=typeof UNIFORM_COMPARE_CUTS[number];
export const UNIFORM_CUT_CAMO:Readonly<Record<UniformCompareCut,
 readonly HeadwearCamoId[]>>={
 // Military-issue U.S. BDU, DCU, and earlier four-pocket jungle/field cut
 // families. Tiger stripe and Rhodesian brushstroke use historical specialty
 // fatigues of similar envelope rather than claiming they were U.S. BDU issue.
 'bdu-shirt':[
  'm81-woodland','three-color-desert','six-color-desert',
  'erdl-lowland','tiger-stripe','rhodesian-brushstroke'
 ],
 // U.S. Army Combat Uniform blouse: early UCP, Afghanistan OEF-CP MultiCam
 // and later OCP (Scorpion W2). Cut and camouflage are distinct dimensions.
 'acu-shirt':['ucp','multicam','scorpion-w2']
};
export const UNIFORM_CUT_NOTES:Readonly<Record<UniformCompareCut,string>>={
 'bdu-shirt':'Historical four-pocket BDU/jungle-inspired cut. Pattern availability reflects documented period uniforms; specialty fatigues are cut approximations, not mislabeled U.S. issue.',
 'acu-shirt':'Army Combat Uniform field blouse. UCP, MultiCam/OEF-CP and Scorpion W2/OCP are documented ACU-family prints; other nations need separately modeled uniforms.'
};
export function uniformCutCamoChoices(cut:UniformCompareCut):readonly HeadwearCamoId[]{
 return UNIFORM_CUT_CAMO[cut];
}
export function uniformCutCamoCompatible(cut:UniformCompareCut,
 id:HeadwearCamoId):boolean{
 return UNIFORM_CUT_CAMO[cut].includes(id);
}

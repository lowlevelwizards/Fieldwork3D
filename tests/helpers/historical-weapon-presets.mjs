/** Explicit historical weapon cohorts.
 * Legacy R2/R3/R4 tests assert their original models still work, instead of
 * failing whenever new weapons join the active Arsenal. Newly added families
 * are exercised by their own family-specific and global tests.
 */
import assert from 'node:assert/strict';

export const ORIGINAL_AR8=Object.freeze([
 'ar-m16a1','ar-m16a2','ar-m16a4','ar-mk12mod0',
 'ar-car15','ar-colt733','ar-m4a1','ar-mk18'
]);
export const ORIGINAL_AK9=Object.freeze([
 'ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'
]);
export const ORIGINAL_HK12=Object.freeze([
 'hk-g3','hk-g3a3','hk-g3a4','hk-hk33a2','hk-hk33a3',
 'hk-hk53a3','hk-mp5a3','hk-mp5sd3','hk-mp5k',
 'hk-mp5k-pdw','hk-mp5a2','hk-mp5sd2'
]);
export const ORIGINAL_R2_17=Object.freeze([...ORIGINAL_AR8,...ORIGINAL_AK9]);
export const ORIGINAL_R4_29=Object.freeze([...ORIGINAL_R2_17,...ORIGINAL_HK12]);

export function historicalPresetCohort(presets,ids){
 assert.equal(new Set(ids).size,ids.length,'historical test fixture has unique IDs');
 const byId=new Map(presets.map(p=>[p.id,p]));
 assert.equal(byId.size,presets.length,'all current factory IDs remain unique');
 return ids.map(id=>{
  const preset=byId.get(id);
  assert.ok(preset,'Historical factory model missing: '+id);
  return preset;
 });
}

/** R5.3-B: only physically meaningful cross-assembly shadows.
 * Every rule is a deliberate caster -> receiver relationship, calibrated
 * in operator-local world units. Missing pairs cast NOTHING.
 * No equipment inventories/IK/physics are affected.
 */
export type ShadowAssemblyRole=
 'generic'|'uniform'|'shirt'|'armor'|'rig'|'pack';
export type ShadowContactRule={
 contactRadius:number;contactStrength:number;
 castReach:number;castStrength:number
};
const generic:Readonly<ShadowContactRule>=Object.freeze({
 contactRadius:1.15,contactStrength:.42,
 castReach:3.25,castStrength:.51
});
const rule=(contactRadius:number,contactStrength:number,
 castReach:number,castStrength:number):Readonly<ShadowContactRule>=>
 Object.freeze({contactRadius,contactStrength,castReach,castStrength});
const rules:Readonly<Partial<Record<
 ShadowAssemblyRole,Partial<Record<ShadowAssemblyRole,
 Readonly<ShadowContactRule>>>>>>={
 uniform:{
  armor:rule(1.15,.48,3.20,.54),
  rig:rule(.95,.36,2.60,.42),
  pack:rule(1.45,.52,3.20,.50)
 },
 shirt:{
  armor:rule(1.15,.46,3.20,.52),
  rig:rule(.95,.34,2.60,.40),
  pack:rule(1.45,.50,3.20,.49)
 },
 armor:{
  rig:rule(.95,.46,2.85,.49),
  pack:rule(1.25,.39,2.80,.42)
 },
 rig:{
  armor:rule(.75,.25,2.0,.25)
 },
 pack:{
  armor:rule(1.20,.36,2.60,.40)
 }
};
export function shadowContactRule(
 receiver:ShadowAssemblyRole,caster:ShadowAssemblyRole
):Readonly<ShadowContactRule>|null{
 // Unannotated public callers retain the R4/R5-A geometry-only contract.
 if(receiver==='generic'||caster==='generic')return generic;
 return rules[receiver]?.[caster]??null;
}

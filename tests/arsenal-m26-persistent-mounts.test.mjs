import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment,
 readWeaponConfiguration,sameWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions} from '../src/weapons/geometry/weapon-physical-mount-fit.ts';
import {mountedAccessorySeat,resolveMountedAccessoryLayout}
 from '../src/weapons/geometry/mounted-accessory-layout.ts';
import {chooseWeaponMountPosition}
 from '../src/weapons/geometry/weapon-mount-position-edits.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy,readArsenalRecipe,
 sameArsenalRecipe,copyArsenalRecipe} from '../src/arsenal/recipes.ts';
import {createSavedArsenalBuild,readArsenalBuildLibrary,
 emptyArsenalBuildLibrary} from '../src/arsenal/saved-builds.ts';
import {weaponLightEmitter} from '../src/equipment-weapon-light-beam.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
const ar=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
const light=()=>setWeaponAttachment(ar(),'light','light-compact');
const options=(c,id)=>physicalAttachmentFitOptions(c,id).options;
const pick=(c,id,face)=>options(c,id).find(p=>p.face===face);
test('M2.6A old V1 and V2 configurations need no new fields',()=>{
 const old=ar(),next=readWeaponConfiguration(JSON.parse(JSON.stringify(old)),old.weapon);
 assert.ok(sameWeaponConfiguration(old,next));
 assert.equal(next.mountSelections,undefined);
 const recipe=arsenalRecipeFromLegacy(old);
 assert.ok(recipe&&arsenalRecipeToLegacy(recipe));
 assert.equal(readArsenalRecipe(JSON.parse(JSON.stringify(recipe))).mountSelections,undefined);
});
test('M2.6A malformed/stale mounting metadata cannot discard a weapon or recipe',()=>{
 let c=light();
 const bad={...c,mountSelections:{light:{
  attachmentId:'light-compact',ownerPartId:'ar-quad',
  surfaceId:'ar-quad:light:side',face:'right',
  standard:'picatinny',position:Infinity}}};
 assert.equal(readWeaponConfiguration(bad,c.weapon).slots.light,'light-compact');
 assert.equal(readWeaponConfiguration(bad,c.weapon).mountSelections,undefined);
 const stale={...bad,mountSelections:{light:{...bad.mountSelections.light,
  position:.5,attachmentId:'foregrip-vertical'}}};
 assert.equal(readWeaponConfiguration(stale,c.weapon).mountSelections,undefined);
 const recipe=arsenalRecipeFromLegacy(c);assert.ok(recipe);
 const parsed=readArsenalRecipe({...recipe,mountSelections:bad.mountSelections});
 assert.ok(parsed);assert.equal(parsed.mountSelections,undefined);
});
test('M2.6B explicitly mounted right/left lights survive config + recipe + library',()=>{
 let c=light();
 const right=pick(c,'light-compact','right'),left=pick(c,'light-compact','left');
 assert.ok(right&&left);
 c=chooseWeaponMountPosition(c,'light',left);
 assert.equal(c.mountSelections?.light?.face,'left');
 assert.equal(mountedAccessorySeat(c,'light')?.placement.face,'left');
 const saved=readWeaponConfiguration(JSON.parse(JSON.stringify(c)),c.weapon);
 assert.ok(sameWeaponConfiguration(c,saved));
 assert.equal(mountedAccessorySeat(saved,'light')?.placement.face,'left');
 const recipe=arsenalRecipeFromLegacy(saved);assert.ok(recipe);
 const loaded=readArsenalRecipe(JSON.parse(JSON.stringify(recipe)));assert.ok(loaded);
 assert.ok(sameArsenalRecipe(recipe,loaded));
 assert.equal(arsenalRecipeToLegacy(loaded)?.mountSelections?.light?.face,'left');
 const out=createSavedArsenalBuild(emptyArsenalBuildLibrary(),recipe,'Left light');
 assert.ok(out);
 const library=readArsenalBuildLibrary(JSON.stringify(out.library));
 assert.equal(library.builds[0].recipe.mountSelections?.light?.face,'left');
 const other=chooseWeaponMountPosition(saved,'light',right);
 assert.equal(other.mountSelections?.light?.face,'right');
 assert.ok(!sameWeaponConfiguration(other,saved));
 assert.ok(!sameArsenalRecipe(copyArsenalRecipe(recipe),
  {...recipe,mountSelections:other.mountSelections}));
 const reset=chooseWeaponMountPosition(saved,'light',null);
 assert.equal(reset.mountSelections,undefined);
 assert.equal(mountedAccessorySeat(reset,'light')?.placement.face,'right');
});
test('M2.6C mounted lens and grip follow saved position, without adding costs',()=>{
 let c=light();
 const left=pick(c,'light-compact','left');assert.ok(left);
 c=chooseWeaponMountPosition(c,'light',left);
 const lens=mountedAccessorySeat(c,'light')?.lens;
 assert.ok(lens);
 const p=weaponLightEmitter({x:0,z:0,yaw:0},c);
 const right=chooseWeaponMountPosition(c,'light',pick(c,'light-compact','right'));
 assert.ok(right!==c);
 assert.ok(weaponLightEmitter({x:0,z:0,yaw:0},right).y>p.y);
 let grip=setWeaponAttachment(ar(),'foregrip','foregrip-vertical');
 const available=options(grip,'foregrip-vertical');
 assert.ok(available.length>=2);
 const chosen=chooseWeaponMountPosition(grip,'foregrip',available[available.length-1]);
 assert.ok(chosen!==grip);
 assert.ok(resolveMountedAccessoryLayout(chosen).unresolved.length===0);
 const palm=riflePoseContacts(chosen.weapon,chosen)?.support.near;
 assert.ok(palm);
 assert.equal(palm.y,mountedAccessorySeat(chosen,'foregrip')?.hand?.y);
});
test('M2.6B rejects phantom or unrelated mount without changing ownership',()=>{
 const c=light(),left=pick(c,'light-compact','left');
 assert.ok(left);
 const wrong={...left,attachmentId:'foregrip-vertical'};
 assert.strictEqual(chooseWeaponMountPosition(c,'light',wrong),c);
 const unmounted=ar();
 assert.strictEqual(chooseWeaponMountPosition(unmounted,'light',left),unmounted);
});

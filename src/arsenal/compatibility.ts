/** Arsenal V2: atomic, side-effect-free proposed part changes.
 * Keep authored V1 family/attachment validators authoritative until art migration.
 */
import {FAMILY_PART_SLOTS,FAMILY_PARTS,proposeFamilyPartChange,
 type FamilyPartSlot,type WeaponFamilyBuild} from '../equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS,initialWeaponConfiguration,readWeaponConfiguration,
 compatibleWeaponAttachment,weaponAttachmentAllowed,
 type WeaponConfiguration} from '../equipment-weapon-assemblies.ts';
import {ARSENAL_REFERENCES,arsenalPlatformForReceiver,type ArsenalSlot}
 from './catalog.ts';
import {arsenalPhysicalPartId} from './finishes.ts';
import {ARSENAL_ACCESSORY_SLOTS,arsenalRecipeIssues,arsenalRecipeToLegacy,
 copyArsenalRecipe,type ArsenalAccessorySlot,type ArsenalRecipeV2}
 from './recipes.ts';

export interface ArsenalPartChange{
 slot:ArsenalSlot;from:string;to:string;
}
export interface ArsenalEditProposal{
 valid:boolean;
 requestedSlot:ArsenalSlot;requestedPartId:string;
 changes:readonly ArsenalPartChange[];
 requiresConfirmation:boolean;reasons:readonly string[];
 nextRecipe?:ArsenalRecipeV2;
}
/** Matching the signature preserves e.g. MP5A3 identity when an optic is added. */
export function arsenalReferenceIdentity(recipe:ArsenalRecipeV2):{
 name:string;referenceId?:string;modified:boolean;ambiguous:boolean;
}{
 const matches=ARSENAL_REFERENCES.filter(ref=>
  ref.platformId===recipe.platformId&&ref.legacy.weapon===recipe.weapon&&
  ref.identitySlots.every(slot=>
   arsenalPhysicalPartId(ref.legacy.parts[slot])===
   arsenalPhysicalPartId(recipe.parts[slot])));
 const exact=matches.filter(ref=>ref.identitySlots.every(slot=>
  ref.legacy.parts[slot]===recipe.parts[slot]));
 const recognized=exact.length===1?exact:matches;
 const fallback=recipe.platformId==='ar15'?'AR-15':
  recipe.platformId==='ak'?'AK':recipe.platformId==='g3'?'G3':
  recipe.platformId==='hk33'?'HK33 / HK53':'MP5';
 if(recognized.length!==1)
  return {name:fallback+' · Custom',modified:true,ambiguous:recognized.length>1};
 const ref=recognized[0];
 const bodyChanged=FAMILY_PART_SLOTS.some(slot=>
  recipe.parts[slot]!==ref.legacy.parts[slot]);
 const defaults=initialWeaponConfiguration(recipe.weapon).slots;
 const accessoriesChanged=ARSENAL_ACCESSORY_SLOTS.some(slot=>
  recipe.accessories[slot]!==defaults[slot]);
 const modified=bodyChanged||accessoriesChanged;
 return {name:ref.name+(modified?' · Modified':''),referenceId:ref.id,
  modified,ambiguous:false};
}
const rejected=(slot:ArsenalSlot,id:string,reason:string):ArsenalEditProposal=>({
 valid:false,requestedSlot:slot,requestedPartId:id,changes:[],
 requiresConfirmation:false,reasons:[reason]
});
/** Only choose an implicit mount where there is precisely one authored valid option.
 * No auto-conversion of receivers, feed type, or handguards.
 */
function opticMountRequirement(config:WeaponConfiguration,opticId:string):
 string|undefined{
 if(weaponAttachmentAllowed(config,'optic',opticId))return undefined;
 const candidates=Object.values(WEAPON_ATTACHMENTS).filter(part=>
  part.slot==='opticMount'&&part.id!=='optic-mount-none'&&
  weaponAttachmentAllowed(config,'opticMount',part.id)&&
  weaponAttachmentAllowed({...config,slots:{...config.slots,opticMount:part.id}},
   'optic',opticId));
 return candidates.length===1?candidates[0].id:undefined;
}
export function proposeArsenalPartChange(recipe:ArsenalRecipeV2,
 slot:ArsenalSlot,id:string):ArsenalEditProposal{
 if(arsenalRecipeIssues(recipe).length)
  return rejected(slot,id,'The working build needs repair before editing');
 const prior=arsenalRecipeToLegacy(recipe);
 if(!prior)return rejected(slot,id,'Unable to resolve the current weapon');
 const next=copyArsenalRecipe(recipe);
 if(FAMILY_PART_SLOTS.includes(slot as FamilyPartSlot)){
  const bodySlot=slot as FamilyPartSlot;
  if(!FAMILY_PARTS[id]||FAMILY_PARTS[id].slot!==bodySlot)
   return rejected(slot,id,'Unknown component');
  if(next.parts[bodySlot]===id)
   return {valid:true,requestedSlot:slot,requestedPartId:id,changes:[],
    requiresConfirmation:false,reasons:[],nextRecipe:next};
  const proposal=proposeFamilyPartChange(prior.build as WeaponFamilyBuild,
   recipe.weapon,bodySlot,id);
  if(!proposal.valid)
   return rejected(slot,id,proposal.reason??'This part does not fit');
  const platformId=arsenalPlatformForReceiver(proposal.build.parts.receiver);
  if(platformId!==recipe.platformId)
   return rejected(slot,id,'Receiver belongs to another platform');
  next.parts={...proposal.build.parts};
 }else{
  const attachmentSlot=slot as ArsenalAccessorySlot;
  if(!ARSENAL_ACCESSORY_SLOTS.includes(attachmentSlot)||
   WEAPON_ATTACHMENTS[id]?.slot!==attachmentSlot||
   !compatibleWeaponAttachment(recipe.weapon,attachmentSlot,id))
   return rejected(slot,id,'Unknown or incompatible accessory');
  if(next.accessories[attachmentSlot]===id)
   return {valid:true,requestedSlot:slot,requestedPartId:id,changes:[],
    requiresConfirmation:false,reasons:[],nextRecipe:next};
  if(!weaponAttachmentAllowed(prior,attachmentSlot,id)){
   if(attachmentSlot==='optic'){
    const required=opticMountRequirement(prior,id);
    if(!required)
     return rejected(slot,id,'This sight needs a compatible mount or rail');
    next.accessories.opticMount=required;
   }else
    return rejected(slot,id,'This accessory does not fit the current assembly');
  }
  next.accessories[attachmentSlot]=id;
 }
 const candidate:WeaponConfiguration={version:1,weapon:recipe.weapon,
  build:{family:(prior.build as WeaponFamilyBuild).family,parts:{...next.parts}},
  slots:{...prior.slots,...next.accessories,stock:'stock-standard'}};
 const normalized=readWeaponConfiguration(candidate,recipe.weapon);
 if(!normalized.build)return rejected(slot,id,'Unable to resolve the new assembly');
 next.parts={...normalized.build.parts};
 for(const key of ARSENAL_ACCESSORY_SLOTS)next.accessories[key]=normalized.slots[key];
 if((FAMILY_PART_SLOTS.includes(slot as FamilyPartSlot)?
  next.parts[slot as FamilyPartSlot]:next.accessories[slot as ArsenalAccessorySlot])!==id)
  return rejected(slot,id,'This part requires a different core or mount');
 if(arsenalRecipeIssues(next).length)
  return rejected(slot,id,'The proposed assembly did not validate');
 const changes:ArsenalPartChange[]=[];
 for(const key of FAMILY_PART_SLOTS)if(recipe.parts[key]!==next.parts[key])
  changes.push({slot:key,from:recipe.parts[key],to:next.parts[key]});
 for(const key of ARSENAL_ACCESSORY_SLOTS)
  if(recipe.accessories[key]!==next.accessories[key])
   changes.push({slot:key,from:recipe.accessories[key],to:next.accessories[key]});
 const extra=changes.filter(c=>c.slot!==slot);
 const reasons=extra.length?['Also changes '+extra.map(x=>x.slot).join(', ')]:[];
 return {valid:true,requestedSlot:slot,requestedPartId:id,changes,
  requiresConfirmation:extra.length>0,reasons,nextRecipe:next};
}

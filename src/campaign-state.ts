/** Campaign domain. Nothing here advances in the render/simulation loop. */
import type {OperationKind} from './breach-operations.ts';
import type {ObjectiveIntelLevel} from './breach-objective-intel.ts';
import {currentDispatchReference,effectiveDispatchSetup,validDispatchSetup,type DispatchCampaignSetupV1} from './dispatch-campaign-setup.ts';
import {validDispatchCase,type DispatchCaseV1} from './dispatch-case-contract.ts';
import {assignDispatchCase} from './dispatch-case-selection.ts';
import {advanceDispatchDepartment,initialDispatchDepartment,
 validDispatchDepartment,validDispatchCareerReceipt,
 type DispatchDepartmentV1,type DispatchCareerReceiptV1}
 from './dispatch-department.ts';
import {validDispatchForceHistory,type DispatchForceHistoryV1}
 from './dispatch-force-review.ts';
import {readCampaignRules,type CampaignRules} from './campaign-rules.ts';
import {mayChooseCampaignContent,dispatchPilotUnclassifiedEditingEnabled}
 from './dispatch-campaign-eligibility.ts';
import {issueDispatchPilotOperator} from './dispatch-pilot-operator.ts';
import {dispatchPilotAppearanceAllowed} from './dispatch-pilot-appearance.ts';
import {isDispatchPilot as isDispatchPilotCampaign} from './dispatch-campaign-eligibility.ts';
import type {ShootingSkills} from './breach-skills.ts';
import {SKILL_NAMES,type SkillName} from './campaign-skill-schema.ts';
export {SKILL_NAMES};
export type {SkillName};
import type {RosterState} from './breach-roster.ts';
import {initialWardrobe,readWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {liveMagazineCapacity,standardReserveRounds,freshMagazineIssue,
 fitMagazineInventory} from './arsenal/live-magazine-capacity.ts';
import {readPersistentMagazines,readLoadedMagazineId,addReserveRounds}
 from './equipment-magazine-persistence.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {initialEquipmentLoadout,readEquipmentLoadout,setEquipmentChoice,syncPrimaryWeapon,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
import {progressOperator,type OperatorPerformance,type SkillGains} from './campaign-progression.ts';
import {readKitPresets,nextPresetId,MAX_KIT_PRESETS,type EquipmentPreset} from './equipment-presets.ts';
import {initialArmorIntegrity,type ArmorIntegrity} from './equipment-armor.ts';
import {clampFlashUse} from './equipment-supply.ts';
import {fieldQuantity,initialFieldInventory,readFieldInventory,fieldCarryReport,
 type FieldInventory} from './equipment-field-inventory.ts';
import {readWeaponConfiguration,changeWeaponPlatform,
 setWeaponAttachment,
 selectWeaponFamilyPreset,setConfiguredFamilyPart,sameWeaponConfiguration,
 type WeaponConfiguration,type WeaponAttachmentSlot}
 from './equipment-weapon-assemblies.ts';
import type {FamilyPartSlot} from './equipment-weapon-families.ts';
import {issueWeaponPreset,starterWeaponPreset,resolveIssuedOrLegacy} from './breach-weapon-issue.ts';
import {attachmentPrice,readAttachmentStock,returnAttachments}
 from './equipment-weapon-inventory.ts';
import {resolveMountedAccessoryLayout}
 from './weapons/geometry/mounted-accessory-layout.ts';
import {quoteAttachmentTransfer}
 from './equipment-weapon-transactions.ts';
import {MAX_OWNED_WEAPONS,recordWeaponRounds,serviceSerializedWeapon,type SerializedWeapon} from './equipment-weapon-identity.ts';
import {reconcileCampaignWeaponOwnership} from './equipment-weapon-ownership.ts';
import {kitMedicalSupplies,normalizedMedicalSupplies,medicalSupplyCount,
 type FieldMedicalSupplies} from './equipment-medical-supplies.ts';

export type CareerEvent={id:string;day:number;operatorId:string;operationId?:string;kind:string;detail:string;otherOperatorId?:string};
export type CampaignOperator={
 id:string;callsign:string;background:string;appearanceSeed:number;
 wardrobe?:WardrobeOptions;
 skills:ShootingSkills;experience:ShootingSkills;aptitudes:ShootingSkills;
 trait:string;distinctions:string[];
 missions:number;successful:number;injuries:number;recoveryDays:number;
 status:'available'|'reserve'|'lost'|'retired';weapon:'carbine'|'smg'|'rifle'|'shotgun';
 magazine:number;reserve:number;shotsFired:number;joinedDay:number;
 loadout:EquipmentLoadout;armorCondition:ArmorIntegrity;
 medicalSupplies:FieldMedicalSupplies;
 weaponConfiguration:WeaponConfiguration;
 weaponSerialId?:string|null;
 magazines:MagazineItem[];loadedMagazineId:string;
};
export type Contract={
 id:string;seed:number;kind:OperationKind;scale:'standard'|'expanded';
 region:string;title:string;description:string;risk:1|2|3;
 intel:'floor-plan'|'unknown'|'scouted';reward:number;deadline:number;
 status:'available'|'accepted'|'completed'|'failed'|'expired';followUpOf?:string;
 /** Optional recon outcome, independent of floor-plan intelligence. */
 objectiveIntel?:ObjectiveIntelLevel;
 /** D8: optional authored incident; missing on all pre-D8 contracts. */
 dispatchCase?:DispatchCaseV1;
};
export type CampaignReport={
 id:string;contractId:string;day:number;outcome:'success'|'failure';
 grade:string;elapsed:number;participatingIds:string[];casualties:string[];
 objective:boolean;events:CareerEvent[];
 performance?:OperatorPerformance[];gains?:SkillGains[];
 flashUsed?:number;
 /** D10: optional evidence-only incident closeout; no extra score rule. */
 dispatchForce?:DispatchForceHistoryV1;
 /** D11: Dispatch-only standing and operating-support receipt. */
 dispatchCareer?:DispatchCareerReceiptV1;
 stabilizedIds?:string[];criticalIds?:string[];evacuatedIds?:string[];
 medicalRemaining?:Record<string,FieldMedicalSupplies>;
};
export type CampaignState={
 version:1;id:string;seed:number;day:number;funds:number;
 /** Reusable case intelligence earned in completed missions; absent in legacy saves. */
 intelligence?:number;
 /** Cosmetic label; absent on unchanged legacy saves. */
 name?:string;
 operators:CampaignOperator[];squadIds:string[];contracts:Contract[];activeContractId:string|null;
 history:CampaignReport[];journal:CareerEvent[];appliedResults:string[];
 supplies:{medical:number;ammo:number;flash:number};regionalPressure:Record<string,number>;
 inventory:{weapons:Record<CampaignOperator['weapon'],number>;
  attachments:Record<string,number>;serializedWeapons?:SerializedWeapon[]};
 kitPresets:EquipmentPreset[];
 /** Optional v0.1 rules; absent on legacy saves, preserving their semantics. */
 rules?:CampaignRules;
 /** D11: optional standing ledger; missing on pre-D11 Dispatch saves. */
 dispatchDepartment?:DispatchDepartmentV1;
 /** D12: optional independent experience settings; missing preserves the original pilot. */
 dispatchSetup?:DispatchCampaignSetupV1;
};
/** Site/architectural intel is distinct from actionable objective location intel.
 * Previous successful cases contribute leads, not a guaranteed room. */
export function contractObjectiveIntel(c:Contract):ObjectiveIntelLevel{
 return c.objectiveIntel??(c.followUpOf?'approximate':'unknown');
}
export const campaignIntelBalance=(c:CampaignState)=>Math.max(0,c.intelligence??0);
export function reconContract(c:CampaignState,id:string):CampaignState{
 const job=c.contracts.find(k=>k.id===id);
 if(!job||job.status!=='available'||c.activeContractId)return c;
 const level=contractObjectiveIntel(job);
 if(level==='confirmed')return c;
 const cost=level==='unknown'?1:2;
 if(campaignIntelBalance(c)<cost)return c;
 const next:ObjectiveIntelLevel=level==='unknown'?'approximate':'confirmed';
 return {...c,intelligence:campaignIntelBalance(c)-cost,
  contracts:c.contracts.map(k=>k.id===id?{...k,objectiveIntel:next}:k)};
}
const WEAPONS=['carbine','smg','rifle','shotgun'] as const;
const REGIONS=['Cutwoods','Breadlands','Flooded Belt','Verdigris City','Timberline'] as const;
const CONTRACTS:{kind:OperationKind;title:string;description:string}[]=[
 {kind:'clear',title:'Secure the Site',description:'Clear hostile opposition and secure the objective.'},
 {kind:'intel',title:'Recover Documents',description:'Secure the intelligence package and extract.'},
 {kind:'rescue',title:'Missing Personnel',description:'Find and escort a civilian to extraction.'},
 {kind:'hold',title:'Defensive Action',description:'Secure and hold the designated location.'},
 {kind:'capture',title:'Target Recovery',description:'Secure the designated hostile target.'}
];
const hash=(n:number)=>{n=(n^n>>>16)>>>0;n=Math.imul(n,0x7feb352d);n=(n^n>>>15)>>>0;n=Math.imul(n,0x846ca68b);return (n^n>>>16)>>>0;};
const values=(seed:number,kind:'skill'|'aptitude'):ShootingSkills=>{
 const nums=SKILL_NAMES.map((_,i)=>{const n=hash(seed+i*7127+(kind==='skill'?0:98711))/0xffffffff;
 return kind==='skill'?.35+n*.30:.8+n*.4;});
 return Object.fromEntries(SKILL_NAMES.map((key,i)=>[key,nums[i]])) as ShootingSkills;
};
export function startingOperator(id:string,i:number,seed:number):CampaignOperator{
 const aptitude=values(hash(seed+i*733),'aptitude');
 const strongest=SKILL_NAMES.reduce((best,key)=>aptitude[key]>aptitude[best]?key:best);
 const traitNames:Record<SkillName,string>={
  pointShooting:'Close Quarters Instinct',longRange:'Patient Marksman',
  precision:'Careful Aim',recoilControl:'Steady Hands',
  composure:'Calm Under Pressure',handling:'Fast Hands'};
 const issue=issueWeaponPreset(['ar-m4a1','ak-ak105','ar-m16a4','ak-ak74m'][i%4]);
 const weapon=issue.weapon;
 const ammo=freshMagazineIssue(id,weapon,issue.weaponConfiguration);
 return {id,callsign:id.toUpperCase(),background:['Patrol','Reconnaissance','Security','Emergency Response'][i%4],
  appearanceSeed:hash(seed+i+83),wardrobe:initialWardrobe(),
  skills:values(hash(seed+i*313),'skill'),
  experience:Object.fromEntries(SKILL_NAMES.map(k=>[k,0])) as ShootingSkills,
  aptitudes:aptitude,trait:traitNames[strongest],distinctions:[],
  missions:0,successful:0,injuries:0,recoveryDays:0,status:'available',
  weapon,...ammo,shotsFired:0,joinedDay:1,
   loadout:initialEquipmentLoadout(weapon),
   medicalSupplies:kitMedicalSupplies(initialEquipmentLoadout(weapon)),
   weaponConfiguration:issue.weaponConfiguration,
   armorCondition:initialArmorIntegrity(initialEquipmentLoadout(weapon))};
}
export function createContracts(seed:number,day:number,existing:readonly Contract[]=[],pressure:Record<string,number>={},dispatch=false):Contract[]{
 const archive=existing.filter(c=>c.status!=='available'&&c.status!=='accepted').slice(-80);
 const active=existing.filter(c=>c.status==='available'||c.status==='accepted');
 const offers:Contract[]=[...active];
 for(let i=0;offers.filter(c=>c.status==='available').length<3&&i<20;i++){
  const s=hash(seed^Math.imul(day+i,0x9e3779b9))||1;
  const id='ct-'+day+'-'+i+'-'+s.toString(16);
  if(offers.some(c=>c.id===id))continue;
  const kind=CONTRACTS[(i+day+seed%5)%CONTRACTS.length];
  const region=REGIONS[(s>>>5)%REGIONS.length];
  const intensity=(pressure[region]??0)>1?1:0;
  const risk=Math.max(1,Math.min(3,1+(s%3)+intensity)) as 1|2|3;
  const offer:Contract={id,seed:s,kind:kind.kind,scale:s%4===0?'expanded':'standard',
   region,title:kind.title,
   description:kind.description,risk,intel:s%3===0?'unknown':'floor-plan',
   reward:240+risk*230,deadline:day+2+(s%3),status:'available'};
  offers.push(dispatch?assignDispatchCase(offer,
   [...archive,...offers].map(k=>k.dispatchCase?.incidentId).filter((id):id is string=>!!id)):offer);
 }
 return [...archive,...offers];
}
export function newCampaign(seed:number,rules?:CampaignRules,name?:string):CampaignState{
 if(name!==undefined&&(!name.trim()||name.trim().length>40||/[\x00-\x1f\x7f]/.test(name)))
  throw Error('Invalid campaign name');
 const parsedRules=rules===undefined?undefined:readCampaignRules(rules);
 if(rules!==undefined&&!parsedRules)throw Error('Unsupported campaign rules');
 const normalized=(seed>>>0)||1;
 return reconcileCampaignWeaponOwnership({version:1,id:'campaign-'+normalized.toString(16),seed:normalized,day:1,funds:1200,
  intelligence:1,
  ...(name!==undefined?{name:name.trim()}:{}),
  operators:['rook','moss','ash','vale'].map((id,i)=>startingOperator(id,i,normalized)),
  squadIds:['rook','moss','ash','vale'],
  contracts:createContracts(normalized,1,[],{},parsedRules?.template==='dispatch'),activeContractId:null,
  history:[],journal:[],appliedResults:[],supplies:{medical:3,ammo:240,flash:4},
  regionalPressure:Object.fromEntries(REGIONS.map(r=>[r,0])),
  inventory:{weapons:{carbine:0,smg:0,rifle:0,shotgun:0},
    attachments:readAttachmentStock(null)},kitPresets:[],
  ...(parsedRules?{rules:parsedRules}:{}),
  ...(parsedRules?.template==='dispatch'?{
   dispatchDepartment:initialDispatchDepartment()}: {})});
}
export function migrateLegacyRoster(campaign:CampaignState,legacy:RosterState):CampaignState{
 if(!legacy||legacy.version!==1||!Array.isArray(legacy.members))return campaign;
 return reconcileCampaignWeaponOwnership({...campaign,operators:campaign.operators.map(operator=>{
  const old=legacy.members.find(m=>m.id===operator.id);
  if(!old)return operator;
  return {...operator,callsign:old.callsign.slice(0,24),
   missions:old.missions,successful:old.successful,injuries:old.injuries,
   recoveryDays:old.recovery,weapon:old.weapon,
    loadout:initialEquipmentLoadout(old.weapon),
    medicalSupplies:kitMedicalSupplies(initialEquipmentLoadout(old.weapon)),
    weaponConfiguration:resolveIssuedOrLegacy(
      readWeaponConfiguration(old.weaponConfiguration,old.weapon),old.weapon,
      starterWeaponPreset(operator.id)),
    magazine:old.magazine,
   reserve:old.reserve,shotsFired:old.fired,
   magazines:readPersistentMagazines(operator.id,old.weapon,old.reserve,
    (old as {magazines?:unknown}).magazines),
   loadedMagazineId:readLoadedMagazineId(operator.id,old.weapon,
    (old as {loadedMagazineId?:unknown}).loadedMagazineId,
    readPersistentMagazines(operator.id,old.weapon,old.reserve,
     (old as {magazines?:unknown}).magazines))};
 })});
}
export function readCampaign(raw:string|null):CampaignState|null{
 if(!raw)return null;
 try{
  const x:unknown=JSON.parse(raw);
  if(!x||typeof x!=='object')return null;
  const c=x as CampaignState;
  const savedRules=(c as {rules?:unknown}).rules;
  const parsedRules=savedRules===undefined?undefined:readCampaignRules(savedRules);
  if(savedRules!==undefined&&!parsedRules)return null;
  if(c.name!==undefined&&(typeof c.name!=='string'||!c.name.trim()||
   c.name.length>40||/[\x00-\x1f\x7f]/.test(c.name)))return null;
  if(c.intelligence!==undefined&&(!Number.isInteger(c.intelligence)||
     c.intelligence<0||c.intelligence>9))return null;
  if(c.version!==1||!Number.isInteger(c.seed)||!Number.isInteger(c.day)||
     c.day<1||c.day>1000000||!Number.isFinite(c.funds)||
     !Array.isArray(c.operators)||c.operators.length>32||!Array.isArray(c.contracts)||
     c.contracts.length>300||!Array.isArray(c.history)||!Array.isArray(c.journal)||
     !Array.isArray(c.appliedResults)||!c.supplies||!Number.isFinite(c.supplies.ammo)||
     !Number.isFinite(c.supplies.medical))return null;
  for(const o of c.operators){
   if(!o||typeof o.id!=='string'||typeof o.callsign!=='string'||
     !SKILL_NAMES.every(k=>Number.isFinite(o.skills?.[k])&&Number.isFinite(o.experience?.[k])&&Number.isFinite(o.aptitudes?.[k])))return null;
  }
  if(c.dispatchSetup!==undefined&&
    (parsedRules?.template!=='dispatch'||!validDispatchSetup(c.dispatchSetup)))return null;
  if(c.dispatchDepartment!==undefined&&
    (parsedRules?.template!=='dispatch'||
     !validDispatchDepartment(c.dispatchDepartment)))return null;
  for(const report of c.history){
   if(!report||typeof report!=='object')return null;
   if(report.dispatchCareer!==undefined&&
     (parsedRules?.template!=='dispatch'||
      !validDispatchCareerReceipt(report.dispatchCareer)))return null;
   if(report?.dispatchForce!==undefined&&

     (parsedRules?.template!=='dispatch'||
      !validDispatchForceHistory(report.dispatchForce)))return null;
  }
  for(const contract of c.contracts){
   if(!contract||typeof contract.id!=='string'||!Number.isInteger(contract.seed)||
     !CONTRACTS.some(k=>k.kind===contract.kind)||
     (contract.objectiveIntel!==undefined&&
       !(['unknown','approximate','confirmed'] as string[]).includes(contract.objectiveIntel))||
     (contract.dispatchCase!==undefined&&
       (parsedRules?.template!=='dispatch'||
        !validDispatchCase(contract.dispatchCase,contract.kind))))return null;
  }
  const fallback=c.operators.slice(0,4).map(o=>o.id);
  const chosen=Array.isArray(c.squadIds)&&c.squadIds.length===4&&
   new Set(c.squadIds).size===4&&
   c.squadIds.every(id=>c.operators.some(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired'))?
   c.squadIds:fallback;
  const weapons=Object.fromEntries(WEAPONS.map(weapon=>
   [weapon,Number.isInteger(c.inventory?.weapons?.[weapon])&&
    c.inventory.weapons[weapon]>=0?c.inventory.weapons[weapon]:0])) as Record<CampaignOperator['weapon'],number>;
  const operators=c.operators.map(o=>{
   const config=resolveIssuedOrLegacy(readWeaponConfiguration(
    (o as {weaponConfiguration?:unknown}).weaponConfiguration,o.weapon),o.weapon,
    starterWeaponPreset(o.id));
   const reserve=Number.isFinite(o.reserve)?Math.max(0,Math.floor(o.reserve)):0;
   const parsed=readPersistentMagazines(o.id,o.weapon,reserve,
    (o as {magazines?:unknown}).magazines,
    300);
   const fitted=fitMagazineInventory(o.id,o.weapon,config,o.magazine,reserve,parsed);
   return {...o,...fitted,
    loadedMagazineId:readLoadedMagazineId(o.id,o.weapon,
     (o as {loadedMagazineId?:unknown}).loadedMagazineId,fitted.magazines),
   loadout:readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon),
   wardrobe:readWardrobe((o as {wardrobe?:unknown}).wardrobe),
   medicalSupplies:normalizedMedicalSupplies((o as {medicalSupplies?:unknown}).medicalSupplies,
    kitMedicalSupplies(readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon))),
    weaponConfiguration:config,
   armorCondition:normalizedArmorCondition((o as {armorCondition?:unknown}).armorCondition,
    readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon)),
   trait:typeof o.trait==='string'?o.trait:'Experienced Operator',
   distinctions:Array.isArray(o.distinctions)?
    o.distinctions.filter((x):x is string=>typeof x==='string').slice(0,32):[]
  };});
  return reconcileCampaignWeaponOwnership({...c,squadIds:chosen,operators,inventory:{weapons,
      serializedWeapons:(c.inventory as {serializedWeapons?:unknown})?.serializedWeapons as SerializedWeapon[]|undefined,
     attachments:readAttachmentStock((c.inventory as {attachments?:unknown})?.attachments)},
    supplies:{...c.supplies,flash:Number.isFinite(c.supplies.flash)?
     Math.max(0,Math.min(1000,Math.floor(c.supplies.flash))):4},
    kitPresets:readKitPresets((c as {kitPresets?:unknown}).kitPresets),
    ...(parsedRules?{rules:parsedRules}:{}),
   regionalPressure:Object.fromEntries(REGIONS.map(region=>
   [region,Math.max(-3,Math.min(3,Number.isFinite(c.regionalPressure?.[region])?
    c.regionalPressure[region]:0))]))});
 }catch{return null;}
}
export function acceptContract(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const found=c.contracts.find(k=>k.id===id&&k.status==='available'&&k.deadline>=c.day);
 if(!found)return c;
 return {...c,activeContractId:id,contracts:c.contracts.map(k=>
  k.id===id?{...k,status:'accepted' as const}:k)};
}
export function resolveOperation(c:CampaignState,r:CampaignReport):CampaignState{
 if(c.appliedResults.includes(r.id)||c.activeContractId!==r.contractId)return c;
 const contract=c.contracts.find(k=>k.id===r.contractId&&k.status==='accepted');
 if(!contract)return c;
 const gained=r.outcome==='success'?contract.reward:0;
 // Dispatch service settlement is pure and opt-in. Unreviewed historical
 // evidence never becomes a fictitious clean-force finding.
 const departmentCycle=c.rules?.template==='dispatch'?
  advanceDispatchDepartment(c.dispatchDepartment,r):null;
 const participants=new Set(r.participatingIds);
 const casualties=new Set(r.casualties);
 const stabilized=new Set(r.stabilizedIds??[]);
 const evacuated=new Set(r.evacuatedIds??[]);
 const gainedSkills:SkillGains[]=[];
 const careerEvents:CareerEvent[]=[];
 const operators=c.operators.map(o=>{
  if(!participants.has(o.id)){
   const recoveryDays=Math.max(0,o.recoveryDays-1);
   return {...o,recoveryDays,injuries:recoveryDays===0?0:o.injuries};
  }
  if(o.missions===0)careerEvents.push({id:r.id+'-'+o.id+'-first',day:c.day,operatorId:o.id,
   operationId:r.id,kind:'first-deployment',detail:'First field operation'});
  if(r.outcome==='success'&&o.successful===0)careerEvents.push({
   id:r.id+'-'+o.id+'-success',day:c.day,operatorId:o.id,operationId:r.id,
   kind:'first-success',detail:'First successful operation'});
  const performance=r.performance?.find(p=>p.id===o.id);
  if(performance?.injuryStage)careerEvents.push({id:r.id+'-'+o.id+'-wound',
   day:c.day,operatorId:o.id,operationId:r.id,kind:'wounded',
   detail:'Wounded during '+contract.title});
  const base={...o,medicalSupplies:r.medicalRemaining?.[o.id]?
   normalizedMedicalSupplies(r.medicalRemaining[o.id],kitMedicalSupplies(o.loadout)):
   o.medicalSupplies,missions:o.missions+1,
   successful:o.successful+(r.outcome==='success'?1:0),
   recoveryDays:Math.max(0,o.recoveryDays-1,
    casualties.has(o.id)?(r.stabilizedIds===undefined?2:
      evacuated.has(o.id)?stabilized.has(o.id)?2:3:
      stabilized.has(o.id)?3:5):0)};
  if(!performance)return base;
  const progress=progressOperator(base,performance,r.outcome==='success');
  gainedSkills.push(progress.gains);
  return {...progress.operator,armorCondition:missionArmorCondition(
   o.armorCondition,performance,initialArmorIntegrity(o.loadout))};
 });
 const milestones=[
  {key:'5-operations',label:'Five Operations',test:(o:CampaignOperator)=>o.missions>=5},
  {key:'10-operations',label:'Ten Operations',test:(o:CampaignOperator)=>o.missions>=10},
  {key:'5-successes',label:'Five Successful Operations',test:(o:CampaignOperator)=>o.successful>=5},
  {key:'precision-specialist',label:'Precision Specialist',test:(o:CampaignOperator)=>o.skills.precision>=.7},
  {key:'recoil-specialist',label:'Weapon Control Specialist',test:(o:CampaignOperator)=>o.skills.recoilControl>=.7}
 ];
 const developed=operators.map(o=>{
  if(!participants.has(o.id))return o;
  const distinctions=[...o.distinctions];
  for(const milestone of milestones){
   if(!milestone.test(o)||distinctions.includes(milestone.label))continue;
   distinctions.push(milestone.label);
   careerEvents.push({id:r.id+'-'+o.id+'-'+milestone.key,
    day:c.day,operatorId:o.id,operationId:r.id,kind:'distinction',
    detail:'Earned distinction: '+milestone.label});
  }
  // D11 service awards require the operator to participate in actual
  // successful Dispatch settlements; no purely cosmetic auto-promotion.
  if(departmentCycle&&r.outcome==='success'){
   for(const award of [
    {key:'dispatch-response',label:'Dispatch Response Citation',at:3},
    {key:'dispatch-senior',label:'Dispatch Senior Service',at:8}
   ]){
    if(o.successful<award.at||distinctions.includes(award.label))continue;
    distinctions.push(award.label);
    careerEvents.push({id:r.id+'-'+o.id+'-'+award.key,day:c.day,
     operatorId:o.id,operationId:r.id,kind:'distinction',
     detail:'Earned distinction: '+award.label});
   }
  }
  return {...o,distinctions};
 });
 const day=c.day+1;
 const contracts=c.contracts.map(k=>k.id===r.contractId?
  {...k,status:r.outcome==='success'?'completed' as const:'failed' as const}:
  k.status==='available'&&k.deadline<day?{...k,status:'expired' as const}:k);
 const pressure={...c.regionalPressure};
 pressure[contract.region]=Math.max(-3,Math.min(3,
  (pressure[contract.region]??0)+(r.outcome==='success'?-1:1)));
 const followupKind:Partial<Record<OperationKind,OperationKind>>={
  intel:'capture',capture:'hold',clear:'rescue',rescue:'hold'};
 const nextKind=r.outcome==='success'?followupKind[contract.kind]:undefined;
 if(nextKind){
  const template=CONTRACTS.find(k=>k.kind===nextKind)!;
  const followup:Contract={id:contract.id+'-followup-'+nextKind,
   followUpOf:contract.id,seed:hash(contract.seed^day^0x69e433a1)||1,
   kind:nextKind,scale:contract.scale,region:contract.region,
   title:template.title,description:template.description,
   risk:Math.min(3,contract.risk+1) as 1|2|3,
   intel:'scouted',objectiveIntel:'approximate',
   reward:contract.reward+180,deadline:day+3,status:'available'};
  contracts.push(c.rules?.template==='dispatch'?assignDispatchCase(followup,
   contracts.map(k=>k.dispatchCase?.incidentId).filter((id):id is string=>!!id)):followup);
 }
 // The appliedResults gate above prevents replay/debrief double charging.
 const serials=c.inventory.serializedWeapons?.map(w=>{
  const owner=c.operators.find(o=>o.weaponSerialId===w.id&&participants.has(o.id));
  if(!owner)return w;
  const actual=r.performance?.find(p=>p.id===owner.id)?.shots??0;
  return recordWeaponRounds(w,actual,c.day,r.id);
 });
 return {...c,day,
  // No intel reward for failures; replayed reports cannot grant it twice.
  intelligence:Math.min(9,campaignIntelBalance(c)+
   (r.outcome==='success'?(contract.kind==='intel'?2:1):0)),
  funds:c.funds+gained+(departmentCycle?.receipt.operatingSupport??0),
  ...(departmentCycle?{dispatchDepartment:departmentCycle.state}:{}),
  operators:developed,regionalPressure:pressure,
  inventory:{...c.inventory,serializedWeapons:serials},
  supplies:{...c.supplies,flash:Math.max(0,(c.supplies.flash??4)-clampFlashUse(r.flashUsed))},
  activeContractId:null,
  history:[...c.history,{...r,gains:gainedSkills,
   ...(departmentCycle?{dispatchCareer:departmentCycle.receipt}:{})}].slice(-200),
  journal:[...c.journal,...r.events,...careerEvents].slice(-1000),
  appliedResults:[...c.appliedResults,r.id].slice(-500),
  contracts:createContracts(c.seed,day,contracts,pressure,
    c.rules?.template==='dispatch')};
}

/** Supplies are counted in actual rounds; no infinite free resupply. */
export function purchaseAmmo(c:CampaignState):CampaignState{
 const cost=120,rounds=60;
 if(!canSpend(c,cost))return c;
 return {...c,funds:charge(c,cost),supplies:{...c.supplies,ammo:c.supplies.ammo+rounds}};
}
export function purchaseMedical(c:CampaignState):CampaignState{
 const cost=170;
 if(!canSpend(c,cost))return c;
 return {...c,funds:charge(c,cost),supplies:{...c.supplies,medical:c.supplies.medical+1}};
}
export function treatOperator(c:CampaignState,id:string):CampaignState{
 const o=c.operators.find(m=>m.id===id&&m.recoveryDays>0);
 if(!o||c.supplies.medical<=0||c.activeContractId)return c;
 return {...c,supplies:{...c.supplies,medical:c.supplies.medical-1},
  operators:c.operators.map(m=>{
   if(m.id!==id)return m;
   const recoveryDays=Math.max(0,m.recoveryDays-2);
   return {...m,recoveryDays,injuries:recoveryDays===0?0:m.injuries};
  })};
}
/** A purchased HQ medical pack replenishes one operator; no free refill. */
export function resupplyMedicalOperator(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId||c.supplies.medical<=0)return c;
 const o=c.operators.find(m=>m.id===id&&m.status!=='lost'&&m.status!=='retired');
 if(!o)return c;
 const capacity=kitMedicalSupplies(o.loadout);
 if(medicalSupplyCount(capacity)===0||
    medicalSupplyCount(o.medicalSupplies)>=medicalSupplyCount(capacity))return c;
 return {...c,supplies:{...c.supplies,medical:c.supplies.medical-1},
  operators:c.operators.map(m=>m.id===id?{...m,medicalSupplies:capacity}:m)};
}
export function resupplyOperator(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const o=c.operators.find(m=>m.id===id&&m.status!=='lost'&&m.status!=='retired');
 if(!o)return c;
 const capacity=liveMagazineCapacity(o.weapon,o.weaponConfiguration);
 const target=standardReserveRounds(o.weapon,o.weaponConfiguration);
 const needed=Math.max(0,capacity-o.magazine)+Math.max(0,target-o.reserve);
 const rounds=Math.min(c.supplies.ammo,needed);
 if(rounds<=0)return c;
 const toMag=Math.min(rounds,Math.max(0,capacity-o.magazine));
 return {...c,supplies:{...c.supplies,ammo:c.supplies.ammo-rounds},
  operators:c.operators.map(m=>m.id===id?{...m,
   magazine:m.magazine+toMag,reserve:m.reserve+rounds-toMag,
    magazines:addReserveRounds(m.id,m.weapon,m.magazines,rounds-toMag,capacity)}:m)};
}

export const TACTICAL_SLOTS=['rook','moss','ash','vale'] as const;
export function tacticalSlotOperator(c:CampaignState,slotId:string):CampaignOperator|undefined{
 const index=TACTICAL_SLOTS.indexOf(slotId as typeof TACTICAL_SLOTS[number]);
 return index<0?undefined:c.operators.find(o=>o.id===c.squadIds[index]);
}
export function assignOperatorToSlot(c:CampaignState,slot:number,id:string):CampaignState{
 if(c.activeContractId||slot<0||slot>=4)return c;
 if(!c.operators.some(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired'))return c;
 const squads=[...c.squadIds],oldIndex=squads.indexOf(id);
 if(oldIndex===slot)return c;
 if(oldIndex>=0)squads[oldIndex]=squads[slot];
 squads[slot]=id;
 return {...c,squadIds:squads};
}
const RECRUIT_NAMES=['KITE','PIPER','JUNO','EMBER','DOVE','LIN','BRAM','SABLE'];
export function hireRecruit(c:CampaignState):CampaignState{
 if(!canSpend(c,450)||c.operators.length>=32||
  c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').length>=8||c.activeContractId)return c;
 const i=c.operators.length;
 const id='recruit-'+i;
 const base=startingOperator(id,i,hash(c.seed+i*733+Math.imul(c.day,31)));
 const available=RECRUIT_NAMES.filter(name=>!c.operators.some(o=>o.callsign===name));
 const fresh={...base,callsign:available[(hash(c.seed+i*59)>>>4)%available.length]??('RECRUIT '+i),
  joinedDay:c.day,status:'reserve' as const};
 const member=isDispatchPilotCampaign(c)?issueDispatchPilotOperator(fresh,
  currentDispatchReference(c)):fresh;
 const event:CareerEvent={id:'join-'+id+'-'+c.day,day:c.day,operatorId:id,
  kind:'joined',detail:'Joined the unit'};
 return reconcileCampaignWeaponOwnership({...c,funds:charge(c,450),operators:[...c.operators,member],
  journal:[...c.journal,event].slice(-1000)});
}

/** Economy is independent of eligible catalog and unlocked equipment. */
const unlimitedDispatch=(c:CampaignState)=>
 c.rules?.template==='dispatch'&&effectiveDispatchSetup(c).economy==='unlimited';
export const canAffordCampaignPurchase=(c:CampaignState,cost:number)=>
 unlimitedDispatch(c)||c.funds>=cost;
const canSpend=canAffordCampaignPurchase;
/** Prevent deductions when reconciliation would discard a newly purchased gun. */
export const campaignWeaponStockAtCapacity=(c:CampaignState):boolean=>{
 const serialized=c.inventory.serializedWeapons?.length;
 const accounted=c.operators.filter(o=>o.status!=='retired'&&o.status!=='lost').length+
  Object.values(c.inventory.weapons).reduce((sum,count)=>sum+count,0);
 return Math.max(serialized??0,accounted)>=MAX_OWNED_WEAPONS;
};
const charge=(c:CampaignState,cost:number)=>unlimitedDispatch(c)?c.funds:c.funds-cost;
export const WEAPON_PRICES:Record<CampaignOperator['weapon'],number>={
 carbine:300,smg:260,rifle:420,shotgun:330
};
export function buyWeapon(c:CampaignState,weapon:CampaignOperator['weapon']):CampaignState{
 if(!mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary'))return c;
 const price=WEAPON_PRICES[weapon];
 if(!price||c.activeContractId||!canSpend(c,price)||
  campaignWeaponStockAtCapacity(c))return c;
 return reconcileCampaignWeaponOwnership({...c,funds:charge(c,price),
  inventory:{...c.inventory,weapons:{...c.inventory.weapons,[weapon]:c.inventory.weapons[weapon]+1}}});
}
/** Buying an attachment adds one stock item without silently equipping it. */
export function buyWeaponAttachment(c:CampaignState,partId:string):CampaignState{
 if(!dispatchPilotUnclassifiedEditingEnabled(c))return c;
 const price=attachmentPrice(partId);
 if(c.activeContractId||price<=0||!canSpend(c,price)||
  (c.inventory.attachments[partId]??0)>=999)return c;
 return {...c,funds:charge(c,price),inventory:{...c.inventory,
  attachments:{...c.inventory.attachments,
   [partId]:(c.inventory.attachments[partId]??0)+1}}};
}
/** Shared M2.6 physical guard for direct Armory and saved kit routes.
 * Class-only legacy weapons still use their existing abstract equipment.
 */
const hasValidPhysicalLayout=(c:WeaponConfiguration):boolean=>
 !c.build||resolveMountedAccessoryLayout(c).unresolved.length===0;
/** Single-slot atomic stock transfer; no duplicate equipped copies. */
export function equipCampaignWeaponAttachment(c:CampaignState,id:string,
 slot:WeaponAttachmentSlot,partId:string):CampaignState{
 if(c.activeContractId||!dispatchPilotUnclassifiedEditingEnabled(c))return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setWeaponAttachment(o.weaponConfiguration,slot,partId);
 if(next===o.weaponConfiguration||!hasValidPhysicalLayout(next))return c;
 const quote=quoteAttachmentTransfer(c.inventory.attachments,
  o.weaponConfiguration,next,Math.max(0,c.funds),false);
 if(!quote.canCommit||!quote.stockAfter)return c;
 return {...c,inventory:{...c.inventory,attachments:quote.stockAfter},
  operators:c.operators.map(m=>m.id===id?{...m,weaponConfiguration:next}:m)};
}
/** Family builds are an appearance-only prototype on owned gameplay classes.
 * No fabricated magazines, ammunition, serialized guns or attachment stock.
 * Named physical weapon ownership will be a separate campaign migration.
 */
export function equipCampaignWeaponPreset(c:CampaignState,id:string,presetId:string):CampaignState{
 if(c.activeContractId||!mayChooseCampaignContent(c,'weapon-preset',presetId))return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=selectWeaponFamilyPreset(o.weaponConfiguration,presetId);
 if(sameWeaponConfiguration(next,o.weaponConfiguration)||
  !hasValidPhysicalLayout(next))return c;
 const transfer=quoteAttachmentTransfer(c.inventory.attachments,
  o.weaponConfiguration,next,Math.max(0,c.funds),false);
 if(!transfer.canCommit||!transfer.stockAfter)return c;
 return {...c,inventory:{...c.inventory,attachments:transfer.stockAfter},
  operators:c.operators.map(m=>m.id===id?{...m,weaponConfiguration:next,
   ...fitMagazineInventory(m.id,m.weapon,next,m.magazine,m.reserve,m.magazines)}:m)};
}
export function equipCampaignWeaponFamilyPart(c:CampaignState,id:string,
 slot:FamilyPartSlot,partId:string):CampaignState{
 if(c.activeContractId||!dispatchPilotUnclassifiedEditingEnabled(c))return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setConfiguredFamilyPart(o.weaponConfiguration,slot,partId);
 if(sameWeaponConfiguration(next,o.weaponConfiguration)||
  !hasValidPhysicalLayout(next))return c;
 const transfer=quoteAttachmentTransfer(c.inventory.attachments,
  o.weaponConfiguration,next,Math.max(0,c.funds),false);
 if(!transfer.canCommit||!transfer.stockAfter)return c;
 return {...c,inventory:{...c.inventory,attachments:transfer.stockAfter},
  operators:c.operators.map(m=>m.id===id?{...m,weaponConfiguration:next,
   ...fitMagazineInventory(m.id,m.weapon,next,m.magazine,m.reserve,m.magazines)}:m)};
}
/** Player-authorized buy-and-equip is all-or-nothing. */
export function purchaseAndEquipWeaponAttachment(c:CampaignState,id:string,
 slot:WeaponAttachmentSlot,partId:string):CampaignState{
 if(c.activeContractId||!dispatchPilotUnclassifiedEditingEnabled(c))return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setWeaponAttachment(o.weaponConfiguration,slot,partId);
 if(next===o.weaponConfiguration||!hasValidPhysicalLayout(next))return c;
 const quote=quoteAttachmentTransfer(c.inventory.attachments,
  o.weaponConfiguration,next,
  unlimitedDispatch(c)?Number.MAX_SAFE_INTEGER:c.funds,true);
 if(!quote.canCommit||!quote.stockAfter||!canSpend(c,quote.cost))return c;
 // Creative's unlimited spending never creates infinite physical stock.
 return {...c,funds:charge(c,quote.cost),
  inventory:{...c.inventory,attachments:quote.stockAfter},
  operators:c.operators.map(m=>m.id===id?{...m,weaponConfiguration:next}:m)};
}
export function equipCampaignWeapon(c:CampaignState,id:string,
 weapon:CampaignOperator['weapon']):CampaignState{
 if(c.activeContractId||!WEAPONS.includes(weapon)||
  !mayChooseCampaignContent(c,'equipment','primary-'+weapon,'primary'))return c;
 const m=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!m||m.weapon===weapon||c.inventory.weapons[weapon]<1)return c;
 const targetConfig=resolveIssuedOrLegacy(
  changeWeaponPlatform(m.weaponConfiguration,weapon),weapon,
  starterWeaponPreset(m.id));
 if(!hasValidPhysicalLayout(targetConfig))return c;
 const transfer=quoteAttachmentTransfer(c.inventory.attachments,
  m.weaponConfiguration,targetConfig,Math.max(0,c.funds),false);
 if(!transfer.canCommit||!transfer.stockAfter)return c;
 return reconcileCampaignWeaponOwnership({...c,inventory:{...c.inventory,
  attachments:transfer.stockAfter,weapons:{
   ...c.inventory.weapons,
   [weapon]:c.inventory.weapons[weapon]-1,
   [m.weapon]:c.inventory.weapons[m.weapon]+1
  }},
  operators:c.operators.map(o=>o.id===id?{...o,weapon,magazine:0,reserve:0,
    magazines:[],loadedMagazineId:o.id+'/'+weapon+'/loaded',
    loadout:syncPrimaryWeapon(o.loadout,weapon),
    weaponConfiguration:targetConfig}:o)});
}

/** Retirement is player-directed, never inferred from an ambiguous downed state. */
export function retireOperator(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId||c.squadIds.includes(id))return c;
 const available=c.operators.filter(o=>o.status==='available'||o.status==='reserve');
 if(available.length<=4)return c;
 const o=available.find(m=>m.id===id);
 if(!o)return c;
 const weapons={...c.inventory.weapons,[o.weapon]:c.inventory.weapons[o.weapon]+1};
 const event:CareerEvent={id:'retired-'+id+'-'+c.day,day:c.day,operatorId:id,
  kind:'retirement',detail:'Retired from active field service'};
 return reconcileCampaignWeaponOwnership({...c,inventory:{...c.inventory,weapons,
  attachments:returnAttachments(c.inventory.attachments,o.weaponConfiguration)},
  operators:c.operators.map(m=>
  m.id===id?{...m,status:'retired' as const}:m),
  journal:[...c.journal,event].slice(-1000)});
}

/** Non-weapon issued kit customization. Weapon swaps must go through the
 * stock-aware equipCampaignWeapon path, never through this editor. */
export function equipCampaignGear(c:CampaignState,id:string,slot:LoadoutSlot,
 itemId:string):CampaignState{
 if(c.activeContractId||slot==='primary'||
  !mayChooseCampaignContent(c,'equipment',itemId,slot))return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setEquipmentChoice(o.loadout,slot,itemId);
 if(next===o.loadout)return c;
 return {...c,operators:c.operators.map(m=>m.id===id?{...m,loadout:next,
  medicalSupplies:normalizedMedicalSupplies(m.medicalSupplies,kitMedicalSupplies(next)),
  magazines:stageMagazines(m.magazines,next),
  armorCondition:clampArmorToKit(m.armorCondition,next)}:m)};
}

/** L2.3: stock- and capacity-aware pre-mission field item issuance.
 * Prepared kit allocations are a reservation, not a purchase or stock debit.
 */
export function equipCampaignFieldInventory(c:CampaignState,id:string,
 inventory:FieldInventory):CampaignState{
 if(c.activeContractId)return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!member)return c;
 const next=readFieldInventory(inventory,member.loadout);
 if(!fieldCarryReport(member.loadout,member.magazines,next).valid)return c;
 const otherFlash=c.operators.filter(o=>o.id!==id&&
  c.squadIds.includes(o.id)).reduce((sum,o)=>sum+fieldQuantity(
  o.loadout.fieldInventory??initialFieldInventory(o.loadout),'flashbang'),0);
 if(c.squadIds.includes(id)&&
  otherFlash+fieldQuantity(next,'flashbang')>c.supplies.flash)return c;
 return {...c,operators:c.operators.map(o=>o.id===id?
  {...o,loadout:{...o.loadout,fieldInventory:next}}:o)};
}

/** Named equipment recipes are lightweight shared records, not physical stock. */
export function saveCampaignKitPreset(c:CampaignState,id:string,name:string):CampaignState{
 if(c.activeContractId||c.kitPresets.length>=MAX_KIT_PRESETS||
    !name.trim())return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='retired'&&o.status!=='lost');
 if(!member)return c;
 const presetId=nextPresetId(c.kitPresets);
 if(!presetId)return c;
 return {...c,kitPresets:[...c.kitPresets,{
   id:presetId,name:name.trim().slice(0,32),weapon:member.weapon,
   kit:readEquipmentLoadout(member.loadout,member.weapon),
   weaponConfiguration:readWeaponConfiguration(member.weaponConfiguration,member.weapon)}]};
}
/** D4.1 validates a complete saved kit before any Campaign mutation.
 * Equipment slots and weapon build must remain within the authored pilot.
 * Legacy/Sandbox campaigns retain existing preset semantics.
 */
export function canApplyCampaignKitPreset(c:CampaignState,id:string,presetId:string):boolean{
 if(c.activeContractId)return false;
 const member=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 const preset=c.kitPresets.find(p=>p.id===presetId);
 if(!member||!preset)return false;
 if(!isDispatchPilotCampaign(c)||
  effectiveDispatchSetup(c).equipmentScope==='global')return true;
 if(member.weapon!==preset.weapon||
  !sameWeaponConfiguration(readWeaponConfiguration(preset.weaponConfiguration,preset.weapon),
   member.weaponConfiguration))return false;
 return Object.entries(preset.kit.slots).every(([slot,itemId])=>
  mayChooseCampaignContent(c,'equipment',itemId,slot as LoadoutSlot));
}
export function applyCampaignKitPreset(c:CampaignState,id:string,presetId:string):CampaignState{
 if(!canApplyCampaignKitPreset(c,id,presetId))return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 const preset=c.kitPresets.find(p=>p.id===presetId);
 if(!member||!preset)return c;
 // Entire recipe is atomic. Never silently skip a missing primary weapon.
 if(member.weapon!==preset.weapon&&c.inventory.weapons[preset.weapon]<1)return c;
 const desired=readWeaponConfiguration(preset.weaponConfiguration,preset.weapon);
 if(!hasValidPhysicalLayout(desired))return c;
 // Apply one return-before-acquire transaction, independent of UI entry.
 const transfer=quoteAttachmentTransfer(c.inventory.attachments,
  member.weaponConfiguration,desired,Math.max(0,c.funds),false);
 if(!transfer.canCommit||!transfer.stockAfter)return c;
 const attachments=transfer.stockAfter;
 const swapped=member.weapon===preset.weapon?c:equipCampaignWeapon(c,id,preset.weapon);
 if(swapped===c&&member.weapon!==preset.weapon)return c;
 return {...swapped,inventory:{...swapped.inventory,attachments},
  operators:swapped.operators.map(o=>o.id===id?{
   ...o,weaponConfiguration:desired,
   ...fitMagazineInventory(o.id,o.weapon,desired,o.magazine,o.reserve,o.magazines),
   loadout:readEquipmentLoadout(preset.kit,preset.weapon),
   medicalSupplies:normalizedMedicalSupplies(o.medicalSupplies,
    kitMedicalSupplies(readEquipmentLoadout(preset.kit,preset.weapon))),
   magazines:stageMagazines(fitMagazineInventory(o.id,o.weapon,desired,
    o.magazine,o.reserve,o.magazines).magazines,preset.kit),
   armorCondition:clampArmorToKit(o.armorCondition,preset.kit)}:o)};
}
export function deleteCampaignKitPreset(c:CampaignState,presetId:string):CampaignState{
 if(c.activeContractId||!c.kitPresets.some(p=>p.id===presetId))return c;
 return {...c,kitPresets:c.kitPresets.filter(p=>p.id!==presetId)};
}
/** Allow cosmetic identity edits without changing personnel service history. */
export function renameCampaignOperator(c:CampaignState,id:string,callsign:string):CampaignState{
 const next=callsign.trim().slice(0,24);
 if(!next||c.activeContractId||c.operators.some(o=>o.id!==id&&o.callsign.toLowerCase()===next.toLowerCase()))
  return c;
 return {...c,operators:c.operators.map(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired'?
  {...o,callsign:next}:o)};
}
export function cycleCampaignAppearance(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 return {...c,operators:c.operators.map(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired'?
  {...o,appearanceSeed:(o.appearanceSeed+1)>>>0}:o)};
}

/** Campaign equipment persists as condition, not a fresh disposable vest.
 * Swapping gear cannot restore previously depleted protection. */
const validArmor=(x:unknown,maximum:number,fallback:number)=>
 typeof x==='number'&&Number.isFinite(x)?
  Math.min(maximum,Math.max(0,Math.floor(x))):fallback;
export function normalizedArmorCondition(raw:unknown,kit:EquipmentLoadout):ArmorIntegrity{
 const max=initialArmorIntegrity(kit);
 if(!raw||typeof raw!=='object')return max;
 const value=raw as Partial<ArmorIntegrity>;
 return {torso:validArmor(value.torso,max.torso,max.torso),
  head:validArmor(value.head,max.head,max.head)};
}
export function clampArmorToKit(condition:ArmorIntegrity,kit:EquipmentLoadout):ArmorIntegrity{
 const max=initialArmorIntegrity(kit);
 return {torso:Math.min(max.torso,Math.max(0,condition.torso)),
  head:Math.min(max.head,Math.max(0,condition.head))};
}
export function missionArmorCondition(
 previous:ArmorIntegrity,performance:OperatorPerformance,maximum:ArmorIntegrity
):ArmorIntegrity{
 return {
  torso:validArmor(performance.armorIntegrity,maximum.torso,previous.torso),
  head:validArmor(performance.helmetIntegrity,maximum.head,previous.head)
 };
}
/** Repairs are explicit, paid and unavailable during an active contract. */
export function armorRepairCost(o:CampaignOperator):number{
 const max=initialArmorIntegrity(o.loadout);
 return Math.max(0,max.torso-o.armorCondition.torso)*30+
  Math.max(0,max.head-o.armorCondition.head)*24;
}
/** Explicit workshop-only paid firearm service; inventory identity is preserved. */
export function weaponServiceCost(w?:SerializedWeapon):number{
 if(!w||w.condition>=100)return 0;
 return 40+(100-w.condition)*4;
}
export function serviceCampaignWeapon(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const operator=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!operator)return c;
 const weapon=c.inventory.serializedWeapons?.find(w=>w.id===operator.weaponSerialId);
 const cost=weaponServiceCost(weapon);
 if(!weapon||cost===0||!canSpend(c,cost))return c;
 return {...c,funds:charge(c,cost),inventory:{...c.inventory,
  serializedWeapons:c.inventory.serializedWeapons?.map(w=>w.id===weapon.id?
   serviceSerializedWeapon(w,c.day,100-w.condition):w)}};
}
export function repairCampaignArmor(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='retired'&&o.status!=='lost');
 if(!member)return c;
 const cost=armorRepairCost(member);
 if(cost===0||!canSpend(c,cost))return c;
 return {...c,funds:charge(c,cost),operators:c.operators.map(o=>o.id===id?
  {...o,armorCondition:initialArmorIntegrity(o.loadout)}:o)};
}

/** Flashbang resupply is a paid transaction, never hidden kit duplication. */
export function purchaseFlash(c:CampaignState):CampaignState{
 if(c.activeContractId||!canSpend(c,150)||c.supplies.flash>998)return c;
 return {...c,funds:charge(c,150),supplies:{...c.supplies,flash:c.supplies.flash+2}};
}

/** Manual pouch assignment changes one owned instance, not ammunition.
 * Removing gear that held magazines repacks them into remaining storage.
 */
export function moveCampaignMagazine(
 c:CampaignState,operatorId:string,magazineId:string,to:MagazineLocation
):CampaignState{
 if(c.activeContractId||!['rig','belt','pocket','backpack','overflow'].includes(to))
  return c;
 const soldier=c.operators.find(o=>o.id===operatorId&&o.status!=='lost'&&o.status!=='retired');
 if(!soldier||soldier.weapon==='shotgun')return c;
 const placed=stageMagazines(soldier.magazines,soldier.loadout);
 const item=placed.find(m=>m.id===magazineId);
 if(!item||item.location===to)return c;
 const spaces=magazineSpace(soldier.loadout);
 if(to!=='overflow'&&placed.filter(m=>m.location===to).length>=spaces[to])return c;
 const relocated=placed.map(m=>m.id===magazineId?{...m,location:to}:m);
 return {...c,operators:c.operators.map(o=>o.id===operatorId?
  {...o,magazines:stageMagazines(relocated,o.loadout)}:o)};
}

/** Appearance-only customization: never issues stock or alters carried gear.
 * An active operation freezes personnel appearance with their deployed kit.
 */
export function setCampaignWardrobe(c:CampaignState,id:string,
 raw:unknown):CampaignState{
 if(c.activeContractId)return c;
 const member=c.operators.find(x=>x.id===id&&
  x.status!=='retired'&&x.status!=='lost');
 if(!member)return c;
 const wardrobe=readWardrobe(raw);
 if(isDispatchPilotCampaign(c)&&
  effectiveDispatchSetup(c).equipmentScope!=='global'&&
  !dispatchPilotAppearanceAllowed(member.wardrobe??initialWardrobe(),wardrobe,member.loadout,
   currentDispatchReference(c)))return c;
 return {...c,operators:c.operators.map(x=>x.id===id?{...x,wardrobe}:x)};
}

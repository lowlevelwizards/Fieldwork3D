/** Campaign domain. Nothing here advances in the render/simulation loop. */
import type {OperationKind} from './breach-operations.ts';
import type {ShootingSkills} from './breach-skills.ts';
import type {RosterState} from './breach-roster.ts';
import {WEAPONS as COMBAT_WEAPONS} from './breach-combat.ts';
import {magazineKit,type MagazineItem} from './breach-magazines.ts';
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
import {initialWeaponConfiguration,readWeaponConfiguration,changeWeaponPlatform,
 setWeaponAttachment,WEAPON_ATTACHMENT_SLOTS,
 type WeaponConfiguration,type WeaponAttachmentSlot}
 from './equipment-weapon-assemblies.ts';
import {attachmentPrice,readAttachmentStock,returnAttachments}
 from './equipment-weapon-inventory.ts';
import {kitMedicalSupplies,normalizedMedicalSupplies,medicalSupplyCount,
 type FieldMedicalSupplies} from './equipment-medical-supplies.ts';

export type SkillName=keyof ShootingSkills;
export const SKILL_NAMES:SkillName[]=['pointShooting','longRange','precision','recoilControl','composure','handling'];
export type CareerEvent={id:string;day:number;operatorId:string;operationId?:string;kind:string;detail:string;otherOperatorId?:string};
export type CampaignOperator={
 id:string;callsign:string;background:string;appearanceSeed:number;
 skills:ShootingSkills;experience:ShootingSkills;aptitudes:ShootingSkills;
 trait:string;distinctions:string[];
 missions:number;successful:number;injuries:number;recoveryDays:number;
 status:'available'|'reserve'|'lost'|'retired';weapon:'carbine'|'smg'|'rifle'|'shotgun';
 magazine:number;reserve:number;shotsFired:number;joinedDay:number;
 loadout:EquipmentLoadout;armorCondition:ArmorIntegrity;
 medicalSupplies:FieldMedicalSupplies;
 weaponConfiguration:WeaponConfiguration;
 magazines:MagazineItem[];loadedMagazineId:string;
};
export type Contract={
 id:string;seed:number;kind:OperationKind;scale:'standard'|'expanded';
 region:string;title:string;description:string;risk:1|2|3;
 intel:'floor-plan'|'unknown'|'scouted';reward:number;deadline:number;
 status:'available'|'accepted'|'completed'|'failed'|'expired';followUpOf?:string;
};
export type CampaignReport={
 id:string;contractId:string;day:number;outcome:'success'|'failure';
 grade:string;elapsed:number;participatingIds:string[];casualties:string[];
 objective:boolean;events:CareerEvent[];
 performance?:OperatorPerformance[];gains?:SkillGains[];
 flashUsed?:number;
 stabilizedIds?:string[];criticalIds?:string[];evacuatedIds?:string[];
 medicalRemaining?:Record<string,FieldMedicalSupplies>;
};
export type CampaignState={
 version:1;id:string;seed:number;day:number;funds:number;
 operators:CampaignOperator[];squadIds:string[];contracts:Contract[];activeContractId:string|null;
 history:CampaignReport[];journal:CareerEvent[];appliedResults:string[];
 supplies:{medical:number;ammo:number;flash:number};regionalPressure:Record<string,number>;
 inventory:{weapons:Record<CampaignOperator['weapon'],number>;
  attachments:Record<string,number>};
 kitPresets:EquipmentPreset[];
};
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
 const weapon=WEAPONS[i%WEAPONS.length];
 const capacity={carbine:12,smg:24,rifle:10,shotgun:6}[weapon];
 const reserve={carbine:36,smg:72,rifle:30,shotgun:24}[weapon];
 return {id,callsign:id.toUpperCase(),background:['Patrol','Reconnaissance','Security','Emergency Response'][i%4],
  appearanceSeed:hash(seed+i+83),skills:values(hash(seed+i*313),'skill'),
  experience:Object.fromEntries(SKILL_NAMES.map(k=>[k,0])) as ShootingSkills,
  aptitudes:aptitude,trait:traitNames[strongest],distinctions:[],
  missions:0,successful:0,injuries:0,recoveryDays:0,status:'available',
  weapon,magazine:capacity,reserve,shotsFired:0,joinedDay:1,
   magazines:weapon==='shotgun'?[]:
    magazineKit(id,weapon,reserve,COMBAT_WEAPONS[weapon].capacity),
   loadedMagazineId:id+'/'+weapon+'/loaded',
   loadout:initialEquipmentLoadout(weapon),
   medicalSupplies:kitMedicalSupplies(initialEquipmentLoadout(weapon)),
   weaponConfiguration:initialWeaponConfiguration(weapon),
   armorCondition:initialArmorIntegrity(initialEquipmentLoadout(weapon))};
}
export function createContracts(seed:number,day:number,existing:readonly Contract[]=[],pressure:Record<string,number>={}):Contract[]{
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
  offers.push({id,seed:s,kind:kind.kind,scale:s%4===0?'expanded':'standard',
   region,title:kind.title,
   description:kind.description,risk,intel:s%3===0?'unknown':'floor-plan',
   reward:240+risk*230,deadline:day+2+(s%3),status:'available'});
 }
 return [...archive,...offers];
}
export function newCampaign(seed:number):CampaignState{
 const normalized=(seed>>>0)||1;
 return {version:1,id:'campaign-'+normalized.toString(16),seed:normalized,day:1,funds:1200,
  operators:['rook','moss','ash','vale'].map((id,i)=>startingOperator(id,i,normalized)),
  squadIds:['rook','moss','ash','vale'],
  contracts:createContracts(normalized,1),activeContractId:null,
  history:[],journal:[],appliedResults:[],supplies:{medical:3,ammo:240,flash:4},
  regionalPressure:Object.fromEntries(REGIONS.map(r=>[r,0])),
  inventory:{weapons:{carbine:0,smg:0,rifle:0,shotgun:0},
    attachments:readAttachmentStock(null)},kitPresets:[]};
}
export function migrateLegacyRoster(campaign:CampaignState,legacy:RosterState):CampaignState{
 if(!legacy||legacy.version!==1||!Array.isArray(legacy.members))return campaign;
 return {...campaign,operators:campaign.operators.map(operator=>{
  const old=legacy.members.find(m=>m.id===operator.id);
  if(!old)return operator;
  return {...operator,callsign:old.callsign.slice(0,24),
   missions:old.missions,successful:old.successful,injuries:old.injuries,
   recoveryDays:old.recovery,weapon:old.weapon,
    loadout:initialEquipmentLoadout(old.weapon),
    medicalSupplies:kitMedicalSupplies(initialEquipmentLoadout(old.weapon)),
    weaponConfiguration:readWeaponConfiguration(old.weaponConfiguration,old.weapon),
    magazine:old.magazine,
   reserve:old.reserve,shotsFired:old.fired,
   magazines:readPersistentMagazines(operator.id,old.weapon,old.reserve,
    (old as {magazines?:unknown}).magazines),
   loadedMagazineId:readLoadedMagazineId(operator.id,old.weapon,
    (old as {loadedMagazineId?:unknown}).loadedMagazineId,
    readPersistentMagazines(operator.id,old.weapon,old.reserve,
     (old as {magazines?:unknown}).magazines))};
 })};
}
export function readCampaign(raw:string|null):CampaignState|null{
 if(!raw)return null;
 try{
  const x:unknown=JSON.parse(raw);
  if(!x||typeof x!=='object')return null;
  const c=x as CampaignState;
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
  for(const contract of c.contracts){
   if(!contract||typeof contract.id!=='string'||!Number.isInteger(contract.seed)||
     !CONTRACTS.some(k=>k.kind===contract.kind))return null;
  }
  const fallback=c.operators.slice(0,4).map(o=>o.id);
  const chosen=Array.isArray(c.squadIds)&&c.squadIds.length===4&&
   new Set(c.squadIds).size===4&&
   c.squadIds.every(id=>c.operators.some(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired'))?
   c.squadIds:fallback;
  const weapons=Object.fromEntries(WEAPONS.map(weapon=>
   [weapon,Number.isInteger(c.inventory?.weapons?.[weapon])&&
    c.inventory.weapons[weapon]>=0?c.inventory.weapons[weapon]:0])) as Record<CampaignOperator['weapon'],number>;
  const operators=c.operators.map(o=>({...o,
    magazines:readPersistentMagazines(o.id,o.weapon,o.reserve,
     (o as {magazines?:unknown}).magazines),
    loadedMagazineId:readLoadedMagazineId(o.id,o.weapon,
     (o as {loadedMagazineId?:unknown}).loadedMagazineId,
     readPersistentMagazines(o.id,o.weapon,o.reserve,
      (o as {magazines?:unknown}).magazines)),
   loadout:readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon),
   medicalSupplies:normalizedMedicalSupplies((o as {medicalSupplies?:unknown}).medicalSupplies,
    kitMedicalSupplies(readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon))),
    weaponConfiguration:readWeaponConfiguration(
     (o as {weaponConfiguration?:unknown}).weaponConfiguration,o.weapon),
   armorCondition:normalizedArmorCondition((o as {armorCondition?:unknown}).armorCondition,
    readEquipmentLoadout((o as {loadout?:unknown}).loadout,o.weapon)),
   trait:typeof o.trait==='string'?o.trait:'Experienced Operator',
   distinctions:Array.isArray(o.distinctions)?
    o.distinctions.filter((x):x is string=>typeof x==='string').slice(0,32):[]
  }));
  return {...c,squadIds:chosen,operators,inventory:{weapons,
     attachments:readAttachmentStock((c.inventory as {attachments?:unknown})?.attachments)},
    supplies:{...c.supplies,flash:Number.isFinite(c.supplies.flash)?
     Math.max(0,Math.min(1000,Math.floor(c.supplies.flash))):4},
    kitPresets:readKitPresets((c as {kitPresets?:unknown}).kitPresets),
   regionalPressure:Object.fromEntries(REGIONS.map(region=>
   [region,Math.max(-3,Math.min(3,Number.isFinite(c.regionalPressure?.[region])?
    c.regionalPressure[region]:0))]))};
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
  contracts.push({id:contract.id+'-followup-'+nextKind,
   followUpOf:contract.id,seed:hash(contract.seed^day^0x69e433a1)||1,
   kind:nextKind,scale:contract.scale,region:contract.region,
   title:template.title,description:template.description,
   risk:Math.min(3,contract.risk+1) as 1|2|3,
   intel:'scouted',reward:contract.reward+180,deadline:day+3,status:'available'});
 }
 return {...c,day,funds:c.funds+gained,operators:developed,regionalPressure:pressure,
  supplies:{...c.supplies,flash:Math.max(0,(c.supplies.flash??4)-clampFlashUse(r.flashUsed))},
  activeContractId:null,history:[...c.history,{...r,gains:gainedSkills}].slice(-200),
  journal:[...c.journal,...r.events,...careerEvents].slice(-1000),
  appliedResults:[...c.appliedResults,r.id].slice(-500),
  contracts:createContracts(c.seed,day,contracts,pressure)};
}

/** Supplies are counted in actual rounds; no infinite free resupply. */
export function purchaseAmmo(c:CampaignState):CampaignState{
 const cost=120,rounds=60;
 if(c.funds<cost)return c;
 return {...c,funds:c.funds-cost,supplies:{...c.supplies,ammo:c.supplies.ammo+rounds}};
}
export function purchaseMedical(c:CampaignState):CampaignState{
 const cost=170;
 if(c.funds<cost)return c;
 return {...c,funds:c.funds-cost,supplies:{...c.supplies,medical:c.supplies.medical+1}};
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
 const weapon=COMBAT_WEAPONS[o.weapon];
 const needed=Math.max(0,weapon.capacity-o.magazine)+Math.max(0,weapon.reserve-o.reserve);
 const rounds=Math.min(c.supplies.ammo,needed);
 if(rounds<=0)return c;
 const toMag=Math.min(rounds,Math.max(0,weapon.capacity-o.magazine));
 return {...c,supplies:{...c.supplies,ammo:c.supplies.ammo-rounds},
  operators:c.operators.map(m=>m.id===id?{...m,
   magazine:m.magazine+toMag,reserve:m.reserve+rounds-toMag,
    magazines:addReserveRounds(m.id,m.weapon,m.magazines,rounds-toMag)}:m)};
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
 if(c.funds<450||c.operators.length>=32||
  c.operators.filter(o=>o.status!=='lost'&&o.status!=='retired').length>=8||c.activeContractId)return c;
 const i=c.operators.length;
 const id='recruit-'+i;
 const base=startingOperator(id,i,hash(c.seed+i*733+Math.imul(c.day,31)));
 const available=RECRUIT_NAMES.filter(name=>!c.operators.some(o=>o.callsign===name));
 const member={...base,callsign:available[(hash(c.seed+i*59)>>>4)%available.length]??('RECRUIT '+i),
  joinedDay:c.day,status:'reserve' as const};
 const event:CareerEvent={id:'join-'+id+'-'+c.day,day:c.day,operatorId:id,
  kind:'joined',detail:'Joined the unit'};
 return {...c,funds:c.funds-450,operators:[...c.operators,member],
  journal:[...c.journal,event].slice(-1000)};
}

export const WEAPON_PRICES:Record<CampaignOperator['weapon'],number>={
 carbine:300,smg:260,rifle:420,shotgun:330
};
export function buyWeapon(c:CampaignState,weapon:CampaignOperator['weapon']):CampaignState{
 const price=WEAPON_PRICES[weapon];
 if(!price||c.activeContractId||c.funds<price)return c;
 return {...c,funds:c.funds-price,
  inventory:{...c.inventory,weapons:{...c.inventory.weapons,[weapon]:c.inventory.weapons[weapon]+1}}};
}
/** Buying an attachment adds one stock item without silently equipping it. */
export function buyWeaponAttachment(c:CampaignState,partId:string):CampaignState{
 const price=attachmentPrice(partId);
 if(c.activeContractId||price<=0||c.funds<price||
  (c.inventory.attachments[partId]??0)>=999)return c;
 return {...c,funds:c.funds-price,inventory:{...c.inventory,
  attachments:{...c.inventory.attachments,
   [partId]:(c.inventory.attachments[partId]??0)+1}}};
}
/** Single-slot atomic stock transfer; no duplicate equipped copies. */
export function equipCampaignWeaponAttachment(c:CampaignState,id:string,
 slot:WeaponAttachmentSlot,partId:string):CampaignState{
 if(c.activeContractId)return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setWeaponAttachment(o.weaponConfiguration,slot,partId);
 if(next===o.weaponConfiguration)return c;
 const paid=attachmentPrice(partId)>0;
 if(paid&&(c.inventory.attachments[partId]??0)<1)return c;
 const attachments=returnAttachments(c.inventory.attachments,o.weaponConfiguration,next);
 if(paid)attachments[partId]--;
 return {...c,inventory:{...c.inventory,attachments},operators:c.operators.map(m=>
  m.id===id?{...m,weaponConfiguration:next}:m)};
}
/** Player-authorized buy-and-equip is all-or-nothing. */
export function purchaseAndEquipWeaponAttachment(c:CampaignState,id:string,
 slot:WeaponAttachmentSlot,partId:string):CampaignState{
 const direct=equipCampaignWeaponAttachment(c,id,slot,partId);
 if(direct!==c)return direct;
 const price=attachmentPrice(partId);
 if(price<=0||c.activeContractId||c.funds<price)return c;
 const purchased=buyWeaponAttachment(c,partId);
 if(purchased===c)return c;
 const equipped=equipCampaignWeaponAttachment(purchased,id,slot,partId);
 return equipped===purchased?c:equipped;
}
export function equipCampaignWeapon(c:CampaignState,id:string,
 weapon:CampaignOperator['weapon']):CampaignState{
 if(c.activeContractId||!WEAPONS.includes(weapon))return c;
 const m=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!m||m.weapon===weapon||c.inventory.weapons[weapon]<1)return c;
 const targetConfig=changeWeaponPlatform(m.weaponConfiguration,weapon);
 const attachments=returnAttachments(c.inventory.attachments,
  m.weaponConfiguration,targetConfig);
 return {...c,inventory:{...c.inventory,attachments,weapons:{
   ...c.inventory.weapons,
   [weapon]:c.inventory.weapons[weapon]-1,
   [m.weapon]:c.inventory.weapons[m.weapon]+1
  }},
  operators:c.operators.map(o=>o.id===id?{...o,weapon,magazine:0,reserve:0,
    magazines:[],loadedMagazineId:o.id+'/'+weapon+'/loaded',
    loadout:syncPrimaryWeapon(o.loadout,weapon),
    weaponConfiguration:changeWeaponPlatform(o.weaponConfiguration,weapon)}:o)};
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
 return {...c,inventory:{...c.inventory,weapons,
  attachments:returnAttachments(c.inventory.attachments,o.weaponConfiguration)},
  operators:c.operators.map(m=>
  m.id===id?{...m,status:'retired' as const}:m),
  journal:[...c.journal,event].slice(-1000)};
}

/** Non-weapon issued kit customization. Weapon swaps must go through the
 * stock-aware equipCampaignWeapon path, never through this editor. */
export function equipCampaignGear(c:CampaignState,id:string,slot:LoadoutSlot,
 itemId:string):CampaignState{
 if(c.activeContractId||slot==='primary')return c;
 const o=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 if(!o)return c;
 const next=setEquipmentChoice(o.loadout,slot,itemId);
 if(next===o.loadout)return c;
 return {...c,operators:c.operators.map(m=>m.id===id?{...m,loadout:next,
  medicalSupplies:normalizedMedicalSupplies(m.medicalSupplies,kitMedicalSupplies(next)),
  magazines:stageMagazines(m.magazines,next),
  armorCondition:clampArmorToKit(m.armorCondition,next)}:m)};
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
export function applyCampaignKitPreset(c:CampaignState,id:string,presetId:string):CampaignState{
 if(c.activeContractId)return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='lost'&&o.status!=='retired');
 const preset=c.kitPresets.find(p=>p.id===presetId);
 if(!member||!preset)return c;
 // Entire recipe is atomic. Never silently skip a missing primary weapon.
 if(member.weapon!==preset.weapon&&c.inventory.weapons[preset.weapon]<1)return c;
 const desired=readWeaponConfiguration(preset.weaponConfiguration,preset.weapon);
 // Return obsolete paid parts before checking whether the saved recipe fits
 // finite workshop stock. Refuse the entire preset if any part is unavailable.
 const attachments=returnAttachments(c.inventory.attachments,
  member.weaponConfiguration,desired);
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const part=desired.slots[slot];
  if(part===member.weaponConfiguration.slots[slot]||attachmentPrice(part)<=0)
   continue;
  if((attachments[part]??0)<1)return c;
  attachments[part]--;
 }
 const swapped=member.weapon===preset.weapon?c:equipCampaignWeapon(c,id,preset.weapon);
 if(swapped===c&&member.weapon!==preset.weapon)return c;
 return {...swapped,inventory:{...swapped.inventory,attachments},
  operators:swapped.operators.map(o=>o.id===id?{
   ...o,weaponConfiguration:desired,
   loadout:readEquipmentLoadout(preset.kit,preset.weapon),
   medicalSupplies:normalizedMedicalSupplies(o.medicalSupplies,
    kitMedicalSupplies(readEquipmentLoadout(preset.kit,preset.weapon))),
   magazines:stageMagazines(o.magazines,preset.kit),
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
export function repairCampaignArmor(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const member=c.operators.find(o=>o.id===id&&o.status!=='retired'&&o.status!=='lost');
 if(!member)return c;
 const cost=armorRepairCost(member);
 if(cost===0||cost>c.funds)return c;
 return {...c,funds:c.funds-cost,operators:c.operators.map(o=>o.id===id?
  {...o,armorCondition:initialArmorIntegrity(o.loadout)}:o)};
}

/** Flashbang resupply is a paid transaction, never hidden kit duplication. */
export function purchaseFlash(c:CampaignState):CampaignState{
 if(c.activeContractId||c.funds<150||c.supplies.flash>998)return c;
 return {...c,funds:c.funds-150,supplies:{...c.supplies,flash:c.supplies.flash+2}};
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

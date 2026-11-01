/** Campaign domain. Nothing here advances in the render/simulation loop. */
import type {OperationKind} from './breach-operations.ts';
import type {ShootingSkills} from './breach-skills.ts';
import type {RosterState} from './breach-roster.ts';
import {WEAPONS as COMBAT_WEAPONS} from './breach-combat.ts';
import {progressOperator,type OperatorPerformance,type SkillGains} from './campaign-progression.ts';

export type SkillName=keyof ShootingSkills;
export const SKILL_NAMES:SkillName[]=['pointShooting','longRange','precision','recoilControl','composure','handling'];
export type CareerEvent={id:string;day:number;operatorId:string;operationId?:string;kind:string;detail:string;otherOperatorId?:string};
export type CampaignOperator={
 id:string;callsign:string;background:string;appearanceSeed:number;
 skills:ShootingSkills;experience:ShootingSkills;aptitudes:ShootingSkills;
 missions:number;successful:number;injuries:number;recoveryDays:number;
 status:'available'|'reserve'|'lost';weapon:'carbine'|'smg'|'rifle'|'shotgun';
 magazine:number;reserve:number;shotsFired:number;joinedDay:number;
};
export type Contract={
 id:string;seed:number;kind:OperationKind;scale:'standard'|'expanded';
 region:string;title:string;description:string;risk:1|2|3;
 intel:'floor-plan'|'unknown'|'scouted';reward:number;deadline:number;
 status:'available'|'accepted'|'completed'|'failed'|'expired';
};
export type CampaignReport={
 id:string;contractId:string;day:number;outcome:'success'|'failure';
 grade:string;elapsed:number;participatingIds:string[];casualties:string[];
 objective:boolean;events:CareerEvent[];
 performance?:OperatorPerformance[];gains?:SkillGains[];
};
export type CampaignState={
 version:1;id:string;seed:number;day:number;funds:number;
 operators:CampaignOperator[];contracts:Contract[];activeContractId:string|null;
 history:CampaignReport[];journal:CareerEvent[];appliedResults:string[];
 supplies:{medical:number;ammo:number};
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
 const weapon=WEAPONS[i%WEAPONS.length];
 const capacity={carbine:12,smg:24,rifle:10,shotgun:6}[weapon];
 const reserve={carbine:36,smg:72,rifle:30,shotgun:24}[weapon];
 return {id,callsign:id.toUpperCase(),background:['Patrol','Reconnaissance','Security','Emergency Response'][i%4],
  appearanceSeed:hash(seed+i+83),skills:values(hash(seed+i*313),'skill'),
  experience:Object.fromEntries(SKILL_NAMES.map(k=>[k,0])) as ShootingSkills,
  aptitudes:values(hash(seed+i*733),'aptitude'),
  missions:0,successful:0,injuries:0,recoveryDays:0,status:'available',
  weapon,magazine:capacity,reserve,shotsFired:0,joinedDay:1};
}
export function createContracts(seed:number,day:number,existing:readonly Contract[]=[]):Contract[]{
 const active=existing.filter(c=>c.status==='available'||c.status==='accepted');
 const offers:Contract[]=[...active];
 for(let i=0;offers.filter(c=>c.status==='available').length<3&&i<20;i++){
  const s=hash(seed^Math.imul(day+i,0x9e3779b9))||1;
  const id='ct-'+day+'-'+i+'-'+s.toString(16);
  if(offers.some(c=>c.id===id))continue;
  const kind=CONTRACTS[(i+day+seed%5)%CONTRACTS.length];
  const risk=((1+(s%3)) as 1|2|3);
  offers.push({id,seed:s,kind:kind.kind,scale:s%4===0?'expanded':'standard',
   region:REGIONS[(s>>>5)%REGIONS.length],title:kind.title,
   description:kind.description,risk,intel:s%3===0?'unknown':'floor-plan',
   reward:240+risk*230,deadline:day+2+(s%3),status:'available'});
 }
 return offers;
}
export function newCampaign(seed:number):CampaignState{
 const normalized=(seed>>>0)||1;
 return {version:1,id:'campaign-'+normalized.toString(16),seed:normalized,day:1,funds:1200,
  operators:['rook','moss','ash','vale'].map((id,i)=>startingOperator(id,i,normalized)),
  contracts:createContracts(normalized,1),activeContractId:null,
  history:[],journal:[],appliedResults:[],supplies:{medical:3,ammo:240}};
}
export function migrateLegacyRoster(campaign:CampaignState,legacy:RosterState):CampaignState{
 if(!legacy||legacy.version!==1||!Array.isArray(legacy.members))return campaign;
 return {...campaign,operators:campaign.operators.map(operator=>{
  const old=legacy.members.find(m=>m.id===operator.id);
  if(!old)return operator;
  return {...operator,callsign:old.callsign.slice(0,24),
   missions:old.missions,successful:old.successful,injuries:old.injuries,
   recoveryDays:old.recovery,weapon:old.weapon,magazine:old.magazine,
   reserve:old.reserve,shotsFired:old.fired};
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
  return c;
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
  const base={...o,missions:o.missions+1,
   successful:o.successful+(r.outcome==='success'?1:0),
   recoveryDays:Math.max(0,o.recoveryDays-1,casualties.has(o.id)?2:0)};
  if(!performance)return base;
  const progress=progressOperator(base,performance,r.outcome==='success');
  gainedSkills.push(progress.gains);
  return progress.operator;
 });
 const day=c.day+1;
 const contracts=c.contracts.map(k=>k.id===r.contractId?
  {...k,status:r.outcome==='success'?'completed' as const:'failed' as const}:
  k.status==='available'&&k.deadline<day?{...k,status:'expired' as const}:k);
 return {...c,day,funds:c.funds+gained,operators,
  activeContractId:null,history:[...c.history,{...r,gains:gainedSkills}].slice(-200),
  journal:[...c.journal,...r.events,...careerEvents].slice(-1000),
  appliedResults:[...c.appliedResults,r.id].slice(-500),
  contracts:createContracts(c.seed,day,contracts)};
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
export function resupplyOperator(c:CampaignState,id:string):CampaignState{
 if(c.activeContractId)return c;
 const o=c.operators.find(m=>m.id===id&&m.status!=='lost');
 if(!o)return c;
 const weapon=COMBAT_WEAPONS[o.weapon];
 const needed=Math.max(0,weapon.capacity-o.magazine)+Math.max(0,weapon.reserve-o.reserve);
 const rounds=Math.min(c.supplies.ammo,needed);
 if(rounds<=0)return c;
 const toMag=Math.min(rounds,Math.max(0,weapon.capacity-o.magazine));
 return {...c,supplies:{...c.supplies,ammo:c.supplies.ammo-rounds},
  operators:c.operators.map(m=>m.id===id?{...m,
   magazine:m.magazine+toMag,reserve:m.reserve+rounds-toMag}:m)};
}

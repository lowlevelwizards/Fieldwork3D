/** EB17: aggregate actual starting loadouts and identities. The briefing
 * projection contains no actor IDs, coordinates, routes, or individual traits.
 * Report quality is independent of map disclosure. */
import type {TeamActor} from '../breach-game.ts';
import {AI_GROUP_PROFILES,AI_COMPETENCE,type AiGroupKind,type AiCompetence} from '../breach-ai-group-profiles.ts';
import {matchingFamilyPreset} from '../equipment-weapon-families.ts';
import {resolvedWardrobe,wardrobeItem} from '../operator-wardrobe-data.ts';
import type {IntelClaim,ReportQuality} from './briefing-types.ts';
export type ThreatGroupFacts={
 kind:AiGroupKind;tiers:AiCompetence[];weapons:string[];armor:string[];
 headgear:string[];clothing:string[];
};
const sorted=(values:Set<string>)=>[...values].sort();
export function threatGroupFacts(actors:readonly TeamActor[]):ThreatGroupFacts[]{
 const rows=new Map<AiGroupKind,{tiers:Set<AiCompetence>;weapons:Set<string>;armor:Set<string>;headgear:Set<string>;clothing:Set<string>}>();
 for(const actor of actors){
  if(actor.side!=='red'||!actor.npcIdentity||!actor.encounterGroupId)continue;
  const kind=actor.npcIdentity.groupKind;
  let row=rows.get(kind);
  if(!row){row={tiers:new Set(),weapons:new Set(),armor:new Set(),headgear:new Set(),clothing:new Set()};rows.set(kind,row);}
  row.tiers.add(actor.npcIdentity.competence);
  const build=actor.weaponConfiguration?.build;
  row.weapons.add((build&&matchingFamilyPreset(build)?.name)||actor.weapon);
  const looks=resolvedWardrobe(actor.wardrobe,actor.equipment);
  const armor=actor.equipment?.slots.armor;
  if(armor)row.armor.add(armor==='armor-none'?'unarmored':armor==='armor-soft'?'soft armor':'plate carriers');
  if(actor.equipment?.slots.head==='head-helmet')row.headgear.add('ballistic helmets');
  else row.headgear.add('no ballistic helmets');
  row.clothing.add(wardrobeItem('top',looks.top)?.name??looks.top);
  row.clothing.add(wardrobeItem('trousers',looks.trousers)?.name??looks.trousers);
 }
 return [...rows].sort(([a],[b])=>a.localeCompare(b)).map(([kind,r])=>({
  kind,tiers:AI_COMPETENCE.filter(t=>r.tiers.has(t)),weapons:sorted(r.weapons),
  armor:sorted(r.armor),headgear:sorted(r.headgear),clothing:sorted(r.clothing)
 }));
}
const tierLabels:Record<AiCompetence,string>={untrained:'untrained',experienced:'experienced',trained:'trained',specialist:'specialist-level'};
export function threatDossierClaims(groups:readonly ThreatGroupFacts[],quality:ReportQuality):IntelClaim[]{
 if(quality==='low'||!groups.length)return [];
 const out:IntelClaim[]=[];
 for(const group of groups){
  const label=AI_GROUP_PROFILES[group.kind].label;
  out.push({id:'threat-group-'+group.kind,text:quality==='medium'?
   'Possible affiliation: '+label+'. Experience and equipment remain unverified.':
   'Reported affiliation: '+label+'. Assessed experience: '+group.tiers.map(t=>tierLabels[t]).join(' / ')+'.',
   confidence:quality==='medium'?'unverified':'credible',source:quality==='medium'?'witness':'records',
   provenance:'resolved group identity / report quality '+quality,disclosure:'general'});
  if(quality==='high')out.push({id:'threat-kit-'+group.kind,
   text:label+' — reported weapons: '+group.weapons.join(', ')+
    '; protection: '+[...group.armor,...group.headgear].join(', ')+
    '; clothing: '+group.clothing.join(', ')+'. Individual issue and current disposition may differ.',
   confidence:'credible',source:'records',provenance:'resolved issued kit / report quality high',disclosure:'general'});
 }
 return out;
}

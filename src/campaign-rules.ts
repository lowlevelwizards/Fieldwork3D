/** Campaign Foundation v0.1: small, pure campaign-rule contracts.
 * Campaign templates are identities and design defaults, NOT promises that
 * future economies, survival systems, or military mission types exist.
 * Quick Play never reads this module or inherits these rules.
 */
import type {IntelMode} from './breach-intel.ts';
import type {SiteScale} from './breach-site.ts';

export const CAMPAIGN_TEMPLATE_IDS=['dispatch','operations','wasteland','custom'] as const;
export type CampaignTemplateId=typeof CAMPAIGN_TEMPLATE_IDS[number];
export type CampaignIntelRule='contract'|'floor-plan'|'exterior-known'|'true-blind';
export type CampaignScaleRule='contract'|'standard'|'expanded';
export type CampaignMissionRules={
 intel:CampaignIntelRule;scale:CampaignScaleRule;
};
export type CampaignRules={
 /** Independent of the existing CampaignState.version=1 save envelope. */
 version:1;
 template:CampaignTemplateId;
 mission:CampaignMissionRules;
};
type CampaignPreset={
 label:string;intent:string;
 /** These are only design profiles, not selectable finished game modes. */
 phase:'defined'|'foundation';
 defaults:Readonly<CampaignMissionRules>;
};
const currentMissionDefaults:Readonly<CampaignMissionRules>=Object.freeze({
 intel:'contract',scale:'contract'
});
/** Campaign template identities configure mission defaults; Dispatch's
 * separately owned D11 post-operation service ledger is opt-in by template.
 * Other presets preserve their shared economy and gameplay. */
export const CAMPAIGN_PRESETS:Readonly<Record<CampaignTemplateId,CampaignPreset>>=
 Object.freeze({
  dispatch:Object.freeze({label:'Dispatch',intent:'Law enforcement and accountable incident response',
   phase:'defined',defaults:currentMissionDefaults}),
  operations:Object.freeze({label:'Operations',intent:'Organized military campaigns and logistics',
   phase:'defined',defaults:currentMissionDefaults}),
  wasteland:Object.freeze({label:'Wasteland',intent:'Scavenging, risk and survival',
   phase:'defined',defaults:currentMissionDefaults}),
  custom:Object.freeze({label:'Custom',intent:'Player-authored campaign rules',
   phase:'foundation',defaults:currentMissionDefaults})
 });

/** A single registry for capability status and future dependencies.
 * "fixed" means implemented by the existing campaign, NOT configurable.
 * "planned" means neither configurable nor activated by any preset.
 */
export const CAMPAIGN_FEATURES={
 missionIntel:{status:'configurable',requires:[]},
 missionScale:{status:'configurable',requires:[]},
 operatorContinuity:{status:'fixed',requires:[]},
 equipmentOwnership:{status:'fixed',requires:[]},
 weaponService:{status:'fixed',requires:['equipmentOwnership']},
 looting:{status:'planned',requires:['equipmentOwnership']},
 gasAndFilters:{status:'planned',requires:[]},
 batterySupplies:{status:'planned',requires:[]},
 safehouseUpgrades:{status:'planned',requires:['looting']},
 militaryLogistics:{status:'planned',requires:['equipmentOwnership']},
 factionReputation:{status:'planned',requires:[]}
} as const;
export type CampaignFeatureId=keyof typeof CAMPAIGN_FEATURES;

const intelRules:readonly CampaignIntelRule[]=[
 'contract','floor-plan','exterior-known','true-blind'
];
const scaleRules:readonly CampaignScaleRule[]=['contract','standard','expanded'];
const record=(value:unknown):value is Record<string,unknown> =>
 typeof value==='object'&&value!==null&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,keys:readonly string[]) =>
 Object.keys(value).every(key=>keys.includes(key))&&
 keys.every(key=>Object.hasOwn(value,key));

/** Reject unknown/unsupported rule versions rather than silently changing play. */
export function readCampaignRules(value:unknown):CampaignRules|null{
 if(!record(value)||!exactKeys(value,['version','template','mission'])||
  value.version!==1||!CAMPAIGN_TEMPLATE_IDS.includes(value.template as CampaignTemplateId)||
  !record(value.mission)||!exactKeys(value.mission,['intel','scale'])||
  !intelRules.includes(value.mission.intel as CampaignIntelRule)||
  !scaleRules.includes(value.mission.scale as CampaignScaleRule))return null;
 return {version:1,template:value.template as CampaignTemplateId,
  mission:{intel:value.mission.intel as CampaignIntelRule,
   scale:value.mission.scale as CampaignScaleRule}};
}
export function createCampaignRules(template:CampaignTemplateId,
 overrides:Partial<CampaignMissionRules>={}):CampaignRules{
 if(!CAMPAIGN_TEMPLATE_IDS.includes(template))throw Error('Unknown campaign template');
 const rules=readCampaignRules({
  version:1,template,mission:{...CAMPAIGN_PRESETS[template].defaults,...overrides}
 });
 if(!rules)throw Error('Unsupported campaign rules');
 return rules;
}
/** Missing rules mean a genuine legacy save. No save migration or mutation. */
export function effectiveCampaignRules(campaign:{rules?:CampaignRules}|null):CampaignRules{
 return campaign?.rules??createCampaignRules('custom');
}
export type CampaignContractMission={
 intel:'floor-plan'|'unknown'|'scouted';
 scale:'standard'|'expanded';
};
export type CampaignDeploymentSettings={intel:IntelMode;scale:SiteScale};
/** The first real sandbox rule bridge; it does not alter contract identity,
 * rewards, enemy population, loadouts, or Quick Play generation.
 */
export function campaignDeploymentSettings(
 campaign:{rules?:CampaignRules}|null,contract:CampaignContractMission
):CampaignDeploymentSettings{
 const rules=effectiveCampaignRules(campaign).mission;
 const intel:IntelMode=rules.intel==='contract'?
  contract.intel==='unknown'?'true-blind':
  contract.intel==='scouted'?'exterior-known':'floor-plan':
  rules.intel;
 const scale:SiteScale=rules.scale==='contract'?contract.scale:rules.scale;
 return {intel,scale};
}

/** EB20: explicit campaign-context bridge; a retained campaign must never
 * affect Quick Play, training, or a restored resolved site. */
export function campaignEnemyContext(mode:string,campaign:{rules?:CampaignRules}|null):
 import('./worldgen/encounter-types.ts').EncounterContext['forceContext']{
 if(mode!=='mission'||!campaign)return undefined;
 const template=effectiveCampaignRules(campaign).template;
 return template==='operations'?'military':template==='wasteland'?'survival':'civilian';
}

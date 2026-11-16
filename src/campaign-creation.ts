/** C0.2: pure user-authored campaign draft. This never touches saved state. */
import {createCampaignRules,readCampaignRules,
 type CampaignIntelRule,type CampaignScaleRule,type CampaignRules}
 from './campaign-rules.ts';

export type CampaignCreationDraft={
 name:string;seed:string;intel:CampaignIntelRule;scale:CampaignScaleRule;
};
export type ValidCampaignCreation={
 ok:true;name:string;seed:number|null;rules:CampaignRules;
};
export type CampaignCreationResult=ValidCampaignCreation|{ok:false;error:string};
export const CAMPAIGN_NAME_LIMIT=40;
export function defaultCampaignDraft():CampaignCreationDraft{
 return {name:'My Sandbox',seed:'',intel:'contract',scale:'contract'};
}
export function validateCampaignDraft(value:unknown):CampaignCreationResult{
 if(!value||typeof value!=='object'||Array.isArray(value))
  return {ok:false,error:'Invalid campaign settings.'};
 const draft=value as Partial<CampaignCreationDraft>;
 if(typeof draft.name!=='string')return {ok:false,error:'Enter a campaign name.'};
 const name=draft.name.trim();
 if(!name||name.length>CAMPAIGN_NAME_LIMIT||/[\x00-\x1f\x7f]/.test(name))
  return {ok:false,error:'Use a name of 1–40 characters without control characters.'};
 if(typeof draft.seed!=='string')return {ok:false,error:'Invalid campaign seed.'};
 const seedText=draft.seed.trim();
 if(seedText&&!/^[0-9]+$/.test(seedText))
  return {ok:false,error:'Seed must be a whole number from 1 to 4294967295.'};
 const seed=seedText?Number(seedText):null;
 if(seed!==null&&(!Number.isSafeInteger(seed)||seed<1||seed>0xffffffff))
  return {ok:false,error:'Seed must be a whole number from 1 to 4294967295.'};
 const rules=readCampaignRules({version:1,template:'custom',
  mission:{intel:draft.intel,scale:draft.scale}});
 if(!rules)return {ok:false,error:'Unsupported campaign rule selection.'};
 return {ok:true,name,seed,rules:createCampaignRules('custom',rules.mission)};
}

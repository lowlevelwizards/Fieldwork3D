/** Portable, validated campaign snapshots; importing never mutates tactical state. */
import type {CampaignState} from './campaign-state.ts';
import {readCampaign} from './campaign-state.ts';
const MAX_EXPORT_SIZE=2_000_000;
export function exportCampaign(c:CampaignState):string{
 return JSON.stringify(c,null,2);
}
export function importCampaign(raw:string):CampaignState|null{
 if(raw.length>MAX_EXPORT_SIZE)return null;
 return readCampaign(raw);
}

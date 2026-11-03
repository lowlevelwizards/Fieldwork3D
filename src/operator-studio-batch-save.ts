/** Atomic appearance-only operator edits: the tactical game is authoritative.
 * No equipment ownership, primary weapons, reserves or campaign inventory
 * are serialized or changed through this protocol. */
import {setRosterWardrobe,type RosterState} from './breach-roster.ts';
import {setCampaignWardrobe,type CampaignState} from './campaign-state.ts';
import {readWardrobe,type WardrobeOptions} from './operator-wardrobe-data.ts';
export type StudioAppearanceEdit={id:string;wardrobe:WardrobeOptions};
export function validateStudioAppearanceEdits(raw:unknown):
 StudioAppearanceEdit[]|null{
 if(!Array.isArray(raw)||!raw.length||raw.length>32)return null;
 const result:StudioAppearanceEdit[]=[],seen=new Set<string>();
 for(const candidate of raw){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
   return null;
  const item=candidate as {id?:unknown;wardrobe?:unknown};
  if(typeof item.id!=='string'||!item.id||item.id.length>128||
     seen.has(item.id))return null;
  if(!item.wardrobe||typeof item.wardrobe!=='object'||
     Array.isArray(item.wardrobe)||
     (item.wardrobe as {version?:unknown}).version!==1)return null;
  result.push({id:item.id,wardrobe:readWardrobe(item.wardrobe)});
  seen.add(item.id);
 }
 return result;
}
export function applyStudioRosterEdits(roster:RosterState,
 edits:readonly StudioAppearanceEdit[]):RosterState|null{
 if(!edits.length||edits.some(e=>!roster.members.some(p=>p.id===e.id))||
    new Set(edits.map(e=>e.id)).size!==edits.length)return null;
 return edits.reduce((state,e)=>setRosterWardrobe(state,e.id,e.wardrobe),roster);
}
export function applyStudioCampaignEdits(campaign:CampaignState,
 edits:readonly StudioAppearanceEdit[]):CampaignState|null{
 if(campaign.activeContractId||!edits.length||
    new Set(edits.map(e=>e.id)).size!==edits.length||
    edits.some(e=>!campaign.operators.some(p=>p.id===e.id&&
      p.status!=='retired'&&p.status!=='lost')))return null;
 return edits.reduce((state,e)=>setCampaignWardrobe(state,e.id,e.wardrobe),
  campaign);
}

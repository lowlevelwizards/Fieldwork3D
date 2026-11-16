/** D3.0: three isolated persistent campaign slots, no automatic migrations.
 * The legacy key never changes. The active pointer is committed LAST.
 * No browser globals at import, no UI logic and no tactical-loop effects.
 */
import {readCampaign,type CampaignState} from './campaign-state.ts';
import {BREACH_STORAGE_KEYS} from './breach-storage-keys.ts';
import {readStoredText,writeStoredText,removeStoredText,browserBreachStorage,
 type BreachStorage} from './breach-persistence.ts';

export type CampaignSlot='legacy'|'sandbox'|'dispatch';
/** Dispatch is playable only from its isolated slot, not by importing a
 * Dispatch-themed save over legacy or Sandbox ownership. */
export function campaignMatchesSlot(campaign:CampaignState,slot:CampaignSlot):boolean{
 const template=campaign.rules?.template;
 return slot==='dispatch'?template==='dispatch':template!=='dispatch';
}
export function campaignSlotKey(slot:CampaignSlot):string{
 return slot==='sandbox'?BREACH_STORAGE_KEYS.sandboxCampaign:
  slot==='dispatch'?BREACH_STORAGE_KEYS.dispatchCampaign:BREACH_STORAGE_KEYS.campaign;
}
export function activeCampaignSlot(storage:BreachStorage|null=browserBreachStorage()):CampaignSlot{
 const stored=readStoredText(BREACH_STORAGE_KEYS.activeCampaignSlot,storage);
 return stored==='sandbox'||stored==='dispatch'?stored:'legacy';
}
export function loadCampaignSlot(slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):CampaignState|null{
 const parsed=readCampaign(readStoredText(campaignSlotKey(slot),storage));
 return parsed&&campaignMatchesSlot(parsed,slot)?parsed:null;
}
export function loadActiveCampaign(
 storage:BreachStorage|null=browserBreachStorage()
):{slot:CampaignSlot;campaign:CampaignState|null}{
 const requested=activeCampaignSlot(storage),campaign=loadCampaignSlot(requested,storage);
 // Corrupt/missing non-legacy slots fall back to the original campaign.
 if(requested!=='legacy'&&!campaign)
  return {slot:'legacy',campaign:loadCampaignSlot('legacy',storage)};
 return {slot:requested,campaign};
}
export function writeCampaignSlot(campaign:CampaignState,slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 return campaignMatchesSlot(campaign,slot)&&
  writeStoredText(campaignSlotKey(slot),JSON.stringify(campaign),storage);
}
/** Only valid, fully saved snapshots may become the selected campaign.
 * A pointer write failure does not change the in-memory active slot.
 */
export function activateCampaignSlot(slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 if(!loadCampaignSlot(slot,storage))return false;
 return writeStoredText(BREACH_STORAGE_KEYS.activeCampaignSlot,slot,storage);
}
/** A new or imported campaign is validated AND durably written before changing
 * selection. If selection fails, it remains available for later recovery.
 */
export function commitCampaignToSlot(campaign:CampaignState,slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 if(!readCampaign(JSON.stringify(campaign))||!campaignMatchesSlot(campaign,slot))return false;
 const key=campaignSlotKey(slot),previous=readStoredText(key,storage);
 if(!writeCampaignSlot(campaign,slot,storage))return false;
 if(activateCampaignSlot(slot,storage))return true;
 // Best-effort rollback in the unusual case where selection fails after the
 // campaign payload writes. Never touch the OTHER campaign slot.
 if(previous===null)removeStoredText(key,storage);
 else writeStoredText(key,previous,storage);
 return false;
}
/** Standalone Operator Studio must use the same active campaign as the game. */
export function activeCampaignStorageKey(
 storage:BreachStorage|null=browserBreachStorage()
):string{return campaignSlotKey(loadActiveCampaign(storage).slot);}

/** C0.2: exactly two persistent campaign slots, no automatic migrations.
 * The legacy key never changes. The active pointer is committed LAST.
 * No browser globals at import, no UI logic and no tactical-loop effects.
 */
import {readCampaign,type CampaignState} from './campaign-state.ts';
import {BREACH_STORAGE_KEYS} from './breach-storage-keys.ts';
import {readStoredText,writeStoredText,removeStoredText,browserBreachStorage,
 type BreachStorage} from './breach-persistence.ts';

export type CampaignSlot='legacy'|'sandbox';
export function campaignSlotKey(slot:CampaignSlot):string{
 return slot==='sandbox'?BREACH_STORAGE_KEYS.sandboxCampaign:BREACH_STORAGE_KEYS.campaign;
}
export function activeCampaignSlot(storage:BreachStorage|null=browserBreachStorage()):CampaignSlot{
 return readStoredText(BREACH_STORAGE_KEYS.activeCampaignSlot,storage)==='sandbox'?
  'sandbox':'legacy';
}
export function loadCampaignSlot(slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):CampaignState|null{
 return readCampaign(readStoredText(campaignSlotKey(slot),storage));
}
export function loadActiveCampaign(
 storage:BreachStorage|null=browserBreachStorage()
):{slot:CampaignSlot;campaign:CampaignState|null}{
 const requested=activeCampaignSlot(storage),campaign=loadCampaignSlot(requested,storage);
 // Corrupt/missing sandbox must never silently switch to a non-existent save.
 if(requested==='sandbox'&&!campaign)
  return {slot:'legacy',campaign:loadCampaignSlot('legacy',storage)};
 return {slot:requested,campaign};
}
export function writeCampaignSlot(campaign:CampaignState,slot:CampaignSlot,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 return writeStoredText(campaignSlotKey(slot),JSON.stringify(campaign),storage);
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
 if(!readCampaign(JSON.stringify(campaign)))return false;
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

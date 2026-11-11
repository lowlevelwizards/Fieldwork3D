/** Browser persistence adapter for the tactical entry and its campaign flow.
 * No storage is accessed at module import, and every method is safe in
 * private browsing, storage denial and quota-exceeded environments.
 * Gameplay state and schemas remain owned by their domain modules.
 */
import {INTEL_MODES,type IntelMode} from './breach-intel.ts';
import {freshQuickPlayRoster,readRoster,serializeQuickPlayCosmetics,
 type RosterState} from './breach-roster.ts';
import {readCampaign,type CampaignState} from './campaign-state.ts';
import {parseOperationHistory,addOperationRecord,type OperationRecord}
 from './breach-operations.ts';
import {BREACH_STORAGE_KEYS} from './breach-storage-keys.ts';

export type BreachStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;

export function browserBreachStorage():BreachStorage|null{
 try{return typeof localStorage==='undefined'?null:localStorage;}
 catch{return null;}
}
export function readStoredText(key:string,
 storage:BreachStorage|null=browserBreachStorage()):string|null{
 try{return storage?.getItem(key)??null;}
 catch{return null;}
}
export function writeStoredText(key:string,value:string,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 try{if(!storage)return false;storage.setItem(key,value);return true;}
 catch{return false;}
}
export function removeStoredText(key:string,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 try{if(!storage)return false;storage.removeItem(key);return true;}
 catch{return false;}
}

/** Intel preference changes only the next mission, never its active
 * knowledge snapshot or the replay's historical disclosure.
 */
export function loadIntelPreference(
 storage:BreachStorage|null=browserBreachStorage()):IntelMode{
 const stored=readStoredText(BREACH_STORAGE_KEYS.intelPreference,storage);
 return stored&&INTEL_MODES.includes(stored as IntelMode)?
  stored as IntelMode:'exterior-known';
}
export function saveIntelPreference(value:IntelMode,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 return writeStoredText(BREACH_STORAGE_KEYS.intelPreference,value,storage);
}

/** The old full-roster save is migrated to cosmetic-only Quick Play state.
 * New cosmetic saves take precedence. Do NOT remove the old save when
 * storage refuses the replacement write (quota, privacy, etc.).
 */
export function loadQuickPlayRoster(
 storage:BreachStorage|null=browserBreachStorage()):RosterState{
 const saved=readStoredText(BREACH_STORAGE_KEYS.quickCosmetics,storage)??
  readStoredText(BREACH_STORAGE_KEYS.legacyRoster,storage);
 const roster=freshQuickPlayRoster(readRoster(saved));
 if(readStoredText(BREACH_STORAGE_KEYS.legacyRoster,storage)!==null){
  if(writeStoredText(BREACH_STORAGE_KEYS.quickCosmetics,
      serializeQuickPlayCosmetics(roster),storage))
   removeStoredText(BREACH_STORAGE_KEYS.legacyRoster,storage);
 }
 return roster;
}
export function saveQuickPlayRoster(roster:RosterState,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 return writeStoredText(BREACH_STORAGE_KEYS.quickCosmetics,
  serializeQuickPlayCosmetics(roster),storage);
}
export function loadCampaignFromStorage(
 storage:BreachStorage|null=browserBreachStorage()):CampaignState|null{
 try{return readCampaign(readStoredText(BREACH_STORAGE_KEYS.campaign,storage));}
 catch{return null;}
}
export function saveCampaignToStorage(campaign:CampaignState,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 try{return writeStoredText(BREACH_STORAGE_KEYS.campaign,
  JSON.stringify(campaign),storage);}
 catch{return false;}
}
export function loadOperationHistory(
 storage:BreachStorage|null=browserBreachStorage()):OperationRecord[]{
 return parseOperationHistory(readStoredText(BREACH_STORAGE_KEYS.operationHistory,storage));
}
/** A failed read must never overwrite the history with a fabricated empty
 * list. The cap, validation, and order remain in breach-operations.ts.
 */
export function appendOperationHistory(record:OperationRecord,
 storage:BreachStorage|null=browserBreachStorage()):boolean{
 try{
  if(!storage)return false;
  const history=parseOperationHistory(storage.getItem(BREACH_STORAGE_KEYS.operationHistory));
  storage.setItem(BREACH_STORAGE_KEYS.operationHistory,
   JSON.stringify(addOperationRecord(history,record)));
  return true;
 }catch{return false;}
}

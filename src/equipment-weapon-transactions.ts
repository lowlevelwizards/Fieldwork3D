/** M2.6E — pure finite-stock reconciliation for every Campaign weapon editor.
 * The caller owns eligibility (contract, unlocks, serialized firearms).
 * Existing equipped items are retained; returns are counted before acquisitions.
 * Repositioning the same ID is ALWAYS free.
 */
import {WEAPON_ATTACHMENT_SLOTS,initialWeaponConfiguration,
 type WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {attachmentPrice} from './equipment-weapon-inventory.ts';

export interface AttachmentAcquisition{partId:string;price:number;}
export interface AttachmentTransferQuote{
 valid:boolean;canCommit:boolean;reason?:string;cost:number;
 purchases:readonly AttachmentAcquisition[];
 stockAfter?:Record<string,number>;
}
const denied=(reason:string):AttachmentTransferQuote=>({
 valid:false,canCommit:false,reason,cost:0,purchases:[]
});
const bounded=(n:unknown):n is number=>
 typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=999;
/** No mutations, no implicit replacement guns, no upfront credit debits.
 * With `mayPurchase=false`, only previously owned shared stock may install.
 * A caller must re-quote from current Campaign state on actual commit.
 */
export function quoteAttachmentTransfer(stock:Readonly<Record<string,number>>,
 previous:WeaponConfiguration,next:WeaponConfiguration,
 funds:number,mayPurchase=true):AttachmentTransferQuote{
 if(!Number.isFinite(funds)||funds<0)return denied('Invalid available funds');
 const values:Record<string,number>={...stock};
 if(Object.values(values).some(n=>!bounded(n)))
  return denied('Invalid attachment inventory');
 const defaults=initialWeaponConfiguration(previous.weapon).slots;
 // Return all detached paid parts first. Replacement may consume one of
 // those *same* items, but no item can ever be returned twice.
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const old=previous.slots[slot];
  if(old===next.slots[slot]||old===defaults[slot])continue;
  const price=attachmentPrice(old);
  if(price<0)return denied('Unknown removed accessory '+old);
  if(price===0)continue;
  const available=values[old]??0;
  if(available>=999)return denied('Attachment stock capacity would be exceeded');
  values[old]=available+1;
 }
 const purchases:AttachmentAcquisition[]=[];
 let cost=0;
 for(const slot of WEAPON_ATTACHMENT_SLOTS){
  const id=next.slots[slot];
  if(id===previous.slots[slot])continue;
  const price=attachmentPrice(id);
  if(price<0)return denied('Unknown inventory attachment '+id);
  if(price===0)continue;
  if((values[id]??0)>0){values[id]--;continue;}
  if(!mayPurchase)return denied('Attachment unavailable in owned stock: '+id);
  purchases.push({partId:id,price});cost+=price;
 }
 if(Object.values(values).some(n=>!bounded(n)))
  return denied('Attachment stock capacity would be exceeded');
 return {valid:true,canCommit:cost<=funds,
  ...(cost>funds?{reason:'Insufficient credits'}:{}),
  cost,purchases,stockAfter:values};
}

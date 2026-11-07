/** R14c — keep equipment authorization messages truthful and short.
 * The quote remains owned by the Campaign/Quick Play adapter; this is UI only.
 */
export interface ArsenalApplyQuote{
 valid:boolean;canCommit?:boolean;cost?:number;reason?:string;changesClass?:boolean;
}
export function arsenalApplyMessage(quote:ArsenalApplyQuote):string{
 if(!quote.valid||quote.canCommit===false){
  return (quote.reason??'Cannot equip this build')+
   (quote.cost&&quote.cost>0?' · '+quote.cost+' CR total':'');
 }
 if(quote.changesClass)
  return 'WEAPON CLASS CHANGE · Loaded and spare magazines will reset on Apply';
 if(quote.cost&&quote.cost>0)
  return 'READY TO EQUIP · '+quote.cost+' CR on Apply';
 return 'READY TO EQUIP · NO PURCHASE NEEDED';
}

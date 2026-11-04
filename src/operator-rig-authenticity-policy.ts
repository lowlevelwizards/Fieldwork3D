/** RIG-R7: visual identity and documented textile availability by actual
 * equipment CUT, not just the generic "gear"/"armor" channel. Source notes:
 * docs/operator-rig-r7-reference-and-compatibility-audit.md.
 * This policy is COSMETIC: do not mutate combat inventory/protection.
 */
import type {GarmentSolidId} from './operator-garment-color-policy.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
export type VisualTextile={
 signature:{solid:GarmentSolidId;print?:HeadwearCamoId};
 solids:readonly GarmentSolidId[];
 prints:readonly HeadwearCamoId[];
 rationale:string;
};
export const RIG_VISUAL_TEXTILES:Readonly<Record<string,VisualTextile>>={
 'no-rig':{signature:{solid:'olive-drab'},solids:[],prints:[],
  rationale:'No textile exposed'},
 'micro-rig':{
  signature:{solid:'ranger-green'},
  solids:['ranger-green','coyote','black','olive-drab','forest-green','foliage',
   'khaki','tan','charcoal'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'woodland-dpm','flecktarn','australian-dpcu'],
  rationale:'Modern compact modular chest chassis, broad commercial color range'
 },
 'chest-placard':{
  signature:{solid:'coyote'},
  solids:['coyote','ranger-green','black','olive-drab','khaki','tan',
   'forest-green','foliage','charcoal'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'woodland-dpm','flecktarn'],
  rationale:'Modern detachable three-magazine front panel; nylon and commercial prints'
 },
 'light-rig':{
  signature:{solid:'olive-drab'},
  solids:['olive-drab','field-green','forest-green','ranger-green',
   'coyote','tan','black'],
  prints:['m81-woodland','multicam','scorpion-w2','woodland-dpm','british-mtp'],
  rationale:'Classic four-cell X harness with documented modern reproductions'
 },
 'chicom-rig':{
  signature:{solid:'field-green'},
  solids:['field-green','olive-drab','forest-green','khaki','tan'],
  prints:[],
  rationale:'Type 56 green/khaki cotton canvas, three tall center toggle cells'
 },
 'bandolier':{
  signature:{solid:'khaki'},
  solids:['khaki','olive-drab','field-green','tan','coyote','black'],
  prints:['multicam','m81-woodland'],
  rationale:'Plain canvas crossbody kit; modern replacement/reproduction variants'
 },
 'split-front':{
  signature:{solid:'ranger-green',print:'multicam'},
  solids:['ranger-green','coyote','black','olive-drab','tan','khaki'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'woodland-dpm'],
  rationale:'Two MOLLE wings and central opening, current modular printed nylon'
 },
 'full-chest':{
  signature:{solid:'forest-green'},
  solids:['forest-green','ranger-green','olive-drab','coyote','tan',
   'black','khaki'],
  prints:['multicam','m81-woodland','scorpion-w2','british-mtp',
   'woodland-dpm','ucp'],
  rationale:'Large modern/surplus patrol bib with broad front admin face'
 },
 'lbv':{
  signature:{solid:'olive-drab',print:'m81-woodland'},
  solids:['olive-drab','forest-green','field-green','ranger-green','coyote',
   'black'],
  prints:['m81-woodland','woodland-dpm','multicam'],
  rationale:'US LBV-88 woodland fabric and olive green nylon, padded twin yokes'
 },
 'field-webbing':{
  signature:{solid:'olive-drab',print:'woodland-dpm'},
  solids:['olive-drab','field-green','forest-green','khaki',
   'ranger-green','coyote','black'],
  prints:['woodland-dpm','m81-woodland','british-mtp',
   'east-german-strichtarn','swedish-m90','australian-dpcu',
   'russian-flora','multicam'],
  rationale:'PLCE-style DPM belt pouches and yoke, plus documented national load kits'
 },
 'sadf-webbing':{
  signature:{solid:'nutria-brown'},
  solids:['nutria-brown','brown','olive-drab','khaki','coyote'],
  prints:[],
  rationale:'Original SADF P83 battle jacket is Nutria Brown; solids beyond it are reproduction/fantasy'
 },
 // Retired style retained solely for old saved appearances.
 'belt-harness':{
  signature:{solid:'olive-drab'},
  solids:['olive-drab','field-green'],prints:[],
  rationale:'Retired visual style is migrated to field-webbing'
 }
};
export const ARMOR_VISUAL_TEXTILES:Readonly<Record<string,VisualTextile>>={
 'armor-bare':{signature:{solid:'olive-drab'},solids:[],prints:[],
  rationale:'No external armor textile'},
 'soft-slick':{
  signature:{solid:'khaki'},
  solids:['black','charcoal','slate','khaki','tan','off-white'],
  prints:[],
  rationale:'Concealed armor kept under garments; no patterned exterior'
 },
 'soft-paca':{
  signature:{solid:'khaki'},
  solids:['black','charcoal','slate','khaki','tan','off-white'],
  prints:[],
  rationale:'Concealed armor has no visible military patterned cover'
 },
 'soft-vest':{
  signature:{solid:'black'},
  solids:['black','charcoal','slate','ranger-green','olive-drab','coyote'],
  prints:['m81-woodland'],
  rationale:'Police/external tactical ballistic vest; mostly dark solid outer covers'
 },
 'soft-flak':{
  signature:{solid:'olive-drab'},
  solids:['olive-drab','forest-green','field-green','khaki','tan','coyote'],
  prints:['m81-woodland','three-color-desert'],
  rationale:'Historic flak/fragmentation outer covers in OD, woodland and DCU'
 },
 'plate-slick':{
  signature:{solid:'ranger-green'},
  solids:['ranger-green','black','charcoal','coyote','khaki','tan',
   'olive-drab','foliage'],
  prints:['multicam','m81-woodland','scorpion-w2','ucp','british-mtp'],
  rationale:'Low-profile plate bags; limited commercially available cover prints'
 },
 'plate-jpc':{
  signature:{solid:'ranger-green',print:'multicam'},
  solids:['ranger-green','coyote','black','olive-drab','khaki','tan'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'woodland-dpm','australian-dpcu'],
  rationale:'Modern skeletonized MOLLE carrier, many fabric/print options'
 },
 'plate-standard':{
  signature:{solid:'coyote'},
  solids:['coyote','ranger-green','black','olive-drab','khaki','tan',
   'forest-green','foliage','charcoal'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'flecktarn','woodland-dpm','finnish-m05','polish-pantera',
   'russian-emr','russian-flora','pla-xingkong','italian-vegetato',
   'desert-tropentarn','cadpat-tw','australian-dpcu'],
  rationale:'Modern overt textile carrier with genuine national/commercial covers'
 },
 'plate-heavy':{
  signature:{solid:'black'},
  solids:['coyote','ranger-green','black','olive-drab','khaki','tan',
   'forest-green','foliage'],
  prints:['multicam','scorpion-w2','m81-woodland','ucp','british-mtp',
   'finnish-m05','russian-emr','pla-xingkong','australian-dpcu'],
  rationale:'Heavy overt contemporary carrier, mostly coherent modern issue prints'
 },
 'plate-legacy':{
  signature:{solid:'olive-drab',print:'m81-woodland'},
  solids:['olive-drab','forest-green','khaki','tan','coyote','black'],
  prints:['m81-woodland','three-color-desert','ucp'],
  rationale:'Legacy broad cover carrier: woodland/DCU and early universal-cover variants'
 }
};
export function rigSignature(style:string):VisualTextile['signature']{
 return RIG_VISUAL_TEXTILES[style]?.signature??{solid:'olive-drab'};
}
/** Every armor has a distinct, reference-guided default separate from
 * terrain matching. Manual compatible solid/print selections always win.
 * 'armor-bare' is only a sentinel and never paints visible shell geometry.
 */
export function armorSignature(style:string):VisualTextile['signature']{
 return ARMOR_VISUAL_TEXTILES[style]?.signature??{solid:'olive-drab'};
}
export function validRigSolid(style:string,id:GarmentSolidId):boolean{
 return !!RIG_VISUAL_TEXTILES[style]?.solids.includes(id);
}
export function validRigPrint(style:string,id:HeadwearCamoId):boolean{
 return !!RIG_VISUAL_TEXTILES[style]?.prints.includes(id);
}
export function validArmorSolid(style:string,id:GarmentSolidId):boolean{
 return !!ARMOR_VISUAL_TEXTILES[style]?.solids.includes(id);
}
export function validArmorPrint(style:string,id:HeadwearCamoId):boolean{
 return !!ARMOR_VISUAL_TEXTILES[style]?.prints.includes(id);
}
/** Mounting interface is not an instruction to remove a standalone
 * harness on an older shell that merely happens to contain armor.
 */
export const PLACARD_RECEIVERS=new Set(['plate-jpc','plate-standard','plate-heavy']);
export const CONVERTIBLE_RIGS=new Set(['micro-rig','chest-placard']);
export type RigArmorAssessment={
 mode:'standalone'|'plate-placard';
 fit:'usual'|'possible'|'caution';
 reason:string;
};
export function assessRigArmor(rig:string,armor:string):RigArmorAssessment{
 if(CONVERTIBLE_RIGS.has(rig)&&PLACARD_RECEIVERS.has(armor))
  return {mode:'plate-placard',fit:'usual',
   reason:'Detachable front module seated on compatible carrier attachment points'};
 if(rig==='no-rig')return {mode:'standalone',fit:'usual',reason:'No rig'};
 if((rig==='sadf-webbing'||rig==='lbv'||rig==='full-chest')&&
  (armor==='plate-heavy'||armor==='plate-legacy'))
  return {mode:'standalone',fit:'caution',
   reason:'Large full-torso equipment competes with high armor collars and wide shoulder bags'};
 if(armor==='soft-slick'||armor==='soft-paca'||armor==='armor-bare')
  return {mode:'standalone',fit:'usual',
   reason:'The independent rig bears on the actual garment, not concealed armor'};
 return {mode:'standalone',fit:'possible',
  reason:'Independent harness fits around external armor; no placard interface assumed'};
}

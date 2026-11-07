/** Arsenal R15a — verified, authored finish variants of the SAME silhouette.
 * No invented colors, arbitrary recoloring, or changed persisted weapon IDs.
 * Every swatch points to a preexisting real geometry/material part ID.
 * Different-magazine feeds and structurally distinct stocks are excluded.
 */
import {FAMILY_PARTS,type FamilyPartSlot} from '../equipment-weapon-families.ts';
export interface ArsenalFinishOption{
 partId:string;label:string;hex:string;
}
export interface ArsenalFinishFamily{
 slot:FamilyPartSlot;physicalId:string;name:string;
 options:readonly ArsenalFinishOption[];
}
type Entry=[string,string,string];
const group=(slot:FamilyPartSlot,name:string,items:readonly Entry[]):ArsenalFinishFamily=>({
 slot,physicalId:items[0][0],name,
 options:items.map(([partId,label,hex])=>({partId,label,hex}))
});
export const ARSENAL_FINISH_FAMILIES:readonly ArsenalFinishFamily[]=[
 group('grip','Polymer Grip',[
  ['ar-grip-poly','Black','343e37'],['ar-grip-poly-fde','FDE','95836b']]),
 group('stock','Wood Fixed',[
  ['ak-wood','Dark Wood','79553b'],['ak-wood-amber','Honey Birch','a07842'],
  ['ak-wood-red','Red Lacquer','915038']]),
 group('stock','AK-74 Fixed',[
  ['ak-wood74','Dark Wood','79553b'],['ak-wood74-amber','Honey Birch','a07842'],
  ['ak-wood74-red','Red Lacquer','915038'],['ak-wood74-plum','Plum Polymer','4e3b4c']]),
 group('stock','Polymer Sidefolder',[
  ['ak-sidefold','Black Polymer','354038'],['ak-sidefold-plum','Plum Polymer','4e3b4c']]),
 group('stock','RPK Clubfoot',[
  ['ak-rpk-clubfoot','Dark Wood','79553b'],['ak-rpk-clubfoot-amber','Honey Birch','a07842'],
  ['ak-rpk-clubfoot-red','Red Lacquer','915038']]),
 group('grip','Wood Grip',[
  ['ak-grip-wood','Dark Wood','79553b'],['ak-grip-wood-amber','Honey Birch','a07842'],
  ['ak-grip-wood-red','Red Lacquer','915038']]),
 group('grip','Polymer Grip',[
  ['ak-grip-poly','Black Polymer','354038'],['ak-grip-poly-plum','Plum Polymer','4e3b4c']]),
 group('handguard','Rifle Wood',[
  ['ak-wood-long','Dark Wood','79553b'],['ak-wood-long-amber','Honey Birch','a07842'],
  ['ak-wood-long-red','Red Lacquer','915038']]),
 group('handguard','Compact Wood',[
  ['ak-wood-short','Dark Wood','79553b'],['ak-wood-short-amber','Honey Birch','a07842'],
  ['ak-wood-short-red','Red Lacquer','915038']]),
 group('handguard','RPK Wood',[
  ['ak-rpk-wood','Dark Wood','79553b'],['ak-rpk-wood-amber','Honey Birch','a07842'],
  ['ak-rpk-wood-red','Red Lacquer','915038']]),
 group('handguard','Rifle Polymer',[
  ['ak-poly-long','Black Polymer','354038'],['ak-poly-plum-long','Plum Polymer','4e3b4c']]),
 group('handguard','Carbine Polymer',[
  ['ak-poly-mid','Black Polymer','354038'],['ak-poly-plum-mid','Plum Polymer','4e3b4c']]),
 group('handguard','Compact Polymer',[
  ['ak-poly-short','Black Polymer','354038'],['ak-poly-plum-short','Plum Polymer','4e3b4c']]),
 group('stock','HK33 Fixed',[
  ['hk33-fixed-stock','OD Polymer','60694e'],['hk33-fixed-stock-black','Black Polymer','303433']]),
 group('handguard','HK33 Slim',[
  ['hk33-poly-slim','OD Polymer','60694e'],['hk33-poly-slim-black','Black Polymer','303433']]),
 group('handguard','HK53 Compact',[
  ['hk53-poly-short','OD Polymer','60694e'],['hk53-poly-short-black','Black Polymer','303433']]),
];
const byPart=new Map<string,ArsenalFinishFamily>();
for(const family of ARSENAL_FINISH_FAMILIES)
 for(const option of family.options)byPart.set(option.partId,family);
export function arsenalFinishFamily(id:string):ArsenalFinishFamily|undefined{
 return byPart.get(id);
}
/** Preserve true model identity and avoid duplicate silhouettes in the parts grid. */
export function arsenalPhysicalPartId(id:string):string{
 return byPart.get(id)?.physicalId??id;
}
export function arsenalFinishOption(id:string):ArsenalFinishOption|undefined{
 return byPart.get(id)?.options.find(option=>option.partId===id);
}
/** A finish can be shown only for an authored part matching the same slot. */
export function validArsenalFinishTaxonomy():string[]{
 const problems:string[]=[],seen=new Set<string>();
 for(const group of ARSENAL_FINISH_FAMILIES){
  const base=FAMILY_PARTS[group.physicalId];
  if(!base||base.slot!==group.slot)problems.push('Invalid physical base '+group.physicalId);
  if(group.options.length<2)problems.push('Single swatch group '+group.physicalId);
  for(const opt of group.options){
   const part=FAMILY_PARTS[opt.partId];
   if(!part||part.slot!==group.slot||part.family!==base?.family)
    problems.push('Wrong family/slot '+opt.partId);
   if(seen.has(opt.partId))problems.push('Duplicate finish '+opt.partId);
   seen.add(opt.partId);
   if(!/^[0-9a-f]{6}$/.test(opt.hex))problems.push('Invalid swatch '+opt.partId);
   // Only cosmetic variants: physical contact, feed and length stay stable.
   if(part&&base&&
     (part.stockX!==base.stockX||part.feed!==base.feed||
      part.length!==base.length||part.role!==base.role))
    problems.push('Changed physical envelope '+opt.partId);
  }
 }
 return problems;
}

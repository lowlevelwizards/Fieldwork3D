/** Functional room contracts: explicit essential furnishings and plausible substitutes.
 * Evaluated per connected zone, not per rectangular decomposition cell.
 * These contracts are diagnostics until the furnishing solver can guarantee them.
 */
import type {Site} from '../breach-site.ts';

export type RoomContract={
  /** Every group requires at least one item; names within a group are alternatives. */
  required:readonly (readonly string[])[];
  expected:readonly string[];
  optional:readonly string[];
};
const contract=(required:readonly (readonly string[])[],expected:string[]=[],optional:string[]=[]):RoomContract=>
  ({required,expected,optional});
export const ROOM_CONTRACTS:Readonly<Record<string,RoomContract>>={
 studio:contract([['bed'],['sofa','armchair']],['nightstand','dresser'],['desk']),
 living:contract([['sofa','armchair']],['coffee-table','tv-stand'],['bookcase','plant']),
 dining:contract([['dining-table']],['chair'],['cabinet']),
 foyer:contract([['entry-bench','shoe-cubby']],['coat-rack'],[]),
 vestibule:contract([['entry-bench','coat-rack']],[],[]),
 mudroom:contract([['shoe-cubby','entry-bench']],['coat-rack'],[]),
 kitchen:contract([['counter','kitchen-island','prep-table'],['fridge'],['stove','microwave','commercial-range'],['sink','dish-station']],['cabinet'],['dining-table']),
 bedroom:contract([['bed']],['nightstand','dresser'],['wardrobe','desk']),
 guest:contract([['bed']],['nightstand','dresser'],['chair']),
 bathroom:contract([['toilet'],['sink'],['shower','bathtub']],['cabinet'],['bath-mat']),
 restroom:contract([['toilet'],['sink']],['cabinet'],[]),
 'half-bath':contract([['toilet'],['sink']],['cabinet'],[]),
 closet:contract([['shelf','wardrobe','coat-rack']],['box'],[]),
 'utility-closet':contract([['shelf','cabinet']],['cleaning-cart'],[]),
 study:contract([['desk']],['chair','bookcase'],[]),
 'garage-storage':contract([['shelf','rack']],['tire-stack'],['crate']),
 laundry:contract([['laundry-machine']],['shelf'],['sink']),
 utility:contract([['shelf','cabinet']],[],['generator']),
 sales:contract([['gondola-shelf','wall-shelf','display-rack']],['display-rack'],['cooler']),
 checkout:contract([['transaction-counter','checkout']],['cash-register'],['display-rack']),
 stockroom:contract([['rack','shelf']],['box','crate'],[]),
 pantry:contract([['shelf']],['box'],[]),
 office:contract([['desk']],['office-chair','filing-cabinet'],['computer','printer']),
 reception:contract([['reception-desk','desk','counter']],['office-chair'],['papers']),
 cubicles:contract([['desk']],['office-chair','filing-cabinet'],['computer']),
 meeting:contract([['meeting-table']],['chair','office-chair'],[]),
 break:contract([['counter','dining-table']],['chair'],['fridge']),
 lobby:contract([['desk','armchair','chair']],['chair'],['plant']),
 storage:contract([['shelf','rack','crate']],['box'],[]),
 bay:contract([['vehicle-lift','workbench']],['tool-chest'],['tire-stack']),
 workshop:contract([['workbench']],['tool-chest'],['compressor']),
 parts:contract([['parts-counter','rack','shelf']],['crate','parts-bin','tire-stack'],[]),
 loading:contract([['pallet','crate']],['rack'],[]),
 aisle:contract([['rack']],[],['pallet']),
 packing:contract([['workbench','packing-station']],['box'],['cart']),
 equipment:contract([['generator','tank','control-panel']],['control-panel'],[]),
 control:contract([['control-panel']],['desk'],[]),
 service:contract([['rack','cart','workbench']],['cart'],[]),
 maintenance:contract([['workbench']],['shelf'],[]),
 waiting:contract([['chair','armchair']],['bench'],['plant']),
 exam:contract([['exam-bed'],['handwash-station','sink']],['cabinet','instrument-cart'],['cart']),
 treatment:contract([['exam-bed'],['handwash-station','sink']],['instrument-cart','cabinet'],['cart']),
 staff:contract([['desk','locker']],['chair'],[]),
 supply:contract([['shelf','cabinet']],['cart'],[]),
 hallway:contract([],[],[])
};
export type RoomContractResult={
 zoneId:string;roomIds:string[];purpose:string;
 present:string[];missing:string[][];missingExpected:string[];
 complete:boolean;
};
export function assessRoomContracts(site:Pick<Site,'rooms'|'cover'>):RoomContractResult[]{
 const zones=new Map<string,typeof site.rooms>();
 for(const r of site.rooms){
  if(r.kind==='hall')continue;
  const id=r.zoneId??r.id;
  const group=zones.get(id)??[];
  group.push(r);zones.set(id,group);
 }
 return [...zones].map(([zoneId,rooms])=>{
  const purpose=rooms[0]?.purpose??'storage';
  const contract=ROOM_CONTRACTS[purpose]??ROOM_CONTRACTS.storage;
  const present=[...new Set(site.cover.filter(o=>o.fixture&&o.fixture!=='window-sill'&&o.fixture!=='glass-barrier'&&
    rooms.some(r=>o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h))
    .map(o=>o.fixture!))];
  const missing=contract.required.filter(group=>!group.some(id=>present.includes(id)))
    .map(group=>[...group]);
  const missingExpected=contract.expected.filter(id=>!present.includes(id));
  return {zoneId,roomIds:rooms.map(r=>r.id),purpose,present,missing,missingExpected,
   complete:missing.length===0};
 });
}

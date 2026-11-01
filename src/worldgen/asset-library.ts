/** MAP 01: Discoverable registry for every environmental asset used by maps.
 * Tactical rules continue to own collision; the library is metadata only.
 */
import {propCatalog, type PropDefinition} from './asset-catalog.ts';
import {CANONICAL_ASSET_DIMENSIONS} from './world-scale.ts';
import {DETAILED_FIXTURE_IDS} from './detailed-fixture-visuals.ts';

export type AssetLibraryEntry = {
  id:string; label:string; category:string; origin:'fixture'|'dressing'|'structure';
  width:number; depth:number; height:number; cover:'none'|'low'|'high';
  solid:boolean; rooms:readonly string[];
  presentation:'bespoke'|'shared-shape'|'architectural';
};
const names:Readonly<Record<string,string>> = {
  'tv-stand':'Television stand', 'exam-bed':'Examination bed',
  'gondola-shelf':'Retail gondola shelf','vehicle-lift':'Vehicle lift',
  'tire-stack':'Stacked tires','picture-frame':'Picture frame',
  'cash-register':'Cash register','filing-cabinet':'Filing cabinet',
  'shipping-container':'Shipping container','wall-shelf':'Wall shelf',
  'kitchen-island':'Kitchen island','laundry-machine':'Washing machine',
};
const label=(id:string)=>names[id]??id.split('-').map(
  word=>word[0]?.toUpperCase()+word.slice(1)).join(' ');
// These have a purpose-built branch in the live tactical renderer.
// Shared-shape objects are still listed: the lab is meant to expose weak art.
const bespoke = new Set([
  'bed','exam-bed','desk','counter','workbench','cart','dining-table',
  'coffee-table','meeting-table','fridge','cooler','wardrobe','locker',
  'filing-cabinet','stove','microwave','kitchen-island','sink','checkout',
  'toilet','bathtub','shelf','gondola-shelf','wall-shelf','bookcase','rack',
  'cabinet','dresser','laundry-machine','generator','control-panel','tool-chest',
  'vehicle','sedan','pickup','van','suv','chair','bench','sofa','armchair','tv-stand','barrel','tank',
  'tire-stack','vehicle-lift','hedge','bush','tree','tree-broadleaf','tree-conifer','tree-scrub','shrub-round','shrub-tall','plant','fence','pallet',
  'mailbox','trash-bin','bollard','hydrant','utility-cabinet',
  'parking-block','parking-sign','street-lamp','bike-rack','window-boards',
]);
const dressings = ['mug','books','papers','tools','plant','lamp','floor-lamp','packages','rug','bedside-rug','bath-mat','welcome-mat','runner'] as const;
const architecture:readonly AssetLibraryEntry[] = [
  {id:'floor',label:'Floor slab',width:80,depth:80,height:2,category:'Structure'},
  {id:'wall',label:'Interior wall',width:80,depth:9,height:40,category:'Structure'},
  {id:'wall-cap',label:'Wall cap',width:80,depth:11,height:2,category:'Structure'},
  {id:'baseboard',label:'Wall skirting',width:80,depth:12,height:4,category:'Structure'},
  {id:'window',label:'Glazed window and sill',width:52,depth:9,height:40,category:'Openings'},
  {id:'window:standard',label:'Standard divided window',width:52,depth:9,height:40,category:'Openings'},
  {id:'window:tall',label:'Tall glazed window',width:52,depth:9,height:40,category:'Openings'},
  {id:'window:picture',label:'Fixed picture window',width:52,depth:9,height:40,category:'Openings'},
  {id:'window:bay',label:'Bay-front window',width:52,depth:9,height:40,category:'Openings'},
  {id:'window:industrial',label:'Industrial divided glazing',width:52,depth:9,height:40,category:'Openings'},
  {id:'door',label:'Hinged door and frame',width:48,depth:12,height:40,category:'Openings'},
  {id:'door:wood',label:'Wood door',width:48,depth:12,height:40,category:'Openings'},
  {id:'door:steel',label:'Steel door',width:48,depth:12,height:40,category:'Openings'},
  {id:'door:reinforced',label:'Reinforced steel door',width:48,depth:12,height:40,category:'Openings'},
  {id:'door:exit',label:'Emergency exit door',width:48,depth:12,height:40,category:'Openings'},
  {id:'shutter',label:'Industrial shutter and frame',width:96,depth:12,height:45,category:'Openings'},
  {id:'arch',label:'Archway',width:72,depth:10,height:40,category:'Openings'},
  {id:'wall-detail:poster',label:'Poster',width:24,depth:1,height:16,category:'Wall Details'},
  {id:'wall-detail:picture',label:'Picture',width:22,depth:1,height:16,category:'Wall Details'},
  {id:'wall-detail:noticeboard',label:'Noticeboard',width:26,depth:2,height:16,category:'Wall Details'},
  {id:'wall-detail:light-switch',label:'Light Switch',width:5,depth:1.3,height:3,category:'Wall Details'},
  {id:'wall-detail:electrical-box',label:'Electrical Box',width:16,depth:3,height:16,category:'Wall Details'},
  {id:'wall-detail:breaker-panel',label:'Breaker Panel',width:16,depth:3,height:19,category:'Wall Details'},
  {id:'wall-detail:exit-sign',label:'Exit Sign',width:17,depth:1.3,height:7,category:'Wall Details'},
].map(item=>({...item,origin:'structure' as const,cover:'none' as const,
  solid:false,rooms:[] as readonly string[],presentation:'architectural' as const}));
const fromProp=(item:PropDefinition):AssetLibraryEntry=>({
  id:item.id,label:label(item.id),category:item.category,
  origin:'fixture',width:item.width,depth:item.depth,height:item.height,
  cover:item.cover,solid:item.solid,rooms:item.rooms,
  presentation:bespoke.has(item.id)||DETAILED_FIXTURE_IDS.has(item.id)?'bespoke':'shared-shape',
});
export function assetLibrary():readonly AssetLibraryEntry[]{
  const props=propCatalog().map(fromProp);
  // Decorative detail geometry is spawned separately from fixture geometry,
  // so it gets its own labeled entry even if the names overlap.
  const details:AssetLibraryEntry[]=dressings.map(id=>({
    id:'detail:'+id,label:label(id)+' (decoration)',category:'Detail',
    origin:'dressing',width:12,depth:12,height:12,cover:'none',
    solid:false,rooms:[],presentation:'bespoke',
  }));
  return [...architecture,...props,...details];
}
export function assetLibraryCategories():readonly string[]{
  return [...new Set(assetLibrary().map(item=>item.category))];
}
export function assetLibraryProblems():string[]{
  const entries=assetLibrary(),seen=new Set<string>(),issues:string[]=[];
  for(const item of entries){
    if(seen.has(item.id))issues.push('Duplicate asset: '+item.id);
    seen.add(item.id);
    if([item.width,item.depth,item.height].some(n=>!Number.isFinite(n)||n<=0))
      issues.push('Invalid dimensions: '+item.id);
    if(item.origin==='fixture'&&!CANONICAL_ASSET_DIMENSIONS[item.id])
      issues.push('Unscaled fixture: '+item.id);
    if(item.origin==='fixture'&&item.rooms.length===0)
      issues.push('No allowed rooms: '+item.id);
  }
  return issues;
}

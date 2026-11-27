/** FT1.1: real-world reference identities, never the gameplay equipment catalog.
 * A visual proxy cannot change the identity or provenance of historical gear.
 */
import {FT12_HISTORICAL_EQUIPMENT} from './faction-reference-equipment-ft1-2.ts';
export type HistoricalEquipmentCategory='weapon'|'headwear'|'uniform'|'armor'|'carriage'|'footwear'|'other';
export type HistoricalModelMapping={
 kind:'weapon-preset'|'wardrobe-style'|'camouflage'|'equipment';
 id:string;
 fidelity:'exact'|'representative'|'proxy';
 note:string;
};
export type HistoricalEquipment={
 id:string;name:string;category:HistoricalEquipmentCategory;familyId?:string;
 variantOf?:string;description:string;model?:HistoricalModelMapping;
};
const record=(id:string,name:string,category:HistoricalEquipmentCategory,
 description:string,model?:HistoricalModelMapping):HistoricalEquipment=>
 ({id,name,category,description,model});
const camo=(id:string,note:string):HistoricalModelMapping=>
 ({kind:'camouflage',id,fidelity:'representative',note});
const weapon=(id:string,fidelity:'exact'|'representative'|'proxy',note:string):HistoricalModelMapping=>
 ({kind:'weapon-preset',id,fidelity,note});
const style=(id:string,fidelity:'exact'|'representative'|'proxy',note:string):HistoricalModelMapping=>
 ({kind:'wardrobe-style',id,fidelity,note});
export const HISTORICAL_EQUIPMENT:readonly HistoricalEquipment[]=[
 record('us-bdu-m81','US woodland Battle Dress Uniform (M81)','uniform',
  'Woodland BDU appearance reference.',camo('m81-woodland','Pattern representation; complete garment cut not certified.')),
 record('us-sixcolor-dbd','US six-color desert Battle Dress Uniform','uniform',
  'Six-color desert BDU appearance reference.',camo('six-color-desert','Pattern representation only.')),
 record('us-dcu-three','US three-color Desert Combat Uniform','uniform',
  'Three-color desert BDU/DCU appearance.',camo('three-color-desert','Pattern representation only.')),
 record('us-acu-ucp','US Army Combat Uniform in UCP','uniform',
  'Army Combat Uniform with Universal Camouflage Pattern.',camo('ucp','Fabric pattern approximation, not a verified uniform cut.')),
 record('us-fracu-oefcp','US Army OEF-CP flame resistant ACU','uniform',
  'Afghanistan theater pattern used during OEF; distinct from later Scorpion W2 OCP.'),
 record('us-acu-ocp','US Army Combat Uniform in OCP','uniform',
  'Operational Camouflage Pattern ACU.',camo('scorpion-w2','Scorpion W2 visual pattern; actual garment varies by year.')),
 record('us-pasgt','US PASGT helmet','headwear',
  'Personnel Armor System for Ground Troops helmet.',style('pasgt','representative','Modeled PASGT-family appearance; configuration varies.')),
 record('us-ach','US Advanced Combat Helmet','headwear',
  'Advanced Combat Helmet.',style('ach','representative','General ACH profile; detailed variants vary.')),
 record('us-interceptor-otv','US Interceptor Outer Tactical Vest','armor',
  'Interceptor body armor outer vest with optional protective inserts.',
  style('plate-legacy','proxy','Legacy visual armor stand-in, not an exact OTV model.')),
 record('us-m16a2','M16A2 service rifle','weapon','US 5.56 mm M16A2.',
  weapon('ar-m16a2','exact','Authored M16A2 preset; technical issue variations not modeled.')),
 record('usmc-marpat-wood','USMC woodland MARPAT combat utility uniform','uniform',
  'USMC woodland MARPAT uniform.',camo('woodland-marpat','Pattern represented; historical garment details may vary.')),
 record('usmc-marpat-desert','USMC desert MARPAT combat utility uniform','uniform',
  'USMC desert MARPAT uniform.',camo('desert-marpat','Pattern represented; historical garment details may vary.')),
 record('usmc-lwh','USMC Lightweight Helmet (LWH)','headwear',
  'Marine Corps Lightweight Helmet.',style('pasgt','proxy','PASGT profile is a stand-in; no dedicated LWH mesh.')),
 record('usmc-mtv','USMC Modular Tactical Vest','armor',
  'USMC modular protective vest.',style('plate-legacy','proxy','Existing broad plate armor is not the dedicated MTV.')),
 record('uk-mtp','British Multi-Terrain Pattern combat uniform','uniform',
  'British MTP field uniform.',camo('british-mtp','Pattern representation; not uniform-cut authenticity.')),
 record('uk-osprey','British Osprey body armour','armor',
  'British Osprey protective vest, variant-specific issue.',
  style('plate-legacy','proxy','Generic broad armor not a dedicated Osprey model.')),
 record('uk-sa80','British SA80 service rifle family','weapon',
  'SA80 family rifle; the exact L85 variant must be separately verified.',
  weapon('ar-m16a2','proxy','AR-15 model is not a genuine SA80/ L85.')),
 record('ddr-m56','East German NVA Stahlhelm M56','headwear',
  'East German National People’s Army steel helmet.',
  style('ddr-m56','representative','Dedicated stylized M56 silhouette; historical wear details vary.')),
 record('ddr-strichtarn','East German NVA Strichtarn field uniform','uniform',
  'Strichtarn field dress used by the East German NVA.',
  camo('east-german-strichtarn','Pattern represented; garment cut not certified.')),
 record('us-ocp-coyote-boots','US Army coyote brown combat boots','footwear',
  'Coyote brown boots authorized for OCP and OEF-CP during the transition. Exact boot model and manufacturer are not established.'),
 record('us-ocp-tan499-belt','US Army Tan 499 trouser belt','carriage',
  'Uniform trouser belt; not a tactical battle belt or holster platform.'),
 record('usmc-mccb','Marine Corps Combat Boots (MCCB)','footwear',
  'Marine Corps combat boot family, with hot-weather and temperate-weather variants.'),
 ...FT12_HISTORICAL_EQUIPMENT
];
export const historicalEquipment=(id:string):HistoricalEquipment|undefined=>
 HISTORICAL_EQUIPMENT.find(x=>x.id===id);

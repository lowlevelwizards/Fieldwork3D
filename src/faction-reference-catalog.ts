/** Curated real-world *appearance references*, not playable factions or combat doctrine.
 * Every entry is a dated visual interpretation. Missing signature assets are
 * recorded openly; a generic substitute is never asserted to be authentic.
 */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {GarmentSolidId} from './operator-garment-color-policy.ts';
import type {HeadwearSolidColorId} from './operator-headwear-colors.ts';
import type {LoadoutSlot} from './equipment-loadouts.ts';
import type {WardrobeSlot,SleeveState,TrouserHem} from './operator-wardrobe-data.ts';

export type ReferenceOrganization='military'|'special-operations'|'police'|'irregular';
export type ReferenceEnvironment='woodland'|'desert'|'urban'|'mixed';
export type ReferenceGap={id:string;label:string;importance:'defining'|'significant'|'minor'};
export type FactionReference={
 id:string;name:string;country:string;organization:ReferenceOrganization;
 environment:ReferenceEnvironment;era:{start:number;end:number;label:string};
 summary:string;baseRecipeId:string;uniformCamo?:HeadwearCamoId;
 uniformSolid?:GarmentSolidId;
 styles?:Partial<Record<WardrobeSlot,string>>;
 kit?:Partial<Record<LoadoutSlot,string>>;
 headwearColor?:HeadwearSolidColorId;
 gearSolid?:GarmentSolidId;
 sleeveState?:SleeveState;trouserHem?:TrouserHem;
 weaponFamily:string;sourceNotes:string;
 gaps:readonly ReferenceGap[];
};
const gap=(id:string,label:string,importance:ReferenceGap['importance']='significant'):ReferenceGap=>
 ({id,label,importance});
const patch=gap('unit-insignia','National, unit and service identification','defining');
const weapon=(id:string,label:string)=>gap(id,label);
export const FACTION_REFERENCES:readonly FactionReference[]=[
 {id:'usmc-woodland-2005',name:'US Marine Corps · Woodland',country:'United States',
 organization:'military',environment:'woodland',era:{start:2004,end:2020,label:'2000s–2010s'},
 summary:'MARPAT utility uniform with predominantly coyote equipment.',
 baseRecipeId:'acu-patrol',uniformCamo:'woodland-marpat',
 styles:{headwear:'ach',top:'acu-shirt',trousers:'acu-trousers',armorStyle:'plate-standard',rigStyle:'light-rig'},
 gearSolid:'coyote',weaponFamily:'AR-15 / M16 / M4',
 gaps:[patch,weapon('ar-family','M16/M4-family rifle'),gap('marine-8point','Eight-point utility cover','minor')],
 sourceNotes:'Representative woodland utility outfit; exact armor varies with year and role.'},
 {id:'bundeswehr-flecktarn-2000',name:'Bundeswehr · Flecktarn',country:'Germany',
 organization:'military',environment:'woodland',era:{start:1995,end:2015,label:'1990s–2010s'},
 summary:'Flecktarn field uniform with substantial conventional load carriage.',
 baseRecipeId:'bdu-field',uniformCamo:'flecktarn',
 styles:{headwear:'pasgt',rigStyle:'field-webbing'},gearSolid:'olive-drab',
 weaponFamily:'HK G36',gaps:[patch,weapon('g36-family','G36-family service rifle'),gap('bundeswehr-helmet','German helmet profile')],
 sourceNotes:'General service silhouette, not a specific battalion or deployed theater.'},
 {id:'russian-emr-2015',name:'Russian Army · EMR',country:'Russia',
 organization:'military',environment:'woodland',era:{start:2013,end:2023,label:'2010s–2020s'},
 summary:'EMR digital field uniform with modern protective kit.',
 baseRecipeId:'acu-patrol',uniformCamo:'russian-emr',
 styles:{headwear:'ach',armorStyle:'plate-heavy',rigStyle:'field-webbing'},
 kit:{rig:'rig-full'},gearSolid:'olive-drab',weaponFamily:'AK-74 / AK-12',
 gaps:[patch,weapon('ak-family','AK-family service rifle'),gap('helmet-6b47','6B47/Ratnik helmet','defining'),gap('armor-6b45','6B45 armor','significant')],
 sourceNotes:'Representative modern kit; actual combinations differ substantially by period and unit.'},
 {id:'british-dpm-1995',name:'British Army · Woodland DPM',country:'United Kingdom',
 organization:'military',environment:'woodland',era:{start:1990,end:2008,label:'1990s–2000s'},
 summary:'Woodland DPM windproof smock and field webbing.',
 baseRecipeId:'windproof-smock',uniformCamo:'woodland-dpm',
 kit:{head:'head-helmet'},styles:{headwear:'pasgt',rigStyle:'field-webbing'},gearSolid:'olive-drab',
 weaponFamily:'L85 / SA80',gaps:[patch,weapon('sa80-family','L85/SA80 rifle'),gap('helmet-mk6','British Mk6-style helmet')],
 sourceNotes:'PLCE-style webbing is an approximation of period British field kit.'},
 {id:'nva-strichtarn-1980',name:'East German NVA · Strichtarn',country:'East Germany',
 organization:'military',environment:'woodland',era:{start:1965,end:1990,label:'1960s–1980s'},
 summary:'Raindrop-pattern field uniform, green steel helmet and canvas load carriage.',
 baseRecipeId:'bdu-field',uniformCamo:'east-german-strichtarn',
 kit:{armor:'armor-none'},styles:{headwear:'soviet-steel',armorStyle:'armor-bare',rigStyle:'field-webbing'},
 gearSolid:'olive-drab',weaponFamily:'AKM / AK-74',
 gaps:[patch,weapon('ak-family','AK-family service rifle'),gap('helmet-m56','Characteristic East German M56 helmet','defining')],
 sourceNotes:'Current steel helmet is an admitted silhouette substitute for the NVA M56.'},
 {id:'sadf-nutria-1985',name:'South African SADF · Bush',country:'South Africa',
 organization:'military',environment:'mixed',era:{start:1983,end:1994,label:'1980s–early 1990s'},
 summary:'Plain Nutria-brown field clothing and characteristic P83 battle jacket.',
 baseRecipeId:'bush-webbing',uniformSolid:'nutria-brown',
 kit:{armor:'armor-none'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'sadf-webbing'},
 headwearColor:'coyote-brown',gearSolid:'nutria-brown',weaponFamily:'R4 / Galil',
 gaps:[patch,weapon('galil-family','R4/Galil-family rifle')],
 sourceNotes:'Pattern 83 and Nutria clothing are the defining visual features.'},
 {id:'swedish-m90-2000',name:'Swedish Armed Forces · M90',country:'Sweden',
 organization:'military',environment:'woodland',era:{start:1990,end:2020,label:'1990s–2010s'},
 summary:'Angular M90 camouflage with green load-bearing equipment.',
 baseRecipeId:'bdu-field',uniformCamo:'swedish-m90',
 kit:{armor:'armor-none'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'field-webbing'},
 gearSolid:'olive-drab',weaponFamily:'Ak 5',
 gaps:[patch,weapon('ak5-family','Ak 5 service rifle'),gap('helmet-sweden','Swedish helmet profile','minor')],
 sourceNotes:'Abstracted classic field uniform; specific Swedish garments vary by service date.'},
 {id:'rhodesian-brushstroke-1975',name:'Rhodesian Security Forces · Brushstroke',country:'Rhodesia',
 organization:'military',environment:'woodland',era:{start:1965,end:1979,label:'1960s–1970s'},
 summary:'Brushstroke tropical field dress with simple canvas equipment.',
 baseRecipeId:'irregular-canvas',uniformCamo:'rhodesian-brushstroke',
 kit:{armor:'armor-none',rig:'rig-full'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'field-webbing'},
 sleeveState:'rolled',gearSolid:'khaki',weaponFamily:'FN FAL',
 gaps:[patch,weapon('fal-family','FN FAL/R1 rifle'),gap('tropical-shirt','Short-sleeved tropical field blouse')],
 sourceNotes:'Historical reference only; no endorsement or glorification of the government or conflict.'},
 {id:'ukraine-mm14-2022',name:'Ukrainian Armed Forces · MM-14',country:'Ukraine',
 organization:'military',environment:'mixed',era:{start:2015,end:2026,label:'2010s–2020s'},
 summary:'MM-14 field dress with plausible mixed olive and coyote tactical equipment.',
 baseRecipeId:'acu-patrol',uniformCamo:'ukrainian-mm14',
 styles:{headwear:'ach',armorStyle:'plate-standard',rigStyle:'light-rig'},gearSolid:'olive-drab',
 weaponFamily:'AK / AR families',
 gaps:[patch,weapon('ak-family','AK-family service rifle'),gap('ukraine-identification','Ukrainian field identification')],
 sourceNotes:'Representative appearance, not a claim that every unit uses the same configuration.'},
 {id:'pla-xingkong-2021',name:'Chinese PLA · Xingkong',country:'China',
 organization:'military',environment:'mixed',era:{start:2019,end:2026,label:'2020s'},
 summary:'Modern digital Xingkong uniform with covered helmet and protective gear.',
 baseRecipeId:'acu-patrol',uniformCamo:'pla-xingkong',
 styles:{headwear:'ach',armorStyle:'plate-standard',rigStyle:'full-chest'},
 kit:{rig:'rig-full'},gearSolid:'field-green',weaponFamily:'QBZ-191',
 gaps:[patch,weapon('qbz-family','QBZ-191 rifle'),gap('pla-helmet','PLA modern helmet profile')],
 sourceNotes:'Type 19-inspired woodland/transitional field interpretation.'},
 {id:'swiss-alpenflage-1980',name:'Swiss Army · Alpenflage',country:'Switzerland',
 organization:'military',environment:'woodland',era:{start:1970,end:1995,label:'1970s–1990s'},
 summary:'Distinctive red-accented Alpenflage smock with integrated-looking field kit.',
 baseRecipeId:'windproof-smock',uniformCamo:'alpenflage',
 kit:{backpack:'backpack-field'},styles:{headwear:'patrol-cap',trousers:'bdu-trousers',packStyle:'field-pack'},
 gearSolid:'olive-drab',weaponFamily:'SIG SG 510 / 550',
 gaps:[patch,weapon('sig-swiss-family','Swiss service rifle'),gap('swiss-taz-cut','Integrated Swiss TAZ field-jacket pockets','defining')],
 sourceNotes:'The smock print is supported; current trousers may remain solid because the BDU cut rejects this print.'},
 {id:'us-desert-1991',name:'US Army · Gulf War Desert',country:'United States',
 organization:'military',environment:'desert',era:{start:1990,end:1993,label:'1990–1993'},
 summary:'Six-color desert fatigues, PASGT protection and old-generation webbing.',
 baseRecipeId:'bdu-field',uniformCamo:'six-color-desert',
 styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'field-webbing'},
 gearSolid:'khaki',weaponFamily:'M16A2',
 gaps:[patch,weapon('ar-family','M16A2 service rifle'),gap('alice-webbing','ALICE-pattern load-bearing system')],
 sourceNotes:'Period approximation; clothing, helmet covers and armor varied by deployment.'}
] as const;

export const factionReference=(id:string):FactionReference|undefined=>
 FACTION_REFERENCES.find(x=>x.id===id);

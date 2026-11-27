import type {GarmentSolidId} from './operator-garment-color-policy.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
const tactical=['black','olive-drab','ranger-green','forest-green','coyote','tan','foliage'] as const;
const modular=['m81-woodland','ucp','multicam','scorpion-w2','british-mtp','flecktarn','desert-tropentarn','finnish-m05','polish-pantera','russian-emr','aor1','aor2','multicam-tropic','multicam-arid','multicam-black','atacs-fg','atacs-au','pencott-greenzone','pencott-badlands'] as const;
const international=['woodland-dpm','british-desert-dpm','swedish-m90','russian-flora','spectre-skwo','russian-izlom','belgian-jigsaw','australian-dpcu','italian-vegetato','pla-xingkong','cadpat-tw','cadpat-ar','ukrainian-mm14','jgsdf-type2','norwegian-m98','french-cce'] as const;
const commercial=['kryptek-highlander','kryptek-typhon','pencott-metropolis'] as const;
type Textile={solid:GarmentSolidId;solids:readonly GarmentSolidId[];prints:readonly HeadwearCamoId[]};
export const PACK_TEXTILES:Readonly<Record<string,Textile>>={
 hydration:{solid:'olive-drab',solids:tactical,prints:modular},
 'assault-panel':{solid:'ranger-green',solids:[...tactical,'charcoal'],prints:modular},
 'day-pack':{solid:'black',solids:[...tactical,'charcoal','navy','khaki','sand','slate','brown'],prints:[...modular,...international,...commercial]},
 'assault-pack':{solid:'coyote',solids:[...tactical,'khaki','sand','field-green'],prints:[...modular,...international,...commercial]},
 'field-pack':{solid:'olive-drab',solids:['olive-drab','forest-green','field-green','khaki','brown','black','nutria-brown'],prints:['m81-woodland','woodland-dpm','russian-flora','alpenflage','east-german-strichtarn','belgian-jigsaw','south-african-s2000']},
 rucksack:{solid:'forest-green',solids:[...tactical,'field-green','khaki','sand','brown','nutria-brown'],prints:[...modular,...international,...commercial,'woodland-marpat','alpenflage','east-german-strichtarn','south-african-s2000']},
 'medic-pack':{solid:'ranger-green',solids:[...tactical,'charcoal','navy','medical-red'],prints:[...modular,'woodland-dpm','cadpat-tw','ukrainian-mm14']},
 'comms-pack':{solid:'coyote',solids:[...tactical,'khaki','field-green'],prints:[...modular,...international]},
 'civilian-pack':{solid:'navy',solids:['black','charcoal','navy','muted-blue','rust','burnt-orange','forest-green','khaki','brown','slate'],prints:['m81-woodland','multicam-black','flecktarn','woodland-dpm','kryptek-highlander']},
 'no-pack':{solid:'olive-drab',solids:[],prints:[]}
};
export function packTextile(style:string){return PACK_TEXTILES[style==='admin-pack'?'assault-panel':style==='sling-bag'?'civilian-pack':style==='duffel'?'rucksack':style]??PACK_TEXTILES['no-pack'];}
// Snow prints and desert cover-only variants are deliberately deferred to removable covers.
export function packPrintCompatible(style:string,id:HeadwearCamoId){return packTextile(style).prints.includes(id);}

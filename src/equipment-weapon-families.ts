/** Weapon families 01: game-only modular appearance catalog.
 * Family parts are visual identities, not instructions for physical assembly.
 * Legacy carbine/rifle classes continue to own firing, inventory and magazines.
 */
import type {WeaponId} from './breach-combat.ts';
import {AR_BARREL_ART} from './weapons/geometry/ar-barrel-profiles.ts';

export const FAMILY_PART_SLOTS=['stock','receiver','grip','magazine',
 'handguard','barrel'] as const;
export type FamilyPartSlot=typeof FAMILY_PART_SLOTS[number];
export type WeaponFamily='ar'|'ak'|'hk';
export type FamilyLength='long'|'mid'|'short';
type Feed='stanag'|'ak762'|'ak545'|'hk762'|'hk556'|'hk9';
export type WeaponFamilyPart={
 id:string;name:string;family:WeaponFamily;slot:FamilyPartSlot;
 receivers?:readonly string[];feed?:Feed;length?:FamilyLength;
 role?:'carbine'|'rifle'|'smg'|'both';stockX?:number;
 /** Canonical factory display only; gameplay ballistics are class-owned. */
 nominalInches?:number;
};
export type WeaponFamilyBuild={family:WeaponFamily;
 parts:Record<FamilyPartSlot,string>};
export type WeaponFamilyPreset={id:string;name:string;weapon:'carbine'|'rifle'|'smg';
 family:WeaponFamily;parts:Record<FamilyPartSlot,string>};
const ar=['ar-a1','ar-a2','ar-retro','ar-flat'];
const akClassic=['akm','ak74'];
const akModern=['ak74m','ak103','ak105'];
const add=(id:string,name:string,family:WeaponFamily,slot:FamilyPartSlot,
 extra:Partial<WeaponFamilyPart>={}):WeaponFamilyPart=>({id,name,family,slot,...extra});
export const FAMILY_PARTS:Readonly<Record<string,WeaponFamilyPart>>={
 'ar-a1':add('ar-a1','Early carry-handle receiver','ar','receiver',{feed:'stanag',role:'rifle'}),
 'ar-a2':add('ar-a2','A2 carry-handle receiver','ar','receiver',{feed:'stanag',role:'rifle'}),
 'ar-retro':add('ar-retro','Retro carbine receiver','ar','receiver',{feed:'stanag',role:'carbine'}),
 'ar-flat':add('ar-flat','Flat-top receiver','ar','receiver',{feed:'stanag',role:'both'}),
 'akm':add('akm','AKM stamped receiver','ak','receiver',{feed:'ak762',role:'rifle'}),
 'ak74':add('ak74','AK-74 receiver','ak','receiver',{feed:'ak545',role:'rifle'}),
 'ak74m':add('ak74m','AK-74M receiver','ak','receiver',{feed:'ak545',role:'rifle'}),
 'ak103':add('ak103','AK-103 receiver','ak','receiver',{feed:'ak762',role:'rifle'}),
 'ak105':add('ak105','AK-105 carbine receiver','ak','receiver',{feed:'ak545',role:'carbine'}),
 'ak-rpk74':add('ak-rpk74','RPK-74 support receiver','ak','receiver',{feed:'ak545',role:'rifle'}),
 'akcompact':add('akcompact','AKS-74U compact receiver','ak','receiver',{feed:'ak545',role:'carbine'}),
 'hk-g3-early':add('hk-g3-early','Early G3 flip-sight stamped receiver','hk','receiver',{feed:'hk762',role:'rifle'}),
 'hk-g3-drum':add('hk-g3-drum','G3 rotary diopter stamped receiver','hk','receiver',{feed:'hk762',role:'rifle'}),
 'hk33-556-rifle':add('hk33-556-rifle','HK33 5.56 stamped rifle receiver','hk','receiver',{feed:'hk556',role:'rifle'}),
 'hk53-556-compact':add('hk53-556-compact','HK53 compact 5.56 stamped receiver','hk','receiver',{feed:'hk556',role:'carbine'}),
 'hk-mp5-standard':add('hk-mp5-standard','MP5 9mm stamped receiver','hk','receiver',{feed:'hk9',role:'smg'}),
 'hk-mp5sd-integral':add('hk-mp5sd-integral','MP5SD dedicated integral shroud receiver','hk','receiver',{feed:'hk9',role:'smg'}),
 'hk-mp5k-stockless':add('hk-mp5k-stockless','MP5K stockless short receiver','hk','receiver',{feed:'hk9',role:'smg'}),
 'ar-fixed':add('ar-fixed','A1 triangular fixed stock','ar','stock',{receivers:['ar-a1','ar-a2','ar-flat'],stockX:-13.74}),
 'ar-fixed-a2':add('ar-fixed-a2','Long A2 triangular fixed stock','ar','stock',{receivers:['ar-a2','ar-flat'],stockX:-14.30}),
 'ar-car':add('ar-car','Retro collapsible carbine stock','ar','stock',{receivers:['ar-retro','ar-flat'],stockX:-14.45}),
 'ar-stock-m4':add('ar-stock-m4','M4 collapsible carbine stock','ar','stock',{receivers:['ar-flat'],stockX:-14.25}),
 'ar-compact':add('ar-compact','Compact adjustable stock','ar','stock',{receivers:['ar-flat'],stockX:-13.85}),
 'ak-wood':add('ak-wood','Wood fixed stock','ak','stock',{receivers:akClassic,stockX:-13.5}),
 'ak-wood74':add('ak-wood74','AK-74 fixed wood stock','ak','stock',{receivers:['ak74'],stockX:-13.5}),
 'ak-poly':add('ak-poly','Polymer fixed stock','ak','stock',{receivers:['akm','ak74','ak74m','ak103'],stockX:-13.5}),
 'ak-sidefold':add('ak-sidefold','Polymer side-folding stock','ak','stock',{receivers:akModern,stockX:-12.7}),
 'ak-skeleton':add('ak-skeleton','Metal skeleton folding stock','ak','stock',{receivers:['akcompact'],stockX:-12.7}),
 'ak-triangle-full':add('ak-triangle-full','Full-length AKS metal triangle folder','ak','stock',{receivers:['ak74'],stockX:-14.4}),
 'ak-triangle-padded':add('ak-triangle-padded','Padded braced triangle folder · custom','ak','stock',{receivers:['ak74'],stockX:-14.4}),
 'ak-underfolder':add('ak-underfolder','AKMS double-bar underfolding stock','ak','stock',{receivers:['akm'],stockX:-14.5}),
 'ak-rpk-clubfoot':add('ak-rpk-clubfoot','RPK wooden clubfoot stock','ak','stock',{receivers:['ak-rpk74'],stockX:-15.6}),
 'ak-wood-amber':add('ak-wood-amber','AKM stock · honey birch laminate','ak','stock',{receivers:akClassic,stockX:-13.5}),
 'ak-wood-red':add('ak-wood-red','AKM stock · red lacquer laminate','ak','stock',{receivers:akClassic,stockX:-13.5}),
 'ak-wood74-amber':add('ak-wood74-amber','AK-74 stock · honey birch laminate','ak','stock',{receivers:['ak74'],stockX:-13.5}),
 'ak-wood74-red':add('ak-wood74-red','AK-74 stock · red lacquer laminate','ak','stock',{receivers:['ak74'],stockX:-13.5}),
 'ak-wood74-plum':add('ak-wood74-plum','AK-74 fixed stock · Soviet plum polymer','ak','stock',{receivers:['ak74'],stockX:-13.5}),
 'ak-sidefold-plum':add('ak-sidefold-plum','Polymer sidefolder · plum (custom)','ak','stock',{receivers:akModern,stockX:-12.7}),
 'ak-rpk-clubfoot-amber':add('ak-rpk-clubfoot-amber','RPK clubfoot · honey laminate','ak','stock',{receivers:['ak-rpk74'],stockX:-15.6}),
 'ak-rpk-clubfoot-red':add('ak-rpk-clubfoot-red','RPK clubfoot · red lacquer laminate','ak','stock',{receivers:['ak-rpk74'],stockX:-15.6}),
 'hk-g3-wood-stock':add('hk-g3-wood-stock','Early G3 fixed wooden stock','hk','stock',{receivers:['hk-g3-early','hk-g3-drum'],stockX:-15.15}),
 'hk-g3-poly-stock':add('hk-g3-poly-stock','G3A3 fixed polymer stock','hk','stock',{receivers:['hk-g3-early','hk-g3-drum'],stockX:-15.30}),
 'hk-g3-retract-stock':add('hk-g3-retract-stock','G3A4 twin-rail retractable stock · extended','hk','stock',{receivers:['hk-g3-drum'],stockX:-15.15}),
 // Preserve existing OD part IDs for saved workbench builds; factory gets
 // new black furniture IDs without silently recoloring old configurations.
 'hk33-fixed-stock':add('hk33-fixed-stock','HK33 fixed stock · OD green','hk','stock',{receivers:['hk33-556-rifle'],stockX:-13.88}),
 'hk33-fixed-stock-black':add('hk33-fixed-stock-black','HK33 fixed stock · black polymer','hk','stock',{receivers:['hk33-556-rifle'],stockX:-13.88}),
 'hk33-retract-stock':add('hk33-retract-stock','HK33A3 wire/twin-rail retractable stock · extended','hk','stock',{receivers:['hk33-556-rifle'],stockX:-14.90}),
 'hk53-retract-stock':add('hk53-retract-stock','HK53A3 short-pattern twin-rail retractable stock · extended','hk','stock',{receivers:['hk53-556-compact'],stockX:-14.90}),
 'hk-mp5-retract-stock':add('hk-mp5-retract-stock','MP5A3/SD3 thick twin-rail stock · extended','hk','stock',{receivers:['hk-mp5-standard','hk-mp5sd-integral'],stockX:-13.05}),
 'hk-mp5-fixed-stock':add('hk-mp5-fixed-stock','MP5A2/SD2 solid fixed polymer stock','hk','stock',{receivers:['hk-mp5-standard','hk-mp5sd-integral'],stockX:-13.05}),
 'hk-mp5k-pdw-stock':add('hk-mp5k-pdw-stock','MP5K-PDW chunky side-folding stock · extended','hk','stock',{receivers:['hk-mp5k-stockless'],stockX:-13.05}),
 'hk-mp5k-cap':add('hk-mp5k-cap','MP5K short stockless receiver cap','hk','stock',{receivers:['hk-mp5k-stockless'],stockX:-6.65}),
 'ar-grip-classic':add('ar-grip-classic','Classic pistol grip','ar','grip',{receivers:ar}),
 'ar-grip-a2':add('ar-grip-a2','A2 pistol grip','ar','grip',{receivers:ar}),
 'ar-grip-poly':add('ar-grip-poly','Modern polymer grip','ar','grip',{receivers:['ar-flat','ar-retro']}),
 'ar-grip-poly-fde':add('ar-grip-poly-fde','Modern polymer grip · flat dark earth','ar','grip',{receivers:['ar-flat']}),
 'ak-grip-wood':add('ak-grip-wood','Wood pistol grip','ak','grip',{receivers:[...akClassic,'ak-rpk74']}),
 'ak-grip-bakelite':add('ak-grip-bakelite','Resin pistol grip','ak','grip',{receivers:[...akClassic,...akModern,'akcompact','ak-rpk74']}),
 'ak-grip-poly':add('ak-grip-poly','Polymer pistol grip','ak','grip',{receivers:[...akClassic,...akModern,'akcompact','ak-rpk74']}),
 'ak-grip-wood-amber':add('ak-grip-wood-amber','Wood grip · honey birch','ak','grip',{receivers:[...akClassic,'ak-rpk74']}),
 'ak-grip-wood-red':add('ak-grip-wood-red','Wood grip · red lacquer','ak','grip',{receivers:[...akClassic,'ak-rpk74']}),
 'ak-grip-poly-plum':add('ak-grip-poly-plum','Pistol grip · Soviet plum polymer','ak','grip',{receivers:[...akClassic,...akModern,'akcompact','ak-rpk74']}),
 'hk-g3-grip':add('hk-g3-grip','Classic HK contoured pistol grip','hk','grip'),
 'ar-mag20':add('ar-mag20','Straight 20-round profile','ar','magazine',{feed:'stanag'}),
 'ar-mag30':add('ar-mag30','Curved 30-round profile','ar','magazine',{feed:'stanag'}),
 'ar-magpoly':add('ar-magpoly','Modern polymer magazine','ar','magazine',{feed:'stanag'}),
 'ak-mag762':add('ak-mag762','7.62 curved steel profile','ak','magazine',{feed:'ak762'}),
 'ak-mag762poly':add('ak-mag762poly','7.62 curved polymer profile','ak','magazine',{feed:'ak762'}),
 'ak-mag545':add('ak-mag545','5.45 resin magazine','ak','magazine',{feed:'ak545'}),
 'ak-mag545poly':add('ak-mag545poly','5.45 polymer magazine','ak','magazine',{feed:'ak545'}),
 'ak-rpk-mag45':add('ak-rpk-mag45','RPK-74 extended 5.45 magazine','ak','magazine',{feed:'ak545'}),
 'ak-mag762-resin':add('ak-mag762-resin','7.62 curved resin magazine · reddish brown','ak','magazine',{feed:'ak762'}),
 'ak-mag762poly-plum':add('ak-mag762poly-plum','7.62 polymer magazine · plum (custom)','ak','magazine',{feed:'ak762'}),
 'ak-mag545-plum':add('ak-mag545-plum','5.45 magazine · Soviet plum polymer','ak','magazine',{feed:'ak545'}),
 'ak-rpk-mag45-plum':add('ak-rpk-mag45-plum','RPK-74 45-round magazine · plum polymer','ak','magazine',{feed:'ak545'}),
 'hk-g3-mag20':add('hk-g3-mag20','G3 straight 20-round magazine','hk','magazine',{feed:'hk762'}),
 'hk556-mag30':add('hk556-mag30','HK33 curved 30-round 5.56 magazine','hk','magazine',{feed:'hk556'}),
 'hk556-mag25':add('hk556-mag25','HK53 curved 25-round 5.56 magazine','hk','magazine',{feed:'hk556'}),
 'hk9-mag30':add('hk9-mag30','MP5 smooth curved 30-round 9mm magazine','hk','magazine',{feed:'hk9'}),
 'ar-triangle':add('ar-triangle','Triangular rifle handguard','ar','handguard',{receivers:['ar-a1'],length:'long'}),
 'ar-round':add('ar-round','Round rifle handguard','ar','handguard',{receivers:['ar-a2','ar-flat'],length:'long'}),
 'ar-carbine':add('ar-carbine','Carbine polymer handguard','ar','handguard',{receivers:['ar-retro','ar-flat'],length:'mid'}),
 'ar-car15-ribbed':add('ar-car15-ribbed','Slim CAR-15 handguard','ar','handguard',{receivers:['ar-retro'],length:'mid'}),
 'ar-733-ribbed':add('ar-733-ribbed','Colt 733 short ribbed handguard','ar','handguard',{receivers:['ar-retro'],length:'short'}),
 'ar-quad':add('ar-quad','Carbine quad rail','ar','handguard',{receivers:['ar-flat'],length:'mid'}),
 'ar-m5-rail':add('ar-m5-rail','Full-length rifle rail','ar','handguard',{receivers:['ar-flat'],length:'long'}),
 'ar-pri-tube':add('ar-pri-tube','Mk 12 PRI tubular fore-end','ar','handguard',{receivers:['ar-flat'],length:'long'}),
 'ar-risii':add('ar-risii','Compact RIS-style rail','ar','handguard',{receivers:['ar-flat'],length:'short'}),
 'ar-compact-rail':add('ar-compact-rail','Compact free-float rail','ar','handguard',{receivers:['ar-flat'],length:'short'}),
 'ak-wood-long':add('ak-wood-long','Classic wood handguard','ak','handguard',{receivers:akClassic,length:'long'}),
 'ak-rpk-wood':add('ak-rpk-wood','RPK-74 heavy wooden fore-end','ak','handguard',{receivers:['ak-rpk74'],length:'long'}),
 'ak-poly-long':add('ak-poly-long','Polymer handguard','ak','handguard',{receivers:['akm','ak74','ak74m','ak103'],length:'long'}),
 'ak-rail-long':add('ak-rail-long','Railed AK handguard','ak','handguard',{receivers:['ak74m','ak103'],length:'long'}),
 'ak-wood-short':add('ak-wood-short','Compact wood handguard','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-poly-short':add('ak-poly-short','Compact polymer handguard','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-poly-mid':add('ak-poly-mid','Carbine polymer handguard','ak','handguard',{receivers:['ak105'],length:'mid'}),
 'ak-wood-long-amber':add('ak-wood-long-amber','Rifle handguard · honey birch laminate','ak','handguard',{receivers:akClassic,length:'long'}),
 'ak-wood-long-red':add('ak-wood-long-red','Rifle handguard · red lacquer laminate','ak','handguard',{receivers:akClassic,length:'long'}),
 'ak-wood-short-amber':add('ak-wood-short-amber','Compact handguard · honey birch','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-wood-short-red':add('ak-wood-short-red','Compact handguard · red lacquer','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'ak-rpk-wood-amber':add('ak-rpk-wood-amber','RPK handguard · honey laminate','ak','handguard',{receivers:['ak-rpk74'],length:'long'}),
 'ak-rpk-wood-red':add('ak-rpk-wood-red','RPK handguard · red lacquer laminate','ak','handguard',{receivers:['ak-rpk74'],length:'long'}),
 'ak-poly-plum-long':add('ak-poly-plum-long','Rifle handguard · plum polymer','ak','handguard',{receivers:['ak74','ak74m'],length:'long'}),
 'ak-poly-plum-mid':add('ak-poly-plum-mid','Carbine handguard · plum (custom)','ak','handguard',{receivers:['ak105'],length:'mid'}),
 'ak-poly-plum-short':add('ak-poly-plum-short','Compact handguard · plum (custom)','ak','handguard',{receivers:['akcompact'],length:'short'}),
 'hk-g3-wood-vented':add('hk-g3-wood-vented','Early wood G3 ventilated fore-end','hk','handguard',{receivers:['hk-g3-early','hk-g3-drum'],length:'long'}),
 'hk-g3-poly-slim':add('hk-g3-poly-slim','Slim G3A3 polymer fore-end','hk','handguard',{receivers:['hk-g3-early','hk-g3-drum'],length:'long'}),
 'hk33-poly-slim':add('hk33-poly-slim','HK33 long slim fore-end · OD green','hk','handguard',{receivers:['hk33-556-rifle'],length:'long'}),
 'hk33-poly-slim-black':add('hk33-poly-slim-black','HK33 long slim fore-end · black polymer','hk','handguard',{receivers:['hk33-556-rifle'],length:'long'}),
 'hk53-poly-short':add('hk53-poly-short','HK53 compact fore-end · OD green','hk','handguard',{receivers:['hk53-556-compact'],length:'short'}),
 'hk53-poly-short-black':add('hk53-poly-short-black','HK53 compact fore-end · black polymer','hk','handguard',{receivers:['hk53-556-compact'],length:'short'}),
 'hk-mp5-tropical':add('hk-mp5-tropical','MP5A3 smooth tropical fore-end','hk','handguard',{receivers:['hk-mp5-standard'],length:'mid'}),
 'hk-mp5-slim':add('hk-mp5-slim','Classic MP5 narrow early fore-end','hk','handguard',{receivers:['hk-mp5-standard'],length:'mid'}),
 'hk-mp5-trirail':add('hk-mp5-trirail','MP5 three-sided accessory rail fore-end','hk','handguard',{receivers:['hk-mp5-standard'],length:'mid'}),
 'hk-mp5sd-shroud':add('hk-mp5sd-shroud','MP5SD3 heavy integral shroud','hk','handguard',{receivers:['hk-mp5sd-integral'],length:'mid'}),
 'hk-mp5k-vertical':add('hk-mp5k-vertical','MP5K integrated vertical foregrip','hk','handguard',{receivers:['hk-mp5k-stockless'],length:'short'}),
 'ar-20':add('ar-20','20\" A1 pencil barrel','ar','barrel',{receivers:['ar-a1','ar-a2','ar-flat'],length:'long',role:'rifle',nominalInches:AR_BARREL_ART['ar-20'].nominalInches}),
 'ar-20-service':add('ar-20-service','20\" A2/A4 service barrel','ar','barrel',{receivers:['ar-a2','ar-flat'],length:'long',role:'rifle',nominalInches:AR_BARREL_ART['ar-20-service'].nominalInches}),
 'ar-spr18':add('ar-spr18','18" Mk 12 precision barrel','ar','barrel',{receivers:['ar-flat'],length:'long',role:'rifle',nominalInches:AR_BARREL_ART['ar-spr18'].nominalInches}),
 'ar-145':add('ar-145','14.5\" retro pencil barrel','ar','barrel',{receivers:['ar-retro','ar-flat'],length:'mid',role:'carbine',nominalInches:AR_BARREL_ART['ar-145'].nominalInches}),
 'ar-145-gov':add('ar-145-gov','14.5\" M4 government barrel','ar','barrel',{receivers:['ar-flat'],length:'mid',role:'carbine',nominalInches:AR_BARREL_ART['ar-145-gov'].nominalInches}),
 'ar-103':add('ar-103','10.3" CQB barrel','ar','barrel',{receivers:['ar-flat'],length:'short',role:'carbine',nominalInches:AR_BARREL_ART['ar-103'].nominalInches}),
 'ar-733-115':add('ar-733-115','11.5" Colt Commando barrel','ar','barrel',{receivers:['ar-retro'],length:'short',role:'carbine',nominalInches:AR_BARREL_ART['ar-733-115'].nominalInches}),
 'hk-g3-service':add('hk-g3-service','Full-length 7.62 G3 barrel','hk','barrel',{receivers:['hk-g3-early','hk-g3-drum'],length:'long',role:'rifle',nominalInches:17.7}),
 'hk33-service':add('hk33-service','HK33 full-size 5.56 barrel','hk','barrel',{receivers:['hk33-556-rifle'],length:'long',role:'rifle',nominalInches:15.4}),
 'hk53-short':add('hk53-short','HK53 very short 5.56 barrel','hk','barrel',{receivers:['hk53-556-compact'],length:'short',role:'carbine',nominalInches:8.3}),
 'hk-mp5-standard-barrel':add('hk-mp5-standard-barrel','MP5 9mm standard visual barrel','hk','barrel',{receivers:['hk-mp5-standard'],length:'mid',role:'smg',nominalInches:8.9}),
 'hk-mp5sd-integrated':add('hk-mp5sd-integrated','MP5SD integral suppressor/barrel visual front','hk','barrel',{receivers:['hk-mp5sd-integral'],length:'mid',role:'smg',nominalInches:5.7}),
 'hk-mp5k-short':add('hk-mp5k-short','MP5K ultra-short visual barrel','hk','barrel',{receivers:['hk-mp5k-stockless'],length:'short',role:'smg',nominalInches:4.5}),
 'ak-long':add('ak-long','Full-length AK barrel','ak','barrel',{receivers:['akm','ak74','ak74m','ak103'],length:'long',role:'rifle'}),
 'ak-103-factory':add('ak-103-factory','AK-103 factory-pattern muzzle · 100-series','ak','barrel',{receivers:['ak103'],length:'long',role:'rifle'}),
 'ak-rpk-long':add('ak-rpk-long','RPK-74 heavy front and folded bipod','ak','barrel',{receivers:['ak-rpk74'],length:'long',role:'rifle'}),
 'ak-mid':add('ak-mid','AK carbine barrel','ak','barrel',{receivers:['ak105'],length:'mid',role:'carbine'}),
 'ak-short':add('ak-short','AKS-74U compact barrel','ak','barrel',{receivers:['akcompact'],length:'short',role:'carbine'})
};
const p=(id:string,name:string,weapon:'carbine'|'rifle'|'smg',family:WeaponFamily,
 receiver:string,stock:string,grip:string,magazine:string,handguard:string,
 barrel:string):WeaponFamilyPreset=>({
 id,name,weapon,family,parts:{receiver,stock,grip,magazine,handguard,barrel}
});
export const FAMILY_PRESETS:readonly WeaponFamilyPreset[]=[
 p('hk-g3','G3 · Early','rifle','hk','hk-g3-early','hk-g3-wood-stock','hk-g3-grip','hk-g3-mag20','hk-g3-wood-vented','hk-g3-service'),
 p('hk-g3a3','G3A3','rifle','hk','hk-g3-drum','hk-g3-poly-stock','hk-g3-grip','hk-g3-mag20','hk-g3-poly-slim','hk-g3-service'),
 p('hk-g3a4','G3A4','rifle','hk','hk-g3-drum','hk-g3-retract-stock','hk-g3-grip','hk-g3-mag20','hk-g3-poly-slim','hk-g3-service'),
 p('hk-hk33a2','HK33A2','rifle','hk','hk33-556-rifle','hk33-fixed-stock-black','hk-g3-grip','hk556-mag30','hk33-poly-slim-black','hk33-service'),
 p('hk-hk33a3','HK33A3','rifle','hk','hk33-556-rifle','hk33-retract-stock','hk-g3-grip','hk556-mag30','hk33-poly-slim-black','hk33-service'),
 p('hk-hk53a3','HK53A3','carbine','hk','hk53-556-compact','hk53-retract-stock','hk-g3-grip','hk556-mag25','hk53-poly-short-black','hk53-short'),
 p('hk-mp5a3','MP5A3','smg','hk','hk-mp5-standard','hk-mp5-retract-stock','hk-g3-grip','hk9-mag30','hk-mp5-tropical','hk-mp5-standard-barrel'),
 p('hk-mp5sd3','MP5SD3','smg','hk','hk-mp5sd-integral','hk-mp5-retract-stock','hk-g3-grip','hk9-mag30','hk-mp5sd-shroud','hk-mp5sd-integrated'),
 p('hk-mp5k','MP5K','smg','hk','hk-mp5k-stockless','hk-mp5k-cap','hk-g3-grip','hk9-mag30','hk-mp5k-vertical','hk-mp5k-short'),
 p('hk-mp5k-pdw','MP5K-PDW','smg','hk','hk-mp5k-stockless','hk-mp5k-pdw-stock','hk-g3-grip','hk9-mag30','hk-mp5k-vertical','hk-mp5k-short'),
 p('hk-mp5a2','MP5A2','smg','hk','hk-mp5-standard','hk-mp5-fixed-stock','hk-g3-grip','hk9-mag30','hk-mp5-tropical','hk-mp5-standard-barrel'),
 p('hk-mp5sd2','MP5SD2','smg','hk','hk-mp5sd-integral','hk-mp5-fixed-stock','hk-g3-grip','hk9-mag30','hk-mp5sd-shroud','hk-mp5sd-integrated'),
 p('ar-m16a1','M16A1','rifle','ar','ar-a1','ar-fixed','ar-grip-classic','ar-mag20','ar-triangle','ar-20'),
 p('ar-m16a2','M16A2','rifle','ar','ar-a2','ar-fixed-a2','ar-grip-a2','ar-mag30','ar-round','ar-20-service'),
 p('ar-m16a4','M16A4','rifle','ar','ar-flat','ar-fixed-a2','ar-grip-a2','ar-mag30','ar-m5-rail','ar-20-service'),
 // C7A2 core approximation: full-length flat-top, polymer handguard and telescoping butt.
 // Canadian-green furniture and C79 optic are not yet dedicated assets.
 p('ar-c7a2-proxy','C7A2 · core approximation','rifle','ar','ar-flat','ar-stock-m4','ar-grip-a2','ar-mag30','ar-round','ar-20-service'),
 p('ar-mk12mod0','Mk 12 Mod 0','rifle','ar','ar-flat','ar-fixed','ar-grip-a2','ar-mag20','ar-pri-tube','ar-spr18'),
 p('ar-car15','CAR-15','carbine','ar','ar-retro','ar-car','ar-grip-classic','ar-mag20','ar-car15-ribbed','ar-145'),
 p('ar-colt733','Colt 733 Commando','carbine','ar','ar-retro','ar-car','ar-grip-a2','ar-mag30','ar-733-ribbed','ar-733-115'),
 p('ar-m4a1','M4A1','carbine','ar','ar-flat','ar-stock-m4','ar-grip-a2','ar-mag30','ar-quad','ar-145-gov'),
 p('ar-mk18','Mk 18','carbine','ar','ar-flat','ar-compact','ar-grip-poly-fde','ar-magpoly','ar-risii','ar-103'),
 p('ak-akm','AKM','rifle','ak','akm','ak-wood','ak-grip-poly-plum','ak-mag762','ak-wood-long','ak-long'),
 p('ak-akms','AKMS','rifle','ak','akm','ak-underfolder','ak-grip-poly-plum','ak-mag762','ak-wood-long','ak-long'),
 p('ak-ak74','AK-74','rifle','ak','ak74','ak-wood74-amber','ak-grip-bakelite','ak-mag545','ak-wood-long-amber','ak-long'),
 p('ak-aks74','AKS-74','rifle','ak','ak74','ak-triangle-full','ak-grip-bakelite','ak-mag545','ak-wood-long','ak-long'),
 p('ak-ak74m','AK-74M','rifle','ak','ak74m','ak-sidefold','ak-grip-poly','ak-mag545poly','ak-poly-long','ak-long'),
 p('ak-rpk74','RPK-74','rifle','ak','ak-rpk74','ak-rpk-clubfoot','ak-grip-bakelite','ak-rpk-mag45','ak-rpk-wood','ak-rpk-long'),
 p('ak-ak103','AK-103','rifle','ak','ak103','ak-sidefold','ak-grip-poly','ak-mag762poly','ak-poly-long','ak-long'),
 p('ak-aks74u','AKS-74U','carbine','ak','akcompact','ak-skeleton','ak-grip-bakelite','ak-mag545','ak-wood-short','ak-short'),
 p('ak-ak105','AK-105','carbine','ak','ak105','ak-sidefold','ak-grip-poly','ak-mag545poly','ak-poly-mid','ak-mid')
];
export function familyPreset(id:string):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(preset=>preset.id===id);
}
export function initialWeaponFamilyBuild(presetId:string):WeaponFamilyBuild|undefined{
 const preset=familyPreset(presetId);
 return preset?{family:preset.family,parts:{...preset.parts}}:undefined;
}
const receiverFor=(id:string,weapon:WeaponId):WeaponFamilyPart|undefined=>{
 const receiver=FAMILY_PARTS[id];
 return receiver?.slot==='receiver'&&
  (receiver.role==='both'||receiver.role===weapon)?receiver:undefined;
};
export function compatibleFamilyPart(receiverId:string,slot:FamilyPartSlot,
 id:string,weapon:WeaponId,barrelLength?:FamilyLength):boolean{
 const receiver=receiverFor(receiverId,weapon),part=FAMILY_PARTS[id];
 if(!receiver||!part||part.slot!==slot||part.family!==receiver.family)return false;
 if(slot==='receiver')return receiverId===id;
 if(part.receivers&&!part.receivers.includes(receiverId))return false;
 if(part.feed&&part.feed!==receiver.feed)return false;
 if(part.role&&part.role!==weapon&&part.role!=='both')return false;
 if(slot==='handguard'&&barrelLength&&part.length!==barrelLength)return false;
 return true;
}
export function readWeaponFamilyBuild(raw:unknown,weapon:WeaponId):WeaponFamilyBuild|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const source=raw as {family?:unknown;parts?:unknown};
 if(!source.parts||typeof source.parts!=='object'||Array.isArray(source.parts))return undefined;
 const parts=source.parts as Record<string,unknown>;
 const receiverId=parts.receiver;
 if(typeof receiverId!=='string')return undefined;
 const receiver=receiverFor(receiverId,weapon);
 if(!receiver||source.family!==receiver.family)return undefined;
 const defaultPreset=FAMILY_PRESETS.find(x=>x.weapon===weapon&&x.parts.receiver===receiverId);
 if(!defaultPreset)return undefined;
 const next:WeaponFamilyBuild={family:receiver.family,parts:{...defaultPreset.parts}};
 for(const slot of ['stock','grip','magazine','barrel'] as const){
  const id=parts[slot];
  if(typeof id==='string'&&compatibleFamilyPart(receiverId,slot,id,weapon))
   next.parts[slot]=id;
 }
 const barrelLength=FAMILY_PARTS[next.parts.barrel].length;
 const handguard=parts.handguard;
 if(typeof handguard==='string'&&compatibleFamilyPart(
   receiverId,'handguard',handguard,weapon,barrelLength))
  next.parts.handguard=handguard;
 else if(!compatibleFamilyPart(receiverId,'handguard',next.parts.handguard,weapon,barrelLength)){
  const suitable=Object.values(FAMILY_PARTS).find(part=>part.slot==='handguard'&&
   compatibleFamilyPart(receiverId,'handguard',part.id,weapon,barrelLength));
  if(suitable)next.parts.handguard=suitable.id;
 }
 return next;
}
/** Interactive edits are separate from tolerant old-save normalization.
 * Report every dependent reset so the UI can ask once before applying it.
 * No second build schema and no separate renderer.
 */
export type FamilyPartReplacement={
 slot:FamilyPartSlot;from:string;to:string;
};
export type FamilyPartProposal={
 valid:boolean;build:WeaponFamilyBuild;
 replacements:readonly FamilyPartReplacement[];reason?:string;
};
export function validFamilyBuild(build:WeaponFamilyBuild,weapon:WeaponId):boolean{
 const receiver=receiverFor(build.parts.receiver,weapon);
 if(!receiver||receiver.family!==build.family)return false;
 const barrel=FAMILY_PARTS[build.parts.barrel];
 if(!barrel)return false;
 return FAMILY_PART_SLOTS.every(slot=>compatibleFamilyPart(
  build.parts.receiver,slot,build.parts[slot],weapon,
  slot==='handguard'?barrel.length:undefined));
}
export function proposeFamilyPartChange(build:WeaponFamilyBuild,weapon:WeaponId,
 slot:FamilyPartSlot,id:string):FamilyPartProposal{
 const reject=(reason:string):FamilyPartProposal=>({
  valid:false,build,replacements:[],reason
 });
 if(!FAMILY_PART_SLOTS.includes(slot))return reject('Unknown part slot');
 if(!validFamilyBuild(build,weapon))return reject('Current build needs repair');
 if(build.parts[slot]===id)return {valid:true,build,replacements:[]};
 const receiverId=slot==='receiver'?id:build.parts.receiver;
 const receiver=receiverFor(receiverId,weapon);
 if(!receiver||receiver.family!==build.family)
  return reject('This core belongs to a different weapon class or family');
 const candidate={...build.parts,[slot]:id};
 // The receiver may invalidate several pieces. Preserve everything else
 // when possible and use the historical factory fallback only where needed.
 const result=readWeaponFamilyBuild({family:build.family,parts:candidate},weapon);
 if(!result||result.parts[slot]!==id||!validFamilyBuild(result,weapon))
  return reject('This part does not fit the current core and front end');
 const replacements=FAMILY_PART_SLOTS.filter(key=>
  build.parts[key]!==result.parts[key]).map(key=>({
   slot:key,from:build.parts[key],to:result.parts[key]
  }));
 return {valid:true,build:result,replacements};
}
export function setWeaponFamilyPart(build:WeaponFamilyBuild,weapon:WeaponId,
 slot:FamilyPartSlot,id:string):WeaponFamilyBuild{
 const proposal=proposeFamilyPartChange(build,weapon,slot,id);
 return proposal.valid?proposal.build:build;
}

export function matchingFamilyPreset(build:WeaponFamilyBuild):WeaponFamilyPreset|undefined{
 return FAMILY_PRESETS.find(p=>p.family===build.family&&
  FAMILY_PART_SLOTS.every(slot=>p.parts[slot]===build.parts[slot]));
}

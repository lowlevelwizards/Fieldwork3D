/** Batch 1 reference-only appearance assembly: closest model cut currently available.
 * These are dated visual proxies, not claims that identical issued equipment existed.
 * Historical equipment colors and print availability remain cut-specific.
 */
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {HeadwearSolidColorId} from './operator-headwear-colors.ts';
import type {GarmentSolidId} from './operator-garment-color-policy.ts';
import type {WardrobeSlot} from './operator-wardrobe-data.ts';
import type {LoadoutSlot} from './equipment-loadouts.ts';
export type ReferenceGearAppearance={
 headwearCamo?:HeadwearCamoId;headwearSolid?:HeadwearSolidColorId;
 helmetCoverCamo?:HeadwearCamoId;
 armorCamo?:HeadwearCamoId;armorSolid?:GarmentSolidId;
 rigCamo?:HeadwearCamoId;rigSolid?:GarmentSolidId;
 packCamo?:HeadwearCamoId;packSolid?:GarmentSolidId;
};
export type ReferenceGearProfile={
 kit?:Partial<Record<LoadoutSlot,string>>;
 styles?:Partial<Record<WardrobeSlot,string>>;
 appearance:ReferenceGearAppearance;
 note:string;
};
export const REFERENCE_GEAR_PROFILES:Readonly<Record<string,ReferenceGearProfile>>={
 'usmc-woodland-2005':{kit:{armor:'armor-carrier',backpack:'backpack-field'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'chest-placard',packStyle:'field-pack'},appearance:{headwearCamo:'woodland-marpat',armorSolid:'coyote',rigSolid:'coyote',packCamo:'woodland-marpat'},
  note:"LWH and Interceptor/MTV are future specialist cuts; PASGT, legacy armor and a pouch panel are closest."},
 'bundeswehr-flecktarn-2000':{kit:{},styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'field-webbing',packStyle:'rucksack'},appearance:{headwearCamo:'flecktarn',armorSolid:'olive-drab',rigSolid:'olive-drab',packCamo:'flecktarn'},
  note:"PASGT approximates M92; field webbing approximates German belt/Y harness."},
 'russian-emr-2015':{kit:{armor:'armor-carrier',rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'rucksack'},appearance:{headwearCamo:'russian-emr',armorCamo:'russian-emr',rigCamo:'russian-emr',packCamo:'russian-emr'},
  note:"Legacy broad armor stands in for 6B45; split-front for 6Sh117; dedicated 6B47/6B45 preferred."},
 'british-dpm-1995':{kit:{armor:'armor-none',backpack:'backpack-field'},styles:{headwear:'pasgt',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'rucksack'},appearance:{headwearCamo:'woodland-dpm',rigCamo:'woodland-dpm',packCamo:'woodland-dpm'},
  note:"PASGT approximates Mk6; DPM belt-mounted PLCE is the right current rig family."},
 'nva-strichtarn-1980':{kit:{armor:'armor-none',backpack:'backpack-field'},styles:{headwear:'ddr-m56',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearSolid:'postwar-green',rigCamo:'east-german-strichtarn',packCamo:'east-german-strichtarn'},
  note:"Correct M56 helmet; field-webbing is wider than original NVA Y-straps."},
 'sadf-nutria-1985':{kit:{armor:'armor-none'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'sadf-webbing',packStyle:'field-pack'},appearance:{headwearSolid:'coyote-brown',rigSolid:'nutria-brown',packSolid:'nutria-brown'},
  note:"P83 webbing is the best current model and should remain unprinted."},
 'swedish-m90-2000':{kit:{armor:'armor-none'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'swedish-m90',rigCamo:'swedish-m90',packCamo:'swedish-m90'},
  note:"Field boonie and printed webbing; Swedish helmet and harness can be refined later."},
 'rhodesian-brushstroke-1975':{kit:{armor:'armor-none',rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'m1956-lce',packStyle:'field-pack'},appearance:{headwearCamo:'rhodesian-brushstroke',rigSolid:'olive-drab',packSolid:'khaki'},
  note:"Period cotton M1956 webbing is closer than modern PLCE; local pattern still varies."},
 'ukraine-mm14-2022':{kit:{rig:'rig-full'},styles:{headwear:'ach',armorStyle:'plate-standard',rigStyle:'split-front',packStyle:'day-pack'},appearance:{headwearCamo:'ukrainian-mm14',armorCamo:'ukrainian-mm14',rigCamo:'ukrainian-mm14',packCamo:'ukrainian-mm14'},
  note:"Contemporary ACH/modular vest proxy; mixed green or coyote pieces remain valid."},
 'pla-xingkong-2021':{kit:{rig:'rig-full'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'day-pack'},appearance:{headwearCamo:'pla-xingkong',armorCamo:'pla-xingkong',rigCamo:'pla-xingkong',packCamo:'pla-xingkong'},
  note:"Broad protective armor and bib approximate the integrated PLA Type 19 vest."},
 'swiss-alpenflage-1980':{kit:{armor:'armor-none',rig:'rig-none',backpack:'backpack-field'},styles:{headwear:'patrol-cap',armorStyle:'armor-bare',rigStyle:'no-rig',packStyle:'field-pack'},appearance:{headwearCamo:'alpenflage',packCamo:'alpenflage'},
  note:"No separate rig: period jacket integrated large load pockets and attached rucksack."},
 'us-desert-1991':{kit:{},styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'alice-lc2',packStyle:'field-pack'},appearance:{headwearCamo:'six-color-desert',armorCamo:'m81-woodland',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"M81 flak over desert uniforms and olive ALICE are intentionally mismatched."},
 'us-army-ocp-2019':{kit:{rig:'rig-full'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'day-pack'},appearance:{headwearCamo:'scorpion-w2',armorCamo:'scorpion-w2',rigCamo:'scorpion-w2',packCamo:'scorpion-w2'},
  note:"Legacy broad armor best approximates IOTV; split-front approximates TAPS/MOLLE."},
 'us-army-ucp-2010':{kit:{},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'day-pack'},appearance:{headwearCamo:'ucp',armorCamo:'ucp',rigCamo:'ucp',packCamo:'ucp'},
  note:"Legacy full-coverage armor is the preferred IOTV-era stand-in."},
 'us-army-m81-1990':{kit:{},styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'alice-lc2',packStyle:'field-pack'},appearance:{headwearCamo:'m81-woodland',armorCamo:'m81-woodland',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"PASGT woodland fragmentation vest plus olive ALICE replace the police-style default."},
 'us-army-dcu-2003':{kit:{armor:'armor-carrier',rig:'rig-full'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'assault-pack'},appearance:{headwearCamo:'three-color-desert',armorCamo:'m81-woodland',rigCamo:'m81-woodland',packSolid:'olive-drab'},
  note:"Legacy armor approximates Interceptor OTV; period woodland MOLLE with desert clothing is deliberate."},
 'us-army-erdl-1970':{kit:{armor:'armor-none',backpack:'backpack-field'},styles:{headwear:'boonie',armorStyle:'armor-bare',rigStyle:'m1956-lce',packStyle:'field-pack'},appearance:{headwearCamo:'erdl-lowland',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"M1956 H-suspenders and canvas pouches are correct era, with no plate armor."},
 'usmc-desert-2010':{kit:{armor:'armor-carrier',backpack:'backpack-field'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'chest-placard',packStyle:'field-pack'},appearance:{headwearCamo:'desert-marpat',armorSolid:'coyote',rigSolid:'coyote',packCamo:'woodland-marpat'},
  note:"MTV stand-in retains coyote MOLLE and woodland MARPAT ILBE."},
 'us-navy-aor1-2014':{kit:{},styles:{headwear:'high-cut',armorStyle:'plate-jpc',rigStyle:'micro-rig',packStyle:'day-pack'},appearance:{headwearSolid:'desert-tan',armorSolid:'coyote',rigSolid:'coyote',packSolid:'coyote'},
  note:"High-cut and JPC are already close; standard equipment should not all become AOR1."},
 'british-mtp-2015':{kit:{rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'rucksack'},appearance:{headwearCamo:'british-mtp',armorCamo:'british-mtp',rigCamo:'british-mtp',packCamo:'british-mtp'},
  note:"PASGT/Mk7 and legacy/Osprey IV proxies are closest currently available."},
 'bundeswehr-tropentarn-2010':{kit:{},styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'desert-tropentarn',armorSolid:'khaki',rigSolid:'khaki',packCamo:'desert-tropentarn'},
  note:"M92/fragmentation kit proxy; arid German harness remains solid sand/khaki."},
 'finnish-m05-2015':{kit:{rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'ach',armorStyle:'plate-standard',rigStyle:'full-chest',packStyle:'field-pack'},appearance:{headwearCamo:'finnish-m05',armorCamo:'finnish-m05',rigCamo:'finnish-m05',packCamo:'finnish-m05'},
  note:"M05 printed vest and webbing proxy; Finnish-specific silhouette remains preferable."},
 'polish-pantera-2010':{kit:{armor:'armor-carrier',rig:'rig-full'},styles:{headwear:'pasgt',armorStyle:'plate-standard',rigStyle:'split-front',packStyle:'field-pack'},appearance:{headwearCamo:'polish-pantera',armorCamo:'polish-pantera',rigCamo:'polish-pantera',packCamo:'polish-pantera'},
  note:"Modular protective carrier and load vest proxy Polish issued Pantera kit."},
 'italian-vegetato-2015':{kit:{armor:'armor-carrier',rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'split-front',packStyle:'rucksack'},appearance:{headwearCamo:'italian-vegetato',armorCamo:'italian-vegetato',rigCamo:'italian-vegetato',packCamo:'italian-vegetato'},
  note:"Legacy high-coverage armor is closer to NC4/09 than a small carrier."},
 'belgian-jigsaw-1995':{kit:{armor:'armor-none'},styles:{headwear:'pasgt',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'belgian-jigsaw',rigSolid:'olive-drab',packCamo:'belgian-jigsaw'},
  note:"Older field webbing with no modern armor; Jigsaw issue varied by unit."},
 'french-cce-2005':{kit:{},styles:{headwear:'pasgt',armorStyle:'soft-flak',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'french-cce',armorSolid:'olive-drab',rigSolid:'olive-drab',packCamo:'french-cce'},
  note:"PASGT approximates SPECTRA; olive fragmentation vest replaces police soft armor."},
 'norwegian-m98-2005':{kit:{armor:'armor-none'},styles:{headwear:'pasgt',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'rucksack'},appearance:{headwearCamo:'norwegian-m98',rigCamo:'norwegian-m98',packCamo:'norwegian-m98'},
  note:"M98 webbing and pack with simple field protection; Norwegian cuts later."},
 'greek-lizard-1990':{kit:{armor:'armor-none'},styles:{headwear:'m1-steel',armorStyle:'armor-bare',rigStyle:'alice-lc2',packStyle:'field-pack'},appearance:{helmetCoverCamo:'greek-lizard',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"Existing M1 steel with fitted Greek Lizard cloth is much closer than PASGT."},
 'swiss-taz90-2005':{kit:{armor:'armor-none'},styles:{headwear:'pasgt',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'swiss-taz90',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"Green Swiss field webbing, no misleading modern plate carrier."},
 'russian-flora-2000':{kit:{armor:'armor-carrier',rig:'rig-full'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'lbv',packStyle:'field-pack'},appearance:{headwearCamo:'russian-flora',armorCamo:'russian-flora',rigCamo:'russian-flora',packCamo:'russian-flora'},
  note:"Legacy vest approximates early 6B13; LBV approximates 6Sh92, not modern Ratnik."},
 'russian-omon-2002':{kit:{},styles:{headwear:'police-helmet',armorStyle:'soft-vest',rigStyle:'micro-rig',packStyle:'no-pack'},appearance:{headwearSolid:'black',armorSolid:'black',rigSolid:'black'},
  note:"Black visored helmet and external police armor are appropriate."},
 'russian-gorka-leto-2010':{kit:{},styles:{headwear:'patrol-cap',armorStyle:'armor-bare',rigStyle:'light-rig',packStyle:'no-pack'},appearance:{headwearSolid:'olive-drab',rigSolid:'olive-drab'},
  note:"Unarmored Gorka with subdued nylon; no invented printed SS-Leto carrier."},
 'jgsdf-type2-2010':{kit:{armor:'armor-carrier',rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'field-pack'},appearance:{headwearCamo:'jgsdf-type2',armorCamo:'jgsdf-type2',rigCamo:'jgsdf-type2',packCamo:'jgsdf-type2'},
  note:"Legacy armor and printed bib proxy Type II/III Japanese protection."},
 'indian-digital-2023':{kit:{rig:'rig-full'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'day-pack'},appearance:{headwearSolid:'olive-drab',armorSolid:'olive-drab',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"Protective kit stays olive; new digital carrier fabric not established."},
 'australian-dpcu-2004':{kit:{armor:'armor-none'},styles:{headwear:'pasgt',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'rucksack'},appearance:{headwearCamo:'australian-dpcu',rigCamo:'australian-dpcu',packCamo:'australian-dpcu'},
  note:"Period DPCU webbing without generic tactical police vest."},
 'canada-cadpat-tw-2012':{kit:{armor:'armor-carrier',rig:'rig-full',backpack:'backpack-field'},styles:{headwear:'pasgt',armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'rucksack'},appearance:{headwearCamo:'cadpat-tw',armorCamo:'cadpat-tw',rigCamo:'cadpat-tw',packCamo:'cadpat-tw'},
  note:"Broad armor + printed tactical vest proxy CG634-era Canadian issue."},
 'korean-granite-2023':{kit:{armor:'armor-carrier',rig:'rig-full'},styles:{headwear:'ach',armorStyle:'plate-legacy',rigStyle:'full-chest',packStyle:'day-pack'},appearance:{headwearCamo:'south-korean-granite-b',armorCamo:'south-korean-granite-b',rigCamo:'south-korean-granite-b',packSolid:'olive-drab'},
  note:"Korean camouflaged body armor and pouches; pack kept green conservatively."},
 'indonesian-kopassus-1990':{kit:{head:'head-cap',armor:'armor-none'},styles:{headwear:'beret',armorStyle:'armor-bare',rigStyle:'field-webbing',packStyle:'field-pack'},appearance:{headwearSolid:'beret-scarlet',rigSolid:'olive-drab',packSolid:'olive-drab'},
  note:"Scarlet beret is unprinted and old webbing remains olive."},
 'sandf-s2000-2015':{kit:{head:'head-cap',armor:'armor-none'},styles:{headwear:'patrol-cap',armorStyle:'armor-bare',rigStyle:'sadf-webbing',packStyle:'field-pack'},appearance:{headwearCamo:'south-african-s2000',rigSolid:'nutria-brown',packCamo:'south-african-s2000'},
  note:"P83 is the available brown rig proxy; later SANDF-specific kit can replace it."},
 'us-swat-2015':{kit:{},styles:{headwear:'police-helmet',armorStyle:'soft-vest',rigStyle:'micro-rig',packStyle:'no-pack'},appearance:{headwearSolid:'black',armorSolid:'black',rigSolid:'black'},
  note:"Black police shell and armor are already the right broad silhouette."},
};

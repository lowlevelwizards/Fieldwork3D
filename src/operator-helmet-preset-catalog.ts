/** H1-E standalone, non-authoritative appearance presets.
 * Shell choice is still the wardrobe headwear slot; a preset never changes kit.
 */
import {HELMET_SETUP_DEFAULTS,readHelmetSetup,type H1ModernHelmet,
 type HelmetSetupV1} from './operator-helmet-setup-policy.ts';
import {headwearCamoChoices,type HeadwearCamoId} from './operator-headwear-camo.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
export type HelmetPreset={
 id:string;label:string;shell:H1ModernHelmet;
 setup:Partial<HelmetSetupV1>;print?:HeadwearCamoId;
 note:string;
};
export const HELMET_H1_PRESETS:readonly HelmetPreset[]=[
 {id:'pasgt-woodland',label:'PASGT · Woodland',shell:'pasgt',
  setup:{cover:'fitted',band:'elastic',retention:'four-point'},print:'m81-woodland',
  note:'Representative late-Cold-War woodland field setup'},
 {id:'pasgt-desert',label:'PASGT · Desert',shell:'pasgt',
  setup:{cover:'fitted',retention:'four-point'},print:'three-color-desert',
  note:'Representative early modern desert field setup'},
 {id:'ach-ucp',label:'ACH · UCP Utility',shell:'ach',
  setup:{cover:'fitted',shroud:'legacy',retention:'four-point'},print:'ucp',
  note:'UCP-era conventional infantry appearance'},
 {id:'ach-multicam',label:'ACH · Modern Field',shell:'ach',
  setup:{cover:'fitted',shroud:'skeleton',retention:'h-nape'},print:'multicam',
  note:'Contemporary field configuration, not unit-specific'},
 {id:'m2002-gunfighter',label:'MICH 2002 · Gunfighter',shell:'mich-2002',
  setup:{cover:'none',shroud:'legacy',retention:'four-point'},
  note:'Simple gunfighter-cut shell and front bracket'},
 {id:'m2001-early',label:'MICH 2001 · Early SOF',shell:'mich-2001',
  setup:{cover:'none',shroud:'legacy',nvg:'mono-stowed',retention:'four-point'},
  note:'Early high-cut tactical reference'},
 {id:'m2001-comms',label:'MICH 2001 · Comms',shell:'mich-2001',
  setup:{cover:'none',shroud:'skeleton',retention:'h-nape'},
  note:'Plain high-cut with independently selectable ear protection'},
 {id:'fast-basic',label:'FAST SF · Basic',shell:'fast-sf',
  setup:{cover:'none',rails:'arc',shroud:'integrated',retention:'dial'},
  note:'Modern high-cut base configuration'},
 {id:'fast-comms',label:'FAST SF · Comms',shell:'fast-sf',
  setup:{cover:'none',rails:'arc',shroud:'integrated',headsetMount:'rail',
   retention:'dial',rearModule:'counterweight'},
  note:'Rails and hearing-protection mounting; select a compatible headset'},
 {id:'fast-night',label:'FAST SF · Night',shell:'fast-sf',
  setup:{cover:'none',rails:'arc',shroud:'integrated',headsetMount:'rail',
   nvg:'dual-stowed',rearModule:'battery',rearStrobe:true,
   retention:'dial'},
  note:'NVG-equipped helmet appearance; no gameplay night-vision benefit'},
 {id:'fast-xp-tactical',label:'FAST XP · Tactical',shell:'fast-xp-mid',
  setup:{cover:'none',rails:'powerpath',shroud:'integrated',
   rearModule:'counterweight',retention:'dial'},
  note:'Intermediate-cut modern tactical helmet'},
 {id:'fast-xp-field',label:'FAST XP · Field',shell:'fast-xp-mid',
  setup:{cover:'fitted',rails:'powerpath',shroud:'skeleton',
   rearModule:'battery',retention:'h-nape'},print:'multicam',
  note:'Mid-cut helmet with fitted camouflage cover'}
];
export const helmetPresetChoices=(shell:string):readonly HelmetPreset[]=>
 HELMET_H1_PRESETS.filter(p=>p.shell===shell);
export function applyHelmetPreset(w:WardrobeOptions,shell:string,id:string):WardrobeOptions{
 const preset=HELMET_H1_PRESETS.find(p=>p.id===id&&p.shell===shell);
 if(!preset)return w;
 const camo=preset.print&&headwearCamoChoices(shell).includes(preset.print)?
  preset.print:undefined;
 return {...w,
  helmetSetup:readHelmetSetup({...HELMET_SETUP_DEFAULTS,...preset.setup,
   presetOrigin:preset.id}),
  headwearCamo:camo,headwearCamoRoll:0
 };
}

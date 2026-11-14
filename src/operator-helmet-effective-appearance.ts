/** A1: single side-effect-free interpretation of the saved helmet look.
 * Saved fields are never edited: availability is an EFFECTIVE appearance,
 * not a migration or an equipment/armor change.
 */
import {readHelmetSetup,resolveHelmetSetup,type HelmetSetupV1} from './operator-helmet-setup-policy.ts';
import {readHelmetField,resolveHelmetField,isFieldHelmet,
 type HelmetFieldOptions} from './operator-helmet-field-policy.ts';
import {readPasgtDetails,resolvePasgtDetails,type PasgtDetails} from './operator-pasgt-cover-policy.ts';
export type HelmetChoiceStatus='active'|'saved-inactive'|'required'|'unavailable';
export type HelmetChoiceFeedback={
 key:string;status:HelmetChoiceStatus;reason:string;
};
export type EffectiveHelmetAppearance={
 shell:string;cover:boolean;setup:HelmetSetupV1;
 field:HelmetFieldOptions;fieldActive:boolean;
 pasgt:PasgtDetails|undefined;
 feedback:readonly HelmetChoiceFeedback[];
};
export type HelmetAppearanceInput={
 shell:string;helmetSetup?:unknown;helmetField?:unknown;
 pasgtDetails?:unknown;headwearCamo?:string;
 headset?:string;eyewear?:string;facewear?:string;
};
/** Consumer-neutral: no Three.js, DOM, cache, timestamps or state writes. */
export function resolveEffectiveHelmetAppearance(
 input:HelmetAppearanceInput):EffectiveHelmetAppearance{
 const {shell}=input;
 const setup=resolveHelmetSetup(shell,input.helmetSetup,{
  hasLegacyPrint:!!input.headwearCamo,
  headset:input.headset,eyewear:input.eyewear,facewear:input.facewear
 }).setup;
 const cover=setup.cover!=='none';
 const fieldActive=isFieldHelmet(shell)&&input.helmetField!==undefined;
 const requestedField=readHelmetField(input.helmetField);
 const field=resolveHelmetField(shell,requestedField,{covered:cover});
 const feedback:HelmetChoiceFeedback[]=[];
 for(const key of Object.keys(requestedField) as (keyof HelmetFieldOptions)[]){
  const saved=requestedField[key],visible=field[key];
  if(saved===visible)continue;
  if(typeof saved==='boolean'&&saved===true&&visible===false||
    typeof saved==='string'&&saved!=='none'&&visible==='none'){
   let reason='Incompatible with current configuration';
   if((key==='light'||key==='camera')&&!field.rails)reason='Requires side rails';
   else if(key==='bungees')reason=!field.rails?'Requires side rails':'Requires an NVG shroud';
   else if(key==='counterweight'||key==='battery')reason=
    field.goggles==='rear'?'Rear goggles occupy this mount':'Rear carrier occupied';
   else if(key==='chemlight')reason='Strobe occupies crown mount';
   else if(key==='patches')reason='Requires fabric cover or Velcro panels';
   else if(key==='concealment')reason='Requires fitted fabric cover';
   feedback.push({key,status:'saved-inactive',reason});
  }
 }
 if(isFieldHelmet(shell)&&field.concealment==='net'&&!requestedField.band)
  feedback.push({key:'band',status:'required',reason:'Required to secure the net'});
 const requestedSetup=readHelmetSetup(input.helmetSetup);
 if(requestedSetup.cover!==setup.cover&&input.helmetSetup!==undefined)
  feedback.push({key:'cover',status:'saved-inactive',
   reason:'This shell uses a fitted cover, not a loose cover'});
 const pasgt=shell==='pasgt'?resolvePasgtDetails(input.pasgtDetails,input.helmetSetup,cover):undefined;
 // The PASGT field system takes precedence over the separate PASGT details
 // only when the field preferences are explicitly present.
 const effectivePasgt=pasgt&&fieldActive?{
  ...readPasgtDetails(input.pasgtDetails,input.helmetSetup),
  band:field.band||field.concealment==='net'?'elastic' as const:'none' as const,
  concealment:field.concealment,
  slits:field.concealment!=='none'
 }:pasgt;
 return {shell,cover,setup,field,fieldActive,pasgt:effectivePasgt,
  feedback};
}

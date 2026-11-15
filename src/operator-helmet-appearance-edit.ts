/** A2-A: pure requested-appearance edits, never equipment or inventory. */
import type {WardrobeOptions} from './operator-wardrobe-data.ts';
import {isFieldHelmet,readHelmetField,type HelmetFieldOptions}
 from './operator-helmet-field-policy.ts';
import {readPasgtDetails,type PasgtDetails}
 from './operator-pasgt-cover-policy.ts';
const fieldConcealment=(value:PasgtDetails['concealment'])=>
 value.startsWith('foliage')?'foliage':value;

/** New PASGT field preferences inherit historical band and concealment. */
export function editHelmetFieldPreferences(
 wardrobe:WardrobeOptions,shell:string,changes:Partial<HelmetFieldOptions>
):WardrobeOptions{
 if(!isFieldHelmet(shell))return wardrobe;
 const historical=shell==='pasgt'?
  readPasgtDetails(wardrobe.pasgtDetails,wardrobe.helmetSetup):undefined;
 const previous=wardrobe.helmetField??readHelmetField(historical?{
  band:historical.band==='elastic',
  concealment:fieldConcealment(historical.concealment)
 }:{});
 const next=readHelmetField({...previous,...changes});
 // Explicit selection owns a physical socket. Missing prerequisites do NOT
 // discard other saved choices: suppression belongs to the effective resolver.
 if(changes.counterweight===true)next.battery=false;
 if(changes.battery===true)next.counterweight=false;
 if(next.light&&next.camera&&next.lightSide===next.cameraSide){
  if(changes.light===true||changes.lightSide!==undefined)
   next.cameraSide=next.lightSide==='left'?'right':'left';
  else next.lightSide=next.cameraSide==='left'?'right':'left';
 }
 if(!historical)return {...wardrobe,helmetField:next};
 const pasgtDetails=readPasgtDetails({
  ...historical,
  ...(changes.band!==undefined?{band:next.band?'elastic':'none'}:{}),
  ...(changes.concealment!==undefined?{concealment:next.concealment}:{})
 });
 return {...wardrobe,helmetField:next,pasgtDetails};
}
/** PASGT-specific controls and shared field modules edit the same intent. */
export function editPasgtFieldDress(
 wardrobe:WardrobeOptions,changes:Partial<PasgtDetails>
):WardrobeOptions{
 const details=readPasgtDetails({
  ...readPasgtDetails(wardrobe.pasgtDetails,wardrobe.helmetSetup),...changes
 });
 if(wardrobe.helmetField===undefined)return {...wardrobe,pasgtDetails:details};
 const field=readHelmetField({
  ...wardrobe.helmetField,
  ...(changes.band!==undefined?{band:details.band==='elastic'}:{}),
  ...(changes.concealment!==undefined?{
   concealment:fieldConcealment(details.concealment)
  }:{})
 });
 return {...wardrobe,pasgtDetails:details,helmetField:field};
}

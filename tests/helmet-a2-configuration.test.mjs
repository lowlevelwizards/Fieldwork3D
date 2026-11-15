import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {resolveEffectiveHelmetAppearance} from '../src/operator-helmet-effective-appearance.ts';
import {editHelmetFieldPreferences,editPasgtFieldDress}
 from '../src/operator-helmet-appearance-edit.ts';
const appearance=(w,shell='pasgt')=>resolveEffectiveHelmetAppearance({
 shell,helmetSetup:w.helmetSetup,helmetField:w.helmetField,
 pasgtDetails:w.pasgtDetails,headwearCamo:w.headwearCamo
});
test('A2-A first PASGT field edit inherits historical cover dress',()=>{
 const base={...initialWardrobe(),helmetSetup:{version:1,cover:'fitted'},
  pasgtDetails:{band:'elastic',concealment:'net',slits:false}};
 const changed=editHelmetFieldPreferences(base,'pasgt',{rails:true});
 assert.equal(base.helmetField,undefined);
 assert.equal(changed.helmetField.band,true);
 assert.equal(changed.helmetField.concealment,'net');
 assert.equal(changed.pasgtDetails.concealment,'net');
 assert.equal(appearance(changed).pasgt.band,'elastic');
});
test('A2-A PASGT detail controls edit visible field state and restore slits',()=>{
 const base={...initialWardrobe(),helmetSetup:{version:1,cover:'fitted'},
  pasgtDetails:{band:'elastic',concealment:'net',slits:false}};
 const field=editHelmetFieldPreferences(base,'pasgt',{shroud:true});
 const changed=editPasgtFieldDress(field,{band:'none',concealment:'scrim'});
 assert.equal(changed.helmetField.band,false);
 assert.equal(changed.helmetField.concealment,'scrim');
 assert.equal(appearance(changed).pasgt.slits,true,'scrim requires slits');
 const clear=editPasgtFieldDress(changed,{concealment:'none'});
 assert.equal(clear.pasgtDetails.slits,false);
 assert.equal(appearance(clear).pasgt.slits,false,'manual slit choice restored');
 assert.equal(appearance(clear).pasgt.band,'none');
 assert.deepEqual(readWardrobe(clear).helmetField,clear.helmetField);
});
test('A2-A field changes synchronize PASGT details',()=>{
 const base={...initialWardrobe(),helmetSetup:{version:1,cover:'fitted'},
  pasgtDetails:{band:'none',concealment:'none',slits:true}};
 const changed=editHelmetFieldPreferences(base,'pasgt',{
  band:true,concealment:'foliage',rails:true
 });
 assert.equal(changed.pasgtDetails.band,'elastic');
 assert.equal(changed.pasgtDetails.concealment,'foliage');
 assert.equal(appearance(changed).pasgt.slits,true);
});
test('A2-A socket ownership follows latest explicit selection',()=>{
 const base=initialWardrobe();
 const withLight=editHelmetFieldPreferences(base,'ach',{light:true,rails:true,
  camera:true,lightSide:'left',cameraSide:'left'});
 assert.equal(withLight.helmetField.cameraSide,'right');
 const noRails=editHelmetFieldPreferences(withLight,'ach',{rails:false});
 assert.equal(noRails.helmetField.light,true,'saved preference survives');
 assert.equal(appearance(noRails,'ach').field.light,false);
 const battery=editHelmetFieldPreferences(withLight,'ach',{battery:true,counterweight:true});
 assert.equal(battery.helmetField.counterweight,false);
 const weight=editHelmetFieldPreferences(battery,'ach',{counterweight:true});
 assert.equal(weight.helmetField.battery,false);
 assert.equal(weight.helmetField.counterweight,true);
});

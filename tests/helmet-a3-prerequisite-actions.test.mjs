import test from 'node:test';
import assert from 'node:assert/strict';
import {readHelmetField,resolveHelmetField} from '../src/operator-helmet-field-policy.ts';
import {helmetPrerequisiteAction} from '../src/operator-helmet-prerequisite-actions.ts';
import {editHelmetFieldPreferences} from '../src/operator-helmet-appearance-edit.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
test('A3: restore saved light through explicit mount activation, preserving light intent',()=>{
 const raw=readHelmetField({light:true,rails:false});
 const effective=resolveHelmetField('ach',raw,{covered:true});
 const fix=helmetPrerequisiteAction('light',raw,effective);
 assert.deepEqual(fix,{label:'ENABLE SIDE RAILS',changes:{rails:true}});
 const next=editHelmetFieldPreferences({...initialWardrobe(),helmetField:raw},
  'ach',fix.changes);
 assert.equal(next.helmetField.light,true);
 assert.equal(resolveHelmetField('ach',next.helmetField,{covered:true}).light,true);
 assert.equal(raw.rails,false);
});
test('A3: bungees add only missing prerequisites',()=>{
 const initial=readHelmetField({bungees:true});
 assert.deepEqual(helmetPrerequisiteAction('bungees',initial,
  resolveHelmetField('ach',initial)),{
   label:'ENABLE RAILS + SHROUD',changes:{rails:true,shroud:true}});
 const rails=readHelmetField({rails:true,bungees:true});
 assert.deepEqual(helmetPrerequisiteAction('bungees',rails,
  resolveHelmetField('ach',rails)),{
   label:'ENABLE NVG SHROUD',changes:{shroud:true}});
});
test('A3: patch prerequisite is additive, but exclusive sockets never auto-replace',()=>{
 const bare=readHelmetField({patches:true,velcro:false});
 assert.deepEqual(helmetPrerequisiteAction('patches',bare,
  resolveHelmetField('ach',bare,{covered:false})),{
   label:'ADD VELCRO PANELS',changes:{velcro:true}});
 const blocked=readHelmetField({strobe:true,chemlight:true,goggles:'rear',
  battery:true,counterweight:true,rails:true});
 const effective=resolveHelmetField('ach',blocked,{covered:true});
 for(const key of ['chemlight','battery','counterweight'])
  assert.equal(helmetPrerequisiteAction(key,blocked,effective),null,key);
 assert.equal(helmetPrerequisiteAction('light',
  readHelmetField({light:true,rails:true}),
  readHelmetField({light:true,rails:true})),null);
});

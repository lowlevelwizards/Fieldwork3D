import test from 'node:test';
import assert from 'node:assert/strict';
import {readHelmetField} from '../src/operator-helmet-field-policy.ts';
import {resolveEffectiveHelmetAppearance} from '../src/operator-helmet-effective-appearance.ts';
import {helmetFieldControlState} from '../src/operator-helmet-control-state.ts';
import {readFileSync} from 'node:fs';
test('A2-C an incompatible saved attachment remains actionable for clearing',()=>{
 const requested=readHelmetField({rails:false,light:true,bungees:true});
 const resolved=resolveEffectiveHelmetAppearance({shell:'ach',helmetField:requested});
 const light=helmetFieldControlState('light',requested,resolved.field,
  resolved.availability.light);
 assert.deepEqual([light.status,light.pressed,light.disabled,light.canClear],
  ['saved-inactive',false,false,true]);
 assert.match(light.note,/Tap to clear saved preference/);
 const off=helmetFieldControlState('camera',requested,resolved.field,
  resolved.availability.camera);
 assert.equal(off.status,'unavailable');
 assert.equal(off.disabled,true);
});
test('A2-C forced retaining band has a distinct required state',()=>{
 const requested=readHelmetField({concealment:'net',band:false});
 const resolved=resolveEffectiveHelmetAppearance({
  shell:'mich-2001',helmetSetup:{cover:'fitted'},helmetField:requested
 });
 const band=helmetFieldControlState('band',requested,resolved.field,
  resolved.availability.band);
 assert.equal(band.status,'required');
 assert.equal(band.pressed,true);
 assert.equal(band.disabled,true);
});
test('A2-C ordinary selected and selectable controls retain expected actions',()=>{
 const requested=readHelmetField({rails:true,light:true});
 const resolved=resolveEffectiveHelmetAppearance({
  shell:'ach',helmetField:requested
 });
 assert.equal(helmetFieldControlState('light',requested,resolved.field).status,'active');
 const off=helmetFieldControlState('camera',requested,resolved.field);
 assert.equal(off.status,'off');
 assert.equal(off.disabled,false);
});
test('A2-C Studio uses requested state for its actions, not suppressed visual state',()=>{
 const source=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(source,/helmetFieldControlState\(/);
 assert.match(source,/currentField\[key\]!==true/);
 assert.match(source,/helmet-option-saved-inactive/);
 assert.match(source,/Tap to clear saved preference|control\.note/);
});

test('A2-C PASGT battery preferences are preserved but never mounted',()=>{
 const requested=readHelmetField({battery:true,rails:true});
 const resolved=resolveEffectiveHelmetAppearance({shell:'pasgt',helmetField:requested});
 const battery=helmetFieldControlState('battery',requested,resolved.field,
  resolved.availability.battery);
 assert.equal(resolved.field.battery,false);
 assert.equal(battery.status,'saved-inactive');
 assert.equal(battery.disabled,false);
 assert.match(battery.note,/Not available on PASGT/);
});

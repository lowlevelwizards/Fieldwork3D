import test from 'node:test';
import assert from 'node:assert/strict';
import {lightControlState} from '../src/equipment-weapon-light-ui.ts';
import {initialWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';

test('21.07 selected operator status follows the actual saved equipment and toggle',()=>{
 const c=setWeaponAttachment(initialWeaponConfiguration('carbine'),'light','light-compact');
 const a={name:'Rook',health:4,weaponConfiguration:c,weaponLightOn:true};
 assert.equal(lightControlState(a,'planning').pressed,true);
 assert.equal(lightControlState(a,'planning').disabled,false);
 assert.equal(lightControlState(a,'running').text,'LIGHT · ROOK · ON');
 assert.equal(lightControlState({...a,weaponLightOn:false},'running').pressed,false);
 assert.equal(lightControlState({...a,weaponLightOn:false},'running').text,'LIGHT · ROOK · OFF');
});
test('21.07 unavailable, down and replay states cannot operate a nonexistent light',()=>{
 const a={name:'Moss',health:4,weaponLightOn:true,weaponConfiguration:initialWeaponConfiguration('carbine')};
 assert.equal(lightControlState(a,'planning').disabled,true);
 assert.equal(lightControlState(a,'planning').pressed,false);
 const m={...a,weaponConfiguration:setWeaponAttachment(a.weaponConfiguration,'light','light-compact')};
 assert.equal(lightControlState({...m,health:0},'running').disabled,true);
 assert.equal(lightControlState(m,'won').disabled,true);
 assert.equal(lightControlState(m,'running',true).disabled,true);
 assert.equal(lightControlState(undefined,'planning').disabled,true);
});

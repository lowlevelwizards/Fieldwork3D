import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,debrief} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
const civ=(id,state,restrained=false)=>{
 const c=createCivilian({id:'civ:'+id,role:'visitor',persona:'steady',
 activity:'idle',position:{x:200,y:200},heading:0,
 roomId:'room',appearanceSeed:4});
 c.state=state;c.restrained=restrained;
 return c;
};
test('EQA3.11 after action distinguishes frightened, physically secured, restrained and escorted',()=>{
 const s=newSession();s.civilians=[
   civ('shaken','frozen'),civ('shaken-2','hiding'),
   civ('secured','compliant'),civ('bound','compliant',true),
   civ('follow','escorted'),civ('other','routine')
 ];
 const summary=debrief(s);
 assert.deepEqual(summary.civilianContact,{
   frightened:2,secured:1,restrained:1,escorted:1
 });
 assert.equal(summary.civilianContact.secured,1,
  'secure without zip ties must never count as physical restraint');
 s.civilians[2].restrained=true;
 const altered=debrief(s);
 assert.equal(altered.civilianContact.secured,0);
 assert.equal(altered.civilianContact.restrained,2);
 assert.equal(altered.score,summary.score,
  'restraint outcome is evidence-only, not a hidden scoring modifier');
});
test('EQA3.11 incapacitated civilians cannot be counted as active frightened custody',()=>{
 const s=newSession();const c=civ('down','compliant',true);
 c.health=0;s.civilians=[c];
 assert.deepEqual(debrief(s).civilianContact,{
   frightened:0,secured:0,restrained:0,escorted:0
 });
});

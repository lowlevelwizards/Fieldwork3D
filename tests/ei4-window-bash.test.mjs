import test from 'node:test';
import assert from 'node:assert/strict';
import {windowBashPoint,windowCanBash,WINDOW_BASH_REACH} from '../src/breach-window-bash.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
const pane={id:'fixed',x:100,y:100,width:48,vertical:true,
 open:false,integrity:2,shattered:false,operable:false,sillHeight:0,headHeight:48};
test('fixed full-height glass is a breakable target independently of operability',()=>{
 assert.equal(windowCanBash(pane),true);
 for(const state of [{open:true},{shattered:true},{treatment:'boarded'},{sillHeight:40}])
  assert.equal(windowCanBash({...pane,...state}),false);
 assert.deepEqual(windowBashPoint(pane,{x:80,y:130}),{x:100,y:119});
 assert.deepEqual(windowBashPoint({...pane,vertical:false},{x:120,y:80}),{x:119,y:100});
 assert.equal(WINDOW_BASH_REACH,34);
});
test('glass break command is separate from opening an operable sash',()=>{
 const o={door:false,node:false,flashRemaining:2,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:30,magazine:20};
 assert.equal(contextActionChoices(o).some(c=>c.id==='ctxBreakGlass'),false);
 const choices=contextActionChoices({...o,nearBreakableGlass:true});
 assert.equal(choices.find(c=>c.id==='ctxBreakGlass')?.label,'BREAK GLASS');
 assert.equal(choices.some(c=>c.id==='ctxWindow'),false);
});

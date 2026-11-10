import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TacticalFeedback} from '../src/ui/tactical-feedback.ts';

const screen=(x=200,y=180)=>({x,y});
function previewCalls(mode){
 const calls=[];
 const canvas=new Proxy({},{
  get:(_target,key)=>{
   if(key==='measureText')return (text)=>({width:text.length*6});
   return (...args)=>{calls.push({method:key,args});};
  },
  set:()=>true
 });
 const feedback=new TacticalFeedback();
 feedback.draw(canvas,x=>x,0,{origin:screen(),direction:screen(300,220),mode});
 return calls;
}
test('all precommit intents render a legible label',()=>{
 for(const [mode,label] of Object.entries({
  look:'LOOK · BRIEF',watch:'WATCH · PERSISTENT',
  flash:'FLASH · TARGET',
  suppress:'SUPPRESS · AREA',drag:'DRAG · DESTINATION',
  carry:'CARRY · DESTINATION'
 })){
  const calls=previewCalls(mode);
  assert.ok(calls.some(c=>c.method==='fillText'&&c.args[0]===label),
   'missing intent label for '+mode);
  assert.ok(calls.some(c=>c.method==='stroke'),'missing guide for '+mode);
 }
});
test('WATCH shows a point target; flash and suppress have distinct areas',()=>{
 const watch=previewCalls('watch');
 assert.ok(watch.some(c=>c.method==='arc'&&c.args[2]===10));
 const flash=previewCalls('flash');
 assert.ok(flash.some(c=>c.method==='arc'&&c.args[2]===26));
 const suppress=previewCalls('suppress');
 assert.ok(suppress.some(c=>c.method==='arc'&&c.args[2]===22));
});
test('mobile drag targets retain gesture, command and preview separation',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const gestures=readFileSync(new URL('../src/breach-canvas-gesture-controller.ts',import.meta.url),'utf8');
 const pointer=readFileSync(new URL('../src/breach-pointer-command-controller.ts',import.meta.url),'utf8');
 const feedback=readFileSync(new URL('../src/ui/breach-tactical-frame-feedback-controller.ts',import.meta.url),'utf8');
 assert.match(gestures,/p\.mode='targetPreview'/);
 assert.match(gestures,/if\(p\.mode==='targetPreview'\)return/);
 assert.match(pointer,/p\.mode==='targetPreview'\|\|p\.mode==='undecided'/);
 assert.match(pointer,/port\.useSelectedGround\(pt\)/);
 assert.match(gestures,/if\(activePointers\.size>=2\)/);
 assert.match(gestures,/pointer\.mode='cameraMulti'/);
 assert.match(pointer,/p\.mode==='cameraMulti'/);
 assert.match(feedback,/const preview:TacticalOrderPreview\|undefined=/);
 assert.match(main,/dispatchTacticalPointerRelease\(/);
});

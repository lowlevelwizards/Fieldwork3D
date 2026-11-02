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
  look:'LOOK',pie:'PIE · TRACK',strafe:'STRAFE · HOLD',
  flash:'FLASH · TARGET',focus:'FOCUS · TARGET',
  suppress:'SUPPRESS · AREA',drag:'DRAG · DESTINATION',
  carry:'CARRY · DESTINATION'
 })){
  const calls=previewCalls(mode);
  assert.ok(calls.some(c=>c.method==='fillText'&&c.args[0]===label),
   'missing intent label for '+mode);
  assert.ok(calls.some(c=>c.method==='stroke'),'missing guide for '+mode);
 }
});
test('pie shows a facing sweep; flash and suppress show different area rings',()=>{
 const pie=previewCalls('pie');
 assert.ok(pie.some(c=>c.method==='arc'&&c.args.length>=5));
 const flash=previewCalls('flash');
 assert.ok(flash.some(c=>c.method==='arc'&&c.args[2]===26));
 const suppress=previewCalls('suppress');
 assert.ok(suppress.some(c=>c.method==='arc'&&c.args[2]===22));
});
test('mobile drag targets use existing validated order action; two fingers cancel',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(main,/p\.mode='targetPreview'/);
 assert.match(main,/if\(p\.mode==='targetPreview'\)\{/);
 assert.match(main,/useSelectedGround\(pt\)/);
 assert.match(main,/if\(activePointers\.size>=2\)/);
 assert.match(main,/pointer\.mode='cameraMulti'/);
 assert.match(main,/p\.mode==='cameraMulti'\)return/);
 assert.match(main,/const preview:TacticalOrderPreview\|undefined=/);
});

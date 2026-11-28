import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioArsenal} from '../src/studio/arsenal.ts';
class Node{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.parent=null;this.hidden=false;}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;}}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
 focus(){this.ownerDocument.activeElement=this;}
 get isConnected(){return this===this.ownerDocument.root||!!this.parent?.isConnected;}
}
const route=(slot,operatorId='rook')=>({workspace:'arsenal',slot,operatorId});
function setup(slot='primary'){
 const doc={activeElement:null,createElement(){return new Node(this);}};doc.root=new Node(doc);
 const host=doc.createElement();doc.root.append(host);const trigger=doc.createElement();host.append(trigger);trigger.focus();
 const events=[];let opts,allow=true,fail=false;
 const editor=(kind,mount,context)=>{
  events.push(['open',kind,context]);if(fail)throw Error('mount failure');let closed=false;
  const dispose=()=>{if(!closed){closed=true;events.push(['retire',kind]);}};
  return {canLeave:()=>allow,requestClose(){if(!allow)return false;dispose();mount.onClose();return true;},dispose};
 };
 const context={mode:'quick',applyLabel:'Apply',onApply:()=>({ok:true})};
 const factory=createStudioArsenal({primaryContext:r=>{events.push(['context',r.operatorId]);return context;},onError:()=>events.push(['error'])},{
  gallery:(host,o)=>{opts=o;return {showCategory:c=>events.push(['category',c]),setVisible:v=>events.push(['visible',v]),dispose:()=>events.push(['gallery disposed'])};},
  primary:(src,refresh,c,m)=>editor('primary',m,c),glock:(r,c,m)=>editor('glock',m,c),m9:(id,m)=>editor('m9',m)
 });
 const view=factory(host,route(slot),{openArsenal:slot=>{events.push(['route',slot]);return true;}});
 return {host,doc,trigger,events,view,opts,context,allow:v=>allow=v,fail:v=>fail=v};
}
test('contextual primary opens once; dirty Back is consumed and gallery returns only after close',()=>{
 const s=setup();s.opts.openPrimary({},()=>{});s.opts.openPrimary({},()=>{});assert.equal(s.events.filter(e=>e[0]==='open').length,1);assert.equal(s.events.find(e=>e[0]==='open')[2],s.context);
 s.allow(false);assert.equal(s.view.canLeave(null),false);assert.equal(s.view.back(),true);assert.equal(s.opts.onSelectCategory('secondary'),false);
 s.allow(true);assert.equal(s.view.back(),true);assert.equal(s.view.back(),false);assert.deepEqual(s.events.at(-1),['visible',true]);assert.equal(s.doc.activeElement,s.trigger);s.view.dispose();
});
test('slot changes retire child, prevent mismatched editor calls and keep M9 inspection-only',()=>{
 const s=setup('secondary');s.opts.openPrimary({},()=>{});assert.equal(s.events.length,0);s.opts.secondaryOpen.m9('m9');assert.deepEqual(s.events.find(e=>e[0]==='open'),['open','m9',undefined]);
 s.view.update(route('primary','moss'));assert.deepEqual(s.events.at(-1),['category','primary']);s.opts.secondaryOpen.glock({},()=>{});s.opts.openPrimary({},()=>{});assert.ok(s.events.some(e=>e[0]==='context'&&e[1]==='moss'));
 s.view.dispose();s.view.dispose();assert.equal(s.events.filter(e=>e[0]==='gallery disposed').length,1);const count=s.events.length;s.opts.openPrimary({},()=>{});assert.equal(s.events.length,count);
});
test('standalone catalog primary has no apply authority; failed mount restores gallery and focus',()=>{
 const s=setup(null);s.fail(true);s.opts.openPrimary({},()=>{});assert.equal(s.events.some(e=>e[0]==='context'),false);assert.deepEqual(s.events.find(e=>e[0]==='open'),['open','primary',undefined]);assert.deepEqual(s.events.at(-1),['error']);assert.equal(s.view.back(),false);assert.equal(s.doc.activeElement,s.trigger);s.view.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mountStudioShell} from '../src/studio/shell.ts';

// Minimal instrumented DOM port: lifecycle tests, not browser/layout acceptance.
class Node {
 constructor(doc,tag){this.ownerDocument=doc;this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this.parent=null;this.hidden=false;}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 replaceChildren(){for(const child of this.children)child.parent=null;this.children=[];}
 contains(node){return node===this||this.children.some(c=>c.contains(node));}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,handler){this.handlers[key]=handler;}
 click(){this.handlers.click?.();}
 focus(){this.ownerDocument.activeElement=this;}
 get isConnected(){return this.ownerDocument.body.contains(this);}
 find(predicate){if(predicate(this))return this;for(const c of this.children){const hit=c.find(predicate);if(hit)return hit;}}
}
function setup(){
 const doc={activeElement:null,createElement(tag){return new Node(this,tag);}};
 doc.body=doc.createElement('body');const host=doc.createElement('div'),launch=doc.createElement('button');doc.body.append(launch,host);launch.focus();
 const counts={mounts:0,updates:0,disposals:0,closed:0,errors:0};let allow=true,fail=false,failUpdate=false,actions;
 const factory=(node,route,a)=>{if(fail)throw Error('fixture');counts.mounts++;actions=a;const el=doc.createElement('button');el.textContent='fixture';node.append(el);return {update(){if(failUpdate)throw Error('update');counts.updates++;},dispose(){counts.disposals++;}};};
 const options={context:{mode:'quick',operatorId:'rook',returnTo:'board'},workspaces:{operators:factory,arsenal:factory},canLeave:()=>allow,onClose:()=>counts.closed++,onError:()=>counts.errors++};
 const shell=mountStudioShell(host,options);
 return {shell,host,doc,launch,counts,options,get actions(){return actions;},allow:v=>allow=v,fail:v=>fail=v,failUpdate:v=>failUpdate=v,button:label=>host.find(n=>n.tag==='button'&&n.textContent===label)};
}
test('same workspace updates in place; weapon return retains category and retired actions are inert',()=>{
 const s=setup(),old=s.actions;assert.equal(s.counts.mounts,1);assert.throws(()=>mountStudioShell(s.host,s.options));
 s.button('fixture').focus();s.shell.selectCategory('head');assert.equal(s.doc.activeElement,s.button('fixture'));assert.equal(s.counts.updates,1);assert.equal(s.counts.mounts,1);
 s.shell.openArsenal('primary');assert.equal(s.counts.disposals,1);assert.equal(old.close(),false);s.button('Arsenal').click();assert.equal(s.shell.route.slot,'primary');
 s.button('Operators').click();assert.equal(s.shell.route.category,'head');assert.equal(s.counts.mounts,3);s.shell.dispose();
});
test('guarded transitions and close, focus restoration, idempotent disposal and host reuse',()=>{
 const s=setup();s.allow(false);assert.equal(s.shell.openArsenal(),false);assert.equal(s.shell.close(),false);assert.equal(s.counts.disposals,0);
 s.allow(true);assert.equal(s.shell.close(),true);assert.equal(s.counts.closed,1);assert.equal(s.doc.activeElement,s.launch);assert.equal(s.host.children.length,0);
 s.shell.dispose();assert.equal(s.counts.disposals,1);assert.equal(s.shell.back(),false);const replacement=mountStudioShell(s.host,s.options);replacement.dispose();assert.equal(s.counts.closed,1);
});
test('failed mount and update can retry without retaining retired resources or callbacks',()=>{
 const s=setup();s.shell.selectCategory('belt');s.fail(true);s.shell.openArsenal();assert.equal(s.counts.errors,1);assert.equal(s.counts.disposals,1);assert.equal(s.button('Retry').hidden,false);
 s.fail(false);s.button('Retry').click();assert.equal(s.shell.route.workspace,'arsenal');assert.equal(s.counts.mounts,2);const old=s.actions;
 s.failUpdate(true);s.shell.openArsenal('secondary');assert.equal(s.counts.errors,2);assert.equal(s.counts.disposals,2);assert.equal(old.back(),false);
 s.failUpdate(false);s.button('Retry').click();s.shell.back();assert.equal(s.shell.route.category,'belt');s.shell.dispose();assert.equal(s.counts.disposals,4);
});

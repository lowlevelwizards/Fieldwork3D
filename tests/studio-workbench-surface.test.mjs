import test from 'node:test';
import assert from 'node:assert/strict';
import {attachWorkbenchSurface} from '../src/arsenal/workbench-surface.ts';
class Element extends EventTarget{
 constructor(doc){super();this.ownerDocument=doc;this.parent=null;this.children=[];this.style={overflow:'auto'};this.classes=new Set();this.classList={add:x=>this.classes.add(x)};this.attrs=new Map([['aria-modal','true']]);}
 append(child){this.children.push(child);child.parent=this;}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}}
 removeAttribute(key){this.attrs.delete(key);}
 focus(){this.ownerDocument.activeElement=this;}
 get isConnected(){return this===this.ownerDocument.body||!!this.parent?.isConnected;}
}
function fixture(){const doc=new EventTarget();doc.body=new Element(doc);const host=new Element(doc),launch=new Element(doc),overlay=new Element(doc);doc.body.append(host);host.append(launch);launch.focus();return {doc,host,launch,overlay};}
function key(){const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'Escape'});return event;}
test('standalone owns body overflow and global key listener; disposal restores focus exactly once',()=>{
 const {doc,overlay,launch}=fixture();let keys=0,cleanups=0;
 const surface=attachWorkbenchSurface(overlay);assert.equal(doc.body.style.overflow,'hidden');assert.equal(overlay.parent,doc.body);
 surface.bindKeys(()=>keys++);doc.dispatchEvent(key());assert.equal(keys,1);overlay.focus();
 surface.dispose(()=>cleanups++);surface.dispose(()=>cleanups++);doc.dispatchEvent(key());
 assert.equal(keys,1);assert.equal(cleanups,1);assert.equal(doc.body.style.overflow,'auto');assert.equal(doc.activeElement,launch);assert.equal(overlay.parent,null);
});
test('embedded surface owns only local keys; close notification is explicit and one-shot',()=>{
 const {doc,host,overlay,launch}=fixture();let keys=0,closed=0;
 const surface=attachWorkbenchSurface(overlay,{host,onClose:()=>closed++});assert.equal(doc.body.style.overflow,'auto');assert.equal(overlay.parent,host);assert.equal(overlay.attrs.has('aria-modal'),false);assert.ok(overlay.classes.has('arsenal-wb-embedded'));
 surface.bindKeys(e=>{keys++;e.preventDefault();});doc.dispatchEvent(key());const e=key();overlay.dispatchEvent(e);assert.equal(keys,1);assert.equal(e.defaultPrevented,true);
 surface.dispose(()=>{},true);surface.dispose(()=>{},true);overlay.dispatchEvent(key());assert.equal(keys,1);assert.equal(closed,1);assert.equal(doc.activeElement,launch);
});
test('forced teardown still restores DOM and overflow on resource cleanup failure',()=>{
 const {doc,overlay}=fixture();const surface=attachWorkbenchSurface(overlay);assert.throws(()=>surface.dispose(()=>{throw Error('fixture');}));assert.equal(surface.disposed,true);assert.equal(overlay.parent,null);assert.equal(doc.body.style.overflow,'auto');
});

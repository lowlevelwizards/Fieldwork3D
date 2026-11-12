import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAfterActionHighlights}
 from '../src/ui/breach-after-action-highlights.ts';
class Node{
 constructor(tag){this.tag=tag;this.className='';this.textContent='';
  this.children=[];this.attrs=new Map();this.listeners=new Map();}
 append(...c){this.children.push(...c);}
 setAttribute(k,v){this.attrs.set(k,String(v));}
 addEventListener(k,v){this.listeners.set(k,v);}
}
const text=n=>n.textContent+n.children.map(text).join(' ');
test('V5.6 no captured frame renders factual incident details, never fabricated imagery',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:t=>new Node(t)};
 try{
  const rec={},moments=[
   {id:'first',at:30,end:38,label:'FIRST CONTACT',
    summary:'Four observed contacts',actorIds:[],incidentScore:9},
   {id:'second',at:40,end:45,label:'OBJECTIVE SECURED',
    summary:'Recorded objective completed',actorIds:[],incidentScore:7}];
  const root=renderAfterActionHighlights(moments,rec,null,()=>{},()=>{});
  assert.match(text(root),/NO VERIFIED FRAME/);
  assert.match(text(root),/Four observed contacts/);
  assert.match(text(root),/FIRST CONTACT/);
  assert.match(text(root),/OBJECTIVE SECURED/);
  assert.equal(root.children.some(c=>c.tag==='img'),false);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});

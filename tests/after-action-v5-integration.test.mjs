import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSquadDetails} from '../src/ui/breach-after-action-squad.ts';
import {readFileSync} from 'node:fs';
class Node{
 constructor(tag){this.tag=tag;this.textContent='';this.className='';
  this.children=[];this.attributes=new Map();this.events=new Map();}
 append(...items){this.children.push(...items);}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 addEventListener(key,fn){this.events.set(key,fn);}
 click(){this.events.get('click')?.();}
}
const all=(node,cls)=>[
 ...(node.className.split(' ').includes(cls)?[node]:[]),
 ...node.children.flatMap(c=>all(c,cls))];
test('V5.7 full operator record exposes every source-linked award, not only top three',()=>{
 const prior=globalThis.document;
 globalThis.document={createElement:t=>new Node(t)};
 try{
  const contributions=Array.from({length:5},(_,i)=>({
   sourceKey:'battle:'+(i+1),category:'support',points:i+1,
   at:i,label:'RECORDED SUPPORT'
  }));
  const op={id:'rook',name:'ROOK',rank:1,contribution:15,
   status:'active',shots:0,hits:0,damagingHits:0,
   armorStops:0,incapacitations:0,contactReports:0,
   doorsOpened:0,doorsForced:0,windowsTraversed:0,
   categories:{combat:0,recon:0,support:15,objective:0},
   contributions};
  const opened=[];
  const node=renderSquadDetails(op,key=>opened.push(key));
  const links=all(node,'fw-v5-recorded-action');
  assert.equal(links.length,5);
  links[0].click();links.at(-1).click();
  assert.deepEqual(opened,['battle:5','battle:1']);
 }finally{
  if(prior===undefined)delete globalThis.document;
  else globalThis.document=prior;
 }
});
test('V5.7 one debrief controller retains authoritative replay and score ownership',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const ctrl=read('src/ui/breach-after-action-controller.ts');
 const details=read('src/ui/breach-after-action-mission-details.ts');
 const report=read('src/breach-after-action-report.ts');
 assert.match(ctrl,/renderSquadDetails\(operator,inspectContribution\)/);
 assert.match(ctrl,/port.setReturn\(origin\)/);
 assert.match(ctrl,/s.summaryCompact=context.summaryCompact/);
 assert.match(details,/stats.scoreComponents/);
 assert.match(report,/contributions/);
});

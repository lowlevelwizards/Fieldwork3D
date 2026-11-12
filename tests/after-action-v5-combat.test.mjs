import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCombatReport} from '../src/ui/breach-after-action-combat.ts';
import {readFileSync} from 'node:fs';
class Node{
 constructor(tag){this.tag=tag;this.className='';this.textContent='';
  this.children=[];this.style={};this.dataset={};this.attrs=new Map();
  this.handlers=new Map();}
 append(...items){this.children.push(...items);}
 setAttribute(k,v){this.attrs.set(k,String(v));}
 addEventListener(k,v){this.handlers.set(k,v);}
 click(){this.handlers.get('click')?.();}
}
const inspect=n=>n.textContent+n.children.map(inspect).join(' ');
const withDom=fn=>{
 const old=globalThis.document;
 globalThis.document={createElement:t=>new Node(t),
  createElementNS:(ns,t)=>new Node(t)};
 try{return fn();}finally{
  if(old===undefined)delete globalThis.document;
  else globalThis.document=old;
 }
};
test('V5.3 combat distinguishes final outcome and selected shot outcome',()=>withDom(()=>{
 const shot={id:9,at:12,shooterId:'moss',targetId:'guard',
  outcome:'damaging',down:false,region:'arm',anatomy:null,
  precision:'region-only',damage:1,weapon:'ak105',caliber:null,receiver:null};
 const contact={id:'guard',name:'GUARD',side:'red',
  resolution:'surrendered',resolvedAt:14,firstSeenAt:10,
  shots:[shot],finalShotId:null};
 const report={operators:[{id:'moss',name:'MOSS'}],
  hostiles:[contact],friendlyCasualties:[]};
 const noop=()=>{};
 const root=renderCombatReport(report,{
  selectedContact:'guard',selectedShotId:9,side:'red',back:false,
  inspectionMode:'paper',scope:'selected'
 },{chooseContact:noop,chooseShot:noop,chooseSide:noop,
  chooseView:noop,chooseMode:noop,chooseScope:noop,viewReplay:noop});
 const output=inspect(root);
 assert.match(output,/FINAL RECORDED OUTCOME/);
 assert.match(output,/SURRENDERED/);
 assert.match(output,/SHOT OUTCOME/);
 assert.match(output,/WOUND/);
 assert.match(output,/MOSS/);
 assert.match(output,/THIS SHOT/);
 assert.match(output,/UP TO THIS SHOT/);
 assert.match(output,/SHOT 1 OF 1/);
}));
test('V5.3 renderer keeps safe fallback and scrollable canvas on mobile',()=>{
 const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(r('src/ui/breach-after-action-controller.ts'),
  /inspectionMode:'3d'/);
 assert.match(r('src/ui/breach-after-action-controller.ts'),
  /state.inspectionMode='paper'/);
 assert.match(r('src/ui/breach-after-action-model.ts'),/touchAction='pan-y'/);
});

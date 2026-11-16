import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayFeedFilterCache,ReplayFeedDomWindow}
 from '../src/ui/breach-replay-feed-dom.ts';
import {replayFeedPosition} from '../src/breach-replay-feed-window.ts';

const kinds={all:[],combat:['shot','wound'],orders:['door'],contacts:['intel']};
const events=n=>Array.from({length:n},(_,i)=>({
 key:'battle:'+i,t:i*.05,kind:i%4===0?'shot':i%4===1?'wound':
 i%4===2?'door':'intel',text:'Event '+i
}));
function fixture(){
 const doc={activeElement:null};
 const container={ownerDocument:doc,children:[],replacements:0,
  replaceChildren(...nodes){this.children=nodes;this.replacements++;},
  contains(node){return this.children.includes(node)}
 };
 const created=[],clicked=[];
 function make(event){
  const classes=new Set();
  const node={event,classes,focusCalls:0,
   classList:{toggle(key,enabled){if(enabled)classes.add(key);else classes.delete(key);}},
   focus(){this.focusCalls++;doc.activeElement=this;},
   click(){clicked.push(event.key+':'+event.text);}
  };
  created.push(node);return node;
 }
 return {container,created,clicked,make,doc};
}
test('E4.H filtered source identity is cached and invalidated on filter or disclosure',()=>{
 const cache=new ReplayFeedFilterCache(),first=events(600);
 const all=cache.get(first,'all',kinds);
 assert.strictEqual(all,first);
 for(let i=0;i<100;i++)assert.strictEqual(cache.get(first,'all',kinds),all);
 const combat=cache.get(first,'combat',kinds);
 assert.equal(combat.length,300);
 assert.ok(combat.every(e=>e.kind==='shot'||e.kind==='wound'));
 assert.strictEqual(cache.get(first,'combat',kinds),combat);
 const second=first.map(x=>({...x,text:'Private '+x.text}));
 const changed=cache.get(second,'combat',kinds);
 assert.notStrictEqual(changed,combat);
 assert.equal(changed[0].text,'Private Event 0');
 cache.clear();
 assert.notStrictEqual(cache.get(second,'combat',kinds),changed);
 const unknown=cache.get(second,'unknown',kinds);
 assert.strictEqual(unknown,second,'unknown filter must match old ALL fallback');
});
test('E4.H 120 stable feed refreshes do not recreate buttons or the DOM window',()=>{
 const source=events(1800),f=fixture();
 const view=new ReplayFeedDomWindow(f.container);
 const initial=replayFeedPosition(source,55);
 view.render(source,initial.start,initial.end,
  source[initial.focusIndex].key,f.make);
 assert.equal(f.created.length,80);
 const first=f.container.children.slice();
 for(let i=1;i<=120;i++){
  const t=55+i/240,pos=replayFeedPosition(source,t);
  view.render(source,initial.start,initial.end,
   source[pos.focusIndex].key,f.make);
 }
 assert.equal(f.created.length,80);
 assert.equal(f.container.replacements,1);
 assert.deepEqual(f.container.children,first);
 assert.equal(view.renderedCount,80);
 assert.equal(f.container.children.filter(b=>b.classes.has('selected')).length,1);
});
test('E4.H overlapping viewport moves reuse event nodes without rebinding clicks',()=>{
 const source=events(300),f=fixture();
 const view=new ReplayFeedDomWindow(f.container);
 view.render(source,20,100,source[40].key,f.make);
 const old=new Map(f.container.children.map((node,i)=>[20+i,node]));
 f.doc.activeElement=old.get(70);
 view.render(source,21,101,source[41].key,f.make);
 assert.equal(f.created.length,81);
 assert.equal(f.container.replacements,2);
 for(let i=21;i<100;i++)
  assert.strictEqual(f.container.children[i-21],old.get(i));
 assert.strictEqual(f.doc.activeElement,old.get(70),
  'focused overlapping event must remain the keyboard target');
 f.container.children[0].click();
 assert.deepEqual(f.clicked,['battle:21:Event 21']);
 view.render(source,100,180,source[100].key,f.make);
 assert.equal(f.doc.activeElement,f.container.children[0],
  'evicted focused item must move focus to nearest visible event');
});
test('E4.H duplicate archival event keys retain old multi-selection semantics',()=>{
 const source=[{key:'same',kind:'shot',text:'one'},
  {key:'same',kind:'shot',text:'two'},
  {key:'other',kind:'door',text:'three'}];
 const f=fixture(),view=new ReplayFeedDomWindow(f.container);
 view.render(source,0,3,'same',f.make);
 assert.equal(f.container.children.filter(b=>b.classes.has('selected')).length,2);
 view.select('other');
 assert.equal(f.container.children.filter(b=>b.classes.has('selected')).length,1);
 assert.strictEqual(f.container.children[2].classes.has('selected'),true);
 view.select('same');
 assert.equal(f.container.children.filter(b=>b.classes.has('selected')).length,2);
});
test('E4.H replacement historical index never keeps old disclosure or click listeners',()=>{
 const first=events(100),second=first.map(e=>({...e,text:'Changed '+e.text}));
 const f=fixture(),view=new ReplayFeedDomWindow(f.container);
 view.render(first,0,80,first[5].key,f.make);
 const previous=f.container.children[5];
 view.render(second,0,80,second[5].key,f.make);
 assert.equal(f.container.children.length,80);
 assert.equal(f.created.length,160);
 assert.notStrictEqual(f.container.children[5],previous);
 f.container.children[5].click();
 assert.deepEqual(f.clicked,['battle:5:Changed Event 5']);
 view.clear();
 assert.equal(view.renderedCount,0);
 assert.equal(f.container.children.length,0);
});
test('E4.H focus and event visibility survive short and empty filtered windows',()=>{
 const source=events(22),f=fixture(),view=new ReplayFeedDomWindow(f.container);
 view.render(source,0,22,source[15].key,f.make);
 view.render(source,0,22,null,f.make);
 assert.equal(f.container.children.filter(b=>b.classes.has('selected')).length,0);
 view.render([],0,0,null,f.make);
 assert.equal(f.container.children.length,0);
 assert.equal(view.renderedCount,0);
});

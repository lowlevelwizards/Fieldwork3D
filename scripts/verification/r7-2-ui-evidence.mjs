/** R7.2 deterministic DOM write and quick-strip reconciliation measurement.
 * These are controlled in-memory setter counts, NOT real browser FPS/latency.
 * node scripts/verification/r7-2-ui-evidence.mjs --check --out artifacts/refactor-r7-2
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createTacticalSectionInvalidator,quickStateViewSignature}
 from '../../src/ui/tactical-ui-invalidation.ts';
import {writeDomText,writeDomAttribute,writeDomStyle,writeDomHidden,
 writeDomDisabled,writeDomTitle,writeDomClass,writeDomOptionalAttribute,
 clearDomStyle} from '../../src/ui/tactical-dom-reconciliation.ts';

export function instrumentedDomNode(){
 const count={text:0,hidden:0,disabled:0,title:0,classes:0,
  attribute:0,removedAttribute:0,style:0,removedStyle:0};
 let value='',hidden=true,disabled=false,title='';
 const attributes=new Map(),classes=new Set(),styles=new Map();
 const node={
  get textContent(){return value;},
  set textContent(next){count.text++;value=next;},
  get hidden(){return hidden;},
  set hidden(next){count.hidden++;hidden=next;},
  get disabled(){return disabled;},
  set disabled(next){count.disabled++;disabled=next;},
  get title(){return title;},
  set title(next){count.title++;title=next;},
  getAttribute(name){return attributes.get(name)??null;},
  setAttribute(name,next){count.attribute++;attributes.set(name,next);},
  removeAttribute(name){count.removedAttribute++;attributes.delete(name);},
  classList:{
   contains(name){return classes.has(name);},
   toggle(name,enabled){count.classes++;if(enabled)classes.add(name);
    else classes.delete(name);}
  },
  style:{
   getPropertyValue(name){return styles.get(name)??'';},
   setProperty(name,next){count.style++;styles.set(name,next);},
   removeProperty(name){count.removedStyle++;styles.delete(name);}
  }
 };
 return {node,count};
}
const view=(extras={})=>({
 scope:'ROOK · HERE · NO ORDERS',
 scopeTitle:'These settings apply to Rook at current position',
 scopeAria:'Commands for Rook at current position',
 scopeKind:'operator',
 choices:[{id:'stance',label:'CROUCH',disabled:false,pressed:false},
  {id:'pace',label:'RUN',title:'Change pace',disabled:false,pressed:false}],
 ...extras
});
/** Real signature code + real equality helpers, but no fake browser timings. */
export function measureR72(){
 const invalidator=createTacticalSectionInvalidator();
 const root={},scope={},session={};
 const initial=quickStateViewSignature(view());
 for(let i=0;i<200;i++)invalidator.shouldReconcile({
  root,scope,session,signature:initial});
 const settled=invalidator.stats();
 const cases=[
  quickStateViewSignature(view({scope:'ROOK · HERE · 1 QUEUED'})),
  quickStateViewSignature(view({scope:'ROOK · HERE · WATCH ACTIVE'})),
  quickStateViewSignature(view({scopeKind:'watch',scopeAria:
   'Commands for Rook at current position; WATCH marker selected'})),
  quickStateViewSignature(view({choices:[{
   id:'stance',label:'CROUCH',disabled:true,pressed:false}]}))
 ];
 for(const signature of cases)
  invalidator.shouldReconcile({root,scope,session,signature});
 const changes=invalidator.stats();
 const freshRoot=invalidator.shouldReconcile({
  root:{},scope,session,signature:cases.at(-1)});
 const freshScope=invalidator.shouldReconcile({
  root,scope:{},session,signature:cases.at(-1)});
 const freshSession=invalidator.shouldReconcile({
  root,scope,session:{},signature:cases.at(-1)});
 invalidator.invalidate();
 const afterHideShow=invalidator.shouldReconcile({
  root,scope,session,signature:initial});
 const {node,count}=instrumentedDomNode();
 for(let i=0;i<200;i++){
  writeDomText(node,'WAIT');
  writeDomHidden(node,false);
  writeDomDisabled(node,true);
  writeDomTitle(node,'READY');
  writeDomClass(node,'selected',true);
  writeDomAttribute(node,'aria-pressed','true');
  writeDomStyle(node,'--progress','34%');
 }
 const settledWrites={...count};
 writeDomText(node,'DONE');
 writeDomHidden(node,true);
 writeDomDisabled(node,false);
 writeDomTitle(node,'COMPLETE');
 writeDomClass(node,'selected',false);
 writeDomOptionalAttribute(node,'aria-pressed',null);
 clearDomStyle(node,'--progress');
 // Test idempotence after the first change/remove.
 writeDomOptionalAttribute(node,'aria-pressed',null);
 clearDomStyle(node,'--progress');
 return {
  schema:1,stage:'R7.2',
  context:'deterministic instrumented DOM setter simulation; not real browser CPU/layout/FPS',
  strip:{
   identicalAttempts:settled.attempts,reconciles:settled.reconciled,
   skipped:settled.skipped,derivedChanges:changes.reconciled-settled.reconciled,
   remountReconciled:[freshRoot,freshScope,freshSession,afterHideShow],
   total:invalidator.stats()
  },
  guardedDom:{
   identicalAttempts:200,
   naiveUnconditionalWrites:200*7,
   firstPassCommittedWrites:Object.values(settledWrites).reduce((a,b)=>a+b,0),
   initialCategoryWrites:settledWrites,
   afterChanged:count
  }
 };
}
export function verifyR72(report){
 assert.equal(report.schema,1);
 assert.equal(report.stage,'R7.2');
 assert.deepEqual([report.strip.identicalAttempts,report.strip.reconciles,
  report.strip.skipped],[200,1,199]);
 assert.equal(report.strip.derivedChanges,4);
 assert.deepEqual(report.strip.remountReconciled,[true,true,true,true]);
 assert.equal(report.guardedDom.naiveUnconditionalWrites,1400);
 assert.equal(report.guardedDom.firstPassCommittedWrites,7);
 assert.deepEqual(Object.values(report.guardedDom.initialCategoryWrites),
  [1,1,1,1,1,1,0,1,0]);
 assert.equal(report.guardedDom.afterChanged.removedAttribute,1);
 assert.equal(report.guardedDom.afterChanged.removedStyle,1);
 return true;
}
export function renderR72(report){
 const a=report.strip,b=report.guardedDom;
 return [
 '# R7.2 — deterministic presentation write evidence','',
 '> '+report.context,'',
 '| Measured synthetic workload | Before / attempts | After / commits |',
 '|---|---:|---:|',
 '| Identical Quick States model (200 observations) | '+a.identicalAttempts+
 ' | '+a.reconciles+' (skipped '+a.skipped+') |',
 '| Unconditional property setters (7×200) | '+b.naiveUnconditionalWrites+
 ' | '+b.firstPassCommittedWrites+' guarded mutations |',
 '| Changed quick-state models | '+a.derivedChanges+
 ' | '+a.derivedChanges+' reconciles |',
 '| New root/scope/Session and hidden→visible | 4 | 4 reconciles |','',
 'The measured values above count calls and simulated committed writes',
 'on real R7.2 signature/guard functions, not an actual mobile browser DOM.',
 'No FPS, CPU, layout, thermal or input-latency improvement is asserted.',
 'Existing 60-Hz GO, replay/fog/notice and all 120/180/750ms refresh paths',
 'remain subject to CI and physical browser validation.',''
 ].join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=measureR72();
 if(process.argv.includes('--check'))verifyR72(report);
 const out=process.argv.indexOf('--out');
 if(out>=0){
  assert.ok(process.argv[out+1]&&!process.argv[out+1].startsWith('--'));
  const folder=resolve(process.argv[out+1]);
  mkdirSync(folder,{recursive:true});
  writeFileSync(join(folder,'ui-write-evidence.json'),
   JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(folder,'ui-write-evidence.md'),renderR72(report));
 }
 process.stdout.write(renderR72(report));
}

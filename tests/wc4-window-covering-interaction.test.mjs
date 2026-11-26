import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COVERING_ACTION_SECONDS,desiredCovering,coveringMotion,coveringContactPoint,coveringHandContact,coveringContactClear} from '../src/breach-window-covering-interaction.ts';
import {validPhysicalContact,contactAllowedByOwners,releasePhysicalContact} from '../src/breach-physical-contact-anchor.ts';
import {windowCoveringPieces,normalizeWindowCovering} from '../src/breach-window-coverings.ts';
import {buildWindowCovering,syncWindowCoveringVisual} from '../src/rendering/window-covering-visual.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
const c=normalizeWindowCovering({covering:{family:'horizontal-blind',side:1,opening:1,palette:'linen'}});
const w={id:'W',x:50,y:50,width:48,vertical:false,sillHeight:14,headHeight:43,covering:c};
test('explicit requests are idempotent and locked hard shutters remain unavailable',()=>{
 const closed=desiredCovering(c,'close-covering');
 assert.equal(closed.opening,0);assert.equal(c.opening,1);
 assert.deepEqual(desiredCovering(closed,'close-covering'),closed);
 assert.equal(desiredCovering(closed,'tilt-covering').tilted,true);
 assert.equal(desiredCovering(c,'tilt-covering'),null);
 assert.equal(desiredCovering({...c,locked:true},'close-covering'),null);
 assert.equal(desiredCovering({...c,family:'rolling-shutter'},'close-covering').opening,0);
 assert.equal(desiredCovering({...c,integrity:0},'close-covering'),null);
});
test('motion is seekable, uses recorded contact clock and does not mutate pane',()=>{
 const contact=coveringHandContact(w,c,{p:{x:50,y:70},posture:'stand'},0,null);
 const actor={health:100,plan:[{id:1,kind:'interact',interaction:'close-covering',objectId:'covering:W'}],physicalContact:contact,actionTimer:.5};
 const m=coveringMotion(actor,c);assert.ok(m.opening>0&&m.opening<1);
 assert.deepEqual(m,coveringMotion(actor,c));assert.equal(c.opening,1);
 assert.equal(coveringMotion({...actor,actionTimer:COVERING_ACTION_SECONDS},c).opening,0);
 assert.equal(coveringMotion({...actor,physicalContact:releasePhysicalContact(contact,.5)},c),null);
 assert.equal(coveringMotion({...actor,plan:[]},c),null);
});
test('contact anchors are on signed face, use existing support-hand ownership',()=>{
 const a={p:{x:50,y:70},posture:'stand'},point=coveringContactPoint(w,c,a.p);
 assert.equal(point.p.y,58);
 const contact=coveringHandContact(w,c,a,2,null);
 assert.ok(validPhysicalContact(contact,2));
 assert.ok(contactAllowedByOwners(contact,{action:'door',left:'door',right:'weapon'}));
 assert.equal(contactAllowedByOwners(contact,{action:'reload',left:'magazine',right:'weapon'}),false);
 assert.equal(releasePhysicalContact(contact,3).releasedAt,3);
 assert.equal(coveringContactPoint({...w,vertical:true},c,{x:30,y:50}).p.x,42);
 const s={site:null,doors:[],coverState:[],objectRevision:0};
 assert.equal(coveringContactClear(s,w,c,{x:50,y:30}),false);
 assert.equal(coveringContactClear(s,w,c,{x:50,y:100}),false);
});
test('all families reuse the same mesh objects across states and reverse seeks',()=>{
 const host={solid:color=>new THREE.MeshStandardMaterial({color}),box:(parent,x,y,z,w,h,d,mat)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
 }};
 for(const family of ['curtain','vertical-blind','horizontal-blind','roller-shade','hinged-shutter','rolling-shutter']){
  const descriptor={...c,family};const parent=new THREE.Group(),root=buildWindowCovering({...w,covering:descriptor},parent,host);
  const slots=[...root.children],closed={...descriptor,opening:0},open={...descriptor,opening:1};
  const read=()=>slots.map(m=>[m.visible,...m.position.toArray(),...m.scale.toArray(),m.rotation.y]);
  syncWindowCoveringVisual(root,closed);const before=read();
  for(const opening of [.1,.5,.9,1]){syncWindowCoveringVisual(root,open,{opening,tilt:.5});assert.deepEqual(root.children,slots);}
  syncWindowCoveringVisual(root,closed);assert.deepEqual(read(),before);
  syncWindowCoveringVisual(root,{...closed,integrity:0});assert.ok(slots.every(m=>!m.visible));
  syncWindowCoveringVisual(root,closed);assert.deepEqual(read(),before);
  assert.ok(windowCoveringPieces(w,descriptor,.5,.5).length<=slots.length);
 }
});
test('covering actions append separately from glass actions',()=>{
 const actions=contextActionChoices({door:false,node:false,flashRemaining:0,posture:'stand',pace:'walk',firePolicy:'hold',reserve:0,magazine:0,nearWindow:true,coveringActions:[{id:'ctxCovering:close-covering:W',label:'CLOSE BLINDS',group:'advanced'}]});
 assert.ok(actions.some(a=>a.id==='ctxWindow'));assert.ok(actions.some(a=>a.id==='ctxCovering:close-covering:W'));
});

import {newSession,team,planWindowCovering} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {createInteractionOrderHandler} from '../src/breach-order-interactions.ts';
import {advanceContextualSupportContacts} from '../src/breach-contextual-support-contact.ts';
import {windowCoveringsBlockSight} from '../src/breach-window-covering-optics.ts';
import {dispatchTacticalContextCommand} from '../src/breach-tactical-context-command.ts';
import {resolveTacticalIconId} from '../src/ui/tactical-icons.ts';
const pt=(x,y)=>({x,y});
function makeSession(){
 const pane={...w,x:300,y:180,style:'standard'};
 const site={seed:49004,name:'WC4 contact',layout:'corridor',
  rooms:[{id:'floor',x:80,y:100,w:420,h:260,kind:'room',purpose:'floor',tone:1}],
  roomCount:1,walls:[],cover:[],doors:[],windows:[pane],
  enemies:[pt(450,300)],spawn:[pt(300,200),pt(340,230),pt(340,260),pt(340,290)],
  entrance:pt(300,200),objective:pt(120,200),extract:pt(470,200),
  bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,49004,'full-view','small','hold',site),a=team(s)[0];
 a.p=pt(300,200);a.priorP={...a.p};a.heading=-Math.PI/2;a.velocity=0;a.plan=[];
 const events=[];
 const run=createInteractionOrderHandler({notify:(_s,msg)=>events.push(msg),
  battleEvent:(_s,_kind,_actor,_point,msg)=>events.push(msg),hear:()=>{},
  approach:()=>true,inSight:()=>false,liveVisibility:()=>true,movePhysicalProp:()=>false});
 return {s,a,events,run};
}
function tick(s,a,run,count=1){
 for(let i=0;i<count&&a.plan.length;i++){s.seconds+=1/60;run(s,a,a.plan[0],1/60);}
}
test('palette dispatch queues a real target, GO timer commits once and changes sight only on completion',()=>{
 const {s,a,events,run}=makeSession();
 try{
  const pane=s.windows.find(x=>x.id==='W');assert.ok(pane);
  const prior=s.objectRevision;
  const action='ctxCovering:close-covering:W';
  assert.equal(resolveTacticalIconId(action),'windowOpen');
  const outcome=dispatchTacticalContextCommand({state:s,selected:a.id,actor:a,node:undefined,door:undefined,action,selectedActiveWatch:false,medicalCandidate:()=>null});
  assert.equal(outcome.outcome,'accepted');assert.equal(a.plan[0].objectId,'covering:W');
  assert.equal(pane.covering.opening,1);assert.equal(s.objectRevision,prior);
  tick(s,a,run,20);assert.equal(pane.covering.opening,1);assert.ok(a.actionTimer>0);
  assert.equal(a.physicalContact.intent,'covering');
  assert.equal(windowCoveringsBlockSight(s,pt(300,150),pt(300,210),32),false);
  tick(s,a,run,75);
  assert.equal(pane.covering.opening,0);assert.equal(s.objectRevision,prior+1);
  assert.equal(a.plan.length,0);assert.ok(a.physicalContact.releasedAt!==null);
  assert.equal(pane.shattered,false);assert.equal(pane.open,false);
  assert.equal(windowCoveringsBlockSight(s,pt(300,150),pt(300,210),32),true);
  assert.ok(events.some(x=>x.includes('CLOSE HORIZONTAL BLIND')));
 }finally{activateSite(null);}
});
test('wrong face rejects planning; lost reach cancels without state mutation',()=>{
 const {s,a,run}=makeSession();
 try{
  const pane=s.windows.find(x=>x.id==='W');
  a.p=pt(300,160);assert.equal(planWindowCovering(s,a.id,'W','close-covering'),false);
  a.p=pt(300,200);assert.equal(planWindowCovering(s,a.id,'W','close-covering'),true);
  tick(s,a,run,20);assert.ok(a.actionTimer>0);
  const prior=s.objectRevision;a.p=pt(300,230);tick(s,a,run,1);
  assert.equal(a.plan.length,0);assert.equal(pane.covering.opening,1);assert.equal(s.objectRevision,prior);
  assert.ok(a.physicalContact.releasedAt!==null);assert.ok(a.lastFailedOrder.reason.includes('CONTACT LOST'));
 }finally{activateSite(null);}
});
test('deleting active covering order releases its support contact without committing',()=>{
 const {s,a,run}=makeSession();
 try{
  assert.equal(planWindowCovering(s,a.id,'W','close-covering'),true);
  tick(s,a,run,20);assert.equal(a.physicalContact.intent,'covering');
  a.plan=[];a.actionTimer=0;s.seconds+=1/60;advanceContextualSupportContacts(s);
  assert.ok(a.physicalContact?.releasedAt!==null);assert.equal(s.windows[0].covering.opening,1);
 }finally{activateSite(null);}
});

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
 assert.equal(desiredCovering({...c,family:'rolling-shutter'},'close-covering'),null);
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

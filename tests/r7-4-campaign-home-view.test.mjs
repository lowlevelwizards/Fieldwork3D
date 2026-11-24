import test from 'node:test';
import assert from 'node:assert/strict';
import {captureCampaignHomeView,restoreCampaignHomeView} from '../src/ui/campaign/home-view-continuity.ts';

const control=(label,disabled=false)=>({
 label,disabled,focusCalls:[],
 getAttribute(name){return name==='aria-label'?this.label:null;},
 matches(selector){assert.equal(selector,':disabled');return this.disabled;},
 focus(options){this.focusCalls.push(options);}
});
const detail=(key,open)=>({dataset:{campaignDetail:key},open});
const fixture=({hidden=false,hasTabs=true,scroll=0,details=[],controls=[],active=null}={})=>{
 const fallback=control('Selected tab');
 const nav={querySelector(selector){assert.equal(selector,'[aria-selected="true"]');return fallback;}};
 const root={hidden,scrollTop:scroll,ownerDocument:{activeElement:active},
  contains(el){return controls.includes(el);},
  querySelector(selector){assert.equal(selector,'.campaign-tabs');return hasTabs?nav:null;},
  querySelectorAll(selector){
   if(selector==='details[data-campaign-detail][open]')return details.filter(d=>d.open);
   if(selector==='details[data-campaign-detail]')return details;
   if(selector==='[aria-label]')return controls;
   throw Error('Unexpected selector: '+selector);
  }};
 return {root,nav,fallback};
};
test('same Operations view keeps keyed details, scroll and named enabled focus',()=>{
 const oldFocus=control('Treat operator');
 const old=fixture({scroll:185,details:[detail('case:a',true),detail('case:b',false)],controls:[oldFocus],active:oldFocus});
 const snapshot=captureCampaignHomeView(old.root);
 const restored=control('Treat operator');
 const details=[detail('case:a',false),detail('case:b',true),detail('case:c',true)];
 const next=fixture({details,controls:[restored]});
 restoreCampaignHomeView(next.root,next.nav,snapshot);
 assert.deepEqual(details.map(d=>d.open),[true,false,false]);
 assert.equal(next.root.scrollTop,185);
 assert.deepEqual(restored.focusCalls,[{preventScroll:true}]);
 assert.deepEqual(next.fallback.focusCalls,[]);
});
test('removed or disabled focused control falls back to selected tab',()=>{
 const oldFocus=control('Purchase');
 const old=fixture({controls:[oldFocus],active:oldFocus});
 const snapshot=captureCampaignHomeView(old.root);
 for(const controls of [[],[control('Purchase',true)]]){
  const next=fixture({controls});
  restoreCampaignHomeView(next.root,next.nav,snapshot);
  assert.deepEqual(next.fallback.focusCalls,[{preventScroll:true}]);
  for(const c of controls)assert.deepEqual(c.focusCalls,[]);
 }
});
test('fresh or hidden view never captures unrelated focus or disclosure state',()=>{
 for(const options of [{hidden:true},{hasTabs:false}]){
  const oldFocus=control('Unrelated');
  const old=fixture({...options,scroll:99,details:[detail('case:a',true)],controls:[oldFocus],active:oldFocus});
  const snapshot=captureCampaignHomeView(old.root);
  assert.equal(snapshot.restoreScroll,0);
  assert.deepEqual([...snapshot.openWorkspaceDetails],[]);
  assert.equal(snapshot.focusedLabel,undefined);
  const next=fixture({details:[detail('case:a',true)]});
  restoreCampaignHomeView(next.root,next.nav,snapshot);
  assert.deepEqual(next.fallback.focusCalls,[]);
  assert.equal(next.root.scrollTop,0);
 }
});

import {createCampaignHomeTabs} from '../src/ui/campaign/home-tabs.ts';
import {createCampaignLandingNavigation} from '../src/ui/campaign/landing-navigation.ts';

function withFakeDocument(run){
 const previous=globalThis.document;
 const doc={activeElement:null};
 class El {
  constructor(tag){this.tagName=tag;this.children=[];this.attrs=new Map();this.handlers={};this.hidden=false;this.scrollTop=0;this.ownerDocument=doc;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this.attrs.set(k,v);}
  getAttribute(k){return this.attrs.get(k)??null;}
  addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}
  emit(k,event={}){for(const fn of this.handlers[k]??[])fn(event);}
  click(){this.emit('click');}
  focus(opts){doc.activeElement=this;this.focusOptions=opts;}
  querySelectorAll(sel){
   const all=this.children.flatMap(el=>[el,...el.querySelectorAll(sel)]);
   return all.filter(el=>sel.startsWith('.')?(el.className??'').split(' ').includes(sel.slice(1)):false);
  }
  querySelector(sel){return this.querySelectorAll(sel)[0]??null;}
 }
 doc.createElement=tag=>new El(tag);
 globalThis.document=doc;
 try{run(doc);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
test('tab controller keeps mounted panels, roving selection and keyboard wrap without rebuilding',()=>withFakeDocument(doc=>{
 const root=doc.createElement('section');
 const keys=['overview','personnel','contracts','logistics','chronicle'];
 const panels=Object.fromEntries(keys.map(key=>[key,doc.createElement('section')]));
 const selected=[];
 const {nav,activateTab}=createCampaignHomeTabs(root,panels,'personnel',tab=>selected.push(tab),3,2);
 const tabs=nav.querySelectorAll('.campaign-tab');
 assert.equal(tabs.length,5);
 assert.equal(tabs[2].getAttribute('aria-label'),'Contracts · 3 available');
 assert.equal(tabs[4].getAttribute('aria-label'),'Chronicle · 2 recorded operations');
 assert.deepEqual(keys.map(k=>panels[k].hidden),[true,false,true,true,true]);
 root.scrollTop=77;activateTab('personnel');
 assert.equal(root.scrollTop,77);
 tabs[4].click();
 assert.equal(root.scrollTop,0);
 assert.deepEqual(selected,['chronicle']);
 assert.equal(tabs[4].tabIndex,0);
 tabs[4].focus();
 let prevented=0;
 nav.emit('keydown',{key:'ArrowRight',preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.equal(doc.activeElement,tabs[0]);
 assert.deepEqual(selected,['chronicle','overview']);
 assert.deepEqual(keys.map(k=>panels[k].hidden),[false,true,true,true,true]);
 assert.deepEqual(tabs.map(el=>el.tabIndex),[0,-1,-1,-1,-1]);
 nav.emit('keydown',{key:'End',preventDefault(){}});
 assert.equal(doc.activeElement,tabs[4]);
 nav.emit('keydown',{key:'Home',preventDefault(){}});
 assert.equal(doc.activeElement,tabs[0]);
 assert.equal(nav.querySelectorAll('.campaign-tab')[0],tabs[0]);
}));
test('landing back and Escape restore the initiating control, not a different menu action',()=>withFakeDocument(doc=>{
 const {main,subpage,showSubpage,option}=createCampaignLandingNavigation();
 const launch=option('NEW','Details',()=>{});
 main.append(launch);
 let action=0;
 showSubpage('NEW CAMPAIGN','Choose',launch,target=>target.append(option('Classic','Start',()=>action++)));
 assert.equal(main.hidden,true);assert.equal(subpage.hidden,false);
 const back=subpage.querySelector('.campaign-landing-back');
 assert.equal(doc.activeElement,back);
 subpage.querySelector('.campaign-landing-option').click();assert.equal(action,1);
 let prevented=0;subpage.emit('keydown',{key:'Escape',preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.equal(subpage.hidden,true);assert.equal(main.hidden,false);
 assert.equal(doc.activeElement,launch);assert.deepEqual(launch.focusOptions,{preventScroll:true});
}));

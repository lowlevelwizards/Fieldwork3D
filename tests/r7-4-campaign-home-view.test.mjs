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

import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorStudioBridge,studioHiddenRetainMs}
 from '../src/operator-studio-bridge.ts';

test('Release A5: menu keeps a warm draft, tactical/replay releases GPU context',()=>{
 assert.equal(studioHiddenRetainMs('menu'),60_000);
 assert.equal(studioHiddenRetainMs('home'),60_000);
 assert.equal(studioHiddenRetainMs('quick'),0);
 assert.equal(studioHiddenRetainMs('mission'),0);
});

test('Release A5: closing a tactical Studio releases the hidden iframe',async()=>{
 const previous={document:globalThis.document,
  window:globalThis.window,location:globalThis.location};
 const nodes=[];
 const frame={src:'',title:'',contentWindow:{postMessage(){}},
  getAttribute(k){return k==='src'?this.src:null;},onload:null};
 const overlay={hidden:true,id:'',append(child){this.child=child;}};
 try{
  globalThis.document={createElement(tag){return tag==='iframe'?frame:overlay;},
   getElementById(){return null;},body:{append(node){nodes.push(node);}}};
  globalThis.window={addEventListener(){}};
  globalThis.location={href:'https://example.test/Fieldwork3D/breach.html',
   origin:'https://example.test'};
  const bridge=createOperatorStudioBridge({
   getCampaign:()=>null,setCampaign(){},
   getRoster:()=>({members:[{id:'rook',callsign:'Rook',
    appearanceSeed:11,wardrobe:{},loadout:{},weapon:'carbine'}]}),
   setRoster(){},getMode:()=> 'quick',getSelected:()=> 'rook',
   getSession:()=>({phase:'planning'}),isReplaying:()=>false,
   saveRoster:()=>true,saveCampaign:()=>true,applyQuickRoster(){},
   onQuickSaved(){},onCampaignSaved(){}
  });
  bridge.open('rook','quick');
  assert.equal(bridge.visible,true);
  assert.ok(frame.src.includes('operator-studio.html'));
  bridge.close();
  assert.equal(bridge.visible,false);
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(frame.src,'about:blank');
  assert.equal(nodes.length,1);
 }finally{
  for(const [key,value] of Object.entries(previous)){
   if(value===undefined)delete globalThis[key];
   else globalThis[key]=value;
  }
 }
});

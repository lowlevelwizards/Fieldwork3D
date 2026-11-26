import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseWindowCovering,windowRoomFaces} from '../src/worldgen/window-covering-placement.ts';
import {dressWindowSecurity} from '../src/worldgen/window-security.ts';
const room={id:'bed',x:0,y:0,w:100,h:100,kind:'room',tone:1,purpose:'bedroom'};
const w={id:'W',x:50,y:0,width:48,vertical:false,style:'standard'};
const site={rooms:[room],windows:[w],cover:[],archetype:'house',condition:'occupied'};
test('signed face matches renderer in both orientations',()=>{
 assert.equal(windowRoomFaces(site,w)[0].side,1);
 assert.equal(windowRoomFaces(site,{...w,x:0,y:50,vertical:true})[0].side,-1);
});
test('stable contextual placement, privacy bias, independent pane geometry',()=>{
 let covered=0,closed=0;
 for(let seed=0;seed<100;seed++){
  const a=chooseWindowCovering(site,w,seed);
  assert.deepEqual(a,chooseWindowCovering(site,w,seed));
  if(a){covered++;if(a.opening===0)closed++;
   if(a.family.includes('shutter'))assert.equal(a.opening,1);
   else assert.equal(a.side,1);}
  for(const treatment of ['bars','boarded'])assert.equal(chooseWindowCovering(site,{...w,treatment},seed),undefined);
  assert.equal(chooseWindowCovering(site,{...w,style:'clerestory'},seed),undefined);
  const result=dressWindowSecurity(site,seed);
  assert.deepEqual(result,dressWindowSecurity(result,seed));
  assert.equal(result.windows[0].width,w.width);
 }
 assert.ok(covered>70&&closed>25);
});
test('boarding remains idempotent on neglected sites',()=>{
 let boarded=0;
 for(let seed=0;seed<100;seed++){
  const a=dressWindowSecurity({...site,condition:'vacant'},seed*9973);
  assert.deepEqual(a,dressWindowSecurity(a,seed*9973));
  if(a.windows[0].treatment==='boarded'){boarded++;assert.equal(a.cover.length,1);assert.equal(a.windows[0].covering,undefined);}
 }
 assert.ok(boarded>0);
});

test('all six families are reachable through appropriate room and archetype contexts',()=>{
 const contexts=[['house','bedroom','standard'],['townhouse','living','standard'],['apartment','bedroom','standard'],['motel','guest','standard'],['office','office','picture'],['clinic','exam','standard'],['retail','sales','storefront'],['restaurant','dining','picture'],['garage','workshop','industrial'],['warehouse','storage','industrial'],['utility','equipment','industrial']];
 const found=new Set();
 for(const [archetype,purpose,style] of contexts){
  const local={...site,archetype,rooms:[{...room,purpose}]};
  for(let seed=0;seed<80;seed++){
   const a=chooseWindowCovering(local,{...w,style},seed*9973);
   if(a){found.add(a.family);if(a.family.includes('shutter'))assert.equal(a.opening,1);}
  }
 }
 assert.deepEqual([...found].sort(),['curtain','hinged-shutter','horizontal-blind','roller-shade','rolling-shutter','vertical-blind']);
});

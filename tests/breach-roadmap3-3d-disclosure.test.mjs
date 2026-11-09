import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDoorPresentation} from '../src/rendering/breach-3d-disclosure-presenter.ts';
const door={id:'D',a:{x:100,y:100},b:{x:140,y:100},open:true,openFraction:1,
 glassShattered:true,wedged:true};
const setup=()=>({door,personal:false,omniscient:false,directlyObserved:false,
 observed:null,rememberedOpen:.25,rememberedGlass:false,replayFraction:1,
 previousFraction:0,renderAlpha:.5,replaying:false,hasRenderFrame:false});
test('unseen live door shows remembered leaf and glass, not hidden changes',()=>{
 const v=resolveDoorPresentation(setup());
 assert.equal(v.fraction,.25);assert.equal(v.glassVisible,true);
 assert.equal(v.wedgeVisible,false);assert.equal(v.remember,false);
});
test('currently observed doors may interpolate the physical leaf',()=>{
 const v=resolveDoorPresentation({...setup(),directlyObserved:true});
 assert.equal(v.fraction,.5);assert.equal(v.glassVisible,false);
 assert.equal(v.wedgeVisible,true);assert.equal(v.remember,true);
});
test('personal history overrides current live leaf, glass and wedge',()=>{
 const v=resolveDoorPresentation({...setup(),personal:true,replaying:true,
  hasRenderFrame:true,observed:{openFraction:.6,glassShattered:false,wedged:false}});
 assert.equal(v.fraction,.6);assert.equal(v.glassVisible,true);
 assert.equal(v.wedgeVisible,false);assert.equal(v.remember,false);
 const missing=resolveDoorPresentation({...setup(),personal:true,replaying:true});
 assert.equal(missing.fraction,0);assert.equal(missing.glassVisible,true);
});
test('unseen replay never uses a future replay leaf fraction',()=>{
 const v=resolveDoorPresentation({...setup(),replaying:true,hasRenderFrame:true});
 assert.equal(v.fraction,.25);assert.equal(v.glassVisible,true);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {initializeWindows,manipulateWindow,damageWindow} from '../src/breach-windows.ts';
test('window runtime state is mutable but never changes original building plan',()=>{
 const site=[{id:'W',x:100,y:90,width:48,vertical:false}];
 const [state]=initializeWindows(site);
 assert.equal(manipulateWindow(state,'open'),true);
 assert.equal(site[0].open,undefined);
 assert.equal(manipulateWindow(state,'open'),false);
 assert.equal(manipulateWindow(state,'close'),true);
 assert.equal(damageWindow(state,1),true);
 assert.equal(state.shattered,false);
 assert.equal(damageWindow(state,1),true);
 assert.equal(state.shattered,true);
 assert.equal(manipulateWindow(state,'close'),false);
});

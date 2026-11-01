import test from 'node:test';import assert from 'node:assert/strict';
import {initializeWindows,damageWindow} from '../src/breach-windows.ts';
import {windowAcousticFactor} from '../src/breach-window-acoustics.ts';
test('closed intact glass muffles without hiding positional truth',()=>{
 const [window]=initializeWindows([{id:'W',x:100,y:100,width:50,vertical:true}]);
 const left={x:60,y:100},right={x:140,y:100};
 const closed=windowAcousticFactor(left,right,[window]);
 assert.ok(closed<1);
 assert.equal(windowAcousticFactor(left,{x:70,y:80},[window]),1);
 damageWindow(window,3);
 assert.equal(windowAcousticFactor(left,right,[window]),1);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {initializeWindows,windowPaneSegment,damageWindow} from '../src/breach-windows.ts';
test('pane follows physical orientation and stops being intact after hits',()=>{
 const [a,b]=initializeWindows([
 {id:'A',x:100,y:80,width:48,vertical:false},
 {id:'B',x:100,y:80,width:48,vertical:true}]);
 assert.equal(windowPaneSegment(a).a.y,80);
 assert.equal(windowPaneSegment(b).a.x,100);
 damageWindow(a,1);assert.equal(a.shattered,false);
 damageWindow(a,1);assert.equal(a.shattered,true);
 assert.equal(a.open,true);
 assert.equal(damageWindow(a,1),false);
});

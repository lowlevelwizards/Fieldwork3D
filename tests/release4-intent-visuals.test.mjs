import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderVisualScopes} from '../src/ui/order-visual-state.ts';
const p={x:20,y:20};
test('R4.2 route state labels take effect after reaching authored node',()=>{
 const nodes=[{id:1,kind:'move',p,paceState:'run',postureState:'crouch'},
 {id:2,kind:'move',p:{x:50,y:30},aimMode:'track',aimPoint:{x:90,y:50}},
 {id:3,kind:'move',p:{x:90,y:30}},
 {id:4,kind:'move',p:{x:100,y:40},paceState:'walk'}];
 const visuals=orderVisualScopes(nodes,{watch:false,pace:'walk',posture:'stand',fire:'free'});
 assert.equal(visuals[0].before.pace,'walk');
 assert.equal(visuals[0].after.pace,'run');
 assert.equal(visuals[0].after.posture,'crouch');
 assert.equal(visuals[2].before.watch,false,'running cancels WATCH, not cosmetic persistence');
 assert.equal(visuals[2].before.pace,'run');
 assert.equal(visuals[3].after.pace,'walk');
});
test('R4.2 both 2D and 3D make known narrow sections distinct',()=>{
 const flat=readFileSync(new URL('../src/breach-2d-route-overlays.ts',import.meta.url),'utf8');
 const projected=readFileSync(new URL('../src/breach-2d-projected-overlays.ts',import.meta.url),'utf8');
 assert.match(flat,/previewCourse\.narrowOnly/);
 assert.match(flat,/draw\.fillText\('NARROW'/);
 assert.match(flat,/visual\[i\]\.before\.pace==='run'/);
 assert.match(projected,/cachedRoute\?\.narrowOnly/);
 assert.match(projected,/draw\.fillText\('NARROW'/);
});

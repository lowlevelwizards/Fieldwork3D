import test from 'node:test';import assert from 'node:assert/strict';
import {conditionWallPixels} from '../src/worldgen/condition-wall.ts';
const site={seed:128,archetype:'house',condition:'neglected',conditionLevel:100,
 walls:[{a:{x:0,y:0},b:{x:200,y:0}}],
 rooms:[{id:'room',kind:'room',purpose:'living',x:0,y:0,w:200,h:170,tone:0}],
 windows:[],cover:[]};
const alpha=(p,start=0)=>Array.from(p).filter((_,i)=>i%4===3)
 .slice(start).reduce((a,b)=>a+b,0);
test('a window creates directional wall runoff instead of a uniform overlay',()=>{
 const dry=conditionWallPixels(site,0,100);
 const exposed=conditionWallPixels({...site,windows:[{id:'w',x:100,y:0,width:36,vertical:false}]},0,100);
 assert.ok(alpha(exposed)>alpha(dry),'window exposure increases source-local deterioration');
 assert.deepEqual(exposed,conditionWallPixels({...site,windows:[{id:'w',x:100,y:0,width:36,vertical:false}]},0,100));
});
test('wet room wall receives higher lower-edge moisture load',()=>{
 const normal=conditionWallPixels(site,0,100);
 const wet=conditionWallPixels({...site,rooms:site.rooms.map(r=>({...r,purpose:'bathroom'}))},0,100);
 assert.ok(alpha(wet)>alpha(normal));
 assert.equal(Math.max(...Array.from(conditionWallPixels(site,0,0)).filter((_,i)=>i%4===3)),0);
});

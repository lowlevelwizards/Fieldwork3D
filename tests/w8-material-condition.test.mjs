import test from 'node:test';import assert from 'node:assert/strict';
import {ageMaterialColor} from '../src/rendering/condition-materials.ts';
import {conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
import {planActivityWear} from '../src/worldgen/wear-sources.ts';
import {planCompiledFloorWear} from '../src/worldgen/floor-wear-plan.ts';
const room={id:'r',kind:'room',purpose:'exam',x:0,y:0,w:100,h:100};
const fixture=(fixture,x=50,y=50)=>({fixture,x,y,w:24,h:20});
const site={seed:23,archetype:'clinic',condition:'neglected',conditionLevel:100,rooms:[room],doors:[],cover:[]};
const alpha=b=>Array.from(b).filter((_,i)=>i%4===3).reduce((n,x)=>n+x,0);
test('W8 material color retention keeps clean identity and varied bounded aging',()=>{
 const hex=0xd3b34b;
 for(const surface of ['painted-metal','porcelain','plastic','furniture-wood','industrial-steel']){
  assert.equal(ageMaterialColor(hex,surface,0),hex);
  assert.notEqual(ageMaterialColor(hex,surface,100),hex);
  assert.equal(ageMaterialColor(hex,surface,100),ageMaterialColor(hex,surface,100));
 }
 assert.notEqual(ageMaterialColor(hex,'painted-wood',100),ageMaterialColor(hex,'painted-metal',100));
 const aged=ageMaterialColor(hex,'painted-metal',100);
 assert.ok(((aged>>>16)&255)- (aged&255)>65,'paint keeps authored color contrast');
 assert.ok((ageMaterialColor(0xf0eee9,'porcelain',100)>>>16)>180,'porcelain remains recognizably light');
});
test('W8 broad buildup ignores unrelated or retired fixtures, preserves washable finish',()=>{
 const clean=conditionFloorPixels(site,room,0),base=conditionFloorPixels(site,room,100);
 assert.equal(alpha(clean),0);
 assert.deepEqual(conditionFloorPixels({...site,cover:[fixture('desk')]},room,100),base);
 assert.deepEqual(conditionFloorPixels({...site,cover:[{...fixture('handwash-station'),destroyed:true}]},room,100),base);
 assert.deepEqual(conditionFloorPixels({...site,cover:[{...fixture('handwash-station'),toppled:true}]},room,100),base);
 assert.ok(alpha(conditionFloorPixels({...site,cover:[fixture('handwash-station')]},room,100))>alpha(base));
 assert.ok(alpha(base)<alpha(conditionFloorPixels({...site,archetype:'garage'}, {...room,purpose:'workshop'},100)));
 const levels=[0,25,50,75,100].map(l=>alpha(conditionFloorPixels(site,room,l)));
 assert.ok(levels.slice(1).every((v,i)=>v>levels[i]));
});
test('W8 activity source scan skips nonfixture and destroyed objects, not entire remaining site',()=>{
 const r={...room,purpose:'workshop'};
 const input={...site,archetype:'garage',rooms:[r],cover:[{x:10,y:10,w:8,h:8},{...fixture('vehicle-lift',20,20),destroyed:true},fixture('vehicle-lift',75,70),fixture('workbench',35,45)]};
 // At level 100 probability is .98; deterministic seed corpus avoids depending on a single roll.
 const witnesses=Array.from({length:16},(_,i)=>planActivityWear({...input,seed:i+1})).flat();
 assert.ok(witnesses.some(m=>m.id.endsWith(':2')&&m.kind==='oil'));
 assert.ok(!witnesses.some(m=>m.id.endsWith(':1')));
 const marks=planCompiledFloorWear(input);
 const deposits=marks.filter(m=>['oil','grease','mineral','drip'].includes(m.kind));
 const keys=deposits.map(m=>[m.kind,m.x,m.y].join(':'));
 assert.equal(new Set(keys).size,keys.length);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {productionPixelPattern,materialTileSize,PIXEL_SURFACES} from '../src/rendering/pixel-recipes.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
import {PixelTextureLibrary} from '../src/rendering/pixel-materials.ts';
import {exteriorAgePixels,exteriorAgeMaterial} from '../src/rendering/material-art-exterior.ts';
import {conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
import * as THREE from 'three';
const alpha=b=>b.reduce((n,v,i)=>n+(i%4===3?v:0),0);
test('macro textures preserve metric UV pitch, bounded contrast and deterministic variants',()=>{
 const lib=new PixelTextureLibrary();
 for(const kind of PIXEL_SURFACES){
  const size=materialTileSize(kind),p=productionPixelPattern(kind,0),t=lib.get(kind,0);
  assert.equal(p.length,size*size*4);assert.deepEqual(p,productionPixelPattern(kind,0));
  assert.equal(t.image.width,size);assert.equal(t.repeat.x,32/size);
  assert.ok(p.every((v,i)=>i%4===3?v===255:v>=255-materialProfile(kind).maxDarkening-2),kind);
  if(size>32){
   assert.notDeepEqual(p,productionPixelPattern(kind,1),kind);
   let different=0,total=0;
   for(let y=0;y<size;y++)for(let x=0;x<size-32;x++){different+=p[(y*size+x)*4]!==p[(y*size+x+32)*4]?1:0;total++;}
   assert.ok(different/total>.08,kind+' repeats every 32 units');
  }
 }
 assert.ok(lib.estimatedBytes<1_000_000);lib.dispose();
});
test('severe exterior maps are deterministic, physically bounded and much more visible than clean',()=>{
 for(const kind of ['grass','asphalt','concrete']){
  const clean=exteriorAgePixels(kind,240,80,17,0),mid=exteriorAgePixels(kind,240,80,17,50),bad=exteriorAgePixels(kind,240,80,17,100);
  assert.equal(bad.width,256);assert.equal(bad.height,128);assert.deepEqual(bad,exteriorAgePixels(kind,240,80,17,100));
  const difference=x=>x.bytes.reduce((n,v,i)=>n+(i%4!==3?Math.abs(v-clean.bytes[i]):0),0);
  assert.ok(difference(bad)>difference(mid)*3,kind);
  assert.ok(bad.bytes.every((v,i)=>i%4!==3||v===255));
 }
 const base=new THREE.MeshStandardMaterial(),m=exteriorAgeMaterial(base,'asphalt',240,80,17,100,{x:-20,y:32});
 assert.equal(m.material.map,m.texture);assert.equal(m.texture.repeat.x,32/240);assert.equal(m.texture.offset.x,20/240);
 assert.equal(exteriorAgeMaterial(base,'asphalt',240,80,17,0),undefined);
 m.material.dispose();m.texture.dispose();base.dispose();
});
test('floor decay accelerates strongly in the second half without universal opaque coverage',()=>{
 for(const [archetype,purpose] of [['clinic','exam'],['apartment','living'],['utility','equipment']]){
  const room={id:'r',x:0,y:0,w:96,h:96,kind:'room',purpose,tone:0};
  const site={seed:119,archetype,rooms:[room],doors:[],walls:[],cover:[]};
  const levels=[0,25,50,75,100].map(n=>alpha(conditionFloorPixels(site,room,n)));
  assert.equal(levels[0],0);assert.ok(levels.slice(1).every((v,i)=>v>levels[i]));
  assert.ok(levels[4]>levels[2]*3,archetype);
  assert.ok(levels[4]<64*64*255*.7,archetype);
 }
});

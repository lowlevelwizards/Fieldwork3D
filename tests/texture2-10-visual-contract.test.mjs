import test from 'node:test';
import assert from 'node:assert/strict';
import {PIXEL_SURFACES,pixelPattern} from '../src/rendering/pixel-recipes.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
import {roomPixelSurface,zonePixelSurface,wallPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear,WEAR_BUDGET} from '../src/worldgen/environment-wear.ts';
const variance=(p)=>{
 let min=255,count=0,sum=0;
 for(let i=0;i<p.length;i+=4){min=Math.min(min,p[i]);count++;sum+=p[i];}
 return {darkening:255-sum/count,maxDarkening:255-min};
};
test('materials preserve baseline hues and controlled contrast',()=>{
 for(const k of PIXEL_SURFACES){
  const p=pixelPattern(k,1),v=variance(p);
  assert.ok(v.maxDarkening<=materialProfile(k).maxDarkening+2,k);
  assert.ok(v.darkening<=15,k+' adds too much global visual noise');
 }
 for(const k of ['plaster','linoleum','porcelain','plastic','asphalt']){
  assert.ok(variance(pixelPattern(k,0)).darkening<2,k);
 }
});
test('six fixed environments retain readable material semantics',()=>{
 const sites=[
  ['clinic',120],['garage',126],['restaurant',128],
  ['apartment',134],['utility',141],['office',158]
 ];
 for(const [kind,seed] of sites){
  const site=generateSite(seed);
  assert.ok(site,kind);
  assert.ok(wallPixelSurface(kind));
  assert.ok(roomPixelSurface(kind,kind==='clinic'?'exam':'hall'));
  assert.ok(planEnvironmentalWear(site).length<=WEAR_BUDGET[site.condition??'occupied']);
 }
 assert.equal(roomPixelSurface('clinic','exam'),'linoleum');
 assert.equal(zonePixelSurface('yard'),'grass');
 assert.equal(wallPixelSurface('clinic'),'plaster');
});

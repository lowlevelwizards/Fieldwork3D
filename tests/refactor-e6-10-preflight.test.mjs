import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
import {ColdRendererTrace} from '../src/rendering/breach-cold-renderer-trace.ts';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('E6.10 boot config enables scene preflight with explicit baseline opt-out',()=>{
 const defaultBoot=parseBreachBootConfig('');
 assert.equal(defaultBoot.coldPrewarmEnabled,true);
 assert.equal(parseBreachBootConfig('?coldPrewarm=0').coldPrewarmEnabled,false);
 assert.equal(parseBreachBootConfig('?gpuWarmup=0').gpuWarmupEnabled,false);
 assert.equal(parseBreachBootConfig('?coldPrewarm=1').coldPrewarmEnabled,true);
 assert.ok(Object.isFrozen(defaultBoot));
});

test('E6.10 direct drawing reuses prepared presentation without a second update',()=>{
 const main=src('src/breach-main.ts');
 const stage=src('src/breach-3d.ts');
 const loader=src('src/breach-quickplay-controller.ts');
 assert.match(main,/prepareFirstFrame:\(\)=>\{/);
 assert.match(main,/stage\.update\(state,selected,0,doorFocusId[\s\S]*?null,null,null,null,true\)/);
 assert.match(main,/!stage\.drawPreparedColdFrame\(\)/);
 assert.match(stage,/drawPreparedColdFrame\(\):boolean\{/);
 assert.match(stage,/if\(deferFirstDraw&&camera===this\.projectionCamera&&masked\.length===0\)/);
 assert.match(stage,/this\.preparedColdFrame=\{camera,at:s\.seconds\}/);
 assert.match(stage,/this\.preparedColdFrame=null;[\s\S]*?this\.displayedSite=site/);
 assert.match(loader,/config\.boot\.coldPrewarmEnabled/);
 assert.match(loader,/coldTrace\.capture\('preflight'/);
 assert.match(loader,/config\.prepareFirstFrame\(\)/);
 assert.ok(loader.indexOf('config.prepareFirstFrame()')<
   loader.indexOf('stage.renderer.compileAsync(stage.scene,stage.camera)'));
 assert.match(loader,/Quick Play preflight fallback/);
 assert.match(loader,/config\.renderFirstFrame\(\)/);
 assert.doesNotMatch(loader,/shadowMap\.enabled=false|renderer\.setPixelRatio\(/);
});

test('E6.10 traces preflight independently and preserves base cold hooks',()=>{
 const gl={getProgramInfoLog:()=>'',linkProgram:()=>{}};
 let count=0;
 const trace=new ColdRendererTrace(gl,0,()=>({
  programs:count,geometries:0,textures:0
 }));
 trace.capture('preflight',()=>{count=1;});
 trace.capture('firstFrame',()=>gl.getProgramInfoLog());
 const output=trace.finish();
 assert.equal(output.captures.length,2);
 assert.equal(output.captures[0].phase,'preflight');
 assert.equal(output.captures[0].resourcesAfter.programs,1);
 assert.equal(output.captures[1].calls.getProgramInfoLog.count,1);
 assert.equal(trace.closed,true);
});

/** Lightweight architecture contract checks: deterministic core modules must not
 * depend on presentation, entrypoints, browser APIs, or THREE.
 * This checks a narrow list of intentionally pure extracted boundaries; it is
 * not a sweeping lint rule for legacy modules in migration.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const modules=[
 'src/breach-world-context.ts',
 'src/breach-ai-visual-evidence.ts',
 'src/breach-shot-ignition.ts',
 'src/breach-locomotion-clearance.ts',
 'src/breach-order-utility.ts'
];
for(const path of modules){
 const text=readFileSync(path,'utf8');
 const imports=[...text.matchAll(/(?:^|\n)\s*import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g)]
   .map(match=>match[1]);
 for(const source of imports){
  assert.ok(!/(?:^|\/)breach-main(?:\.ts)?$/.test(source),
    `${path} must not import the application entrypoint: ${source}`);
  assert.ok(!/(?:^|\/)breach-3d(?:\.ts)?$/.test(source),
    `${path} must not import the 3D scene: ${source}`);
  assert.ok(!/(?:^|\/)ui\//.test(source),
    `${path} must not import a UI component: ${source}`);
  assert.ok(source!=='three'&&!source.startsWith('three/'),
    `${path} must not import a rendering engine: ${source}`);
 }
 assert.ok(!/\b(?:document|window|localStorage|requestAnimationFrame)\s*\./.test(text),
   `${path} must be usable without browser globals`);
}
console.log('Architecture boundaries verified for '+modules.length+' deterministic core modules.');

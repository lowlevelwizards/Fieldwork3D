import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');

test('tactical camera allows optional tighter zoom without changing normal framing',()=>{
 assert.match(scene,/private readonly minZoom=\.65;/);
 assert.match(scene,/private readonly maxZoom=8\.0;/);
 assert.match(scene,/this\.view\.zoom=THREE\.MathUtils\.clamp\(this\.view\.zoom\*factor,\s*this\.minZoom,this\.maxZoom\)/);
 assert.match(scene,/this\.view\.zoom=this\.displayedSite\?1\.48:1\.25;/);
});

test('tactical orbit can descend to 25 degrees while preserving overhead ceiling',()=>{
 assert.match(scene,/this\.view\.pitch-dy\*\.004,25\*Math\.PI\/180,Math\.PI\/2\)/);
 assert.match(scene,/if\(mode==='top'\)this\.view\.pitch=Math\.PI\/2;/);
 assert.match(scene,/else if\(mode==='iso'\)this\.view\.pitch=55\*Math\.PI\/180;/);
 assert.match(scene,/this\.view\.mode='iso';/);
});

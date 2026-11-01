import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../asset-lab.html',import.meta.url),'utf8');
test('material lab has non-inert selectors and zoom controls',()=>{
 for(const id of ['material-family','surface-condition','texture-variant',
  'zoom-close','zoom-tactical','zoom-overview','textures','pixel-swatch'])
  assert.ok(html.includes('id="'+id+'"'),id);
});

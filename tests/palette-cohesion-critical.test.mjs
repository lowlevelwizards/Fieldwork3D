import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {OPERATOR_SOLID_FAMILIES,tonedOperatorSolid} from '../src/operator-solid-color-families.ts';
import {GARMENT_SOLID_COLORS,FABRIC_SOLID_CHOICES,garmentSolidHex} from '../src/operator-garment-color-policy.ts';
import {HEADWEAR_SOLID_COLORS,HEADWEAR_ALLOWED_SOLIDS,resolvedHeadwearSolid} from '../src/operator-headwear-colors.ts';
import {D2_FACE_SOLID_COLORS,D2_MASK_COLORS,D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
import {garmentColorValues,TOP_COLORWAYS} from '../src/operator-upper-colorways.ts';

const repoText=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const headwearAlias={'foliage-green':'foliage','desert-tan':'tan','coyote-brown':'coyote'};

test('each garment solid is exactly the canonical shared family value',()=>{
 for(const [id,{hex}] of Object.entries(GARMENT_SOLID_COLORS)){
  assert.equal(hex,OPERATOR_SOLID_FAMILIES[id],id);
  assert.equal(garmentSolidHex(id),hex,id);
 }
 assert.equal(Object.keys(GARMENT_SOLID_COLORS).length,16);
 assert.equal(FABRIC_SOLID_CHOICES.top.length,16);
 assert.equal(FABRIC_SOLID_CHOICES.trousers.length,16);
});

test('approved headwear labels, eligibility and saved IDs stay intact',()=>{
 assert.equal(Object.keys(HEADWEAR_SOLID_COLORS).length,12);
 for(const [id,{hex}] of Object.entries(HEADWEAR_SOLID_COLORS)){
  assert.equal(hex,OPERATOR_SOLID_FAMILIES[headwearAlias[id]??id],id);
 }
 assert.deepEqual(HEADWEAR_ALLOWED_SOLIDS['soviet-steel'],['soviet-4bo','postwar-green']);
 assert.equal(resolvedHeadwearSolid('soviet-steel','soviet-4bo'),'soviet-4bo');
 assert.equal(resolvedHeadwearSolid('ach','unsupported'),'olive-drab');
 assert.equal(resolvedHeadwearSolid('high-cut','ranger-green'),'ranger-green');
});

test('historical signature identities stay distinguishable',()=>{
 assert.notEqual(OPERATOR_SOLID_FAMILIES['soviet-4bo'],OPERATOR_SOLID_FAMILIES['olive-drab']);
 assert.notEqual(OPERATOR_SOLID_FAMILIES['nutria-brown'],OPERATOR_SOLID_FAMILIES.coyote);
 assert.notEqual(OPERATOR_SOLID_FAMILIES['field-green'],OPERATOR_SOLID_FAMILIES['ranger-green']);
 assert.notEqual(OPERATOR_SOLID_FAMILIES.black,OPERATOR_SOLID_FAMILIES.charcoal);
});

test('face-fabric tint inherits a solid family while masks and lenses remain specialized',()=>{
 assert.equal(D2_FACE_SOLID_COLORS.black.hex,tonedOperatorSolid('black',.85));
 assert.equal(D2_FACE_SOLID_COLORS.olive.hex,tonedOperatorSolid('olive-drab',.85));
 assert.equal(D2_FACE_SOLID_COLORS.foliage.hex,tonedOperatorSolid('foliage',.78));
 assert.equal(D2_MASK_COLORS.black.hex,0x23282a);
 assert.equal(D2_LENS_MATERIALS.amber.hex,0xb2883a);
 assert.equal(D2_LENS_MATERIALS.clear.opacity,.31);
});

test('combat-shirt and smock solids inherit the family; Gorka pairs remain authored',()=>{
 assert.equal(garmentColorValues('combat-shirt','standard').combat,OPERATOR_SOLID_FAMILIES.tan);
 assert.equal(garmentColorValues('combat-shirt','ranger').combat,OPERATOR_SOLID_FAMILIES['ranger-green']);
 assert.equal(garmentColorValues('smock-jacket','khaki').smock,OPERATOR_SOLID_FAMILIES.khaki);
 assert.equal(garmentColorValues('smock-jacket','black').smock,tonedOperatorSolid('black',1.25));
 assert.equal(garmentColorValues('gorka-jacket','standard').gorkaPanel,0x59483b);
 assert.equal(garmentColorValues('gorka-jacket','ss-leto').specialty,'ss-leto');
 assert.equal(TOP_COLORWAYS['gorka-jacket'].length,9);
});

test('all major active UI screens import and use the canonical theme',()=>{
 const theme=repoText('src/ui/fieldwork-design.css');
 for(const token of ['--fw-bg','--fw-panel-deep','--fw-panel-raised','--fw-control-bg',
  '--fw-interactive','--fw-control-active','--fw-text','--fw-sage','--fw-mint',
  '--fw-brass','--fw-focus','--fw-warning']){
  assert.ok(theme.includes(token+':'),token);
 }
 for(const file of ['src/breach-style.css','src/campaign-style.css','src/operator-studio.css',
  'src/operator-appearance-grid.css','src/operator-material-browser.css',
  'src/operator-headwear-picker.css','src/operator-fabric-camo-picker.css',
  'src/ui/ux-r1-sheets.css']){
  const css=repoText(file);
  assert.match(css,/^@import\s+'\.\/(?:ui\/)?fieldwork-design\.css';/,file);
  assert.match(css,/var\(--fw-(?:bg|panel|control|interactive|text|sage|mint|brass|focus|warning)/,file);
 }
});

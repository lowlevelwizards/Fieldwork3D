import test from 'node:test';
import assert from 'node:assert/strict';
import {readWardrobe,initialWardrobe,wardrobeItem}
 from '../src/operator-wardrobe-data.ts';
import {policeVisorFit} from '../src/operator-police-visor-policy.ts';
import {resolveFactionReference} from '../src/faction-reference-resolver.ts';
import {readFileSync} from 'node:fs';

test('D7 retired police visor is absent from the live head renderer',()=>{
 const source=readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',
  import.meta.url),'utf8');
 assert.doesNotMatch(source,/createPoliceVisor|updatePoliceVisor|PoliceVisorLayers/);
 assert.equal(wardrobeItem('headwear','police-helmet'),undefined);
});

test('D7 older visor data remains readable but no separate shell is instantiated',()=>{
 const prior={...initialWardrobe(),styles:{headwear:'police-helmet'},
  headwearColor:'black',policeVisorPosition:'lowered',
  policeVisorTint:'smoke',policeVisorFrame:'reinforced'};
 const next=readWardrobe(prior);
 assert.equal(next.styles.headwear,'mich-2001');
 assert.equal(next.headwearColor,'black');
 // Legacy visor data may be retained as an inert preference.
 assert.equal(next.policeVisorPosition,'lowered');
 assert.deepEqual(readWardrobe(next),next);
 assert.equal(resolveFactionReference('us-swat-2015').wardrobe.policeVisorPosition,
  undefined);
});

test('D7 legacy police visor fit metadata remains isolated from new ballistic kit',()=>{
 assert.equal(policeVisorFit('mich-2001','face-none','eyes-none',
  'comms-none').compatible,false);
 assert.equal(policeVisorFit('police-helmet','face-none','eyes-none',
  'comms-none').compatible,true);
});

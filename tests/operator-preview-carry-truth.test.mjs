import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('operator preview uses shared magazine placement authority and shotgun rules',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(lab,/carryPlacementLedger\(kit,sample\)/);
 assert.match(lab,/weapon==='shotgun'\?0/);
 assert.match(lab,/magazineSelector\.disabled=shotgun/);
 assert.match(lab,/medicalCarryLocation:currentCarry\.find/);
 assert.match(lab,/utilityCarryLocation:currentCarry\.find/);
 assert.doesNotMatch(lab,/magazineFixture\(/);
});

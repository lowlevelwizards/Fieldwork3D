import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doctrineForPurpose,doctrineInitialMorale,doctrinePersonality}
 from '../src/breach-ai-doctrine.ts';
import {coordinationLeaseSeconds} from '../src/breach-ai-team-commitment.ts';
test('R6.4 actual encounter groups determine doctrine, not art faction',()=>{
 assert.equal(doctrineForPurpose('organised'),'organised');
 assert.equal(doctrineForPurpose('security'),'security');
 assert.equal(doctrineForPurpose('occupants'),'irregular');
 assert.equal(doctrineForPurpose(undefined),'irregular');
});
test('R6.4 same seed draw produces purpose-specific temperament and resolve',()=>{
 assert.equal(doctrinePersonality('irregular','occupant',.45),'aggressor');
 assert.equal(doctrinePersonality('organised','occupant',.45),'guard');
 assert.equal(doctrinePersonality('security','occupant',.75),'cautious');
 assert.equal(doctrinePersonality('organised','investigator',.5),'aggressor');
 assert.equal(doctrinePersonality('security','reserve',.5),'cautious');
 assert.ok(doctrineInitialMorale('organised',0)>
  doctrineInitialMorale('irregular',0));
 assert.equal(doctrinePersonality('organised','occupant',.45),
   doctrinePersonality('organised','occupant',.45));
});
test('R6.4 organised responders keep personally delivered duties longer',()=>{
 const irregular=coordinationLeaseSeconds('watch',80);
 const security=coordinationLeaseSeconds('watch',80,'security');
 const organised=coordinationLeaseSeconds('watch',80,'organised');
 assert.ok(organised>security&&security>irregular);
 assert.equal(irregular,coordinationLeaseSeconds('watch',80,'irregular'));
 const session=readFileSync(new URL('../src/breach-session-factory.ts',import.meta.url),'utf8');
 const ctrl=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(session,/doctrinePersonality\(doctrine,spec\?\.role,enemyRng\(\)\)/);
 assert.match(ctrl,/doctrineForPurpose\(purpose\)/);
});

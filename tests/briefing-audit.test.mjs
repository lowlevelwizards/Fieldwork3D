import test from 'node:test';
import assert from 'node:assert/strict';
import {auditBriefingVariations} from '../src/briefing/briefing-audit.ts';
import {operationBrief} from '../src/breach-operations.ts';
const truth={schema:1,seed:11,missionKind:'clear',building:'retail',
 subtype:'hardware-store',siteName:'SITE',scale:'small',propertyCondition:'occupied',
 premise:'incident',encounterProfile:'active',risk:1,riskFromContract:false,
 intelMode:'exterior-known',roomCount:5,hostileCount:4,
 armedProfileCount:{ordinary:4,security:0,prepared:0},
 activeCivilianCount:0,rescueTargetPresent:false,captureTargetPresent:false,
 objective:operationBrief('clear'),entryId:'FRONT'};
test('B7: audit varies twenty-four documents without touching the physical mission',()=>{
 const before=structuredClone(truth);
 const audit=auditBriefingVariations(truth,24);
 assert.equal(audit.samples,24);
 assert.ok(audit.uniqueFamilies>=2);
 assert.ok(audit.uniqueTitles>=10);
 assert.deepEqual(audit.validationErrors,[]);
 assert.deepEqual(truth,before);
 assert.deepEqual(auditBriefingVariations(truth,24),audit);
});

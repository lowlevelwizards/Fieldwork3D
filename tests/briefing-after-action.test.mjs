import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileIntelligence} from '../src/briefing/briefing-after-action.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {operationBrief} from '../src/breach-operations.ts';

const facts={schema:1,seed:123,missionKind:'intel',building:'warehouse',
 subtype:'distribution',siteName:'AUDIT',scale:'small',propertyCondition:'occupied',
 premise:'guarded',encounterProfile:'prepared',risk:2,riskFromContract:false,
 intelMode:'true-blind',roomCount:6,hostileCount:5,
 armedProfileCount:{ordinary:5,security:0,prepared:0},activeCivilianCount:0,
 rescueTargetPresent:false,captureTargetPresent:false,
 objective:operationBrief('intel'),entryId:'FRONT'};

test('B8: successful operation reconciles report with verified encounter count',()=>{
 const d=createOperationDossier(facts,{quality:'high'});
 const report=reconcileIntelligence(d,{outcome:'success',confirmedVisually:3,
   heardOnly:1,totalHostiles:5});
 assert.match(report,/Encounter record: 5 armed occupants/);
 assert.match(report,/3 hostile contacts visually identified/);
 assert.match(report,/BRIEFED/);
});
test('B8: failed mission never reveals hidden population for retry',()=>{
 const d=createOperationDossier(facts,{quality:'low'});
 const report=reconcileIntelligence(d,{outcome:'failure',confirmedVisually:1,
   heardOnly:0,totalHostiles:5});
 assert.match(report,/full opposing force remains undisclosed/);
 assert.doesNotMatch(report,/Encounter record: 5/);
 assert.match(report,/Initial threat reporting was incomplete/);
});
test('B8: legacy missions without a dossier produce no review',()=>{
 assert.equal(reconcileIntelligence(undefined,{outcome:'success',
   confirmedVisually:2,heardOnly:1,totalHostiles:3}),'');
});

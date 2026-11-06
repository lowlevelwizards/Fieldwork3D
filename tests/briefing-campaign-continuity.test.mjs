import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCampaignDossierContext} from '../src/briefing/campaign-context.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {operationBrief} from '../src/breach-operations.ts';
const facts={schema:1,seed:76,missionKind:'hold',building:'warehouse',subtype:'distribution',
 siteName:'FACILITY',scale:'standard',propertyCondition:'occupied',
 premise:'guarded',encounterProfile:'prepared',risk:3,riskFromContract:true,
 intelMode:'floor-plan',roomCount:8,hostileCount:4,
 armedProfileCount:{ordinary:4,security:0,prepared:0},
 activeCivilianCount:0,rescueTargetPresent:false,captureTargetPresent:false,
 objective:operationBrief('hold'),entryId:'FRONT'};
test('B9: Campaign briefing references only actually recorded follow-up outcomes',()=>{
 const dossier=createOperationDossier(facts);
 const active={id:'c2',seed:76,kind:'hold',title:'Defensive Action',
   region:'Cutwoods',risk:3,followUpOf:'c1'};
 const previous={id:'c1',seed:11,kind:'capture',title:'Target Recovery',
   region:'Cutwoods',risk:2};
 const campaign={activeContractId:'c2',day:9,contracts:[previous,active],
   history:[{contractId:'c1',outcome:'success'}]};
 const contextual=attachCampaignDossierContext(dossier,campaign);
 assert.equal(contextual.campaign.contractId,'c2');
 assert.equal(contextual.campaign.followUp.title,'Target Recovery');
 assert.equal(contextual.campaign.followUp.outcome,'success');
 assert.deepEqual(contextual.rendered,dossier.rendered);
 const without=attachCampaignDossierContext(dossier,{...campaign,history:[]});
 assert.equal(without.campaign.followUp,undefined);
 assert.equal(attachCampaignDossierContext(dossier,null),dossier);
});

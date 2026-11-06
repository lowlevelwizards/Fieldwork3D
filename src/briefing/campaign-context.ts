/** Campaign case continuity from REAL contract and operation history only. */
import type {CampaignState} from '../campaign-state.ts';
import type {OperationDossierV1} from './briefing-types.ts';

export function attachCampaignDossierContext(
  dossier:OperationDossierV1,campaign:CampaignState|null
):OperationDossierV1{
  const job=campaign?.contracts.find(c=>c.id===campaign.activeContractId);
  if(!job||!campaign)return dossier;
  const previous=job.followUpOf?
    campaign.contracts.find(c=>c.id===job.followUpOf):undefined;
  const report=previous?
    campaign.history.find(r=>r.contractId===previous.id):undefined;
  const followUp=previous&&report?{
    contractId:previous.id,title:previous.title,outcome:report.outcome
  }:undefined;
  return {
    ...dossier,
    campaign:{
      contractId:job.id,title:job.title,region:job.region,
      risk:job.risk,day:campaign.day,followUp
    }
  };
}

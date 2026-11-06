/** Narrative after-action review. Failure never reveals unobserved defenders. */
import type {Session} from '../breach-game.ts';
import type {OperationDossierV1} from './briefing-types.ts';

export type IntelReconciliationInput={
  outcome:'success'|'failure';
  confirmedVisually:number;
  heardOnly:number;
  totalHostiles:number;
};
export function reconcileIntelligence(
  dossier:OperationDossierV1|undefined,
  input:IntelReconciliationInput
):string{
  if(!dossier)return '';
  const threat=dossier.claims.find(c=>c.id==='threat');
  const lines=[
    'BRIEFED / '+dossier.incident.name.toUpperCase(),
    threat?.text??'No premission armed-occupancy report was available.',
    'OBSERVED',
    input.confirmedVisually+' hostile contact'+
      (input.confirmedVisually===1?'':'s')+' visually identified'+
      (input.heardOnly?' · '+input.heardOnly+' additional audio-only contact'+
        (input.heardOnly===1?'':'s'):'')+'.'
  ];
  if(input.outcome==='success'){
    lines.push('POST-OPERATION REVIEW',
      'Encounter record: '+input.totalHostiles+' armed occupant'+
        (input.totalHostiles===1?'':'s')+
        '. Intelligence quality: '+dossier.classification.reportQuality.toUpperCase()+'.');
  }else{
    lines.push('POST-OPERATION REVIEW',
      'Incomplete operation. The full opposing force remains undisclosed; '+
        'only the squad\'s observed contacts are listed.');
  }
  if(dossier.classification.reportQuality==='low')
    lines.push('LIMITATION','Initial threat reporting was incomplete.');
  else if(dossier.classification.reportQuality==='medium')
    lines.push('LIMITATION','Premission threat reporting was provisional.');
  return lines.join('\n');
}
export function sessionIntelligenceReview(s:Session):string{
  if(!s.operationDossier)return '';
  const ids=new Set(s.operators.filter(a=>a.side==='red').map(a=>a.id));
  const known=[...s.known.entries()].filter(([id])=>ids.has(id));
  return reconcileIntelligence(s.operationDossier,{
    outcome:s.phase==='won'?'success':'failure',
    confirmedVisually:known.filter(([,v])=>v.status==='seen').length,
    heardOnly:known.filter(([,v])=>v.status==='heard').length,
    totalHostiles:ids.size
  });
}

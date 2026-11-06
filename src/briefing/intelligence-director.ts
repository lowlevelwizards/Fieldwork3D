/** Intelligence is a report of world facts, never an x-ray into hidden actors. */
import type {IntelClaim,MissionTruth,ReportQuality} from './briefing-types.ts';

export function intelligenceClaims(truth:MissionTruth,quality:ReportQuality):IntelClaim[]{
  const claims:IntelClaim[]=[];
  const threat=quality==='high'
    ? truth.hostileCount>=3?'Multiple armed occupants have been reported at the property.':
      truth.hostileCount===2?'Two armed occupants have been reported at the property.':
      truth.hostileCount===1?'An armed occupant has been reported at the property.':
      'No armed occupants have been confirmed by responding personnel.'
    :quality==='medium'
      ? truth.hostileCount===0?'Armed occupancy has not been established.':
        'Armed occupants may be present; their number and disposition remain uncertain.'
      :'Reliable information about armed occupancy is unavailable.';
  claims.push({id:'threat',text:threat,
    source:quality==='high'?'patrol':quality==='medium'?'witness':'dispatch',
    confidence:quality==='high'?'credible':quality==='medium'?'unverified':'unknown',
    provenance:'resolved hostileCount; quality '+quality,disclosure:'general'});
  if(truth.activeCivilianCount>0){
    claims.push({id:'civilian-presence',
      text:quality==='high'?'Civilians have been reported at the property.':
        quality==='medium'?'Civilian occupancy is possible.':
          'No reliable civilian occupancy report is available.',
      source:quality==='high'?'patrol':quality==='medium'?'witness':'dispatch',
      confidence:quality==='high'?'credible':quality==='medium'?'unverified':'unknown',
      provenance:'resolved activeCivilianCount; quality '+quality,disclosure:'general'});
  }
  if(truth.rescueTargetPresent&&truth.missionKind==='rescue'){
    claims.push({id:'rescue-assignment',
      text:'The designated individual is the priority for contact and extraction.',
      source:'dispatch',confidence:'confirmed',
      provenance:'resolved rescueTargetPresent',disclosure:'general'});
  }
  if(truth.intelMode==='floor-plan'||truth.intelMode==='full-view'){
    claims.push({id:'floor-plan',text:
      'Available plans document '+truth.roomCount+' internal spaces.',
      source:'records',confidence:'confirmed',
      provenance:'roomCount / floor-plan authorization',disclosure:'floor-plan'});
  }else{
    claims.push({id:'layout-unknown',
      text:truth.intelMode==='exterior-known'?
        'Exterior information is available; the interior remains uncharted.':
        'No verified architectural plan has been provided.',
      source:'records',confidence:'unknown',
      provenance:'intelMode '+truth.intelMode,disclosure:'general'});
  }
  if(quality==='high'&&truth.encounterProfile==='prepared'&&truth.hostileCount>0)
    claims.push({id:'prepared-resistance',
      text:'Available reporting suggests the occupants may be prepared for an attempted entry.',
      source:'patrol',confidence:'credible',
      provenance:'encounterProfile prepared',disclosure:'general'});
  if(quality!=='low'&&truth.propertyCondition==='vacant')
    claims.push({id:'vacant-record',
      text:'Property records list the site as vacant; current use may differ.',
      source:'records',confidence:'credible',
      provenance:'propertyCondition vacant',disclosure:'general'});
  return claims;
}

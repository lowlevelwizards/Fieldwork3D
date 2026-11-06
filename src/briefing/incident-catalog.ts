/** Authored incident motives. Restrictive gates take precedence over weights. */
import type {IncidentDefinition,MissionTruth} from './briefing-types.ts';

export const INCIDENTS:readonly IncidentDefinition[]=[
  {
    id:'warrant-service',name:'High-Risk Warrant',missions:['capture'],
    buildings:['house','townhouse','apartment','motel','office','retail','garage'],
    premises:['hideout','guarded','disturbance','incident','after-hours'],
    needs:'capture-target',weight:7,
    leads:[
      'A wanted subject has been connected to this address during an ongoing investigation.',
      'Investigators have traced a designated suspect to a property in the area.',
      'Recent case information points to this address as a possible location for a wanted individual.'
    ],
    contexts:[
      'The team has been tasked with locating the subject and establishing control of the site.',
      'The subject\'s present movements and any associates remain unconfirmed.',
      'Available reports do not establish whether additional people are present.'
    ],
  },
  {
    id:'missing-person',name:'Missing Person',missions:['rescue'],
    buildings:['house','townhouse','apartment','motel','clinic','office','restaurant'],
    premises:['incident','disturbance','routine','after-hours','hideout'],
    needs:'rescue-target',weight:7,
    leads:[
      'A person associated with this property has not responded to recent attempts at contact.',
      'An inquiry into a missing individual has identified this location as a point of interest.',
      'A request for assistance has led the response team to this address.'
    ],
    contexts:[
      'The immediate priority is locating the designated individual and bringing them to safety.',
      'Circumstances surrounding the loss of contact have not been established.',
      'The team should establish contact with the designated person before extraction.'
    ],
  },
  {
    id:'evidence-seizure',name:'Evidence Seizure',missions:['intel'],
    buildings:['office','retail','garage','warehouse','restaurant','clinic','motel','house','townhouse','apartment'],
    weight:7,
    leads:[
      'An ongoing investigation has identified material believed to be stored at this location.',
      'Investigators have designated the property for a time-sensitive evidence recovery.',
      'A case review has established this site as a possible source of relevant records.'
    ],
    contexts:[
      'The assignment is to secure the marked intelligence package and withdraw.',
      'The exact activities of any occupants are not reliably established.',
      'Avoid unnecessary delay once the designated material has been secured.'
    ],
  },
  {
    id:'generic-clear',name:'Security Sweep',missions:['clear'],weight:1,
    leads:['The location has been designated for an armed security operation.'],
    contexts:['Establish control of hostile threats before securing the objective.']
  },
  {
    id:'generic-intel',name:'Intelligence Recovery',missions:['intel'],weight:1,
    leads:['Investigators have identified this property as relevant to an active inquiry.'],
    contexts:['Secure the designated intelligence package and return to extraction.']
  },
  {
    id:'generic-rescue',name:'Personnel Recovery',missions:['rescue'],weight:1,
    needs:'rescue-target',
    leads:['A designated person is believed to need assistance at this location.'],
    contexts:['Establish contact and complete the required extraction.']
  },
  {
    id:'generic-hold',name:'Defensive Assignment',missions:['hold'],weight:1,
    leads:['The team has been ordered to establish and maintain control of a designated location.'],
    contexts:['Resistance may disrupt the required security hold.']
  },
  {
    id:'generic-capture',name:'Target Recovery',missions:['capture'],weight:1,
    needs:'capture-target',
    leads:['A designated subject has been identified for a targeted operation.'],
    contexts:['Secure the designated target and complete the extraction requirements.']
  }
] as const;

export function isIncidentEligible(truth:MissionTruth,def:IncidentDefinition):boolean{
  if(!def.missions.includes(truth.missionKind))return false;
  if(def.buildings&&!def.buildings.includes(truth.building as never))return false;
  if(def.premises&&!def.premises.includes(truth.premise as never))return false;
  if(def.needs==='capture-target'&&!truth.captureTargetPresent)return false;
  if(def.needs==='rescue-target'&&!truth.rescueTargetPresent)return false;
  return true;
}
export function eligibleIncidents(truth:MissionTruth):IncidentDefinition[]{
  return INCIDENTS.filter(def=>isIncidentEligible(truth,def));
}

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
  // CLEAR: distinct reasons for securing a physical site.
  {
    id:'after-hours-sweep',name:'After-Hours Security Sweep',missions:['clear'],
    buildings:['retail','office','garage','clinic','restaurant','warehouse'],
    premises:['after-hours','disturbance','incident','guarded'],weight:5,
    leads:[
      'An after-hours report has prompted a security response at this property.',
      'An irregularity at a commercial address has triggered a request for a site sweep.',
      'The property was flagged after reports of unauthorized activity outside normal hours.'
    ],
    contexts:[
      'Current occupancy has not been reliably established; the team must secure the designated area.',
      'Available reporting does not identify every person who may be inside.',
      'Responding units have been instructed to clear threats and secure the marked objective.'
    ]
  },
  {
    id:'compromised-hideout',name:'Compromised Hideout',missions:['clear'],
    buildings:['house','townhouse','apartment','motel','warehouse'],
    premises:['hideout','guarded','vacant','incident'],weight:5,
    leads:[
      'Investigators suspect this property has been used as a temporary staging address.',
      'A location linked to a wider inquiry has been referred for tactical clearance.',
      'Recent case information points to this building as a possible concealed meeting site.'
    ],
    contexts:[
      'The site has not been fully surveyed; establish security before assessing the objective.',
      'The identities and intentions of any remaining occupants are not confirmed.',
      'The assigned team must secure the site without assuming the original reports are complete.'
    ]
  },
  {
    id:'shipment-security',name:'Shipment-Site Security',missions:['clear'],
    buildings:['warehouse','garage','utility','retail'],
    premises:['guarded','after-hours','incident','defensive'],weight:5,
    leads:[
      'A storage and handling site has been connected to a disputed shipment inquiry.',
      'A report involving restricted inventory has placed this facility under scrutiny.',
      'Investigators have requested control of a commercial handling location.'
    ],
    contexts:[
      'The team is assigned to remove immediate threats and establish control of the premises.',
      'The condition of any inventory is outside the present assignment.',
      'The number of persons currently using the property is not confirmed.'
    ]
  },
  {
    id:'facility-reclamation',name:'Facility Reclamation',missions:['clear'],
    buildings:['clinic','office','restaurant','retail','motel','utility'],
    weight:4,
    leads:[
      'Operations has ordered a controlled sweep of a facility whose security status is disputed.',
      'A site formerly in routine use has been designated for immediate security assessment.',
      'A property access dispute has escalated to a tactical clearance assignment.'
    ],
    contexts:[
      'The mission is limited to securing the designated location and any active opposition.',
      'Intelligence does not establish the full disposition of current occupants.',
      'Restore control of the property before the response is declared complete.'
    ]
  },
  // CAPTURE: all require an actually instantiated target.
  {
    id:'fugitive-lead',name:'Fugitive Lead',missions:['capture'],
    buildings:['house','townhouse','apartment','motel','warehouse','garage'],
    premises:['hideout','after-hours','routine','incident'],needs:'capture-target',weight:6,
    leads:[
      'A new lead places a person sought by investigators at this address.',
      'A wanted individual has been connected to a recently identified property.',
      'Case officers have authorized a targeted apprehension attempt.'
    ],
    contexts:[
      'A confirmed positive identification is required before the target is secured.',
      'Additional occupants or associates have not been reliably identified.',
      'The team should prioritize securing the designated individual over unnecessary engagements.'
    ]
  },
  {
    id:'organizer-apprehension',name:'Organizer Apprehension',missions:['capture'],
    buildings:['warehouse','garage','office','utility','restaurant'],
    premises:['guarded','defensive','incident','hideout'],needs:'capture-target',weight:5,
    leads:[
      'Investigators have identified a designated subject associated with this operation site.',
      'A suspected coordinator has been linked to a commercial property under investigation.',
      'An intelligence review has prompted a targeted recovery operation.'
    ],
    contexts:[
      'The designated subject must be secured before the operation can be closed.',
      'The status of additional armed occupants remains unverified.',
      'The objective is the individual, not the materials present at the site.'
    ]
  },
  {
    id:'surveillance-intercept',name:'Surveillance Intercept',missions:['capture'],
    buildings:['retail','motel','office','restaurant','apartment'],
    premises:['routine','after-hours','disturbance','incident'],needs:'capture-target',weight:5,
    leads:[
      'Surveillance information has produced a short window for a targeted operation.',
      'Recent reporting has identified a possible temporary location for a wanted subject.',
      'The team has received an assignment to intercept a designated individual.'
    ],
    contexts:[
      'The current movements of associates are uncertain.',
      'The subject must be identified and secured within the existing mission parameters.',
      'The reporting is time-sensitive, but no additional response units are scheduled in this assignment.'
    ]
  },
  // RESCUE: no additional hostages or live civilians are assumed.
  {
    id:'welfare-response',name:'Urgent Welfare Response',missions:['rescue'],
    buildings:['house','townhouse','apartment','clinic','motel'],
    premises:['disturbance','routine','after-hours','incident'],needs:'rescue-target',weight:6,
    leads:[
      'A welfare inquiry has identified a person who may require urgent assistance.',
      'Repeated failures to contact an individual have escalated to a recovery assignment.',
      'A request for a welfare check has been referred for a protected entry.'
    ],
    contexts:[
      'The team must locate the designated individual and reach extraction safely.',
      'The available report does not establish the circumstances of the lost contact.',
      'The priority is contact and extraction; unrelated occupants remain unconfirmed.'
    ]
  },
  {
    id:'isolated-employee',name:'Isolated Worker',missions:['rescue'],
    buildings:['clinic','office','utility','warehouse','restaurant','garage'],
    premises:['incident','after-hours','disturbance','routine'],needs:'rescue-target',weight:5,
    leads:[
      'An employee associated with this facility has been designated for recovery.',
      'A workplace contact report has led to a personnel extraction assignment.',
      'Management records connect the missing individual to this property.'
    ],
    contexts:[
      'No reliable account of the current interior situation is available.',
      'The team is responsible for reaching the designated person and escorting them out.',
      'Do not infer that other employees are still present from the original report.'
    ]
  },
  {
    id:'witness-recovery',name:'Witness Recovery',missions:['rescue'],
    buildings:['retail','motel','office','clinic','restaurant'],
    premises:['guarded','hideout','incident','disturbance'],needs:'rescue-target',weight:5,
    leads:[
      'A protected individual has been associated with a location requiring a controlled extraction.',
      'A sensitive witness contact has become a personnel recovery assignment.',
      'Case officers have directed the team to retrieve a designated individual.'
    ],
    contexts:[
      'The team should make contact before attempting the designated extraction.',
      'No additional witnesses are assumed to be present.',
      'The current threat picture remains provisional pending first contact.'
    ]
  },
  // INTEL: evidence contents remain narrative framing, not extra pickups.
  {
    id:'records-review',name:'Records Retrieval',missions:['intel'],
    buildings:['office','clinic','warehouse','utility','retail'],
    premises:['routine','after-hours','guarded','hideout'],weight:5,
    leads:[
      'Investigators have identified a records location relevant to an active case.',
      'A formal inquiry has requested recovery of a designated documentation package.',
      'Administrative records suggest the site may contain material of evidentiary value.'
    ],
    contexts:[
      'The team must secure the marked intelligence item and withdraw with its carrier.',
      'Additional documents are outside the scope of this assignment.',
      'The current site occupancy picture has not been independently confirmed.'
    ]
  },
  {
    id:'concealed-cache',name:'Concealed Cache',missions:['intel'],
    buildings:['motel','warehouse','house','townhouse','garage','apartment'],
    premises:['hideout','vacant','after-hours','guarded'],weight:5,
    leads:[
      'An intelligence lead has identified a possible cache within this property.',
      'A location associated with concealed records has been marked for a retrieval operation.',
      'New case material points to a designated item stored at the address.'
    ],
    contexts:[
      'The actual condition of the item will be established after recovery.',
      'The team must secure the marked package rather than searching for additional fictional targets.',
      'Occupant numbers and intentions remain uncertain until observed.'
    ]
  },
  {
    id:'equipment-trace',name:'Equipment Trace',missions:['intel'],
    buildings:['warehouse','utility','garage','office','retail'],
    premises:['guarded','after-hours','routine','incident'],weight:5,
    leads:[
      'A technical investigation has led to a site potentially holding relevant equipment records.',
      'Investigators have linked the address to an equipment provenance inquiry.',
      'The operation follows a report concerning materials associated with a broader investigation.'
    ],
    contexts:[
      'The marked intelligence package is the only required recovery item.',
      'Personnel activity at the site has not been reliably established.',
      'Recover the assigned evidence and withdraw without unnecessary delay.'
    ]
  },
  // HOLD: do not promise scripted waves, events, or relief units.
  {
    id:'perimeter-recovery',name:'Perimeter Recovery',missions:['hold'],
    buildings:['house','townhouse','motel','retail','restaurant','clinic'],
    premises:['defensive','guarded','incident','disturbance'],weight:6,
    leads:[
      'The team has been ordered to restore control of a contested site.',
      'A location with uncertain access has been designated for a defensive assignment.',
      'Operations requires a brief, controlled hold at the marked position.'
    ],
    contexts:[
      'Nearby opposition will prevent the position from being considered secure.',
      'Maintain the designated location until the mission hold requirement is satisfied.',
      'The current assignment does not include a programmed relief or reinforcement arrival.'
    ]
  },
  {
    id:'access-control',name:'Access-Control Detail',missions:['hold'],
    buildings:['warehouse','utility','office','garage','clinic'],
    premises:['defensive','guarded','routine','incident'],weight:6,
    leads:[
      'A restricted property has been assigned for temporary access control.',
      'Operations has requested a controlled security hold at a designated facility.',
      'A facility access assessment has escalated to a defensive assignment.'
    ],
    contexts:[
      'Keep the marked position uncontested long enough to satisfy the security requirement.',
      'The perimeter outside the objective area is not the primary scoring condition.',
      'A successful assignment requires control of the designated point, followed by extraction.'
    ]
  },
  {
    id:'site-preservation',name:'Site Preservation',missions:['hold'],
    buildings:['office','clinic','utility','warehouse','retail'],
    premises:['defensive','guarded','after-hours','incident'],weight:5,
    leads:[
      'Investigators require the marked location to be held secure during an active operation.',
      'A designated facility point must be brought under temporary tactical control.',
      'A property central to an inquiry has been assigned a short-duration protection task.'
    ],
    contexts:[
      'Securing other rooms is secondary to maintaining the marked position.',
      'Any opposition within the objective area interrupts the hold requirement.',
      'Withdraw once the hold is complete and the assigned extraction is available.'
    ]
  },
  {
    id:'observation-post',name:'Observation Post',missions:['hold'],
    buildings:['motel','warehouse','house','townhouse','garage','apartment'],
    premises:['defensive','after-hours','guarded','vacant'],weight:5,
    leads:[
      'A suitable position has been selected for a short controlled security operation.',
      'The team has been tasked with occupying a designated observation point.',
      'A location offering tactical access has been assigned as a temporary hold position.'
    ],
    contexts:[
      'The position must remain uncontested for the specified hold period.',
      'Current opponent numbers are not established by the assignment itself.',
      'The operation concludes with withdrawal after the marked position is secured.'
    ]
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

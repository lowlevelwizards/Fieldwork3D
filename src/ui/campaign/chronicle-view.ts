import {uiNode as node,uiButton as button} from '../dom-elements.ts';
import type {CampaignState,Contract} from '../../campaign-state.ts';
import {isDispatchPilot} from '../../dispatch-campaign-eligibility.ts';
import {campaignIncidentView} from '../../dispatch-incident-view.ts';
import {dispatchCaseDossier} from '../../dispatch-case-dossier.ts';
import {dispatchCaseCloseout} from '../../dispatch-case-closeout.ts';
import {historicalDispatchIncident} from '../../dispatch-incident-context.ts';
/** Historical projections and local inspected-report selection only. */
export function renderCampaignChronicle(c:CampaignState,serviceRecord:HTMLElement|null,
 selectedRecordId:string|null,onSelect:(id:string)=>void){
  const chronicle=node('section','campaign-section campaign-chronicle');
  chronicle.append(node('h2','','UNIT CHRONICLE'));
  if(c.history.length===0)chronicle.append(node('p','campaign-note',
   'Your unit history will appear here after its first operation.'));
  const recentReports=c.history.slice(-8).reverse();
  const operationBoard=node('div','campaign-operation-board campaign-uxr-record-index');
  const renderOperation=(report:(typeof c.history)[number])=>{
   const contract=c.contracts.find(k=>k.id===report.contractId);
   const incident=historicalDispatchIncident(c,report);
   const fallback=isDispatchPilot(c)?
    'UNCLASSIFIED DISPATCH OPERATION · '+report.contractId.toUpperCase():'Operation';
   const article=node('article','campaign-operation-record');
   const heading=node('div','campaign-operation-record-heading');
   const identity=node('div','campaign-operation-record-identity');
   identity.append(node('small','','DAY '+report.day),
    node('strong','',incident?.title??(contract?
     campaignIncidentView(c,contract).title:fallback)));
   heading.append(identity,node('span','campaign-operation-outcome',report.outcome.toUpperCase()));
   article.append(heading);
   const facts=node('div','campaign-operation-facts');
   facts.append(node('span','','GRADE '+report.grade),
    node('span','',report.participatingIds.length+' OPERATORS'));
   article.append(facts);
   // Technical references and after-action evidence remain accessible
   // without forcing eight separate expanded report bodies into the log.
   const recordDetail=node('details','campaign-operation-detail');
   recordDetail.dataset.campaignDetail='operation:'+report.id;
   const recordSummary=node('summary','','OPERATION DETAILS');
   recordSummary.setAttribute('aria-label',
    'Operation details: '+(incident?.title??(contract?
     campaignIncidentView(c,contract).title:fallback))+' · DAY '+report.day);
   recordDetail.append(recordSummary);
   const involved=report.participatingIds.map(id=>
    c.operators.find(o=>o.id===id)?.callsign??id);
   recordDetail.append(node('p','campaign-operation-participants',
    'PARTICIPATING · '+(involved.join(' · ')||'NONE RECORDED')));
   if(incident)recordDetail.append(node('small','campaign-operation-reference',incident.reference));
   if(incident&&(report.dispatchForce||report.dispatchCareer)){
    const detail=node('details','campaign-operation-evidence');
    detail.append(node('summary','','AFTER-ACTION RECORD'));
    if(report.dispatchForce)detail.append(node('p','campaign-note',
     (report.dispatchForce.blueCivilianInjured+report.dispatchForce.blueCivilianDown>0?
      'CIVILIAN HARM RECORDED':'NO SQUAD CIVILIAN HARM RECORDED')+
      ' · '+report.dispatchForce.surrenders+' SURRENDERS'));
    if(report.dispatchCareer)detail.append(node('p','campaign-note',
     'STANDING '+(report.dispatchCareer.standingDelta>0?'+':'')+
     report.dispatchCareer.standingDelta+' → '+report.dispatchCareer.standingAfter+
     ' · SUPPORT +'+report.dispatchCareer.operatingSupport+' CR'));
    recordDetail.append(detail);
   }
   article.append(recordDetail);
   return article;
  };
  // UXR-07: chronological scan lives in compact rows. Only one complete
  // authoritative report is inspected; old history remains lazy below.
  const inspected=node('section','campaign-uxr-record-inspector');
  if(recentReports.length){
   const selected=c.history.find(report=>report.id===selectedRecordId);
   const initial=selected?recentReports.findIndex(report=>report.id===selected.id):-1;
   let current=initial<0?0:initial;
   const recordButtons:HTMLButtonElement[]=[];
   const inspect=(index:number)=>{
    current=index;
    const report=recentReports[current];
    if(!report)return;
    onSelect(report.id);
    for(let i=0;i<recordButtons.length;i++)
     recordButtons[i].setAttribute('aria-current',i===current?'true':'false');
    inspected.replaceChildren(renderOperation(report));
   };
   for(let i=0;i<recentReports.length;i++){
    const report=recentReports[i];
    const contract=c.contracts.find(k=>k.id===report.contractId);
    const incident=historicalDispatchIncident(c,report);
    const title=incident?.title??(contract?
     campaignIncidentView(c,contract).title:'Operation');
    // Read-only selection uses the shared button helper and report projection.
    const record=button('',()=>inspect(i),'campaign-uxr-record-row');
    record.append(node('span','campaign-uxr-record-day','DAY '+report.day),
     node('span','campaign-uxr-record-title',title),
     node('span','campaign-uxr-record-result',
      report.outcome.toUpperCase()+' · '+report.grade));
    record.setAttribute('aria-label','Inspect day '+report.day+' · '+title+
     ' · '+report.outcome+' · grade '+report.grade);
    recordButtons.push(record);operationBoard.append(record);
   }
   chronicle.append(node('p','campaign-operation-count',
    'LATEST '+recentReports.length+' OF '+c.history.length+' RECORDED OPERATION'+
    (c.history.length===1?'':'S')),operationBoard,inspected);
   inspect(current);
  }
  if(c.history.length>recentReports.length){
   const older=node('details','campaign-operation-more');
   older.dataset.campaignDetail='more-history';
   older.append(node('summary','',
    'VIEW '+(c.history.length-recentReports.length)+' EARLIER OPERATION'+
    (c.history.length-recentReports.length===1?'':'S')));
   const olderBoard=node('div','campaign-operation-board');
   older.append(olderBoard);
   // Build older cards only when requested. Large campaigns keep a light first view.
   older.addEventListener('toggle',()=>{
    if(!older.open||olderBoard.childElementCount)return;
    for(const report of c.history.slice(0,-8).reverse())
     olderBoard.append(renderOperation(report));
   });
   chronicle.append(older);
  }
  if(isDispatchPilot(c)){
   // Recent linked operations are optional, compact, and derived from real reports.
   const linked=c.contracts.filter(k=>k.followUpOf&&
    c.history.some(report=>report.contractId===k.id)).slice(-8).reverse();
   if(linked.length){
    const trail=node('details','campaign-case-history');
    trail.dataset.campaignDetail='related-cases';
    trail.append(node('summary','',
     'RELATED CASE HISTORY · '+linked.length+' RECENT OPERATION'+
     (linked.length===1?'':'S')));
    for(const operation of linked){
     const dossier=dispatchCaseDossier(c,operation);
     const report=c.history.find(row=>row.contractId===operation.id);
     const prior=dossier?.related.at(-1);
     trail.append(node('p','campaign-note',
      'DAY '+(report?.day??'?')+' · '+campaignIncidentView(c,operation).title+
      ' · '+(report?.outcome.toUpperCase()??'OUTCOME UNRECORDED')+
      ' · PRIOR: '+(prior?.title??'RECORD UNAVAILABLE')+
      ' ('+(prior?.outcome.toUpperCase()??'UNKNOWN')+')'));
    }
    chronicle.append(trail);
   }
   // A read-only comparison of reported leads and settled outcome evidence.
   // Closed by default: the primary eight-operation log stays compact.
   const closeouts=c.history.slice(-4).reverse()
    .map(report=>dispatchCaseCloseout(c,report))
    .filter((entry):entry is NonNullable<typeof entry>=>!!entry);
   if(closeouts.length){
    const notes=node('details','campaign-case-history');
    notes.dataset.campaignDetail='closeout-notes';
    notes.append(node('summary','',
     'OPERATION CLOSEOUT NOTES · '+closeouts.length+' RECENT'));
    for(const entry of closeouts){
     const item=node('div','campaign-case-closeout');
     item.append(node('strong','',
      'DAY '+entry.day+' · '+entry.title));
     item.append(node('p','campaign-note',
      'REPORTED / UNCONFIRMED · '+entry.reported));
     item.append(node('p','campaign-note',
      'RECORDED OUTCOME · '+entry.recorded));
     item.append(node('p','campaign-note',
      'FORCE EVIDENCE · '+entry.forceEvidence));
     item.append(node('p','campaign-note',
      'CASE RELATIONSHIP · '+entry.relationship));
     notes.append(item);
    }
    chronicle.append(notes);
   }
   const awarded=c.history.slice(-8).flatMap(h=>
    h.dispatchCareer?.recognitions.map(name=>({
     id:h.id,name,day:h.day
    }))??[]);
   for(const earned of awarded.slice(-3).reverse())
    chronicle.append(node('p','campaign-note',
     'DAY '+earned.day+' · UNIT RECOGNITION: '+earned.name));
  }
  const highlights=c.journal.filter(e=>
   ['wounded','first-deployment','first-success','objective','intel','down','distinction',
    'operator-missing','operator-recovered','casualty-evacuated']
    .includes(e.kind)).slice(-6).reverse();
  if(highlights.length){
   const timeline=node('details','campaign-career-timeline');
   timeline.dataset.campaignDetail='personnel-milestones';
   timeline.append(node('summary','',
    'PERSONNEL MILESTONES · '+highlights.length+' RECENT · DAY '+highlights[0].day));
   const entries=node('div','campaign-career-events');
   for(const event of highlights){
    const person=c.operators.find(o=>o.id===event.operatorId);
    const item=node('article','campaign-career-event');
    item.dataset.kind=event.kind;
    const date=node('span','campaign-career-day','DAY '+event.day);
    const body=node('div','campaign-career-content');
    body.append(node('strong','',person?.callsign??event.operatorId),
     node('p','',event.detail));
    item.append(date,body);entries.append(item);
   }
   timeline.append(entries);chronicle.append(timeline);
  }
  const retirees=c.operators.filter(o=>
   o.status==='retired'||o.status==='lost');
  if(retirees.length){
   const archive=node('section','campaign-career-archive');
   archive.append(node('h3','','SERVICE ARCHIVE'));
   for(const operator of retirees){
    const record=node('article','campaign-archive-record');
    record.dataset.status=operator.status;
    const identity=node('div','campaign-archive-identity');
    identity.append(node('strong','',operator.callsign),
     node('span','',operator.missingSinceOperationId&&operator.status==='lost'?
       'MISSING · FATE UNCONFIRMED':operator.status.toUpperCase()));
    const metrics=node('div','campaign-archive-metrics');
    metrics.append(node('span','',operator.missions+' DEPLOYMENTS'),
     node('span','',operator.successful+' SUCCESSES'));
    record.append(identity,metrics);archive.append(record);
   }
   chronicle.append(archive);
  }
  if(serviceRecord)chronicle.append(serviceRecord);
 return chronicle;
}

/** D13: read-only, save-compatible Dispatch organization presentation.
 * Reference snapshots represent an authored look, not verified issue dates.
 */
import type {CampaignState} from './campaign-state.ts';
import {dispatchReferenceContext} from './dispatch-content-foundation.ts';
import {factionReference} from './faction-reference-catalog.ts';
import {currentDispatchReference,effectiveDispatchSetup,
 DISPATCH_PRESET_LABELS,DISPATCH_TIMELINE_CHAPTERS}
 from './dispatch-campaign-setup.ts';
import {initialDispatchDepartment,dispatchStandingTier}
 from './dispatch-department.ts';

export type DispatchDepartmentView=Readonly<{
 preset:string;unit:string;organization:string;period:string;
 standing:number;standingTier:string;responses:number;completed:number;
 scope:string;access:string;economy:string;
 chapterLabel:string;chapterDetail:string;
 chapterProgress:number;chapterGoal:number|null;chapterJustUnlocked:boolean;
}>;
export function dispatchDepartmentView(campaign:CampaignState):DispatchDepartmentView{
 const setup=effectiveDispatchSetup(campaign);
 const referenceId=currentDispatchReference(campaign);
 const reference=factionReference(referenceId);
 const context=dispatchReferenceContext(referenceId);
 const department=campaign.dispatchDepartment??initialDispatchDepartment();
 const completed=campaign.history.length;
 const progressive=setup.timeMode==='progressive';
 const threshold=DISPATCH_TIMELINE_CHAPTERS[1].minimumOperations;
 const newChapter=progressive&&completed>=threshold;
 const chapterProgress=progressive?Math.min(completed,threshold):0;
 const org=context?.organizationId==='russian-omon'?
  'Russian OMON · unit family':'US tactical police · agency-neutral';
 const chapterLabel=progressive?
  newChapter?'2015 SWAT CHAPTER ACTIVE':'1995 SWAT CHAPTER':
  setup.timeMode==='fixed'?'FIXED REFERENCE PERIOD':'UNRESTRICTED PERIOD';
 const chapterDetail=progressive?
  newChapter?'2015 kit is issued to future recruits. Existing operators keep their owned equipment.':
   'The 2015 authored chapter begins after '+threshold+
   ' completed responses. Existing equipment is retained.':
  setup.timeMode==='fixed'?
   'The chosen reference stays fixed; career development and purchases continue.':
   'Equipment selection is not tied to a progressing calendar.';
 return {
  preset:DISPATCH_PRESET_LABELS[setup.preset],unit:reference?.name??referenceId,
  organization:org,period:context?String(context.representativeYear):'REFERENCE',
  standing:department.standing,standingTier:dispatchStandingTier(department.standing),
  responses:department.responses,completed,
  scope:setup.equipmentScope==='department'?'SELECTED REFERENCE':
   setup.equipmentScope==='dispatch'?'CURATED DISPATCH':'GLOBAL SUPPORTED CATALOG',
  access:setup.unlockMode==='all'?'ALL ELIGIBLE CHOICES':
   setup.unlockMode==='career'?'CAREER AUTHORIZATIONS':
   setup.unlockMode==='historical'?'CURATED REFERENCE ACCESS':'REFERENCE + CAREER',
  economy:setup.economy==='unlimited'?'NO-CHARGE PROCUREMENT':'NORMAL PROCUREMENT',
  chapterLabel,chapterDetail,chapterProgress,
  chapterGoal:progressive&&!newChapter?threshold:null,
  chapterJustUnlocked:progressive&&completed===threshold
 };
}

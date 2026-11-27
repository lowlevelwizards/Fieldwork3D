/** FT1.1 conservative evidence-bound equipment associations.
 * The interval is the researched window, NOT an asserted first/last year of use.
 * Distinct policy/fielding/trial claims are never converted into rarity weights.
 */
import type {ReferenceEnvironment} from './faction-reference-catalog.ts';
import {FT12_ASSOCIATIONS} from './faction-reference-equipment-ft1-2.ts';
export type HistoricalAvailability='experimental'|'emerging'|'standard'|'legacy'|'surplus'|'unknown';
export type HistoricalIssueStatus='documented-use'|'authorized'|'trial'|'planned';
export type HistoricalConfidence='verified'|'tentative'|'unverified';
export type HistoricalEquipmentAssociation={
 id:string;timelineId:string;historicalEquipmentId:string;
 startYear:number;endYear:number;
 datePrecision:'year'|'approximate';
 availability:HistoricalAvailability;issueStatus:HistoricalIssueStatus;
 confidence:HistoricalConfidence;evidenceIds:readonly string[];
 role?:string;environment?:ReferenceEnvironment;theater?:string;note:string;
};
const a=(timelineId:string,id:string,historicalEquipmentId:string,
 startYear:number,endYear:number,availability:HistoricalAvailability,
 issueStatus:HistoricalIssueStatus,evidenceIds:readonly string[],
 note:string,context:Partial<Pick<HistoricalEquipmentAssociation,
 'datePrecision'|'confidence'|'role'|'environment'|'theater'>>={}
):HistoricalEquipmentAssociation=>({
 timelineId,id,historicalEquipmentId,startYear,endYear,availability,issueStatus,
 evidenceIds,note,datePrecision:context.datePrecision??'year',
 confidence:context.confidence??'verified',
 ...(context.role?{role:context.role}:{}),
 ...(context.environment?{environment:context.environment}:{}),
 ...(context.theater?{theater:context.theater}:{})
});
export const HISTORICAL_ISSUE_RECORDS:readonly HistoricalEquipmentAssociation[]=[
 a('us-army-infantry','army-m16a2-1991','us-m16a2',1991,1991,'unknown','documented-use',
  ['us-m16a2-1991'],'M16A2 spare parts documented supporting Desert Storm; indirect evidence, not proof of issue to a particular unit.',
  {theater:'Persian Gulf',confidence:'tentative'}),
 a('us-army-infantry','army-pasgt-1981','us-pasgt',1981,1981,'emerging','documented-use',
  ['us-pasgt-ach-2018'],'First fielding reported in 1981; later fielding years need separate documentation.'),
 a('us-army-infantry','army-ach-2003','us-ach',2003,2003,'emerging','documented-use',
  ['us-pasgt-ach-2018'],'ACH initially fielded in 2003; does not imply all helmets were replaced.'),
 a('us-army-infantry','army-iba-2003','us-interceptor-otv',2003,2003,'emerging','documented-use',
  ['us-iba-2003'],'Interceptor available in Iraq but not universally issued when invasion began.',
  {theater:'Iraq'}),
 a('us-army-infantry','army-ucp-transition','us-acu-ucp',2015,2019,'legacy','authorized',
  ['us-ocp-2015','us-ucp-2019'],'UCP remained authorized during transition, until 30 September 2019; year 2019 is only partial.'),
 a('us-army-infantry','army-ocp-transition','us-acu-ocp',2015,2019,'emerging','authorized',
  ['us-ocp-2015','us-ucp-2019'],'OCP was introduced July 2015 and became mandatory October 2019; prevalence changed within interval.'),
 a('us-army-infantry','army-oefcp-afghanistan-2010','us-fracu-oefcp',2010,2010,'emerging','documented-use',
  ['us-oefcp-2010'],'Afghanistan theater MultiCam/OEF-CP should not be relabeled Scorpion W2.',
  {theater:'Afghanistan',environment:'mixed'}),
 a('usmc-field','usmc-woodland-marpat-transition','usmc-marpat-wood',2002,2006,'emerging','authorized',
  ['usmc-marpat-2002'],'MARPAT woodland was phased in during the 2002–2006 utility-uniform transition.'),
 a('usmc-field','usmc-desert-marpat-transition','usmc-marpat-desert',2004,2006,'emerging','authorized',
  ['usmc-marpat-2002'],'Desert MARPAT entered the required minimum uniform allowance in October 2004.',
  {environment:'desert'}),
 a('usmc-field','usmc-lwh-2006','usmc-lwh',2006,2006,'unknown','documented-use',
  ['usmc-lwh-2006'],'LWH suspension-policy guidance confirms use by 2006, not its first issue date.'),
 a('usmc-field','usmc-mtv-development','usmc-mtv',2006,2006,'experimental','planned',
  ['usmc-mtv'],'Development followed a January 2006 urgent need; 2006 is NOT proven field issue.'),
 a('british-army-field','british-mtp-2010','uk-mtp',2010,2010,'emerging','documented-use',
  ['uk-mtp-2010'],'Documented among deployed troops in Afghanistan beginning April 2010; expansion by 2012 was a plan.',
  {theater:'Afghanistan'}),
 a('british-army-field','british-osprey-2010','uk-osprey',2010,2010,'unknown','documented-use',
  ['uk-osprey-2010'],'Specific British unit is documented wearing Osprey in Afghanistan in 2010.',
  {theater:'Afghanistan'}),
 a('british-army-field','british-sa80-2011','uk-sa80',2011,2011,'unknown','documented-use',
  ['uk-sa80-2011'],'SA80 family in theater; exact L85 variant not established by this source.',
  {theater:'Afghanistan'}),
 a('nva-field','nva-m56-circa-1980','ddr-m56',1980,1980,'unknown','documented-use',
  ['ddr-m56-museum'],'Museum identifies this NVA helmet but does not substantiate the selected year 1980.',
  {datePrecision:'approximate',confidence:'tentative'}),
 a('nva-field','nva-strichtarn-1981','ddr-strichtarn',1981,1981,'unknown','documented-use',
  ['ddr-strichtarn-1981'],'Museum identifies a specifically dated 1981 NVA winter field uniform.'),
 a('us-army-infantry','army-ocp-boots-2015-2019','us-ocp-coyote-boots',2015,2019,'emerging','authorized',
  ['us-ocp-2015','us-ocp-wear-2015'],'Authorized with OCP or OEF-CP during the July 2015–September 2019 transition; not a universal boot model or proof of co-issue.'),
 a('us-army-infantry','army-ocp-belt-2015-2019','us-ocp-tan499-belt',2015,2019,'emerging','authorized',
  ['us-ocp-2015','us-ocp-wear-2015'],'Uniform belt authorization with OCP or OEF-CP; sand remained permitted during transition. No tactical belt claim.'),
 a('usmc-field','usmc-mccb-2004','usmc-mccb',2004,2004,'unknown','authorized',
  ['usmc-marpat-2002','usmc-boots-2004'],'Mandatory possession guidance for the boot family in 2004; individual boot variant and field wear not established.'),
 ...FT12_ASSOCIATIONS
];

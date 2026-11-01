/** Deterministic, bounded site score composed of independent physical audits.
 * A favorable score is not an assertion of building-code compliance or
 * proof of visual quality. Fatal gameplay errors always dominate.
 */
import type {SiteAudit} from '../breach-site-audit.ts';
export type CompositeQuality={score:number;grade:'good'|'review'|'critical';
 signals:{playability:number;function:number;circulation:number;spatial:number};
 notes:string[]};
type Input=Pick<SiteAudit,'errors'|'designQuality'|'incompleteZones'|
 'serviceIssues'|'operationalRouteIssues'|'spaceQuality'|'accessibilityQuality'|
 'humanJourneys'|'routeFriction'>;
const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
export function scoreCompositeQuality(a:Input):CompositeQuality{
 const playability=clamp(100-a.errors.length*35);
 const functionScore=clamp(100-Math.min(45,a.designQuality.score*2)-
  a.incompleteZones.length*4-a.serviceIssues.length*3);
 const circulation=clamp(100-a.operationalRouteIssues.length*6-
  a.humanJourneys.issues.length*4-a.routeFriction.warnings.length*8);
 const spatial=clamp(100-a.spaceQuality.crowdedRoomIds.length*8-
  a.spaceQuality.doorApproachIssues.length*9-
  a.accessibilityQuality.issues.length*3);
 const weighted=clamp(playability*.35+functionScore*.25+
  circulation*.25+spatial*.15);
 const score=a.errors.length?Math.min(weighted,Math.max(0,65-a.errors.length*12)):weighted;
 const grade=playability<70||score<55?'critical':score<82?'review':'good';
 const notes=[
  ...(a.errors.length?[a.errors.length+' gameplay errors']:[]),
  ...(a.incompleteZones.length?[a.incompleteZones.length+' incomplete functional zones']:[]),
  ...(a.spaceQuality.doorApproachIssues.length?
   [a.spaceQuality.doorApproachIssues.length+' obstructed door approaches']:[]),
  ...(a.humanJourneys.issues.length?
   [a.humanJourneys.issues.length+' human journey concerns']:[])
 ];
 return {score,grade,signals:{playability,function:functionScore,circulation,spatial},
  notes};
}

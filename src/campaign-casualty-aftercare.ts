/** OC11: Evidence-limited casualty aftercare at Campaign settlement.
 * This is a recovery-time estimate, NEVER an inference of confirmed death,
 * survival probability, resurrection, or instantaneous field treatment.
 * The tactical medical/wound system remains the source of clinical facts.
 */
export type AftercareEvidence={
  downed:boolean;
  evacuated:boolean;
  leftBehind:boolean;
  stabilized:boolean;
  critical:boolean;
  /** Legacy reports lack structured triage and must remain compatible. */
  structured:boolean;
  injuryStage:number;
};
export type AftercareAssessment={
  category:'fit'|'injured'|'heavy-wound'|'stable-evacuation'|
   'critical-evacuation'|'unverified-evacuation'|'missing';
  recoveryDays:number;
};
/** A persistent field career requires time off after injury; stabilizing
 * a critical casualty changes the duration but does not guarantee survival.
 * Real transport custody is independently validated by Mission reporting.
 */
export function assessCampaignAftercare(e:AftercareEvidence):AftercareAssessment{
 const injury=Number.isFinite(e.injuryStage)?
  Math.max(0,Math.min(3,Math.floor(e.injuryStage))):0;
 if(!e.downed)return injury>=2?
  {category:'heavy-wound',recoveryDays:injury*2}:
  injury===1?{category:'injured',recoveryDays:2}:
  {category:'fit',recoveryDays:0};
 if(e.leftBehind)return {category:'missing',recoveryDays:7};
 if(e.evacuated){
  if(!e.structured)return {category:'unverified-evacuation',recoveryDays:2};
  if(e.critical)return {category:'critical-evacuation',recoveryDays:8};
  if(e.stabilized)return {category:'stable-evacuation',recoveryDays:4};
  return {category:'unverified-evacuation',recoveryDays:6};
 }
 // This category is an unresolved medical custody result, not a miraculous
 // return to duty. Career MIA state is decided by separate physical evidence.
 return {category:'missing',recoveryDays:7};
}
export function aftercareDescription(a:AftercareAssessment):string{
 const headline:Record<AftercareAssessment['category'],string>={
  fit:'Cleared without field injury',
  injured:'Field injury under observation',
  'heavy-wound':'Heavy wound requires follow-up',
  'stable-evacuation':'Stabilized casualty physically evacuated',
  'critical-evacuation':'Critical casualty physically evacuated',
  'unverified-evacuation':'Casualty evacuated; stability unverified',
  missing:'Missing casualty; medical fate unconfirmed'
 };
 return headline[a.category]+
  (a.recoveryDays>0?' · estimated '+a.recoveryDays+' recovery days':'');
}

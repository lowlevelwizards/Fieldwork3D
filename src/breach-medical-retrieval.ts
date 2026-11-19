/** F6.5A — medical presentation follows the existing GO treatment clock.
 * This does not spend dressings, re-time a treatment or author a new hand.
 */
export type MedicalRetrievalPhase={
 reach:number;apply:number;itemInHand:boolean;
};
const smooth=(value:number)=>{
 const t=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 return t*t*(3-2*t);
};
export function medicalRetrievalPhase(progress:number):MedicalRetrievalPhase{
 const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 return {reach:smooth(p/.16),
  apply:smooth((p-.16)/.27),itemInHand:p>=.16};
}

/** Single auditable acquisition clock for ballistic truth and presentation.
 * Pure: aim readiness still accumulates in fixed-step simulation time.
 */
export function acquisitionSeconds(input:{
 base:number;moving:boolean;skillFactor:number;enemy:boolean;
 attachmentFactor:number;cautious:boolean;
}):number{
 const {base,moving,skillFactor,enemy,attachmentFactor,cautious}=input;
 return Math.max(.05,base*(moving?1.8:1)*skillFactor*
   (enemy?1.65:1)*attachmentFactor+(cautious?.12:0));
}

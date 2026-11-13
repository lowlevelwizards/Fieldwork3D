/** Single auditable acquisition clock for ballistic truth and presentation.
 * Pure: aim readiness still accumulates in fixed-step simulation time.
 */
export function acquisitionSeconds(input:{
 base:number;moving:boolean;skillFactor:number;enemy:boolean;
 attachmentFactor:number;cautious:boolean;range?:number;
}):number{
 const {base,moving,skillFactor,enemy,attachmentFactor,cautious}=input;
 // Independent of whether the observer can see the subject. Longer-range
 // target alignment needs a steadier sight picture, without a new LOS cap.
 const excess=Math.max(0,(input.range??0)-140);
 const rangeScale=1+Math.min(.85,excess/660*.34);
 return Math.max(.05,base*(moving?1.8:1)*skillFactor*
   (enemy?1.65:1)*attachmentFactor*rangeScale+(cautious?.12:0));
}

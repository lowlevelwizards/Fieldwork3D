/** A2-C: one presentation contract for helmet field controls.
 * Saved preferences can always be cleared even when hidden by prerequisites.
 * UI status is read-only; selection still goes through A2 helmet edit policy.
 */
import type {HelmetFieldOptions} from './operator-helmet-field-policy.ts';
export type HelmetFieldControlStatus=
 'active'|'off'|'saved-inactive'|'required'|'unavailable';
export type HelmetFieldControlState={
 status:HelmetFieldControlStatus;pressed:boolean;disabled:boolean;
 canClear:boolean;note:string;
};
export function helmetFieldControlState(
 key:keyof HelmetFieldOptions,
 requested:HelmetFieldOptions,effective:HelmetFieldOptions,
 requirement?:string,manuallyAvailable=true
):HelmetFieldControlState{
 const saved=requested[key]===true,visible=effective[key]===true;
 if(!saved&&visible)return {
  status:'required',pressed:true,disabled:true,canClear:false,
  note:requirement??'Required by another active option'
 };
 if(saved&&!visible)return {
  status:'saved-inactive',pressed:false,disabled:false,canClear:true,
  note:(requirement??'Currently incompatible')+' · Tap to clear saved preference'
 };
 if(saved&&visible)return {
  status:'active',pressed:true,disabled:false,canClear:true,note:''
 };
 if(requirement||!manuallyAvailable)return {
  status:'unavailable',pressed:false,disabled:true,canClear:false,
  note:requirement??'Requires compatible mounting'
 };
 return {status:'off',pressed:false,disabled:false,canClear:false,note:''};
}

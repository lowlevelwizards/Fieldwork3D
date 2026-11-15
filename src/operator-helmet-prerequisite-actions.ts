/** A3: optional, explicit one-tap repairs for non-destructive mount prerequisites.
 * Never clears a saved device or silently replaces another occupied socket.
 */
import type {HelmetFieldOptions} from './operator-helmet-field-policy.ts';
export type HelmetPrerequisiteAction={
 label:string;changes:Partial<HelmetFieldOptions>;
};
/** Return only safe additive fixes; occupied slots remain a manual choice. */
export function helmetPrerequisiteAction(
 key:keyof HelmetFieldOptions,
 requested:HelmetFieldOptions,
 effective:HelmetFieldOptions
):HelmetPrerequisiteAction|null{
 if(requested[key]===true&&effective[key]===true)return null;
 if((key==='light'||key==='camera')&&!requested.rails)
  return {label:'ENABLE SIDE RAILS',changes:{rails:true}};
 if(key==='bungees'&&(!requested.rails||!requested.shroud))
  return {
   label:!requested.rails&&!requested.shroud?
    'ENABLE RAILS + SHROUD':!requested.rails?'ENABLE SIDE RAILS':'ENABLE NVG SHROUD',
   changes:{
    ...(!requested.rails?{rails:true}:{}),
    ...(!requested.shroud?{shroud:true}:{})
   }
  };
 if(key==='patches'&&!effective.patches&&!requested.velcro)
  return {label:'ADD VELCRO PANELS',changes:{velcro:true}};
 return null;
}

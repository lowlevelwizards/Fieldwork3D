/** A building's core sanitary and operational support cannot disappear
 * merely because a template reserves another office or third service bay.
 * This is a bounded role substitution on a physical authored blueprint:
 * it changes real rooms before walls, doors and furnishing are compiled.
 */
import type {BuildingArchetype,SiteScale} from '../breach-site.ts';
import type {Blueprint} from './architectural-program.ts';
type FacilityRule={required:string;replace:readonly string[];minimum:number};
const rules:Partial<Record<BuildingArchetype,readonly FacilityRule[]>>={
 clinic:[{required:'restroom',replace:['exam','staff'],minimum:2}],
 office:[{required:'restroom',replace:['storage','office'],minimum:1}],
 retail:[{required:'restroom',replace:['storage','office'],minimum:1}],
 garage:[{required:'restroom',replace:['office','parts','bay'],minimum:1}],
 warehouse:[{required:'restroom',replace:['service','storage'],minimum:1}],
 utility:[{required:'restroom',replace:['storage','maintenance'],minimum:1}]
};
export function facilityProgramIssues(blueprint:Blueprint):string[]{
 const roles=blueprint.cells.flat().filter((role):role is string=>!!role);
 return (rules[blueprint.kind]??[])
   .filter(rule=>!roles.includes(rule.required))
   .map(rule=>'missing '+rule.required);
}
export function ensureFacilityProgram(blueprint:Blueprint,scale:SiteScale):Blueprint{
 // Small businesses can share off-site/common amenities. The larger layouts
 // modeled as complete establishments require accessible dedicated restrooms.
 if(scale==='small')return blueprint;
 if(blueprint.unitIds)return blueprint;
 const cells=blueprint.cells.map(row=>[...row]);
 let changed=0;
 for(const rule of rules[blueprint.kind]??[]){
  if(cells.some(row=>row.includes(rule.required)))continue;
  let target:{row:number;col:number}|undefined;
  for(const role of rule.replace){
   const matches=cells.flatMap((row,y)=>row.map((v,x)=>({row:y,col:x,role:v})))
     .filter(v=>v.role===role&&
       !(v.row===blueprint.front.row&&v.col===blueprint.front.col));
   if(matches.length<rule.minimum)continue;
   // Choose the support room nearest public circulation, not the isolated
   // staff/loading edge. Existing layout remains recognizably the same.
   matches.sort((a,b)=>(Math.abs(a.row-blueprint.front.row)+
     Math.abs(a.col-blueprint.front.col))-
     (Math.abs(b.row-blueprint.front.row)+Math.abs(b.col-blueprint.front.col))||
     b.row-a.row||a.col-b.col);
   target={row:matches[0].row,col:matches[0].col};break;
  }
  if(!target)continue;
  cells[target.row][target.col]=rule.required;
  changed++;
 }
 return changed?{...blueprint,cells,family:blueprint.family+' / serviced'}:blueprint;
}

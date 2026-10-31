/** Movement patterns guide *real physical* door/open connections.
 * The same building family can have a corridor spine, ring, covered gallery,
 * interconnecting public rooms or service-first backline.
 */
import type {BuildingArchetype} from '../breach-site.ts';
export type CirculationStyle='spine'|'loop'|'gallery'|'enfilade'|'service';
const distribution:Record<BuildingArchetype,readonly CirculationStyle[]>={
 house:['enfilade','spine','loop'],
 townhouse:['spine','enfilade','loop'],
 apartment:['gallery','spine','loop'],
 retail:['enfilade','service','loop'],
 office:['spine','loop','enfilade'],
 garage:['service','loop','spine'],
 warehouse:['service','loop','gallery'],
 restaurant:['enfilade','service','loop'],
 motel:['gallery','gallery','loop'],
 utility:['service','spine','loop'],
 clinic:['spine','loop','gallery']
};
const pub=new Set(['living','dining','sales','waiting','reception','lobby',
 'checkout','cubicles','office','meeting']);
const work=new Set(['loading','bay','workshop','parts','aisle','equipment',
 'maintenance','control','storage','service','stockroom']);
export function circulationFor(kind:BuildingArchetype,seed:number):CirculationStyle{
 const v=distribution[kind];return v[(Math.floor(seed/11)>>>0)%v.length];
}
export function circulationScore(style:CirculationStyle,
 a:{role:string;hall:boolean},b:{role:string;hall:boolean}):number{
 if(a.hall&&b.hall)return -95;
 if(a.hall||b.hall)return style==='gallery'?-24:
   style==='spine'?-14:style==='loop'?0:6;
 if(style==='enfilade'&&pub.has(a.role)&&pub.has(b.role))return -16;
 if(style==='service'&&work.has(a.role)&&work.has(b.role))return -10;
 if(style==='loop'&&pub.has(a.role)&&pub.has(b.role))return -5;
 return 12;
}
export function loopChance(style:CirculationStyle,
 a:{role:string},b:{role:string}):number{
 const sensitive=new Set(['exam','treatment','bedroom','guest','bathroom','restroom']);
 if(sensitive.has(a.role)||sensitive.has(b.role))return 0;
 return style==='loop'?.55:style==='enfilade'?.32:
   style==='service'?.26:style==='gallery'?.17:.1;
}

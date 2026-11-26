/** VEH12 art-direction weights, not empirical registration statistics.
 * Stable catalog indices; all probabilities are relative within a pool.
 * Special service bodies are opt-in by contextual weights, never random
 * paint substitutions. Military recipes remain available in the Lab.
 */
import {VEHICLE_CONFIGURATIONS,VEHICLE_PAINTS,type VehicleFamily} from './vehicle-catalog.ts';
type Weight=readonly [number,number];
type ConfigWeight=readonly [string,number];
export type VehiclePaletteContext={archetype?:string;condition?:string;role?:string};
const civilian:Record<VehicleFamily,readonly Weight[]>={
 sedan:[[0,20],[1,19],[2,13],[3,12],[4,8],[6,8],[7,5],[10,6],[8,3],[5,2],[12,1],[13,2],[11,1]],
 hatchback:[[0,19],[1,17],[2,11],[3,9],[4,7],[6,10],[7,5],[10,10],[8,4],[12,3],[13,2],[11,2],[14,1]],
 pickup:[[0,23],[3,15],[2,10],[7,10],[10,10],[4,9],[5,8],[1,6],[9,4],[6,3],[8,2]],
 suv:[[3,23],[2,16],[0,15],[7,12],[9,10],[4,8],[1,6],[10,4],[8,4],[5,2]],
 van:[[0,49],[1,15],[4,12],[2,7],[6,5],[7,4],[10,3],[5,3],[12,2]],
 'light-truck':[[0,46],[4,16],[1,13],[5,10],[2,7],[6,4],[10,2],[9,2]]
};
const service:Record<string,readonly Weight[]>={
 police:[[3,34],[0,30],[7,20],[2,10],[9,6]],
 unmarked:[[3,40],[2,28],[7,20],[1,12]],
 medical:[[0,80],[1,15],[4,5]],
 taxi:[[11,70],[14,12],[0,9],[4,6],[3,3]],
 municipal:[[0,28],[11,22],[15,16],[4,14],[9,12],[5,8]],
 delivery:[[0,68],[1,16],[4,10],[6,6]],
 contractor:[[0,40],[4,20],[5,13],[10,10],[6,9],[2,8]],
 fleet:[[0,48],[1,26],[2,14],[4,12]],
 military:[[9,70],[4,20],[8,10]],
 aid:[[0,65],[4,20],[1,15]]
};
export function vehiclePaintWeights(family:VehicleFamily,configuration:string):readonly Weight[]{
 return service[configuration]??civilian[family];
}
export function vehicleConfigWeights(family:VehicleFamily,context:VehiclePaletteContext):readonly ConfigWeight[]{
 const a=context.archetype??'',industrial=context.role==='loading'||['garage','warehouse','utility'].includes(a),
 residential=context.role==='residential'||['house','townhouse'].includes(a),
 clinic=a==='clinic',urban=['office','retail','restaurant','motel','apartment'].includes(a);
 switch(family){
  case 'sedan':return [['civilian',residential?95:urban?76:85],['fleet',residential?3:12],['taxi',urban?8:residential?0:1],['police',residential?0:2],['unmarked',residential?2:2]];
  case 'hatchback':return [['civilian',75],['economy',22],['municipal',residential?0:industrial?8:3]];
  case 'pickup':return [['civilian',industrial?38:72],['covered',12],['cargo',industrial?20:8],['contractor',industrial?30:8],['military',0]];
  case 'suv':return [['civilian',residential?95:86],['police',residential?0:4],['unmarked',residential?4:6],['aid',clinic?9:residential?1:4],['military',0]];
  case 'van':return clinic?[['cargo',20],['passenger',20],['delivery',12],['medical',43],['police',2],['contractor',3]]:
   industrial?[['cargo',31],['passenger',5],['delivery',38],['medical',0],['police',1],['contractor',25]]:
   [['cargo',44],['passenger',25],['delivery',20],['medical',1],['police',2],['contractor',8]];
  case 'light-truck':return [['box',industrial?47:64],['flatbed',industrial?28:14],['canvas',industrial?14:12],['municipal',industrial?11:10],['military',0]];
 }
}
function pick<T>(rows:readonly (readonly [T,number])[],u:number):T{
 const sum=rows.reduce((s,r)=>s+r[1],0);
 let n=Math.min(.999999999,Math.max(0,u))*sum;
 for(const [value,weight] of rows){if(weight>0&&n<weight)return value;n-=weight;}
 return rows.filter(r=>r[1]>0).at(-1)![0];
}
export function chooseVehicleArt(family:VehicleFamily,context:VehiclePaletteContext,rng:()=>number):number{
 const config=pick(vehicleConfigWeights(family,context),rng());
 const weights=vehiclePaintWeights(family,config);
 // Neglected properties favor subdued existing paint, not random new hues.
 const adjusted=weights.map(([i,w])=>[i,w*((context.condition==='vacant'||context.condition==='neglected')&&[2,4,5,8,9].includes(i)?1.5:1)] as const);
 const paint=pick(adjusted,rng()),configs=VEHICLE_CONFIGURATIONS[family] as readonly string[];
 return configs.indexOf(config)+paint*configs.length;
}
export function allowedVehiclePaint(family:VehicleFamily,configuration:string,index:number){
 return Number.isInteger(index)&&index>=0&&index<VEHICLE_PAINTS.length&&vehiclePaintWeights(family,configuration).some(([i])=>i===index);
}

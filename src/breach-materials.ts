/** LW-09: Physical material properties, never inferred from rendered paint.
 * Thickness is expressed in world units; resistance is a game-scale
 * penetration cost per unit thickness, not a real-world ballistic claim.
 */
export type MaterialId='glass'|'drywall'|'softwood'|'hardwood'|
 'upholstery'|'sheet-metal'|'steel'|'brick'|'concrete';
export type MaterialDefinition={id:MaterialId;resistance:number;
 integrity:number;penetrable:boolean;impact:'glass'|'dust'|'wood'|'metal'|'stone'};
export const MATERIALS:Record<MaterialId,MaterialDefinition>={
 glass:{id:'glass',resistance:.025,integrity:.45,penetrable:true,impact:'glass'},
 drywall:{id:'drywall',resistance:.04,integrity:.65,penetrable:true,impact:'dust'},
 softwood:{id:'softwood',resistance:.055,integrity:1.2,penetrable:true,impact:'wood'},
 hardwood:{id:'hardwood',resistance:.10,integrity:1.8,penetrable:true,impact:'wood'},
 upholstery:{id:'upholstery',resistance:.015,integrity:.7,penetrable:true,impact:'dust'},
 'sheet-metal':{id:'sheet-metal',resistance:.16,integrity:2.2,
   penetrable:true,impact:'metal'},
 steel:{id:'steel',resistance:.65,integrity:8,penetrable:false,impact:'metal'},
 brick:{id:'brick',resistance:.45,integrity:5,penetrable:false,impact:'stone'},
 concrete:{id:'concrete',resistance:.8,integrity:9,penetrable:false,impact:'stone'}
};
const metalFixtures=new Set(['locker','fridge','stove','vehicle','generator',
 'tank','filing-cabinet','vehicle-lift','shutter','control-panel']);
const softFixtures=new Set(['sofa','armchair','bed','exam-bed','mattress']);
const strongWood=new Set(['workbench','wardrobe','cabinet','bookcase','counter',
 'door','dining-table','desk','dresser']);
export function materialForFixture(id?:string):MaterialId{
 if(!id)return 'softwood';
 if(softFixtures.has(id))return 'upholstery';
 if(metalFixtures.has(id))return 'sheet-metal';
 if(strongWood.has(id))return 'hardwood';
 if(id==='window-pane')return 'glass';
 if(id==='window-sill'||id==='masonry')return 'brick';
 return 'softwood';
}
export const surfaceResistance=(material:MaterialId,thickness:number)=>
 MATERIALS[material].resistance*Math.max(0,thickness);

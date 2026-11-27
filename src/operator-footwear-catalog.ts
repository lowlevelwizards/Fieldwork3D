/** FW1: curated catalog; existing equipment IDs retain their mass. */
export const FOOTWEAR_IDS=['combat-boots','leather-boots','hiking-boots','hiking-shoes','sneakers','bare-feet'] as const;
export type FootwearId=typeof FOOTWEAR_IDS[number];
type Profile={name:string;equipment:string;height:'high'|'mid'|'low'|'bare';colors:Readonly<Record<string,number>>;defaultColor:string};
export const FOOTWEAR:Readonly<Record<FootwearId,Profile>>={
 'combat-boots':{name:'Combat Boots',equipment:'feet-boots',height:'high',colors:{black:0x343633,coyote:0xa28b65,sand:0xc6b48f,olive:0x686e4e},defaultColor:'coyote'},
 'leather-boots':{name:'Leather Boots',equipment:'feet-leather',height:'high',colors:{black:0x30312e,'dark-brown':0x4e392b,brown:0x74533a},defaultColor:'black'},
 'hiking-boots':{name:'Hiking Boots',equipment:'feet-hiking-boots',height:'mid',colors:{brown:0x78634b,olive:0x686f50,grey:0x777c78,black:0x343633,tan:0xaa9472},defaultColor:'brown'},
 'hiking-shoes':{name:'Hiking Shoes',equipment:'feet-hiking-shoes',height:'low',colors:{black:0x343633,olive:0x686f50,grey:0x777c78,tan:0xaa9472},defaultColor:'olive'},
 sneakers:{name:'Sneakers',equipment:'feet-light',height:'low',colors:{black:0x303030,white:0xdedcd3,grey:0x7c7e7d,navy:0x384862,red:0x99423b,brown:0x77583e},defaultColor:'black'},
 'bare-feet':{name:'Bare Feet',equipment:'feet-none',height:'bare',colors:{},defaultColor:''}
};
export function canonicalFootwear(id:unknown):FootwearId|undefined{
 // Read-only save aliases; no legacy asset or visible catalog entry.
 if(id==='field-boots')return 'combat-boots';
 if(id==='tall-boots')return 'leather-boots';
 return typeof id==='string'&&(FOOTWEAR_IDS as readonly string[]).includes(id)?id as FootwearId:undefined;
}
export function footwearForEquipment(equipment:string|undefined,preferred?:unknown):FootwearId{
 const id=canonicalFootwear(preferred);
 const actual=FOOTWEAR_IDS.find(key=>FOOTWEAR[key].equipment===equipment)??'combat-boots';
 if(id&&(FOOTWEAR[id].equipment===equipment||
  equipment==='feet-boots'&&FOOTWEAR[id].height==='high'||
  equipment==='feet-light'&&FOOTWEAR[id].height==='low'))return id;
 return actual;
}
export function footwearColor(id:FootwearId,color?:string):string{
 const p=FOOTWEAR[id];return color&&Object.hasOwn(p.colors,color)?color:p.defaultColor;
}
export function footwearColorChoices(id:string):readonly string[]{
 return Object.keys(FOOTWEAR[canonicalFootwear(id)??'combat-boots'].colors);
}
export function footwearHemOptions(trousers:string,footwear:string):readonly ('unbloused'|'bloused'|'cuffed')[]{
 const height=FOOTWEAR[canonicalFootwear(footwear)??'combat-boots'].height;
 if(!['bdu-trousers','acu-trousers','gorka-trousers'].includes(trousers)||height==='bare')return ['unbloused'];
 return height==='low'?['unbloused','cuffed']:['unbloused','bloused','cuffed'];
}
export function resolveFootwearHem(trousers:string,footwear:string,requested:'unbloused'|'bloused'|'cuffed'='bloused'){
 return footwearHemOptions(trousers,footwear).includes(requested)?requested:'unbloused';
}

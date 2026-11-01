/** MAP 07: reproducible architectural material palettes for every building. */
import type {BuildingArchetype} from '../breach-site.ts';
export type BuildingTheme={
 name:string;wall:number;floor:number;door:number;trim:number;cap:number;
 hall:number;tile:number;wood:number;grout:number;
};
type Scheme={name:string;wall:number;floor:number;door:number;trim:number;cap:number;tile:number;wood:number};
const schemes:Record<BuildingArchetype,readonly Scheme[]>={
 house:[
 {name:'Warm Traditional',wall:0xcac0a7,floor:0x8b765e,door:0x987350,trim:0xd6cbb6,cap:0x554b42,tile:0xb6aa92,wood:0x74573f},
 {name:'Muted Modern',wall:0xbac5b3,floor:0x766f5f,door:0x5c786a,trim:0xd7d8c9,cap:0x495a53,tile:0xb8bdb1,wood:0x715f50},
 {name:'Aged Cottage',wall:0xb9aa93,floor:0x786750,door:0x7c6651,trim:0xc8bda9,cap:0x544a40,tile:0xaaa79a,wood:0x6b5343}],
 townhouse:[
 {name:'Brick Heritage',wall:0xbbad96,floor:0x867561,door:0x73594d,trim:0xd8ccb8,cap:0x4d443e,tile:0xa8a49b,wood:0x745745},
 {name:'Urban Renovation',wall:0xc6c5bb,floor:0x858174,door:0x59716d,trim:0xd4d6d1,cap:0x484f50,tile:0xb4b8b5,wood:0x6b6358},
 {name:'Old Rental',wall:0xa8a79a,floor:0x72685a,door:0x77735f,trim:0xbeb7a5,cap:0x49473f,tile:0x9a9e98,wood:0x74604c}],
 apartment:[
 {name:'Budget Rental',wall:0xc8c3b5,floor:0x898075,door:0x777970,trim:0xd5d0be,cap:0x57544c,tile:0xb9b4aa,wood:0x7b6553},
 {name:'Contemporary',wall:0xc5cfcb,floor:0x898882,door:0x667c83,trim:0xe0dfd6,cap:0x47585d,tile:0xb7c5c5,wood:0x73675c},
 {name:'Older Urban',wall:0xb5ada1,floor:0x6f665b,door:0x74645b,trim:0xc8bdaf,cap:0x4b4542,tile:0xaaa9a1,wood:0x685444}],
 retail:[
 {name:'Neighborhood Shop',wall:0xcbd4c9,floor:0x8a9389,door:0x647d72,trim:0xe0dfd0,cap:0x485950,tile:0xb5bdb4,wood:0x87735a},
 {name:'Bright Commercial',wall:0xd4d5c9,floor:0x9da8a4,door:0x668a91,trim:0xe2e5dd,cap:0x4c6268,tile:0xc4cdc8,wood:0x898373},
 {name:'Tired Storefront',wall:0xa7a89b,floor:0x73776e,door:0x8e7959,trim:0xc5bea9,cap:0x4b4e46,tile:0x9c9d93,wood:0x76634d}],
 office:[
 {name:'Corporate Neutral',wall:0xc0c9c6,floor:0x808e91,door:0x66777b,trim:0xd7d9d2,cap:0x475359,tile:0xacb8b8,wood:0x776b60},
 {name:'Warm Administrative',wall:0xcbc1b0,floor:0x817d70,door:0x777059,trim:0xdcd0bd,cap:0x504d46,tile:0xbdb9ad,wood:0x80684e},
 {name:'Dated Office',wall:0xafb7aa,floor:0x6e827c,door:0x66716b,trim:0xc0c7b8,cap:0x424c47,tile:0x9fa9a2,wood:0x6b6250}],
 garage:[
 {name:'Concrete Service',wall:0xaaaaa1,floor:0x626b66,door:0x697879,trim:0x9ea59d,cap:0x343e3d,tile:0x818881,wood:0x726451},
 {name:'Rusted Workshop',wall:0x9f9584,floor:0x686358,door:0x83644d,trim:0xada28d,cap:0x393b36,tile:0x8d8679,wood:0x73614c},
 {name:'Tidy Auto Shop',wall:0xb9bcb5,floor:0x777f7c,door:0x607f83,trim:0xd0d0c6,cap:0x425357,tile:0xabb2ac,wood:0x786a56}],
 warehouse:[
 {name:'Steel Utilitarian',wall:0xaab1ad,floor:0x69716e,door:0x657473,trim:0xb7bdb6,cap:0x39484a,tile:0x8f9590,wood:0x79664f},
 {name:'Aged Logistics',wall:0xaaa392,floor:0x68665d,door:0x81765e,trim:0xb4b2a5,cap:0x434841,tile:0x8d8c83,wood:0x726047},
 {name:'Renovated Storage',wall:0xc1c1b6,floor:0x777f80,door:0x72878b,trim:0xd1d2c5,cap:0x4b5a59,tile:0x9daaaa,wood:0x817667}],
 restaurant:[
 {name:'Warm Diner',wall:0xc9b399,floor:0x78614d,door:0x98694a,trim:0xe3cbb0,cap:0x533e36,tile:0xb9a18d,wood:0x79513d},
 {name:'Modern Casual',wall:0xc1c1b4,floor:0x7e7466,door:0x697d72,trim:0xd5d6c9,cap:0x47534b,tile:0xb7b8ad,wood:0x806b53},
 {name:'Older Neighborhood',wall:0xb0a18e,floor:0x685c50,door:0x825f53,trim:0xc7b19e,cap:0x4a3a33,tile:0x9e9284,wood:0x6b4d3e}],
 motel:[
 {name:'Retro Roadside',wall:0xb4c9bc,floor:0x8b8270,door:0xa66f57,trim:0xd7c3a2,cap:0x4a5950,tile:0xa1b4ac,wood:0x776452},
 {name:'Budget Contemporary',wall:0xc5c0b2,floor:0x7d7f76,door:0x64817f,trim:0xd8d3c4,cap:0x434f51,tile:0xafb5ad,wood:0x6f6256},
 {name:'Weathered Vintage',wall:0xb7a58b,floor:0x736a5b,door:0x8f6c54,trim:0xd0b89d,cap:0x4c463d,tile:0x9da69b,wood:0x755b44}],
 utility:[
 {name:'Municipal Gray',wall:0xabb4ae,floor:0x697675,door:0x72817e,trim:0xc1c6bc,cap:0x444e50,tile:0x939c98,wood:0x726453},
 {name:'Safety Yellow',wall:0xb8b4a5,floor:0x696a5d,door:0xb0a05d,trim:0xd1c6a5,cap:0x4d5042,tile:0x9a9987,wood:0x786449},
 {name:'Aging Substation',wall:0x979e92,floor:0x5d6c66,door:0x7a816b,trim:0xabb5a4,cap:0x414941,tile:0x8c9486,wood:0x655c4a}],
 clinic:[
 {name:'Soft Sage',wall:0xdce8de,floor:0xbccdc2,door:0x8caea1,trim:0xf0f2e9,cap:0x647871,tile:0xe0e9dd,wood:0x7c7b6c},
 {name:'Blue White Modern',wall:0xe4eae7,floor:0xc3d5d5,door:0x8aafb9,trim:0xf1f2ea,cap:0x5c7782,tile:0xe0eded,wood:0x808378},
 {name:'Older Institutional',wall:0xd6d9c8,floor:0xb2c0b1,door:0x90aa94,trim:0xe5e8d9,cap:0x606b5d,tile:0xd7e0d2,wood:0x818072}],
};
const mix=(a:number,b:number,t:number)=>{
 const channel=(shift:number)=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);
 return (channel(16)<<16)|(channel(8)<<8)|channel(0);
};
export function buildingTheme(kind:BuildingArchetype|undefined,seed:number):BuildingTheme{
 const options=schemes[kind??'house'];
 // Same archetype, varied seeds: three stable palettes, not random per room.
 const s=options[(seed>>>0)%options.length];
 return {...s,hall:mix(s.floor,s.wall,.26),grout:mix(s.floor,s.cap,.19)};
}
export function roomFloor(theme:BuildingTheme,purpose:string|undefined,tone=0):number{
 const wet=['kitchen','bathroom','restroom','pantry','laundry','exam',
   'treatment','waiting','reception','checkout','service'].includes(purpose??'');
 const industrial=['bay','workshop','loading','storage','equipment','maintenance',
   'aisle','parking','packing'].includes(purpose??'');
 const base=wet?theme.tile:industrial?mix(theme.floor,0x6b706d,.21):theme.floor;
 return mix(base,tone%2===0?theme.wall:theme.cap,.045);
}

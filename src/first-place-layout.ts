/**
 * Build 049 — The First Place.
 *
 * A single intentionally composed 100m field-station location *inside*
 * the real Cutwoods region. Every placed element has a reason: road access,
 * enclosed working yard, a main entrance, drainage ditch, foot crossing,
 * equipment and landmarks. Not a random settlement generator or mission.
 *
 * x east (+), z south (+), both in metres.
 */
export const FIRST_PLACE={
  name:'CUTWOODS FIELD STATION',
  center:{x:91,z:110},
  halfSize:50,
  spawn:{x:127,z:129},
  house:{x:76,z:90},
  shed:{x:94,z:118},
  gate:{x:117,z:118},
  radio:{x:62,z:76},
  logCase:{x:83,z:106},
} as const;

export type SiteSegment={
  x1:number;z1:number;x2:number;z2:number;
  type:'fence'|'ditch'|'path'|'deck';
};
// All fence legs stop at the entrance so the opening exists
// geometrically and physically. No invisible walls at the gate.
export const FENCE:readonly SiteSegment[]=[
 {x1:49,z1:66,x2:117,z2:66,type:'fence'},
 {x1:49,z1:66,x2:49,z2:145,type:'fence'},
 {x1:49,z1:145,x2:117,z2:145,type:'fence'},
 {x1:117,z1:66,x2:117,z2:111,type:'fence'},
 {x1:117,z1:125,x2:117,z2:145,type:'fence'},
];
export const FOOTPATH:readonly SiteSegment[]=[
 {x1:76,z1:99,x2:83,z2:106,type:'path'},
 {x1:83,z1:106,x2:107,z2:117,type:'path'},
 {x1:107,z1:117,x2:134,z2:128,type:'path'},
];
export const DRAINAGE:readonly SiteSegment[]=[
 {x1:56,z1:135,x2:83,z2:140,type:'ditch'},
 {x1:83,z1:140,x2:108,z2:151,type:'ditch'},
];
export const DITCH_CROSSING:SiteSegment={
 x1:93,z1:144,x2:101,z2:151,type:'deck',
};
export const YARD_EQUIPMENT=[
 {id:'fuel',x:59,z:112,type:'tank'},
 {id:'generator',x:100,z:79,type:'generator'},
 {id:'pallets',x:66,z:125,type:'pallet'},
 {id:'field-logs',x:83,z:106,type:'logs'},
 {id:'sign',x:123,z:124,type:'sign'},
] as const;
export const FIELD_TREES=[
 {x:37,z:145,scale:1.07},
 {x:38,z:99,scale:1.03},
 {x:56,z:51,scale:1.20},
 {x:90,z:49,scale:.88},
 {x:134,z:57,scale:1.12},
 {x:149,z:89,scale:.94},
 {x:157,z:147,scale:1.15},
 {x:91,z:159,scale:.98},
] as const;

function distanceToSegment(x:number,z:number,s:SiteSegment):number{
 const dx=s.x2-s.x1,dz=s.z2-s.z1;
 const t=Math.max(0,Math.min(1,
  ((x-s.x1)*dx+(z-s.z1)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(x-(s.x1+dx*t),z-(s.z1+dz*t));
}
export function fenceObstructionAt(x:number,z:number,radius=.3):boolean{
 return FENCE.some(s=>distanceToSegment(x,z,s)<.20+radius);
}
export function fieldTreeAt(x:number,z:number,radius=.3):boolean{
 return FIELD_TREES.some(t=>Math.hypot(t.x-x,t.z-z)<.20*t.scale+radius);
}
export function fieldObjectAt(x:number,z:number,radius=.3):boolean{
 return YARD_EQUIPMENT.some(p=>
  Math.hypot(x-p.x,z-p.z)<(p.type==='tank'?1.25:p.type==='generator'?1.3:.55)+radius);
}
export function insideFirstPlace(x:number,z:number):boolean{
 return Math.abs(x-FIRST_PLACE.center.x)<=FIRST_PLACE.halfSize&&
  Math.abs(z-FIRST_PLACE.center.z)<=FIRST_PLACE.halfSize;
}
export function siteSurfaceAt(x:number,z:number):'yard'|'path'|'ditch'|'woodland'{
 if(DRAINAGE.some(s=>distanceToSegment(x,z,s)<1.8))return 'ditch';
 if(FOOTPATH.some(s=>distanceToSegment(x,z,s)<1.8))return 'path';
 if(x>49&&x<117&&z>66&&z<145)return 'yard';
 return 'woodland';
}
export function fieldTreeCanopyAt(x:number,z:number):boolean{
 return FIELD_TREES.some(t=>Math.hypot(x-t.x,z-t.z)<3.8*t.scale);
}

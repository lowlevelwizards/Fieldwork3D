/** R5A: explicit cosmetic identity markings. No rank, authority, inventory or gameplay effects.
 * Availability describes visually plausible historical context; it does NOT
 * claim a specific soldier or regiment actually wore a given badge.
 */
export const MARKING_SLOTS=['leftShoulder','rightShoulder','chest','armband'] as const;
export type MarkingSlot=typeof MARKING_SLOTS[number];
export type IdentityMarkings=Partial<Record<MarkingSlot,string>>;
export type MarkingRecord={id:string;label:string;kind:'flag'|'label'|'field-band';
 slots:readonly MarkingSlot[];from:number;to:number;
 /** A simple known graphic; no fabricated organizational seals. */
 graphic:string};
const shoulders=['leftShoulder','rightShoulder'] as const;
const rightShoulder=['rightShoulder'] as const;
const chest=['chest'] as const;
const band=['armband'] as const;
export const IDENTITY_MARKINGS:readonly MarkingRecord[]=[
 {id:'flag-us',label:'United States flag · standard orientation',kind:'flag',slots:shoulders,from:1777,to:2100,graphic:'us'},
 // Forward-facing canton on the right arm, established for universal Army BDU wear in 2004.
 {id:'flag-us-reversed',label:'US Army flag · right shoulder, canton forward',kind:'flag',slots:rightShoulder,from:2004,to:2100,graphic:'us-reverse'},
 {id:'flag-uk',label:'United Kingdom flag',kind:'flag',slots:shoulders,from:1801,to:2100,graphic:'uk'},
 {id:'flag-germany',label:'German federal flag',kind:'flag',slots:shoulders,from:1949,to:2100,graphic:'de'},
 {id:'flag-ukraine',label:'Ukraine flag',kind:'flag',slots:shoulders,from:1992,to:2100,graphic:'ua'},
 {id:'flag-poland',label:'Poland flag',kind:'flag',slots:shoulders,from:1919,to:2100,graphic:'pl'},
 {id:'flag-france',label:'France flag',kind:'flag',slots:shoulders,from:1794,to:2100,graphic:'fr'},
 {id:'flag-italy',label:'Italy flag',kind:'flag',slots:shoulders,from:1946,to:2100,graphic:'it'},
 {id:'flag-russia',label:'Russian tricolor',kind:'flag',slots:shoulders,from:1991,to:2100,graphic:'ru'},
 {id:'flag-indonesia',label:'Indonesia flag',kind:'flag',slots:shoulders,from:1945,to:2100,graphic:'id'},
 {id:'flag-belgium',label:'Belgium flag',kind:'flag',slots:shoulders,from:1831,to:2100,graphic:'be'},
 {id:'flag-sweden',label:'Sweden flag',kind:'flag',slots:shoulders,from:1906,to:2100,graphic:'se'},
 {id:'flag-finland',label:'Finland flag',kind:'flag',slots:shoulders,from:1918,to:2100,graphic:'fi'},
 {id:'flag-norway',label:'Norway flag',kind:'flag',slots:shoulders,from:1899,to:2100,graphic:'no'},
 {id:'flag-canada',label:'Canada flag',kind:'flag',slots:shoulders,from:1965,to:2100,graphic:'ca'},
 {id:'flag-switzerland',label:'Swiss flag',kind:'flag',slots:shoulders,from:1889,to:2100,graphic:'ch'},
 {id:'flag-greece',label:'Greece flag',kind:'flag',slots:shoulders,from:1978,to:2100,graphic:'gr'},
 {id:'flag-japan',label:'Japan flag',kind:'flag',slots:shoulders,from:1870,to:2100,graphic:'jp'},
 {id:'flag-australia',label:'Australia flag',kind:'flag',slots:shoulders,from:1954,to:2100,graphic:'au'},
 {id:'flag-south-korea',label:'Republic of Korea flag',kind:'flag',slots:shoulders,from:1949,to:2100,graphic:'kr'},
 {id:'flag-china',label:'People’s Republic of China flag',kind:'flag',slots:shoulders,from:1949,to:2100,graphic:'cn'},
 {id:'flag-india',label:'India flag',kind:'flag',slots:shoulders,from:1947,to:2100,graphic:'in'},
 {id:'flag-south-africa',label:'South Africa flag (1994–)',kind:'flag',slots:shoulders,from:1994,to:2100,graphic:'za'},
 {id:'flag-east-germany',label:'East Germany state flag (1959–1990)',kind:'flag',slots:shoulders,from:1959,to:1990,graphic:'ddr'},
 {id:'label-police',label:'POLICE panel',kind:'label',slots:chest,from:1950,to:2100,graphic:'police'},
 {id:'label-swat',label:'SWAT panel',kind:'label',slots:chest,from:1970,to:2100,graphic:'swat'},
 // OMON is written ОМОН in Cyrillic; its four glyph silhouettes match Latin OMON.
 {id:'label-omon',label:'OMON / ОМОН police panel',kind:'label',slots:chest,from:1988,to:2100,graphic:'omon'},
 {id:'label-security',label:'SECURITY panel',kind:'label',slots:chest,from:1950,to:2100,graphic:'security'},
 {id:'band-blue',label:'Blue field identification',kind:'field-band',slots:band,from:1900,to:2100,graphic:'blue'},
 {id:'band-yellow',label:'Yellow field identification',kind:'field-band',slots:band,from:1900,to:2100,graphic:'yellow'}
];
const byId=new Map(IDENTITY_MARKINGS.map(m=>[m.id,m]));
export const identityMarking=(id:unknown):MarkingRecord|undefined=>
 typeof id==='string'?byId.get(id):undefined;
export function readIdentityMarkings(raw:unknown):IdentityMarkings{
 const result:IdentityMarkings={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
 const obj=raw as Record<string,unknown>;
 for(const slot of MARKING_SLOTS){
  const marking=identityMarking(obj[slot]);
  if(marking&&marking.slots.includes(slot))result[slot]=marking.id;
 }
 return result;
}
export function setIdentityMarking(raw:IdentityMarkings,slot:MarkingSlot,id:string|null):IdentityMarkings{
 const result=readIdentityMarkings(raw);
 if(!id){delete result[slot];return result;}
 const marking=identityMarking(id);
 if(marking&&marking.slots.includes(slot))result[slot]=id;
 return result;
}
export const identityMarkingChoices=(slot:MarkingSlot,year?:number)=>
 IDENTITY_MARKINGS.filter(x=>x.slots.includes(slot)&&
  (year===undefined||(year>=x.from&&year<=x.to)));
/** Curation for the reference library: not all national flags were standard combat insignia. */
export function referenceIdentity(country:string,year:number,organization:string):IdentityMarkings{
 if(organization==='police')return {chest:'label-police'};
 const flagByCountry:Record<string,string>={
  'United States':year>=2004?'flag-us-reversed':'flag-us','United Kingdom':'flag-uk','Germany':'flag-germany',
  'Ukraine':'flag-ukraine','Poland':'flag-poland','France':'flag-france',
  'Italy':'flag-italy','Russia':'flag-russia','Indonesia':'flag-indonesia',
  'Belgium':'flag-belgium','Sweden':'flag-sweden','Finland':'flag-finland',
  'Norway':'flag-norway','Canada':'flag-canada','Switzerland':'flag-switzerland',
  'Greece':'flag-greece','Japan':'flag-japan','Australia':'flag-australia',
  'South Korea':'flag-south-korea','China':'flag-china','India':'flag-india',
  'South Africa':'flag-south-africa','East Germany':'flag-east-germany'
 };
 const id=flagByCountry[country],m=identityMarking(id);
 // Keep historically uncertain reference kits unmarked rather than invent issue.
 return m&&year>=m.from&&year<=m.to?{rightShoulder:id}:{};
}

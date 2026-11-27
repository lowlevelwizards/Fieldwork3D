/** SR13 visual identities; existing WR custody capabilities and saved IDs
 * are unchanged. These are stylized presentation profiles, not new gear. */
import type {SlingKind} from './breach-weapon-retention.ts';
export type SlingArtProfile=Readonly<{
 id:'single'|'modern'|'traditional';kind:Exclude<SlingKind,'none'>;
 width:number;color:number;freedom:number;returnHeight:number;entryHeight:number;
}>;
export const SLING_ART_PROFILES:Readonly<Record<SlingArtProfile['id'],SlingArtProfile>>={
 single:{id:'single',kind:'single',width:1.16,color:0x383b34,freedom:1,returnHeight:-1.8,entryHeight:4.2},
 modern:{id:'modern',kind:'two',width:1.35,color:0x4e5544,freedom:.48,returnHeight:-3.5,entryHeight:3.8},
 traditional:{id:'traditional',kind:'two',width:1.0,color:0x80664a,freedom:.67,returnHeight:-4.4,entryHeight:3.5}
};
export function slingArtProfile(id:string|undefined):SlingArtProfile{
 return id==='sling-single-point'?SLING_ART_PROFILES.single:
  id==='sling-traditional'?SLING_ART_PROFILES.traditional:SLING_ART_PROFILES.modern;
}

/** Shared, serializable Quick Play generation messages. */
import type {Site,SiteScale} from './breach-site.ts';

export type QuickPlayGenerationRequest={
  id:number;
  seed:number;
  scale:SiteScale;
};
export type QuickPlayGenerationResponse=
 |{id:number;kind:'progress';percent:number;stage:string;detail:string}
 |{id:number;kind:'done';site:Site;generationMs:number}
 |{id:number;kind:'error';message:string};

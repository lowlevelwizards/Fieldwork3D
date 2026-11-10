/** Shared, serializable Quick Play generation messages. */
import type {Site} from './breach-site.ts';
import type {ResolvedQuickPlay} from './quick-play-settings.ts';

export type QuickPlayGenerationRequest={id:number}&ResolvedQuickPlay;
export type QuickPlayGenerationResponse=
 |{id:number;kind:'progress';percent:number;stage:string;detail:string}
 |{id:number;kind:'done';site:Site;generationMs:number}
 |{id:number;kind:'error';message:string};

/** Pure photography state. Never contains simulation or historical evidence. */
import type {PhotoFilter,PhotoRatio} from './breach-photo-capture.ts';
export type PhotoLens='ortho'|'wide'|'cam';
export type PhotoGuide='off'|'thirds'|'center';
export type PhotoSettings={
 lens:PhotoLens;guide:PhotoGuide;ratio:PhotoRatio;
 filter:PhotoFilter;strength:number;
};
export const INITIAL_PHOTO_SETTINGS:PhotoSettings={
 lens:'ortho',guide:'thirds',ratio:'screen',filter:'original',strength:1
};
export function photographCanEnter(input:{
 site:boolean;loading:boolean;menu:boolean;already:boolean;video:boolean;
}):boolean{
 return input.site&&!input.loading&&!input.menu&&!input.already&&!input.video;
}

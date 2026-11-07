import {activeSite, activateSite, WALLS, COVER} from '../../src/breach-core.ts';

/** Legacy geometry is process-local. Preserve live mutations as well as the authored site. */
export function withTacticalWorld(site, run) {
  const previous = activeSite();
  const walls = structuredClone(WALLS), cover = structuredClone(COVER);
  activateSite(site);
  try {
    const result = run();
    if (result?.then) throw Error('withTacticalWorld requires a synchronous callback');
    return result;
  } finally {
    activateSite(previous);
    WALLS.splice(0, WALLS.length, ...walls);
    COVER.splice(0, COVER.length, ...cover);
  }
}
export function emptySite(overrides = {}) {
  return {seed:1,name:'Verification fixture',scale:'standard',layout:'office',
    bounds:{minX:0,minY:0,maxX:640,maxY:740},walls:[],cover:[],doors:[],rooms:[],
    spawn:[{x:48,y:96},{x:70,y:96},{x:48,y:120},{x:70,y:120}],enemies:[],
    entrance:{x:320,y:500},objective:{x:250,y:96},extract:{x:48,y:650},roomCount:0,
    ...overrides};
}

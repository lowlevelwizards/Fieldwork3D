/** Fieldwork's approved mobile HUD icon family (35 semantic actions).
 * SVG path geometry is stored in its original audition viewBox and rendered
 * at 24 CSS px. It inherits currentColor/operator accents in every theme.
 * Icon ids are stable; state variants remain driven by gameplay labels.
 */
type Glyph={markup:string;viewBox:string;strokeWidth:number};
export const FIELDWORK_ICON_FAMILY:Record<string,Glyph>={
  "go": {
    "markup": "<path d=\"M9 11L18 24L9 37M25 11L34 24L25 37\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "pause": {
    "markup": "<path d=\"M16 10V38M32 10V38\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "engage": {
    "markup": "<path d=\"M12 26V20c0-2.8 1.8-4.5 4.2-4.5 1.6 0 2.8.7 3.6 2v-1.8c0-2.8 1.7-4.3 4.1-4.3 2.3 0 3.8 1.6 3.8 4v.2c.6-2.1 2-3.3 4.1-3.3 2.5 0 4.1 1.8 4.1 4.2v2c.7-1.7 2-2.6 3.8-2.6 2.7 0 4.3 1.8 4.3 4.6v10.6c0 7.7-4.9 12.4-12.3 12.4H22c-6.8 0-10.7-3.9-10.7-10.3v-4.5c0-3.1 1.6-4.9 4-4.9h3.4l4 5.6H34\"/><path d=\"M19.8 17.5v6.5M27.7 16v8M35.9 18.5V24\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.6
  },
  "holdFire": {
    "markup": "<path d=\"M14 27V17.5a3.3 3.3 0 0 1 6.6 0V25 13a3.3 3.3 0 0 1 6.6 0v12-9a3.3 3.3 0 0 1 6.6 0v9-5.5a3.3 3.3 0 0 1 6.6 0v13.3c0 8.8-5.8 13.2-13.8 13.2h-5.3c-5.1 0-8.1-2-11-6.2l-5.2-7.4c-1.3-2.1-.8-4.2 1-5.3 1.9-1.1 4-.5 5.3 1.3L14 32\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.6
  },
  "returnFire": {
    "markup": "<path d=\"M16 6L29 11V23C29 32 23 38 16 41C9 37 4 31 4 23V11Z\"/><path d=\"M34 17L42 13M34 24H45M34 31L42 35\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "suppress": {
    "markup": "<path d=\"M4 14L22 21M4 24H22M4 34L22 27\"/><path d=\"M29 17V12H41V17M29 31V36H41V31\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "flash": {
    "markup": "<g transform=\"rotate(-26 19 25)\"><path d=\"M12 16H26V39H12Z M16 16V10H22V16M15 22H23\"/></g><path d=\"M38 16L45 9M39 25H49M38 33L45 40\"/>",
    "viewBox": "0 0 54 50",
    "strokeWidth": 2.4
  },
  "reload": {
    "markup": "<path d=\"M17 8H30V25L34 39H21L17 25Z M23.5 11V25L27.5 36\"/><path d=\"M10 12C2 17 2 31 10 36M5 32L10 36L11 30M41 36C49 31 49 17 41 12M46 16L41 12L40 18\"/>",
    "viewBox": "0 0 50 48",
    "strokeWidth": 2.3
  },
  "wait": {
    "markup": "<path d=\"M13 7H35M13 41H35M15 9C15 18 20 21 24 24C20 27 15 31 15 39M33 9C33 18 28 21 24 24C28 27 33 31 33 39M20 34H28\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "cancelTarget": {
    "markup": "<path d=\"M11 11L37 37M37 11L11 37\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "walk": {
    "markup": "<g transform=\"rotate(180 24 24)\"><path d=\"M11 19Q11 16 15 16H19Q22 16 22 21L24 37Q24 43 19 43H16Q12 43 12 38Z M27 8Q27 4 31 4H35Q39 4 39 9L40 25Q40 31 35 31H32Q28 31 28 26Z M12 25H22M13 30H23M28 13H39M28 18H39\"/></g>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.6
  },
  "run": {
    "markup": "<g transform=\"translate(35 33) rotate(13) scale(1.7) translate(-28 -31.5)\"><path d=\"M18 24H30V29L32 31H35Q38 31 38 34V39H18Z\"/></g><path d=\"M6 20L14 23M3 30H12M6 40L13 38\"/>",
    "viewBox": "0 0 64 64",
    "strokeWidth": 3.4
  },
  "stand": {
    "markup": "<path d=\"M8 31V11M3 16L8 11L13 16\"/><circle cx=\"30\" cy=\"9\" r=\"4.5\"/><path d=\"M24 18H36L35 29H25Z\"/><path d=\"M24 20L20 29M36 20L40 29\"/><path d=\"M27 29L26 40H23M33 29L34 40H37\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "crouch": {
    "markup": "<path d=\"M8 11V37M3 32L8 37L13 32\"/><circle cx=\"30\" cy=\"13\" r=\"4.5\"/><path d=\"M24 21H36L35 30H25Z\"/><path d=\"M24 23L20 30M36 23L40 30\"/><path d=\"M27 30L19 34L24 41H19M33 30L41 34L36 41H42\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "look": {
    "markup": "<path d=\"M5 24Q24 7 43 24Q24 41 5 24Z\"/><circle cx=\"24\" cy=\"24\" r=\"6\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "watch": {
    "markup": "<path d=\"M5 15V5H15M33 5H43V15M43 33V43H33M15 43H5V33 M9 24Q24 12 39 24Q24 36 9 24Z\"/><circle cx=\"24\" cy=\"24\" r=\"5\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "releaseWatch": {
    "markup": "<path d=\"M5 15V5H15M33 5H43V15M43 33V43H33M15 43H5V33 M9 24Q24 12 39 24Q24 36 9 24Z M7 41L41 7\"/><circle cx=\"24\" cy=\"24\" r=\"5\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "deletePoint": {
    "markup": "<path d=\"M8 13H40M17 13V8H31V13M12 13L15 42H33L36 13 M20 20V35M28 20V35\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "clearPlan": {
    "markup": "<path d=\"M4 38L15 12L26 29L42 8 M30 33L41 44M41 33L30 44\"/><circle cx=\"4\" cy=\"38\" r=\"2\"/><circle cx=\"15\" cy=\"12\" r=\"2\"/><circle cx=\"26\" cy=\"29\" r=\"2\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "undo": {
    "markup": "<path d=\"M15 8L6 17L15 26 M6 17H21C29 17 33 22 32 29\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "redo": {
    "markup": "<path d=\"M25 8L34 17L25 26 M34 17H19C11 17 7 22 8 29\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "openDoor": {
    "markup": "<path d=\"M9 7H39V41H9Z\"/><path d=\"M12 10L28 16V38L12 40Z\"/><circle cx=\"25\" cy=\"28\" r=\"1\"/><path d=\"M33 15Q43 22 35 31M34 25L35 31L41 29\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "closeDoor": {
    "markup": "<path d=\"M9 7H39V41H9Z\"/><path d=\"M12 10H36V39H12Z\"/><circle cx=\"32\" cy=\"26\" r=\"1\"/><path d=\"M3 24H10M7 20L11 24L7 28\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "kick": {
    "markup": "<g transform=\"translate(28 34) rotate(-33) scale(1.68) translate(-28 -31.5)\"><path d=\"M18 24H30V29L32 31H35Q38 31 38 34V39H18Z\"/></g><path d=\"M53 24V43\"/><path stroke-width=\"2.9\" d=\"M57 28L61 25M58 35H62M57 42L61 45\"/>",
    "viewBox": "0 0 64 64",
    "strokeWidth": 3.4
  },
  "push": {
    "markup": "<rect x=\"32\" y=\"9\" width=\"12\" height=\"30\"/><path d=\"M32 24H28L24 20L21 21V17Q21 15 18 15Q15 15 15 18V26L11 21Q8 19 6 21Q4 23 6 26L13 36Q15 39 19 39H32\"/><path d=\"M21 23H28\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "window": {
    "markup": "<path d=\"M6 8H36V41H6Z\"/><path d=\"M21 8V41M6 24H36\"/><path d=\"M32 15L43 4M36 4H43V11\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "settings": {
    "markup": "<path d=\"M7 10H41M7 24H41M7 38H41\"/><circle cx=\"18\" cy=\"10\" r=\"4\"/><circle cx=\"32\" cy=\"24\" r=\"4\"/><circle cx=\"18\" cy=\"38\" r=\"4\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "fitView": {
    "markup": "<path d=\"M18 6H6V18M30 6H42V18M42 30V42H30M18 42H6V30 M15 15L6 6M33 15L42 6M33 33L42 42M15 33L6 42\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "briefing": {
    "markup": "<path d=\"M4 10L17 5L30 10L44 5V38L30 43L17 38L4 43Z M17 5V38M30 10V43 M20 19L25 24L20 29\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "restart": {
    "markup": "<g transform=\"translate(40 0) scale(-1 1)\"><path d=\"M8 22A13 13 0 1 1 33 18 M33 10V18H24\"/></g>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.5
  },
  "watchReplay": {
    "markup": "<path d=\"M4 6H36V34H4Z M11 6V34M29 6V34 M4 13H11M4 27H11M29 13H36M29 27H36 M16 14L26 20L16 26Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.2
  },
  "previousEvent": {
    "markup": "<path d=\"M10 8V32 M31 9L13 20L31 31Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "rewind": {
    "markup": "<path d=\"M20 9L7 20L20 31Z M34 9L21 20L34 31Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "fastForward": {
    "markup": "<path d=\"M7 9L20 20L7 31Z M21 9L34 20L21 31Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "nextEvent": {
    "markup": "<path d=\"M30 8V32 M9 9L27 20L9 31Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.65
  },
  "replayPlay": {
    "markup": "<path d=\"M13 8L33 20L13 32Z\"/>",
    "viewBox": "0 0 40 40",
    "strokeWidth": 2.4
  },
  "medical": {
    "markup": "<path d=\"M18 6H30V18H42V30H30V42H18V30H6V18H18Z\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  },
  "focus": {
    "markup": "<circle cx=\"24\" cy=\"24\" r=\"8\"/><path d=\"M24 4V12M24 36V44M4 24H12M36 24H44\"/>",
    "viewBox": "0 0 48 48",
    "strokeWidth": 2.65
  }
};
const aliases:Record<string,string>={
  "ctxOpen": "openDoor",
  "ctxDoor": "openDoor",
  "ctxClose": "closeDoor",
  "ctxKick": "kick",
  "ctxDoorFlash": "flash",
  "ctxLook": "look",
  "ctxWatch": "watch",
  "ctxReleaseWatch": "releaseWatch",
  "ctxWait": "wait",
  "ctxFlash": "flash",
  "ctxSuppress": "suppress",
  "ctxFire": "engage",
  "ctxFireHold": "holdFire",
  "ctxFireReturn": "returnFire",
  "ctxStance": "stand",
  "ctxStanceCrouch": "crouch",
  "ctxPace": "run",
  "ctxPaceWalk": "walk",
  "ctxReload": "reload",
  "ctxDelete": "deletePoint",
  "ctxPush": "push",
  "ctxWindow": "window",
  "ctxTreat": "medical",
  "siteSettingsToggle": "settings",
  "reset": "restart",
  "cancelTarget": "cancelTarget",
  "back": "undo"
};

/** Resolve the four persistent quick-strip states without mutating actions. */
export function tacticalIconForState(id:string,label:string){
  const state=label.trim().toUpperCase();
  if(id==='ctxStance')return state==='CROUCH'?'ctxStanceCrouch':'ctxStance';
  if(id==='ctxPace')return state==='WALK'?'ctxPaceWalk':'ctxPace';
  if(id==='ctxFire')return state.startsWith('HOLD')?'ctxFireHold':
    state.startsWith('RETURN')?'ctxFireReturn':'ctxFire';
  return id;
}
export function tacticalIcon(key:string):SVGSVGElement{
  const id=aliases[key]??key;
  const g=FIELDWORK_ICON_FAMILY[id]??FIELDWORK_ICON_FAMILY.focus;
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox',g.viewBox);
  s.setAttribute('width','24');s.setAttribute('height','24');
  s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');
  s.setAttribute('stroke-width',String(g.strokeWidth));
  s.setAttribute('stroke-linecap','round');
  s.setAttribute('stroke-linejoin','round');
  s.setAttribute('aria-hidden','true');s.classList.add('ui-icon');
  s.innerHTML=g.markup;
  return s;
}
export function decorateIconButton(button:HTMLButtonElement,key:string){
  if(button.querySelector('.ui-icon'))return;
  button.prepend(tacticalIcon(key));
}

/** Compact 24px outlined instrument icon family, matched to Tabler's stroke language.
 * Custom tactical glyphs (pie, suppress, door flash) share the same canvas. */
const glyphs:Record<string,string>={
  ctxOpen:'<path d="M5 21V4l12-2v19H5Z"/><path d="M11 12h2"/>',
  ctxKick:'<path d="M4 19h14M7 15l4-8 5 5-3 4-6-1Z"/><path d="m16 12 4-2"/>',
  ctxDoorFlash:'<circle cx="12" cy="12" r="3"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3 3m8 8 3 3m0-14-3 3M8 16l-3 3"/>',
  ctxHold:'<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M10 12h5m-3-3v6"/>',
  ctxLook:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  ctxPie:'<circle cx="5" cy="19" r="2"/><path d="M5 19V8M5 19h11M5 19A14 14 0 0 1 19 5"/><path d="M15 4h4v4"/>',
  ctxFlash:'<circle cx="12" cy="12" r="3"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3 3m8 8 3 3m0-14-3 3M8 16l-3 3"/>',
  ctxWait:'<path d="M8 5v14m8-14v14"/>',
  ctxFocus:'<circle cx="12" cy="12" r="4"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  ctxSuppress:'<path d="M4 17 10 14 10 10 4 7Z"/><path d="M11 7 21 3M11 12 22 12M11 17 21 21"/><path d="M14 9l3-1m-3 8 3 1" stroke-dasharray="2 2"/>',
  ctxFire:'<path d="M3 8h9l3-2h5v6h-6l-3 3H7l-3 4"/><path d="m14 15 3 5"/><circle cx="19" cy="9" r="1"/>',
  ctxStance:'<circle cx="12" cy="4.5" r="2"/><path d="M12 7v8m0-5-5 3m5-3 5 2m-5 3-5 6m5-6 6 6"/>',
  ctxPace:'<circle cx="15" cy="4" r="2"/><path d="m14 7-5 4 4 3 7 1m-7-1-4 7m0-10-5 3m12 0 5-5"/>',
  ctxReload:'<path d="M6 5h12v5H6zM8 10v9l4 3 4-3v-9"/><path d="M12 12v6M4 13H2m20 0h-2"/>',
  ctxDelete:'<path d="M4 7h16M9 7v12m6-12v12M6 7l1 14h10l1-14M9 4h6"/>',
  back:'<path d="m15 5-7 7 7 7"/>',undo:'<path d="M9 8 4 12l5 4M4 12h9a6 6 0 0 1 0 12"/>',
  redo:'<path d="m15 8 5 4-5 4M20 12H11a6 6 0 0 0-6 6"/>',
  moreOrders:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  siteSettingsToggle:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
  cancelTarget:'<path d="M5 5l14 14M19 5 5 19"/>',
  go:'<path d="M8 5 19 12 8 19Z"/>',
  pause:'<path d="M8 5v14m8-14v14"/>',
  reset:'<path d="M5 7a8 8 0 1 1-1 10"/><path d="M5 2v5H1"/>'
};
export function tacticalIcon(key:string):SVGSVGElement{
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 24 24');
  s.setAttribute('width','19');s.setAttribute('height','19');
  s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');
  s.setAttribute('stroke-width','1.9');
  s.setAttribute('stroke-linecap','round');
  s.setAttribute('stroke-linejoin','round');
  s.setAttribute('aria-hidden','true');s.classList.add('ui-icon');
  s.innerHTML=glyphs[key]??glyphs.ctxFocus;
  return s;
}
export function decorateIconButton(button:HTMLButtonElement,key:string){
  if(button.querySelector('.ui-icon'))return;
  button.prepend(tacticalIcon(key));
}

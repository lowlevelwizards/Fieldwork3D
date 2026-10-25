import {
  REGIONS, REGION_LENGTH_KM, regionalRiverX,
  regionalHeight,
} from './region-model';

/**
 * Read-only macro map; no procedural campaign generation is enabled yet.
 * This is the stable regional identity from north to south; the playable
 * local 10 m hydrology section is a representative watershed test slice.
 */
export function mountRegionInspector():void{
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.id='regionToggle';
  toggle.textContent='VERDIGRIS / REGION';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','regionPanel');
  toggle.className='region-map-toggle';

  const panel=document.createElement('aside');
  panel.id='regionPanel';
  panel.className='region-map-panel';
  panel.setAttribute('aria-label','Verdigris north to south watershed overview');
  panel.hidden=true;
  const rows=REGIONS.map((r,i)=>{
    const top=10+r.startKm/REGION_LENGTH_KM*485;
    const bottom=10+r.endKm/REGION_LENGTH_KM*485;
    const fill=['#627781','#537b68','#6c826a','#a3a078','#668883','#677684'][i];
    return '<rect x="1" y="'+top+'" width="258" height="'+(bottom-top)+
      '" fill="'+fill+'" opacity=".26" />'
      +'<text x="8" y="'+(top+Math.min(18,(bottom-top)*.43))+
      '" font-size="10" fill="#dfe9de">'+r.name+'</text>';
  }).join('');
  const path=(offset:number)=>Array.from({length:121},(_,i)=>{
    const km=i/120*REGION_LENGTH_KM;
    const xKm=regionalRiverX(km)+offset;
    // Rim contour changes with regional relief, not purely artistic noise.
    const relief=regionalHeight(xKm,km)-regionalHeight(regionalRiverX(km),km);
    const dx=122+xKm*5+Math.sign(offset)*relief*.002;
    const y=10+km/REGION_LENGTH_KM*485;
    return (i?'L':'M')+dx.toFixed(2)+' '+y.toFixed(2);
  }).join(' ');
  const river=path(0);
  const hills=[-13,-9,9,13].map(o=>
    '<path d="'+path(o)+'" fill="none" stroke="#b6ad87" '+
    'stroke-opacity=".35" stroke-width="1.3"/>').join('');
  panel.innerHTML='<div class="region-map-heading"><strong>VERDIGRIS VALLEY</strong>'
    +'<span>North → South · 180 km regional model</span></div>'
    +'<svg viewBox="0 0 260 506" role="img" aria-label="Fixed north-south regional valley, winding river, ridges, and six regional zones">'
    +'<rect x="1" y="1" width="258" height="504" rx="7" fill="#314c4a"/>'
    +rows+hills
    +'<path d="'+river+'" fill="none" stroke="#243f48" stroke-width="11" opacity=".65"/>'
    +'<path d="'+river+'" fill="none" stroke="#8cbcc4" stroke-width="4" stroke-linecap="round"/>'
    +'<text x="244" y="12" text-anchor="end" font-size="9" fill="#e4eee6">N ↑</text>'
    +'<text x="244" y="489" text-anchor="end" font-size="9" fill="#e4eee6">S ↓</text>'
    +'</svg>'
    +'<p>The blue watercourse follows the continuous north–south valley. '
    +'Terrain and hydrology are proven in the smaller detailed test section. '
    +'Campaign-specific geography comes later.</p>';
  toggle.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
  });
  document.body.append(toggle,panel);
}

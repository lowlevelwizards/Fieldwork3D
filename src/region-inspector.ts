import {
  REGIONS, REGION_LENGTH_KM, regionalRiverX,
  regionalHeight,
} from './region-model';
import {
  roadCorridor, settlementSites, snowCover, coastalInundation,
} from './region-ecology';

/** The 180km strategic atlas is a distinct scale from the 10m test slab.
 * Regional features are geographic planning data, not active tactical NPCs.
 */
export function mountRegionInspector():void{
  const toggle=document.createElement('button');
  toggle.type='button';toggle.id='regionToggle';
  toggle.textContent='VERDIGRIS / REGION';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','regionPanel');
  toggle.className='region-map-toggle';
  const panel=document.createElement('aside');
  panel.id='regionPanel';panel.className='region-map-panel';
  panel.setAttribute('aria-label','Verdigris alpine headwaters to coastal estuary');
  panel.hidden=true;
  const y=(km:number)=>10+km/REGION_LENGTH_KM*485;
  const x=(km:number,southKm:number)=>122+(km-regionalRiverX(southKm))*5+
    regionalRiverX(southKm)*5;
  const ribbon=(offset:number)=>Array.from({length:121},(_,i)=>{
    const km=i/120*REGION_LENGTH_KM;
    const cx=regionalRiverX(km)+offset;
    const relief=regionalHeight(cx,km)-regionalHeight(regionalRiverX(km),km);
    return (i?'L':'M')+(x(cx,km)+Math.sign(offset)*relief*.002).toFixed(2)+
      ' '+y(km).toFixed(2);
  }).join(' ');
  const road=(side:-1|1)=>Array.from({length:101},(_,i)=>{
    const km=i/100*REGION_LENGTH_KM;
    return (i?'L':'M')+x(roadCorridor(km,side),km).toFixed(2)+
      ' '+y(km).toFixed(2);
  }).join(' ');
  const zones=REGIONS.map((r,i)=>{
    const colors=['#a1b3b2','#5b8878','#477561','#aeac76','#527e79','#607f8d'];
    return '<rect x="1" y="'+y(r.startKm)+'" width="258" height="'+
      (y(r.endKm)-y(r.startKm))+'" fill="'+colors[i]+'" opacity=".43"/>'+
      '<text x="8" y="'+(y(r.startKm)+Math.min(16,(y(r.endKm)-y(r.startKm))*.36))+
      '" font-size="10" fill="#f5f1dc">'+r.name+'</text>';
  }).join('');
  const snow=Array.from({length:8},(_,i)=>{
    const km=3+i*3.2;
    const strength=snowCover(km,regionalRiverX(km)-17);
    return '<path d="M1 '+y(km).toFixed(1)+' Q65 '+
      (y(km)+7).toFixed(1)+' 118 '+(y(km)+3).toFixed(1)+
      '" fill="none" stroke="#e1e9e6" stroke-width="'+
      (1+strength*4).toFixed(1)+'" opacity="'+(.17+strength*.35).toFixed(2)+'"/>';
  }).join('');
  const sea='<rect x="1" y="'+y(174)+'" width="258" height="'+
    (y(180)-y(174))+'" fill="#77a9b8" opacity=".55"/>';
  const wetland=Array.from({length:13},(_,i)=>{
    const km=132+i*2.7;
    const risk=coastalInundation(km,regionalRiverX(km));
    return '<ellipse cx="'+(122+Math.sin(i*2)*22).toFixed(1)+
      '" cy="'+y(km).toFixed(1)+'" rx="'+(10+risk*12).toFixed(1)+
      '" ry="2.8" fill="#8cbabd" opacity=".38"/>';
  }).join('');
  const sites=settlementSites().map(s=>{
    const cx=x(s.xKm,s.southKm),cy=y(s.southKm);
    const port=s.type==='port';
    return '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+
      '" r="'+(port?3.9:2.8)+'" fill="#f0d7a0" stroke="#303c39" stroke-width="1.1"/>'+
      '<title>'+s.name+' · '+s.type+' · '+s.altitudeM.toFixed(0)+' m</title>';
  }).join('');
  const hills=[-17,-11,11,17].map(o=>
    '<path d="'+ribbon(o)+'" fill="none" stroke="#e1d5ae" stroke-opacity=".40" stroke-width="1.3"/>').join('');
  const river=ribbon(0);
  panel.innerHTML='<div class="region-map-heading"><strong>VERDIGRIS VALLEY</strong>'+
    '<span>Alpine → forests → farms → wetlands → coast · 180 km</span></div>'+
    '<svg viewBox="0 0 260 506" role="img" aria-label="Six ecological regions from snowy mountains to the southern estuary, with a valley river, roads and ten logical settlement sites">'+
    '<rect x="1" y="1" width="258" height="504" rx="7" fill="#314c4a"/>'+
    zones+snow+sea+wetland+hills+
    '<path d="'+road(-1)+'" fill="none" stroke="#d6b67e" stroke-width="1.5" stroke-dasharray="5 3" opacity=".9"/>'+
    '<path d="'+road(1)+'" fill="none" stroke="#d6b67e" stroke-width="1.5" stroke-dasharray="5 3" opacity=".8"/>'+
    '<path d="'+river+'" fill="none" stroke="#314b55" stroke-width="11" opacity=".68"/>'+
    '<path d="'+river+'" fill="none" stroke="#92c1c4" stroke-width="4" stroke-linecap="round"/>'+
    sites+'<text x="245" y="12" text-anchor="end" font-size="9" fill="#f3f5e9">N ↑</text>'+
    '<text x="245" y="488" text-anchor="end" font-size="9" fill="#f3f5e9">S ↓</text></svg>'+
    '<p>Ten planned settlement sites occupy valley terraces along two strategic road corridors. Snow and wetlands follow regional altitude and temperature. This is the strategic atlas, not a fully simulated 180 km battlefield.</p>'+
    '<a class="region-map-operation" href="./operation.html">OPEN FIRST OPERATION / TRAINING AREA</a>';
  toggle.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
  });
  document.body.append(toggle,panel);
}

import { PLAYABLE_REGIONS } from './playable-region-model';

/** Small lab->region launcher. The original 180km atlas survives as
 * historical test data in region-model.ts; it is no longer presented as
 * playable scale. Region loading happens in world.html, not in this lab. */
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
  panel.setAttribute('aria-label','Six playable Verdigris regions');
  panel.hidden=true;
  panel.innerHTML=
    '<div class="region-map-heading"><strong>VERDIGRIS VALLEY</strong>'+
    '<span>Six separately loaded 1 km² regions · North → South</span></div>'+
    '<div class="region-lab-list">'+
    PLAYABLE_REGIONS.map((region,index)=>
      '<div class="region-lab-item'+(region.implemented?' live':'')+'">'+
      '<span>'+String(index+1).padStart(2,'0')+' · '+
      region.name.toUpperCase()+'</span>'+
      '<small>'+(region.implemented?'EXPLORE':'PLANNED')+'</small></div>'
    ).join('')+'</div>'+
    '<a class="region-world-link" href="./world.html">'+
    'OPEN 1 KM CUTWOODS REGION</a>'+
    '<p>This scene is the original 10 m Environment Lab. Its saved water,'+
    ' soil, vegetation and ground-load simulations remain intact.'+
    ' Regional terrain is separate and currently has no gameplay or full hydrology.</p>';
  toggle.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    toggle.setAttribute('aria-expanded',String(!panel.hidden));
  });
  document.body.append(toggle,panel);
}

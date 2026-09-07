'use strict';

const Core=window.YamahaSimulatorCore;
const APP_VERSION='1.2.1';
const STORAGE_KEY='simulateur-batterie-gpx-yamaha-v1-settings';
const LEGACY_STORAGE_KEY='simulateur-batterie-gpx-web-v1-settings';
let settings=loadSettings();
let gpxPoints=null;
let gpxName=null;
let gpxInfo=null;
let simulation=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fr=(n,d=1)=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fr0=n=>fr(n,0);
const fr1=n=>fr(n,1);
const fr2=n=>fr(n,2);

function loadSettings(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? '{}';
    const stored=JSON.parse(raw);
    const merged={...Core.DEFAULTS,...stored};
    for(const key of Object.keys(Core.DEFAULTS)){
      const n=Number(merged[key]);
      merged[key]=Number.isFinite(n)?n:Core.DEFAULTS[key];
    }
    return merged;
  }catch{return {...Core.DEFAULTS};}
}
function saveSettings(){localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}
function setStatus(text){$('#appStatus').textContent=text;}

function parseGpx(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('Le fichier GPX est invalide ou illisible.');

  const trksegs=[...doc.getElementsByTagNameNS('*','trkseg')];
  const points=[];
  let missingElevation=0;
  let segmentCount=0;

  function appendNodes(nodes){
    if(nodes.length<1) return;
    segmentCount++;
    nodes.forEach((n,index)=>{
      const lat=Number(n.getAttribute('lat'));
      const lon=Number(n.getAttribute('lon'));
      const eleNode=[...n.children].find(c=>c.localName==='ele');
      const ele=eleNode?Number(eleNode.textContent):null;
      if(!Number.isFinite(lat)||!Number.isFinite(lon)) throw new Error('Un point GPX contient des coordonnées invalides.');
      if(!Number.isFinite(ele)) missingElevation++;
      points.push({lat,lon,ele:Number.isFinite(ele)?ele:null,breakBefore:index===0 && points.length>0});
    });
  }

  if(trksegs.length){
    trksegs.forEach(seg=>appendNodes([...seg.getElementsByTagNameNS('*','trkpt')]));
  }else{
    appendNodes([...doc.getElementsByTagNameNS('*','trkpt')]);
  }

  if(points.length<2) throw new Error('Le GPX doit contenir au moins deux points <trkpt>.');
  if(missingElevation===points.length) throw new Error('Le GPX ne contient aucune altitude <ele>. Le calcul du D+ Yamaha serait impossible.');

  return {points,info:{pointCount:points.length,trackSegmentCount:Math.max(segmentCount,1),missingElevation}};
}

function selectScreen(name){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
  $$('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${name}`));
  if(name==='results'&&simulation) requestAnimationFrame(renderCharts);
}
$$('.tab').forEach(b=>b.addEventListener('click',()=>selectScreen(b.dataset.screen)));

function fillSettings(){$$('[data-setting]').forEach(i=>{i.value=settings[i.dataset.setting];});}
function readSettings(){
  const next={...settings};
  $$('[data-setting]').forEach(i=>{
    const v=Number(String(i.value).replace(',','.'));
    if(!Number.isFinite(v)) throw new Error(`Valeur invalide : ${i.dataset.setting}`);
    next[i.dataset.setting]=v;
  });
  Core.validateSettings(next);
  return next;
}

$('#saveSettingsBtn').addEventListener('click',()=>{
  try{
    settings=readSettings();
    saveSettings();
    $('#settingsSaved').textContent='Paramètres enregistrés.';
    setTimeout(()=>$('#settingsSaved').textContent='',2200);
    if(gpxPoints) analyze();
  }catch(e){alert(e.message);}
});
$('#resetSettingsBtn').addEventListener('click',()=>{
  if(!confirm('Revenir aux valeurs de référence Yamaha / Excel V1 ?')) return;
  settings={...Core.DEFAULTS};
  saveSettings();
  fillSettings();
  if(gpxPoints) analyze();
});

$('#gpxInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  setStatus('Lecture GPX…');
  try{
    gpxName=file.name;
    const parsed=parseGpx(await file.text());
    gpxPoints=parsed.points;
    gpxInfo=parsed.info;
    analyze();
    selectScreen('gpx');
  }catch(err){
    console.error(err);
    setStatus('Erreur');
    alert(err.message);
  }finally{e.target.value='';}
});
$('#reanalyzeBtn').addEventListener('click',()=>{if(gpxPoints) analyze();});

function analyze(){
  try{
    simulation=Core.simulate(gpxPoints,settings);
    setStatus('Calcul terminé');
    $('#gpxEmpty').classList.add('hidden');
    $('#gpxLoaded').classList.remove('hidden');
    $('#resultsEmpty').classList.add('hidden');
    $('#resultsContent').classList.remove('hidden');
    $('#fileName').textContent=gpxName;
    $('#resultFileName').textContent=gpxName;
    $('#gpxMetrics').innerHTML=[
      metric('Points GPX',gpxPoints.length.toLocaleString('fr-FR')),
      metric('Distance',`${fr1(simulation.totalDistanceKm)} km`),
      metric('D+',`${fr0(simulation.totalElevationGainM)} m`),
      metric('Tronçons calcul',simulation.segments.length.toLocaleString('fr-FR'))
    ].join('');
    renderGpxWarning();
    renderResults();
  }catch(e){
    console.error(e);
    setStatus('Erreur');
    alert(e.message);
  }
}

function renderGpxWarning(){
  const box=$('#gpxWarning');
  const msgs=[];
  if(gpxInfo?.trackSegmentCount>1) msgs.push(`${gpxInfo.trackSegmentCount} segments GPX détectés : aucune liaison artificielle n'est ajoutée entre eux.`);
  if(gpxInfo?.missingElevation>0) msgs.push(`${gpxInfo.missingElevation} point(s) sans altitude : ces transitions ne contribuent pas au D+.`);
  box.textContent=msgs.join(' ');
  box.classList.toggle('hidden',msgs.length===0);
}

function metric(label,value,cls='',sub=''){
  return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value ${cls}">${value}</div>${sub?`<div class="metric-sub">${sub}</div>`:''}</div>`;
}
function batteryClass(wh){return Core.batteryBand(wh,settings.batteryCapacityWh);}
function batteryStatusClass(wh){
  const band=batteryClass(wh);
  return band==='good'?'ok':band==='warn'?'warn':'alert';
}

function renderResults(){
  const r=simulation;
  const s=settings;
  const re=r.recharge;
  $('#routeMetrics').innerHTML=[
    metric('Distance',`${fr1(r.totalDistanceKm)} km`),
    metric('D+',`${fr0(r.totalElevationGainM)} m`),
    metric('Tronçons',r.segments.length.toLocaleString('fr-FR')),
    metric('Batterie',`${fr0(s.batteryCapacityWh)} Wh`)
  ].join('');

  $('#noRechargeMetrics').innerHTML=[
    metric('Consommation totale',`${fr1(r.totalConsumptionWh)} Wh`),
    metric('Batterie finale',`${fr1(r.remainingWh)} Wh`,batteryClass(r.remainingWh)),
    metric('Batterie finale',`${fr0(r.remainingPercent*100)} %`,batteryClass(r.remainingWh)),
    metric('Énergie rechargée','0 Wh')
  ].join('');
  $('#noRechargeStatus').textContent=r.remainingExactWh>=0
    ? `Arrivée avec ${fr0(r.remainingPercent*100)} % de batterie.`
    : `Batterie théoriquement épuisée avant l'arrivée (${fr1(-r.remainingExactWh)} Wh manquants).`;
  $('#noRechargeStatus').className=`scenario-note ${batteryStatusClass(r.remainingExactWh)}`;

  if(re.enabled){
    let rechargeSub;
    if(re.limitedByBattery) rechargeSub=`${fr0(re.availableWh)} Wh disponibles, ${fr0(re.maxUsefulWh)} Wh utiles au maximum`;
    else if(re.usesAllAvailable) rechargeSub=`capacité disponible : ${fr0(re.availableWh)} Wh`;
    else rechargeSub=`sur ${fr0(re.availableWh)} Wh disponibles`;

    $('#withRechargeMetrics').innerHTML=[
      metric('Km du plein',`${fr1(re.rechargeKm)} km`,'','calculé automatiquement'),
      metric('Avant recharge',`${fr1(re.beforeWh)} Wh · ${fr0(re.beforePercent*100)} %`,batteryClass(re.beforeWh)),
      metric('Recharge',`+${fr1(re.energyAddedWh)} Wh`,'',rechargeSub),
      metric('Après recharge',`${fr0(s.batteryCapacityWh)} Wh · 100 %`,'good'),
      metric('Conso après le plein',`${fr1(re.consumptionAfterRechargeWh)} Wh`),
      metric('Batterie finale',`${fr1(re.finalWh)} Wh · ${fr0(re.finalPercent*100)} %`,batteryClass(re.finalWh))
    ].join('');
    $('#rechargeRule').innerHTML=`Avec <strong>${fr0(re.availableWh)} Wh</strong> disponibles pour la recharge, le plein à 100 % est placé automatiquement vers le <strong>km ${fr1(re.rechargeKm)}</strong>.`;
    $('#withRechargeStatus').textContent=re.finalWh>=0
      ? `Après le plein, arrivée avec ${fr0(re.finalPercent*100)} % de batterie.`
      : `Même avec ce plein, la batterie serait théoriquement épuisée avant l'arrivée (${fr1(-re.finalWh)} Wh manquants).`;
    $('#withRechargeStatus').className=`scenario-note ${batteryStatusClass(re.finalWh)}`;
  }else{
    $('#withRechargeMetrics').innerHTML=metric('Recharge','Désactivée');
    $('#rechargeRule').textContent=re.reason||'Recharge indisponible.';
    $('#withRechargeStatus').textContent='Règle une capacité de recharge supérieure à 0 Wh pour calculer le scénario 2.';
    $('#withRechargeStatus').className='scenario-note';
  }

  $('#segmentsBody').innerHTML=r.segments.map((x,i)=>{
    const withWh=re.enabled?re.batteryAfterSegment(i):null;
    return `<tr><td>${x.index}</td><td>${fr1(x.startKm)}</td><td>${fr1(x.endKm)}</td><td>${fr2(x.distanceKm)}</td><td>${fr0(x.elevationGainM)}</td><td class="mode ${x.mode==='Turbo'?'turbo':'tour'}">${x.mode}</td><td>${fr1(x.consumptionWh)}</td><td>${fr1(x.cumulativeConsumptionWh)}</td><td class="remaining ${batteryClass(x.remainingWh)}">${fr1(x.remainingWh)}</td><td class="remaining ${withWh==null?'':batteryClass(withWh)}">${withWh==null?'—':fr1(withWh)}</td></tr>`;
  }).join('');
  requestAnimationFrame(renderCharts);
}

function niceMax(v,min){
  const x=Math.max(v,min);
  const p=10**Math.floor(Math.log10(x));
  const n=x/p;
  const q=n<=1?1:n<=2?2:n<=5?5:10;
  return q*p;
}
function niceNegativeMin(v){
  if(v>=0) return 0;
  const step=50;
  return Math.floor(v/step)*step;
}
function renderCharts(){
  if(!simulation) return;
  drawChart($('#chartNoRecharge'),false);
  drawChart($('#chartWithRecharge'),true);
}
function drawChart(canvas,withRecharge){
  const r=simulation;
  const s=settings;
  const re=r.recharge;
  if(withRecharge&&!re.enabled){
    drawEmptyCanvas(canvas,'Recharge désactivée : règle une capacité de recharge supérieure à 0 Wh.');
    return;
  }
  const segs=r.segments;
  const cssW=Math.max(canvas.parentElement.clientWidth-2,760);
  const cssH=370;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.style.width=`${cssW}px`;
  canvas.style.height=`${cssH}px`;
  canvas.width=Math.floor(cssW*dpr);
  canvas.height=Math.floor(cssH*dpr);
  const c=canvas.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,cssW,cssH);

  const L=52,R=64,T=32,B=50,W=cssW-L-R,H=cssH-T-B;
  const maxD=niceMax(Math.max(...segs.map(x=>x.elevationGainM),1),10);
  const batteryVals=segs.map((x,i)=>withRecharge?re.batteryAfterSegment(i):x.remainingExactWh);
  const whMax=niceMax(Math.max(s.batteryCapacityWh,...batteryVals),100);
  const whMin=niceNegativeMin(Math.min(0,...batteryVals));
  const whSpan=Math.max(1,whMax-whMin);
  const totalKm=Math.max(r.totalDistanceKmRaw,0.001);
  const xKm=km=>L+Core.clamp(km/totalKm,0,1)*W;
  const yWh=v=>T+((whMax-v)/whSpan)*H;
  const yD=v=>T+H-(v/maxD)*H;

  c.font='11px system-ui';
  c.fillStyle='#65717d';
  c.strokeStyle='#dfe5e9';
  c.lineWidth=1;
  for(let j=0;j<=4;j++){
    const f=j/4;
    const y=T+H-H*f;
    c.beginPath();c.moveTo(L,y);c.lineTo(L+W,y);c.stroke();
    c.textAlign='right';c.fillText(fr0(maxD*f),L-7,y+4);
    c.textAlign='left';c.fillText(fr0(whMin+whSpan*f),L+W+7,y+4);
  }
  c.strokeStyle='#65717d';
  c.beginPath();c.moveTo(L,T);c.lineTo(L,T+H);c.lineTo(L+W,T+H);c.lineTo(L+W,T);c.stroke();
  c.fillStyle='#65717d';c.textAlign='left';c.fillText('D+ (m)',4,16);c.textAlign='right';c.fillText('Wh',cssW-4,16);

  if(whMin<0){
    const zeroY=yWh(0);
    c.strokeStyle='#8b949c';c.setLineDash([3,3]);c.beginPath();c.moveTo(L,zeroY);c.lineTo(L+W,zeroY);c.stroke();c.setLineDash([]);
  }

  const critical=Math.max(0,s.batteryCriticalWh);
  if(critical>0 && critical<whMax){
    const yy=yWh(critical);
    c.fillStyle='rgba(204,32,40,.06)';c.fillRect(L,yy,W,T+H-yy);
    c.strokeStyle='#cc2028';c.setLineDash([5,4]);c.beginPath();c.moveTo(L,yy);c.lineTo(L+W,yy);c.stroke();c.setLineDash([]);
    c.fillStyle='#cc2028';c.textAlign='left';c.fillText(`Alerte ${fr0(critical)} Wh`,L+5,yy-5);
  }

  c.fillStyle='#0070c0';
  segs.forEach(seg=>{
    const x1=xKm(seg.startKmRaw),x2=xKm(seg.endKmRaw),mid=(x1+x2)/2;
    const bw=Math.max(2,(x2-x1)*0.72),yy=yD(seg.elevationGainM);
    c.fillRect(mid-bw/2,yy,bw,T+H-yy);
  });

  segs.forEach(seg=>{
    const xx=xKm((seg.startKmRaw+seg.endKmRaw)/2),yy=yWh(seg.consumptionWh);
    c.fillStyle=seg.mode==='Turbo'?'#cc2028':'#119640';
    c.beginPath();c.arc(xx,yy,2.6,0,Math.PI*2);c.fill();
  });

  const batteryBandColors={good:'#C6EFCE',warn:'#FFEB9C',bad:'#FF9999'};
  const batteryColor=wh=>batteryBandColors[Core.batteryBand(wh,s.batteryCapacityWh)];
  const batteryPoints=[{km:0,wh:s.batteryCapacityWh}];
  if(!withRecharge){
    segs.forEach(seg=>batteryPoints.push({km:seg.endKmRaw,wh:seg.remainingExactWh}));
  }else{
    for(let i=0;i<segs.length;i++){
      const seg=segs[i];
      if(i<re.crossingIndex) batteryPoints.push({km:seg.endKmRaw,wh:seg.remainingExactWh});
      else if(i===re.crossingIndex){
        batteryPoints.push({km:re.rechargeKm,wh:re.beforeWh});
        batteryPoints.push({km:re.rechargeKm,wh:s.batteryCapacityWh});
        batteryPoints.push({km:seg.endKmRaw,wh:re.batteryAfterSegment(i)});
      }else batteryPoints.push({km:seg.endKmRaw,wh:re.batteryAfterSegment(i)});
    }
  }

  const thresholdWh=[0.20,0.10].map(p=>p*s.batteryCapacityWh);
  function drawBatterySegment(a,b){
    const ts=[0,1];
    const delta=b.wh-a.wh;
    if(Math.abs(delta)>1e-9){
      thresholdWh.forEach(th=>{
        const t=(th-a.wh)/delta;
        if(t>0&&t<1) ts.push(t);
      });
    }
    ts.sort((x,y)=>x-y);
    for(let j=0;j<ts.length-1;j++){
      const t1=ts[j],t2=ts[j+1],tm=(t1+t2)/2;
      const km1=a.km+(b.km-a.km)*t1,km2=a.km+(b.km-a.km)*t2;
      const wh1=a.wh+delta*t1,wh2=a.wh+delta*t2,whm=a.wh+delta*tm;
      c.strokeStyle=batteryColor(whm);c.lineWidth=3;c.beginPath();
      c.moveTo(xKm(km1),yWh(wh1));c.lineTo(xKm(km2),yWh(wh2));c.stroke();
    }
  }
  for(let i=1;i<batteryPoints.length;i++) drawBatterySegment(batteryPoints[i-1],batteryPoints[i]);
  batteryPoints.forEach(p=>{
    c.fillStyle=batteryColor(p.wh);c.strokeStyle='rgba(23,50,77,.28)';c.lineWidth=.7;
    c.beginPath();c.arc(xKm(p.km),yWh(p.wh),2.8,0,Math.PI*2);c.fill();c.stroke();
  });

  if(withRecharge){
    const rx=xKm(re.rechargeKm);
    c.strokeStyle='#00a0d6';c.setLineDash([5,4]);c.lineWidth=1.5;c.beginPath();c.moveTo(rx,T);c.lineTo(rx,T+H);c.stroke();c.setLineDash([]);
    c.fillStyle='#006b91';c.textAlign='center';c.font='700 11px system-ui';c.fillText(`Plein 100 % · km ${fr1(re.rechargeKm)}`,rx,18);
    c.font='11px system-ui';
  }

  c.fillStyle='#65717d';c.textAlign='center';
  for(let j=0;j<=8;j++){
    const km=totalKm*j/8,xx=xKm(km);c.fillText(fr1(km),xx,T+H+18);
  }
  c.fillText('Km',L+W/2,cssH-5);

  if(canvas.parentElement && 'scrollLeft' in canvas.parentElement) canvas.parentElement.scrollLeft=0;
}
function drawEmptyCanvas(canvas,msg){
  const w=Math.max(canvas.parentElement.clientWidth,500),h=180,dpr=Math.min(devicePixelRatio||1,2);
  canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.width=w*dpr;canvas.height=h*dpr;
  const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#65717d';c.font='15px system-ui';c.fillText(msg,20,50);
}

$('#csvBtn').addEventListener('click',()=>{
  if(!simulation) return;
  const re=simulation.recharge;
  const rows=[['N°','Km début','Km fin','Distance km','D+ m','Mode','Conso Wh','Cumul Wh','Restant sans recharge Wh','Restant avec recharge Wh']];
  simulation.segments.forEach((x,i)=>rows.push([
    x.index,x.startKm,x.endKm,x.distanceKm,x.elevationGainM,x.mode,x.consumptionWh,x.cumulativeConsumptionWh,x.remainingWh,
    re.enabled?Core.roundHalfEven(re.batteryAfterSegment(i),1):''
  ]));
  const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\r\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download=(gpxName||'simulation-yamaha').replace(/\.gpx$/i,'')+'-simulation-yamaha.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});

window.addEventListener('resize',()=>{if(simulation&&$('#screen-results').classList.contains('active')) renderCharts();});
$('#appVersion').textContent=`V${APP_VERSION}`;
fillSettings();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});

'use strict';
const assert=require('assert');
const Core=require('../simulator-core.js');

let passed=0;
function test(name,fn){
  try{fn();passed++;console.log('OK  ',name);}
  catch(err){console.error('FAIL',name);throw err;}
}
function near(actual,expected,tol=1e-6){
  assert.ok(Math.abs(actual-expected)<=tol,`attendu ${expected}, obtenu ${actual}`);
}

test('arrondi half-even',()=>{
  assert.strictEqual(Core.roundHalfEven(1.25,1),1.2);
  assert.strictEqual(Core.roundHalfEven(1.35,1),1.4);
  assert.strictEqual(Core.roundHalfEven(2.5,0),2);
  assert.strictEqual(Core.roundHalfEven(3.5,0),4);
});

test('Haversine ~0,5 km à l’équateur',()=>{
  const deltaLon=0.5/111.19492664455873;
  near(Core.haversineKm({lat:0,lon:0},{lat:0,lon:deltaLon}),0.5,2e-5);
});

test('un saut entre deux trkseg n’ajoute aucune distance fantôme',()=>{
  const d=0.5/111.19492664455873;
  const points=[
    {lat:0,lon:0,ele:0},
    {lat:0,lon:d,ele:0},
    {lat:10,lon:10,ele:100,breakBefore:true},
    {lat:10,lon:10+d,ele:100}
  ];
  const raw=Core.makeRawSegments(points,0.5);
  near(raw.reduce((a,x)=>a+x.distanceKmRaw,0),0.9924,0.02); // longitude à lat 10° légèrement plus courte
  assert.ok(raw.reduce((a,x)=>a+x.distanceKmRaw,0)<1.1);
});

test('mode Turbo au seuil et formule Yamaha V1',()=>{
  const deltaLon=0.5/111.19492664455873;
  const s={...Core.DEFAULTS,turboElevationThresholdM:18,segmentLengthKm:0.5};
  const r=Core.simulate([{lat:0,lon:0,ele:0},{lat:0,lon:deltaLon,ele:20}],s);
  assert.strictEqual(r.segments[0].mode,'Turbo');
  assert.strictEqual(r.segments[0].distanceKm,0.5);
  assert.strictEqual(r.segments[0].elevationGainM,20);
  near(r.segments[0].consumptionExactWh,(0.5*9+20*0.15)*1.0398,1e-9);
  assert.strictEqual(r.segments[0].consumptionWh,7.8);
});

test('mode Tour et correction par vitesse',()=>{
  const deltaLon=0.5/111.19492664455873;
  const s={...Core.DEFAULTS,segmentLengthKm:0.5};
  const r=Core.simulate([{lat:0,lon:0,ele:0},{lat:0,lon:deltaLon,ele:0}],s);
  assert.strictEqual(r.segments[0].mode,'Tour');
  near(r.segments[0].consumptionExactWh,(0.5*(6.6*(15/18)))*1.0398,1e-9);
  assert.strictEqual(r.segments[0].consumptionWh,2.9);
});

test('recharge 200 Wh placée exactement au cumul 200 Wh',()=>{
  const s={...Core.DEFAULTS,rechargeWh:200};
  const segments=[
    {startKmRaw:0,endKmRaw:10,consumptionExactWh:100,cumulativeExactWh:100,remainingExactWh:700},
    {startKmRaw:10,endKmRaw:20,consumptionExactWh:100,cumulativeExactWh:200,remainingExactWh:600},
    {startKmRaw:20,endKmRaw:30,consumptionExactWh:100,cumulativeExactWh:300,remainingExactWh:500}
  ];
  const re=Core.buildRechargeScenario(segments,300,s);
  near(re.rechargeKm,20);
  near(re.beforeWh,600);
  near(re.energyAddedWh,200);
  near(re.finalWh,700);
  near(re.batteryAfterSegment(2),700);
});

test('recharge interpolée à l’intérieur d’un tronçon',()=>{
  const s={...Core.DEFAULTS,rechargeWh:200};
  const segments=[
    {startKmRaw:0,endKmRaw:10,consumptionExactWh:120,cumulativeExactWh:120,remainingExactWh:680},
    {startKmRaw:10,endKmRaw:20,consumptionExactWh:120,cumulativeExactWh:240,remainingExactWh:560}
  ];
  const re=Core.buildRechargeScenario(segments,240,s);
  near(re.rechargeKm,10+10*(80/120));
  near(re.beforeWh,600);
  near(re.finalWh,760);
});

test('si le parcours consomme moins de 200 Wh, plein à l’arrivée',()=>{
  const s={...Core.DEFAULTS,rechargeWh:200};
  const segments=[{startKmRaw:0,endKmRaw:15,consumptionExactWh:150,cumulativeExactWh:150,remainingExactWh:650}];
  const re=Core.buildRechargeScenario(segments,150,s);
  near(re.rechargeKm,15);
  near(re.energyAddedWh,150);
  near(re.finalWh,800);
  assert.strictEqual(re.usesAllAvailable,false);
});

test('couleurs batterie Yamaha : >20 vert, 20–10 jaune, <10 rouge',()=>{
  assert.strictEqual(Core.batteryBand(160.1,800),'good');
  assert.strictEqual(Core.batteryBand(160,800),'warn');
  assert.strictEqual(Core.batteryBand(80,800),'warn');
  assert.strictEqual(Core.batteryBand(79.9,800),'bad');
});

test('validation refuse une consommation négative',()=>{
  assert.throws(()=>Core.validateSettings({...Core.DEFAULTS,turboConsumptionWhPerKm:-1}));
});

console.log(`\n${passed} tests Yamaha réussis.`);

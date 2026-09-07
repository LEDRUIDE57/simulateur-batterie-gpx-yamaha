'use strict';
const assert=require('assert');
const Core=require('../simulator-core.js');

function oldRoundHalfEven(value,digits){
  if(!Number.isFinite(value)) return value;
  if(value<0) return -oldRoundHalfEven(-value,digits);
  const factor=10**digits,n=value*factor,lo=Math.floor(n),diff=n-lo;
  let r;if(Math.abs(diff-0.5)<1e-9) r=(lo%2===0)?lo:lo+1; else r=Math.round(n);return r/factor;
}
function oldHaversineKm(a,b){
  const R=6371.0,rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),lat1=rad(a.lat),lat2=rad(b.lat);
  const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return R*2*Math.atan(Math.sqrt(x)/Math.sqrt(Math.max(0,1-x)));
}
function oldMakeRawSegments(points,len){
  const out=[];let total=0,dist=0,start=0,dplus=0;
  for(let i=1;i<points.length;i++){
    const prev=points[i-1],cur=points[i],d=oldHaversineKm(prev,cur);total+=d;dist+=d;
    if(prev.ele!=null&&cur.ele!=null&&cur.ele>prev.ele)dplus+=cur.ele-prev.ele;
    if(dist>=len||i===points.length-1){out.push({startKmRaw:start,endKmRaw:total,distanceKmRaw:dist,elevationGainMRaw:dplus});start=total;dist=0;dplus=0;}
  }
  return out;
}
function oldBuildRechargeScenario(segments,totalConsumptionExact,s){
  const capacity=s.batteryCapacityWh,available=Math.max(0,s.rechargeWh);if(!segments.length||available<=0)return {enabled:false};
  const usable=Math.min(available,capacity),energyToFull=Math.min(totalConsumptionExact,usable);let crossingIndex=segments.length-1,rechargeKm=segments.at(-1).endKmRaw,previousCum=0;
  for(let i=0;i<segments.length;i++){const seg=segments[i];if(seg.cumulativeExactWh+1e-9>=energyToFull){crossingIndex=i;const inside=Math.max(0,energyToFull-previousCum);const fraction=seg.consumptionExactWh>0?Math.max(0,Math.min(1,inside/seg.consumptionExactWh)):0;rechargeKm=seg.startKmRaw+(seg.endKmRaw-seg.startKmRaw)*fraction;break;}previousCum=seg.cumulativeExactWh;}
  return {enabled:true,energyAddedWh:energyToFull,rechargeKm,beforeWh:capacity-energyToFull,finalWh:capacity-(totalConsumptionExact-energyToFull)};
}
function oldSimulate(points,s){
  const raw=oldMakeRawSegments(points,s.segmentLengthKm);let cumulative=0;
  const segments=raw.map((r,i)=>{
    const distance=oldRoundHalfEven(r.distanceKmRaw,2),dPlus=oldRoundHalfEven(r.elevationGainMRaw,0),startKm=oldRoundHalfEven(r.startKmRaw,2),endKm=oldRoundHalfEven(r.endKmRaw,2);
    const mode=dPlus>=s.turboElevationThresholdM?'Turbo':'Tours';
    const perKm=mode==='Turbo'?s.turboConsumptionWhPerKm*(15/s.turboSpeedKmh):s.toursConsumptionWhPerKm*(15/s.tourSpeedKmh);
    const climbWh=dPlus>s.climbCoefficientWhPerM?s.climbCoefficientWhPerM*dPlus:0;
    const exact=(distance*perKm+climbWh)*s.motorCorrection;cumulative+=exact;const remain=s.batteryCapacityWh-cumulative;
    return {index:i+1,startKm,endKm,distanceKm:distance,elevationGainM:dPlus,mode,startKmRaw:r.startKmRaw,endKmRaw:r.endKmRaw,consumptionExactWh:exact,cumulativeExactWh:cumulative,remainingExactWh:remain};
  });
  const totalConsumptionExact=segments.at(-1)?.cumulativeExactWh||0;
  return {segments,totalDistanceKm:segments.at(-1)?.endKm||0,totalDistanceKmRaw:segments.at(-1)?.endKmRaw||0,totalElevationGainM:segments.reduce((a,x)=>a+x.elevationGainM,0),totalConsumptionExactWh:totalConsumptionExact,recharge:oldBuildRechargeScenario(segments,totalConsumptionExact,s)};
}

let seed=123456789;
function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/2**32;}
function makeRoute(n){
  let lat=48+(rnd()-.5)*.2,lon=6+(rnd()-.5)*.2,ele=150+rnd()*100;
  const pts=[{lat,lon,ele}];
  for(let i=1;i<n;i++){
    lat+=(rnd()-.5)*0.0006;lon+=(0.0008+rnd()*0.0012);ele+=(-8+rnd()*18);
    pts.push({lat,lon,ele});
  }
  return pts;
}
function near(a,b,tol=1e-9){assert.ok(Math.abs(a-b)<=tol,`écart ${a} vs ${b}`);}

for(let k=0;k<100;k++){
  const s={...Core.DEFAULTS,
    segmentLengthKm:[0.3,0.5,1][k%3],
    turboElevationThresholdM:[10,18,25][k%3],
    rechargeWh:[0,120,200,280][k%4]
  };
  const points=makeRoute(20+(k%35));
  const oldR=oldSimulate(points,s),newR=Core.simulate(points,s);
  assert.strictEqual(newR.segments.length,oldR.segments.length);
  near(newR.totalDistanceKmRaw,oldR.totalDistanceKmRaw);
  assert.strictEqual(newR.totalDistanceKm,oldR.totalDistanceKm);
  assert.strictEqual(newR.totalElevationGainM,oldR.totalElevationGainM);
  near(newR.totalConsumptionExactWh,oldR.totalConsumptionExactWh);
  for(let i=0;i<newR.segments.length;i++){
    assert.strictEqual(newR.segments[i].mode==='Tour'?'Tours':newR.segments[i].mode,oldR.segments[i].mode);
    near(newR.segments[i].consumptionExactWh,oldR.segments[i].consumptionExactWh);
  }
  assert.strictEqual(newR.recharge.enabled,oldR.recharge.enabled);
  if(newR.recharge.enabled){
    near(newR.recharge.rechargeKm,oldR.recharge.rechargeKm);
    near(newR.recharge.energyAddedWh,oldR.recharge.energyAddedWh);
    near(newR.recharge.beforeWh,oldR.recharge.beforeWh);
    near(newR.recharge.finalWh,oldR.recharge.finalWh);
  }
}
console.log('OK   parité calculatoire sur 100 parcours synthétiques (hors correctif multi-trkseg et libellé Tour).');

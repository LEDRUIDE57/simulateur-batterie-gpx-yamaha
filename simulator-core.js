(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.YamahaSimulatorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DEFAULTS=Object.freeze({
    bikeWeightKg:24.0,
    riderWeightKg:74.0,
    cargoWeightKg:3.0,
    batteryCapacityWh:800.0,
    batteryVoltageV:36.0,
    turboElevationThresholdM:18.0,
    tourSpeedKmh:18.0,
    turboSpeedKmh:15.0,
    averageSpeedKmh:16.8,
    segmentLengthKm:0.5,
    motorCorrection:1.0398,
    batteryCriticalWh:112.0,
    rechargeWh:200.0,
    turboConsumptionWhPerKm:9.0,
    toursConsumptionWhPerKm:6.6,
    climbCoefficientWhPerM:0.15
  });

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

  function roundHalfEven(value,digits){
    if(!Number.isFinite(value)) return value;
    if(value<0) return -roundHalfEven(-value,digits);
    const factor=10**digits;
    const n=value*factor;
    const lo=Math.floor(n);
    const diff=n-lo;
    let rounded;
    if(Math.abs(diff-0.5)<1e-9) rounded=(lo%2===0)?lo:lo+1;
    else rounded=Math.round(n);
    return rounded/factor;
  }

  function haversineKm(a,b){
    const R=6371.0;
    const rad=x=>x*Math.PI/180;
    const dLat=rad(b.lat-a.lat);
    const dLon=rad(b.lon-a.lon);
    const lat1=rad(a.lat);
    const lat2=rad(b.lat);
    const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const c=2*Math.atan(Math.sqrt(x)/Math.sqrt(Math.max(0,1-x)));
    return R*c;
  }

  function validateSettings(s){
    const positive=['batteryCapacityWh','tourSpeedKmh','turboSpeedKmh','segmentLengthKm','motorCorrection'];
    const nonNegative=['turboElevationThresholdM','turboConsumptionWhPerKm','toursConsumptionWhPerKm','climbCoefficientWhPerM','rechargeWh','batteryCriticalWh','bikeWeightKg','riderWeightKg','cargoWeightKg'];
    for(const key of positive){
      if(!Number.isFinite(Number(s[key])) || Number(s[key])<=0) throw new Error(`Le paramètre ${key} doit être supérieur à zéro.`);
    }
    for(const key of nonNegative){
      if(!Number.isFinite(Number(s[key])) || Number(s[key])<0) throw new Error(`Le paramètre ${key} ne peut pas être négatif.`);
    }
    if(!Number.isFinite(Number(s.batteryVoltageV)) || Number(s.batteryVoltageV)<=0) throw new Error('La tension batterie doit être supérieure à zéro.');
    if(!Number.isFinite(Number(s.averageSpeedKmh)) || Number(s.averageSpeedKmh)<=0) throw new Error('La vitesse moyenne doit être supérieure à zéro.');
  }

  function makeRawSegments(points,len){
    const out=[];
    let total=0;
    let dist=0;
    let start=0;
    let dplus=0;

    function closeSegment(){
      if(dist<=0) return;
      out.push({startKmRaw:start,endKmRaw:total,distanceKmRaw:dist,elevationGainMRaw:dplus});
      start=total;
      dist=0;
      dplus=0;
    }

    for(let i=1;i<points.length;i++){
      const prev=points[i-1];
      const cur=points[i];

      // Un nouveau <trkseg> n'est jamais relié artificiellement au précédent.
      if(cur.breakBefore){
        closeSegment();
        continue;
      }

      const d=haversineKm(prev,cur);
      if(Number.isFinite(d) && d>=0){
        total+=d;
        dist+=d;
      }
      if(prev.ele!=null && cur.ele!=null && cur.ele>prev.ele) dplus+=cur.ele-prev.ele;

      if(dist>=len) closeSegment();
    }
    closeSegment();
    return out;
  }

  function buildRechargeScenario(segments,totalConsumptionExact,s){
    const capacity=s.batteryCapacityWh;
    const available=Math.max(0,s.rechargeWh);
    if(!segments.length || available<=0){
      return {enabled:false,reason:'Capacité de recharge réglée à 0 Wh.'};
    }

    // Règle Yamaha V1 : faire le plein dès que l'énergie consommée est égale à
    // l'énergie réellement rechargeable disponible. Si le parcours consomme moins,
    // le plein est placé à l'arrivée avec seulement l'énergie nécessaire.
    const maxUseful=Math.min(available,capacity);
    const energyToFull=Math.min(totalConsumptionExact,maxUseful);
    let crossingIndex=segments.length-1;
    let rechargeKm=segments.at(-1).endKmRaw;
    let previousCum=0;

    for(let i=0;i<segments.length;i++){
      const seg=segments[i];
      if(seg.cumulativeExactWh+1e-9>=energyToFull){
        crossingIndex=i;
        const inside=Math.max(0,energyToFull-previousCum);
        const fraction=seg.consumptionExactWh>0?clamp(inside/seg.consumptionExactWh,0,1):0;
        rechargeKm=seg.startKmRaw+(seg.endKmRaw-seg.startKmRaw)*fraction;
        break;
      }
      previousCum=seg.cumulativeExactWh;
    }

    const beforeWh=capacity-energyToFull;
    const finalWh=capacity-(totalConsumptionExact-energyToFull);

    return {
      enabled:true,
      availableWh:available,
      maxUsefulWh:maxUseful,
      energyAddedWh:energyToFull,
      rechargeKm,
      crossingIndex,
      beforeWh,
      beforePercent:capacity>0?beforeWh/capacity:0,
      afterWh:capacity,
      finalWh,
      finalPercent:capacity>0?finalWh/capacity:0,
      consumptionAfterRechargeWh:Math.max(0,totalConsumptionExact-energyToFull),
      usesAllAvailable:Math.abs(energyToFull-available)<0.05,
      limitedByBattery:available>capacity+0.05,
      batteryAfterSegment(i){
        const seg=segments[i];
        if(i<crossingIndex) return seg.remainingExactWh;
        if(i===crossingIndex){
          const consumedAfterRecharge=Math.max(0,seg.cumulativeExactWh-energyToFull);
          return capacity-consumedAfterRecharge;
        }
        return seg.remainingExactWh+energyToFull;
      }
    };
  }

  function simulate(points,s){
    if(!Array.isArray(points) || points.length<2) throw new Error('Au moins deux points GPX sont nécessaires.');
    validateSettings(s);
    const raw=makeRawSegments(points,s.segmentLengthKm);
    if(!raw.length) throw new Error('Le GPX ne contient pas de distance exploitable.');

    let cumulative=0;
    const segments=raw.map((r,i)=>{
      // Fidélité au VBA Yamaha V1 : distance à 2 décimales et D+ à l'entier
      // AVANT le calcul de consommation.
      const distance=roundHalfEven(r.distanceKmRaw,2);
      const dPlus=roundHalfEven(r.elevationGainMRaw,0);
      const startKm=roundHalfEven(r.startKmRaw,2);
      const endKm=roundHalfEven(r.endKmRaw,2);
      const mode=dPlus>=s.turboElevationThresholdM?'Turbo':'Tour';
      const perKm=mode==='Turbo'
        ? s.turboConsumptionWhPerKm*(15/s.turboSpeedKmh)
        : s.toursConsumptionWhPerKm*(15/s.tourSpeedKmh);
      const climbWh=dPlus>0?s.climbCoefficientWhPerM*dPlus:0;
      const exact=(distance*perKm+climbWh)*s.motorCorrection;
      cumulative+=exact;
      const remain=s.batteryCapacityWh-cumulative;

      return {
        index:i+1,
        startKm,endKm,distanceKm:distance,elevationGainM:dPlus,mode,
        startKmRaw:r.startKmRaw,endKmRaw:r.endKmRaw,
        distanceKmRaw:r.distanceKmRaw,elevationGainMRaw:r.elevationGainMRaw,
        consumptionExactWh:exact,cumulativeExactWh:cumulative,remainingExactWh:remain,
        consumptionWh:roundHalfEven(exact,1),
        cumulativeConsumptionWh:roundHalfEven(cumulative,1),
        remainingWh:roundHalfEven(remain,1),
        remainingPercent:roundHalfEven(remain/s.batteryCapacityWh,3)
      };
    });

    const result={segments,settings:s};
    result.totalDistanceKm=segments.at(-1)?.endKm||0;
    result.totalDistanceKmRaw=segments.at(-1)?.endKmRaw||0;
    result.totalElevationGainM=segments.reduce((sum,x)=>sum+x.elevationGainM,0);
    result.totalConsumptionExactWh=segments.at(-1)?.cumulativeExactWh||0;
    result.totalConsumptionWh=roundHalfEven(result.totalConsumptionExactWh,1);
    result.remainingExactWh=s.batteryCapacityWh-result.totalConsumptionExactWh;
    result.remainingWh=roundHalfEven(result.remainingExactWh,1);
    result.remainingPercent=s.batteryCapacityWh>0?result.remainingExactWh/s.batteryCapacityWh:0;
    result.recharge=buildRechargeScenario(segments,result.totalConsumptionExactWh,s);
    return result;
  }

  function batteryBand(wh,capacity){
    if(!(capacity>0)) return 'bad';
    const pct=wh/capacity;
    if(pct>0.20) return 'good';
    if(pct>=0.10) return 'warn';
    return 'bad';
  }

  return {DEFAULTS,roundHalfEven,haversineKm,validateSettings,makeRawSegments,buildRechargeScenario,simulate,batteryBand,clamp};
});

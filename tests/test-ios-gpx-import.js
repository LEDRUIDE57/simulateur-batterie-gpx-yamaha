'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function ok(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } else console.log('OK:',msg); }
ok(/topByLocalName\('trkpt'\)/.test(app),'import trace <trkpt> présent');
ok(/topByLocalName\('rtept'\)/.test(app),'import itinéraire <rtept> présent');
ok(/sourceType='route'/.test(app),'détection du type itinéraire présente');
ok(!/accept\s*=/.test(index),'aucun filtre accept sur le sélecteur de fichiers iOS');
ok(/V1\.2\.4/.test(index),'interface V1.2.4');
ok(/1\.2\.4|v1-2-4/.test(sw),'cache PWA V1.2.4');
if(process.exitCode) process.exit(process.exitCode);

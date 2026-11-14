// Corrida: análises (recordes, previsões, parciais, zonas, forma), tênis, GPX, rotas e planos. node test/run2.e2e.cjs
let pw;try{pw=require('playwright')}catch{pw=require('/opt/npm-tools/node_modules/playwright')}
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'x'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const out=[];const ok=(c,m)=>{c?pass++:fail++;out.push((c?'  ✓ ':'  ✗ FALHOU: ')+m)};
const txt=p=>p.locator('main').innerText();const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await new Promise(r=>srv.listen(8129,r));const browser=await pw.chromium.launch();out.push('\n== Corrida: análises, tênis, GPX e planos ==');
 const ctx=await browser.newContext(pw.devices['Pixel 7']),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8129/index.html');await p.waitForSelector('h1');
 await p.evaluate(async()=>{for(let i=0;i<50;i++){const m=await db.kv.get('meta');if(m){await db.kv.put({...m,onboarded:true});return}await new Promise(r=>setTimeout(r,100))}});await p.reload();await p.waitForSelector('h1');
 // corridas sintéticas pelo mesmo motor do app: 5,2 km (5:00/km, subida de 40 m) e 3 km (6:00/km, km 2 mais rápido)
 await p.evaluate(async()=>{await loadCore();const mk=(segs,t0,date,name)=>{const tr=R.core.createTracker({autoPause:false});tr.start(t0);let t=t0,y=0,alt=800,s=11;const rnd=()=>((s=(s*16807)%2147483647)/2147483647);
  for(const g of segs){const v=1000/g.pace,n=Math.round(g.m/v);for(let i=0;i<n;i++){t+=1000;y+=v;alt+=(g.up||0)/n;tr.addPoint({t,lat:-19.9167+(y+(rnd()-.5)*2)/111320,lon:-43.9345+(rnd()-.5)*2/111320,acc:6,alt:alt+(rnd()-.5)*2,altAcc:5})}}
  tr.finish(t);const sn=tr.snapshot(t);return{uid:crypto.randomUUID(),date,startedAt:t0,endedAt:t,activeMs:sn.activeMs,elapsedMs:sn.elapsedMs,distM:r1(sn.distM),avgPaceSecKm:sn.avgPaceSecKm,avgKmh:sn.avgKmh,gainM:sn.gainM,lossM:sn.lossM,gapMs:0,name,sport:'corrida',state:'completed',gearId:null,route:downsample(tr.route())}};
  const d1=ymd(new Date(Date.now()-5*864e5)),d2=ymd(new Date(Date.now()-2*864e5));
  await db.activities.add(mk([{m:2600,pace:300,up:0},{m:2600,pace:300,up:40}],new Date(d1+'T07:00:00').getTime(),d1,'Treino 5K'));
  await db.activities.add(mk([{m:1000,pace:370},{m:1000,pace:330},{m:1000,pace:370}],new Date(d2+'T18:00:00').getTime(),d2,'Rodagem'))});
 await p.reload();await p.waitForSelector('h1');await p.evaluate(()=>location.hash='#/corrida');await p.waitForTimeout(400);
 ok(/Gravar/.test(await txt(p))&&/Análises/.test(await txt(p))&&/Equipamento e planos/.test(await txt(p)),'abas Gravar / Análises / Equipamento e planos');
 await p.click('[data-a=rtab][data-k=analise]');await p.waitForTimeout(250);let t=await txt(p);
 ok(/1 km\s+0?[0-9]:\d\d/.test(t.replace(/\n/g,' '))&&/5 km/.test(t),'recordes pessoais por distância (1 km e 5 km preenchidos)');
 ok(/Meia maratona\s+—/.test(t.replace(/\n/g,' ')),'recordes de distâncias não corridas aparecem vazios (não inventa)');
 ok(/Previsão de tempos/i.test(t)&&/10 km/.test(t)&&/Riegel/.test(t),'previsão de tempos (Riegel)');
 ok(/forma/i.test(t)&&/fadiga/i.test(t)&&/frescor/i.test(t),'forma, fadiga e frescor');
 ok(/Z[1-5]/.test(t)&&/limiar/i.test(t),'zonas de ritmo (30 dias)');
 ok(await p.locator('svg[aria-label^="Mapa de calor"] path').count()===2,'mapa de calor pessoal com os 2 trajetos');
 await p.click('[data-a=thrCfg]');await p.fill('.sheet [name=p]','abc');await p.click('.sheet button[type=submit]');await p.waitForTimeout(150);ok(/MM:SS/.test(await p.locator('.sheet .err').textContent()),'ritmo de limiar: formato inválido recusado');
 await p.fill('.sheet [name=p]','5:30');await p.click('.sheet button[type=submit]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(200);ok(/5:30\/km/.test(await txt(p)),'ritmo de limiar manual aplicado');
 // detalhe: parciais, RAI, resumo, GPX, tênis
 await p.click('[data-a=rtab][data-k=gravar]');await p.waitForTimeout(200);await p.locator('[data-a=runOpen]').first().click();await p.waitForTimeout(250);t=await txt(p);
 ok(/parciais/i.test(t)&&/RAI/.test(t)&&await p.locator('table.spl tr').count()>=3,'detalhe: tabela de parciais por km com RAI');
 ok(/subida/i.test(t)&&/resumo da corrida/i.test(t),'detalhe: subida e resumo automático');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-a=gpxOut]')]);const gp=fs.readFileSync(await dl.path(),'utf8');ok(/^<\?xml/.test(gp)&&/<trkpt /.test(gp)&&/<ele>/.test(gp)&&/\.gpx$/.test(dl.suggestedFilename()),'exportar GPX (com pontos, altitude e horário)');
 fs.writeFileSync('/tmp/exp.gpx',gp);
 await p.click('[data-a=runBack]');await p.click('[data-a=rtab][data-k=mais]');await p.waitForTimeout(200);
 await p.click('[data-a=gearAdd]');await p.fill('.sheet [name=name]','Nimbus 25');await p.fill('.sheet [name=limit]','700');await p.click('.sheet button[type=submit]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(200);
 ok(/Nimbus 25/.test(await txt(p))&&/0 de 700 km/.test(await txt(p)),'tênis cadastrado (0 de 700 km)');
 await p.click('[data-a=rtab][data-k=gravar]');await p.locator('[data-a=runOpen]').first().click();await p.waitForTimeout(200);await p.click('[data-a=runGear]');await p.selectOption('.sheet [name=g]',{label:'Nimbus 25'});await p.click('.sheet button[type=submit]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(200);
 ok(/Tênis: Nimbus 25/.test(await txt(p)),'tênis associado à corrida');await p.click('[data-a=runBack]');await p.click('[data-a=rtab][data-k=mais]');await p.waitForTimeout(200);
 const km=/(\d+) de 700 km/.exec(await txt(p));ok(km&&+km[1]>=3,`quilometragem do tênis somada (${km&&km[1]} km)`);
 await p.evaluate(async()=>{await db.kv.put({key:'gear',items:S.gear.items.map(g=>({...g,limitKm:3})),def:S.gear.def})});await p.reload();await p.waitForSelector('h1');await p.evaluate(()=>location.hash='#/corrida');await p.waitForTimeout(300);ok(/trocar o tênis/i.test(await txt(p)),'alerta de desgaste do tênis (≥ 90% do limite)');
 // GPX: importar
 await p.click('[data-a=rtab][data-k=mais]');await p.waitForTimeout(150);
 fs.writeFileSync('/tmp/ruim.gpx','<html>nada</html>');await p.setInputFiles('input[data-c=gpxImp]','/tmp/ruim.gpx');await p.waitForSelector('.modal .err');ok(/GPX válido/.test(await p.locator('.modal').innerText()),'GPX inválido recusado com mensagem');await p.click('.modal .btn');
 const n0=await p.evaluate(async()=>await db.activities.count());
 await p.setInputFiles('input[data-c=gpxImp]','/tmp/exp.gpx');await p.waitForSelector('[data-r]');ok(/Importar GPX/.test(await p.locator('.modal').innerText())&&await p.locator('.modal svg.route path').count()>=1,'pré-visualização do GPX com trajeto');
 await p.click('[data-r]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(300);await p.click('[data-a=rtab][data-k=mais]');await p.waitForTimeout(200);
 ok(await p.locator('[data-a=routeFollow]').count()===1,'GPX salvo como rota');
 await p.click('[data-a=routeFollow]');await p.waitForTimeout(150);ok(/Seguindo a rota/.test(await txt(p)),'ao escolher "Seguir", a aba Gravar mostra a rota em uso');await p.click('[data-a=rtab][data-k=mais]');await p.waitForTimeout(150);ok(/Seguindo ✓/.test(await txt(p)),'rota marcada como "Seguindo ✓" na lista');
 await p.click('[data-a=rtab][data-k=mais]');await p.setInputFiles('input[data-c=gpxImp]','/tmp/exp.gpx');await p.waitForSelector('[data-a2]');await p.click('[data-a2]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(400);
 ok((await p.evaluate(async()=>await db.activities.count()))===n0+1&&/Exportar GPX/.test(await txt(p)),'GPX importado como corrida (mesmo motor, com recálculo de distância e ritmo)');
 // planos
 await p.evaluate(()=>{R.view=null;ui.rtab='mais';render()});await p.click('[data-a=planStart]');await p.selectOption('.sheet [name=plan]','c5k');await p.click('.sheet button[type=submit]');await p.waitForSelector('.modal',{state:'detached'});await p.waitForTimeout(200);
 ok(/Do sofá aos 5 km/.test(await txt(p))&&/semana atual: 1/.test(await txt(p)),'plano de 8 semanas iniciado na semana 1');
 await p.locator('input[data-c=planChk]').first().check();await p.waitForTimeout(250);ok(/1 de 24 treinos feitos/.test(await txt(p)),'treino do plano marcado');
 await p.reload();await p.waitForSelector('h1');await p.evaluate(()=>{ui.rtab='mais';location.hash='#/corrida';render()});await p.waitForTimeout(300);ok(/1 de 24 treinos feitos/.test(await txt(p)),'progresso do plano persiste');
 await p.click('[data-a=planStop]');await p.click('[data-y]');await p.waitForTimeout(250);ok(/Escolher um plano/.test(await txt(p)),'plano encerrado com confirmação');
 // sincronização inclui os novos dados
 ok(await p.evaluate(()=>KVSYNC.includes('gear')&&KVSYNC.includes('runPlan')&&KVSYNC.includes('routes')&&SYNC_TABLES.includes('activities')),'tênis, plano, rotas e corridas entram na sincronização');
 ok(errs.length===0,'sem erros de JavaScript'+(errs.length?': '+errs[0]:''));
 console.log(out.join('\n')+`\n\nRESULTADO: ${pass} passaram, ${fail} falharam`);await browser.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.log(out.join('\n'));console.log('ERRO FATAL:',e.message.split('\n')[0]);process.exit(1)});

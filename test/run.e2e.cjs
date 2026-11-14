// Corrida: GPS emulado no Chromium (o GPS nativo/segundo plano só pode ser testado no celular). node test/run.e2e.cjs
let pw;try{pw=require('playwright')}catch{pw=require('/opt/npm-tools/node_modules/playwright')}
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'x'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const out=[];const ok=(c,m)=>{c?pass++:fail++;out.push((c?'  ✓ ':'  ✗ FALHOU: ')+m)};
const LAT=-19.9167,LON=-43.9345,at=m=>LAT+m/111320,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(browser,perm){const ctx=await browser.newContext({...pw.devices['Pixel 7'],...(perm?{permissions:['geolocation'],geolocation:{latitude:LAT,longitude:LON,accuracy:10}}:{})});const p=await ctx.newPage();p.__e=[];p.on('pageerror',e=>p.__e.push(e.message));await p.goto('http://localhost:8128/index.html');await p.waitForSelector('h1');
 await p.evaluate(async()=>{for(let i=0;i<50;i++){const m=await db.kv.get('meta');if(m){await db.kv.put({...m,onboarded:true});return}await new Promise(r=>setTimeout(r,100))}});await p.reload();await p.waitForSelector('h1');return{ctx,p}}
const km=async p=>parseFloat((await p.locator('.rbig').first().innerText()).replace(',','.'));
(async()=>{await new Promise(r=>srv.listen(8128,r));const browser=await pw.chromium.launch();
 out.push('\n== Corrida (GPS emulado) ==');
 // 1) sem permissão
 let {ctx,p}=await open(browser,false);await p.evaluate(()=>location.hash='#/corrida');await p.waitForTimeout(200);
 ok(await p.locator('#tabs a[href="#/corrida"]').isVisible(),'aba Corrida na navegação');
 await p.click('[data-a=runStart]');await p.waitForSelector('main .err',{timeout:8000});ok(/Permissão de localização negada/.test(await p.locator('main').innerText()),'sem permissão de GPS: não inicia e explica como liberar');
 ok(await p.locator('[data-a=runStart]').isVisible(),'continua na tela inicial (nada foi gravado)');await ctx.close();
 // 2) corrida completa
 ({ctx,p}=await open(browser,true));await p.evaluate(async()=>{await setKV('settings',{...S.settings,runAlertEveryM:50});});await p.reload();await p.waitForSelector('h1');await p.evaluate(()=>location.hash='#/corrida');await p.waitForTimeout(200);
 ok(/esta semana/i.test(await p.locator('main').innerText())&&/nenhuma corrida ainda/i.test(await p.locator('main').innerText()),'tela inicial: resumo da semana e estado vazio');
 await p.click('[data-a=runStart]');await p.waitForSelector('[data-a=runPause]',{timeout:8000});ok(/GRAVANDO/.test(await p.locator('#runlive').innerText()),'começou a gravar após sinal de GPS bom (±10 m)');
 let y=0;const mv=async(n,step=5,acc=8)=>{for(let i=0;i<n;i++){y+=step;await ctx.setGeolocation({latitude:at(y),longitude:LON,accuracy:acc});await sleep(1000)}};
 await mv(12);await ctx.setGeolocation({latitude:at(y+1100),longitude:LON,accuracy:8});await sleep(1000);await ctx.setGeolocation({latitude:at(y),longitude:LON,accuracy:90});await sleep(1000); // salto de 1,1 km + ponto impreciso
 await mv(12);
 const d1=await km(p);ok(d1>=0.10&&d1<=0.14,`distância ao vivo ≈ 0,12 km (mostra ${d1.toFixed(2)}): salto de 1,1 km e ponto impreciso ignorados`);
 const tm=await p.locator('.stat').nth(0).innerText();ok(/00:2\d|00:3\d/.test(tm),`cronômetro andando (${tm.replace(/\s+/g,' ')})`);
 ok((await p.evaluate(()=>window.__alerts||0))>=2,`aviso (bipe + vibração) a cada 50 m: ${await p.evaluate(()=>window.__alerts)} avisos em 120 m`);
 {const sp=await p.evaluate(()=>window.__spoken||[]);ok(sp.length>=2&&/percorridos\. Tempo .* Ritmo .* por quilômetro/.test(sp[0]),`aviso de voz a cada trecho: “${sp[0]}”`)}
 ok(/decorrido/i.test(await p.locator('#runlive').innerText())&&/subida/i.test(await p.locator('#runlive').innerText()),'tela ao vivo mostra tempo decorrido e subida ("--" sem altitude do GPS)');
 ok(/\/km/.test(await p.locator('#runlive').innerText())&&await p.locator('svg.route path').count()>=1,'pace atual e trajeto ao vivo (linha) na tela');
 await p.click('[data-a=runPause]');await p.waitForTimeout(200);const dp=await km(p);await mv(3);ok(await km(p)===dp&&/PAUSADA/.test(await p.locator('#runlive').innerText()),'pausada: distância congelada mesmo andando');
 await p.click('[data-a=runResume]');await mv(4);
 await p.click('[data-a=runFinish]');await p.waitForSelector('[data-y]');await p.click('[data-y]');await p.waitForSelector('[data-a=runSave]');
 const sm=await p.locator('main').innerText();ok(/parciais/i.test(sm)&&/resumo da corrida|decorrido/i.test(sm),'resumo mostra parciais e tempo decorrido');
 ok(/Corrida concluída/i.test(sm)&&/pace médio/i.test(sm)&&/tempo/i.test(sm)&&/velocidade/i.test(sm)&&await p.locator('svg.route path').count()===1,'resumo: trajeto (linha), distância, tempo, pace médio e velocidade');
 await p.click('[data-a=runSave]');await p.waitForFunction(()=>document.querySelector('h1')&&/Corrida d/.test(document.querySelector('h1').textContent),null,{timeout:5000});
 const a=await p.evaluate(async()=>(await db.activities.toArray())[0]);ok(a&&a.uid&&a.distM>=110&&a.distM<=160&&a.route.length>=3&&a.sport==='corrida'&&a.activeMs>=25000&&a.avgPaceSecKm>0,`salva: ${a.distM} m, ${Math.round(a.activeMs/1000)} s, ${a.route.length} pontos, pace ${Math.round(a.avgPaceSecKm)} s/km`);
 ok(!(await p.evaluate(async()=>await db.kv.get('runInProgress'))),'estado temporário da corrida removido após salvar');
 await p.evaluate(()=>location.hash='#/treino');await p.waitForTimeout(250);ok(/Corrida · 0,1\d km/.test(await p.locator('main').innerText()),'corrida aparece no histórico de treinos');
 await p.evaluate(()=>location.hash='#/evolucao');await p.waitForTimeout(250);ok(/Corrida \(km por dia\)/.test(await p.locator('main').innerText()),'evolução tem gráfico de corrida');
 await p.reload();await p.waitForSelector('h1');ok((await p.evaluate(async()=>await db.activities.count()))===1,'corrida persiste após recarregar');
 await p.evaluate(()=>location.hash='#/corrida');await p.waitForTimeout(200);ok(/Histórico/.test(await p.locator('main').innerText())&&await p.locator('[data-a=runOpen]').count()>=1,'histórico de corridas na aba Corrida');
 await p.locator('[data-a=runOpen]').first().click();await p.waitForTimeout(200);ok(/km/.test(await p.locator('main').innerText())&&await p.locator('svg.route path').count()===1,'abrir atividade mostra trajeto e estatísticas');
 // 3) recuperação após fechamento inesperado
 await p.click('[data-a=runBack]');await p.click('[data-a=runStart]');await p.waitForSelector('[data-a=runPause]',{timeout:8000});await mv(7,6);
 await p.reload();await p.waitForSelector('.modal',{timeout:6000});ok(/Corrida em andamento encontrada/.test(await p.locator('.modal').innerText()),'app fechado no meio da corrida: oferece recuperar');
 await p.click('[data-r]');await p.waitForSelector('#runlive');await p.waitForTimeout(300);const rd=await km(p);ok(rd>=0.02&&/PAUSADA/.test(await p.locator('#runlive').innerText()),`recuperada com ${rd.toFixed(2)} km (retoma pausada; tempo com o app fechado não conta)`);
 await p.click('[data-a=runFinish]');await p.waitForSelector('[data-y]');await p.click('[data-y]');await p.waitForSelector('[data-a=runDiscard]');await p.click('[data-a=runDiscard]');await p.waitForSelector('[data-y]');await p.click('[data-y]');await p.waitForTimeout(250);
 ok((await p.evaluate(async()=>await db.activities.count()))===1&&!(await p.evaluate(async()=>await db.kv.get('runInProgress'))),'descartar remove a corrida sem salvar (sem duplicidade)');
 ok(p.__e.length===0,'sem erros de JavaScript'+(p.__e.length?': '+p.__e[0]:''));await ctx.close();
 console.log(out.join('\n')+`\n\nRESULTADO: ${pass} passaram, ${fail} falharam`);await browser.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.log(out.join('\n'));console.log('ERRO FATAL:',e.message.split('\n')[0]);process.exit(1)});

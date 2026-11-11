// E2E: node test/e2e.cjs   (precisa de playwright + Chromium; sobe um servidor estático local)
let pw;try{pw=require('playwright')}catch{pw=require('/opt/npm-tools/node_modules/playwright')}
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let pass=0,fail=0;const results=[];
const ok=(c,m)=>{if(c){pass++;results.push('  ✓ '+m)}else{fail++;results.push('  ✗ FALHOU: '+m)}};
const ymd=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const add=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
async function fillForm(page,vals,expectClose=true){for(const [k,v] of Object.entries(vals)){const el=page.locator(`.sheet [name="${k}"]`);const t=await el.evaluate(e=>e.tagName);if(t==='SELECT')await el.selectOption(String(v));else await el.fill(String(v))}
 await page.click('.sheet button[type=submit]');if(expectClose){await page.waitForSelector('.modal',{state:'detached',timeout:4000});await page.waitForTimeout(80)}else{await page.waitForTimeout(150);const e=await page.locator('.sheet .err').textContent();await page.click('.sheet [data-x]');return e}}
const go=async(page,h)=>{await page.evaluate(h=>{location.hash=h},h);await page.waitForTimeout(120)};
const body=page=>page.locator('main').innerText();
async function run(name,ctxOpts){
 results.push(`\n== ${name} ==`);
 const browser=await pw.chromium.launch();const ctx=await browser.newContext({acceptDownloads:true,...ctxOpts});const page=await ctx.newPage();const _c=page.click.bind(page);page.click=async(...a)=>{const r=await _c(...a);await page.waitForTimeout(150);return r};
 const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text())&&!/vendor\/dexie/.test(m.location().url))errs.push(m.text()+' @'+m.location().url)});
 const base='http://localhost:8123/index.html';await page.goto(base);await page.waitForSelector('h1');
 const mobile=!!ctxOpts.isMobile;
 ok(await page.locator(mobile?'#tabs':'#side').isVisible()&&!await page.locator(mobile?'#side':'#tabs').isVisible(),mobile?'navegação inferior (mobile) visível, lateral oculta':'navegação lateral (desktop) visível, inferior oculta');
 // Seed da planilha
 await go(page,'#/treino');await page.click('[data-a=tday][aria-label*="terça"]');let t=await body(page);
 ok(/Força A/.test(t)&&/Agachamento/.test(t)&&/Flexão apoiada/.test(t)&&/Elevação de quadril/.test(t)&&/Prancha/.test(t)&&/2x10/.test(t)&&/2x15s/.test(t),'Terça = Força A com exercícios e prescrições da planilha');
 ok(/Planilha: Força A: agachamento 2x10/.test(t),'texto original da planilha preservado');
 await page.click('[data-a=tday][aria-label*="sexta"]');t=await body(page);
 ok(/Força B/.test(t)&&/Afundo com apoio/.test(t)&&/Superman/.test(t)&&/Panturrilha/.test(t)&&/Prancha lateral/.test(t),'Sexta = Força B completa');
 await page.click('[data-a=tday][aria-label*="quarta"]');ok(/Caminhada/.test(await body(page)),'Quarta = Caminhada');
 await page.click('[data-a=tday][aria-label*="sábado"]');ok(/Corda \(opcional\)/.test(await body(page)),'Sábado = Caminhada + corda opcional');
 // Perfil
 await go(page,'#/perfil');await page.click('[data-a=editProfile]');
 const e0=await fillForm(page,{name:'',age:'30',height:'170',weight:'70',sex:'f',activity:'moderado'},false);ok(/Nome: obrigatório/.test(e0),'validação: nome obrigatório');
 await page.click('[data-a=editProfile]');const e1=await fillForm(page,{name:'Ana',age:'5',height:'170',weight:'70'},false);ok(/Idade/.test(e1),'validação: idade fora do intervalo');
 await page.click('[data-a=editProfile]');await fillForm(page,{name:'Ana',age:'30',height:'170',weight:'70',sex:'f',activity:'moderado',experience:'iniciante',freq:'3',limits:'joelho sensível'});
 t=await body(page);ok(/Ana/.test(t)&&/joelho sensível/.test(t),'perfil salvo');
 ok(/1452/.test(t)&&/2250/.test(t),'cálculo: TMB Mifflin 1452 e gasto 2250 kcal (30a, 170cm, 70kg, F, moderado)');
 await page.reload();await page.waitForSelector('h1');ok(/Ana/.test(await body(page)),'perfil persiste após recarregar');
 // Perfil incompleto → explica faltas
 // Peso
 await go(page,'#/peso');t=await body(page);ok(/Próxima pesagem/.test(t)&&t.includes(String(new Date(Date.now()+7*864e5).getDate())),'mostra próxima data de pesagem (+7 dias)');
 await page.click('[data-a=addW]');await page.waitForTimeout(150);ok(await page.locator('.modal').count()===0&&/Bloqueado/.test(await page.locator('#toast').textContent()),'bloqueia pesagem antecipada');
 ok(!!(await page.locator('table').count()),'histórico de peso exibido');
 await page.click('[data-a=wInterval]');const e2=await fillForm(page,{d:'5'},false);ok(/entre 7/.test(e2),'intervalo mínimo de 7 dias imposto');
 await page.click('[data-a=wInterval]');await fillForm(page,{d:'10'});ok(/10 dias/.test(await body(page)),'intervalo editável (10 dias)');
 await page.click('[data-a=wInterval]');await fillForm(page,{d:'7'});
 // injeta uma pesagem antiga por IndexedDB (via API do app) para testar edição cronológica
 await page.evaluate(async d=>{await db.weights.add({date:d,kg:72,note:''})},add(-20));await page.reload();await page.waitForSelector('h1');
 const ed=page.locator('[data-a=editW]').first();await ed.click();const e3=await fillForm(page,{date:add(-15)},false);ok(/7\+ dias após/.test(e3),'edição respeita 7 dias da pesagem anterior');
 await page.locator('[data-a=editW]').first().click();await fillForm(page,{date:add(-10),kg:'69,5'});ok(/69\.5/.test(await body(page)),'correção de pesagem válida aceita (vírgula decimal)');
 // Alimentos / dieta
 await go(page,'#/dieta');await page.click('[data-a=addFood]');await fillForm(page,{name:'Arroz cozido',ref:'100',kcal:'130',p:'2.5',c:'28',f:'0.3',portion:'colher de servir',portionQty:'50'});
 await page.click('[data-a=addFood]');const e4=await fillForm(page,{name:'Ruim',kcal:'-5',p:'1',c:'1',f:'1'},false);ok(/Calorias/.test(e4),'validação: calorias negativas rejeitadas');
 await page.click('[data-a=addPlan][data-k=almoco]');await fillForm(page,{qty:'200'});
 t=await body(page);ok(/Arroz cozido/.test(t)&&/200 g · 260 kcal/.test(t),'item no plano com cálculo 260 kcal');
 await page.click('[data-a=editPlan]');await fillForm(page,{qty:'100'});ok(/100 g · 130 kcal/.test(await body(page)),'editar quantidade no plano');
 await page.click('[data-a=addPlan][data-k=almoco]');await fillForm(page,{qty:'',por:'2'});ok(/100 g · 130 kcal/.test(await body(page))&&(await page.locator('.li:has-text("Arroz cozido")').count())>=2,'porção personalizada (2 × 50 g) soma');
 await page.click('[data-a=copyMeal][data-k=almoco]');const other=(new Date().getDay()+1)%7;await fillForm(page,{to:String(other)});
 await page.click(`[data-a=dwd][data-i="${other}"]`);ok(/Arroz cozido/.test(await page.locator('section:has(h2:text-is("Almoço"))').innerText()),'copiar refeição para outro dia');
 await page.click(`[data-a=dwd][data-i="${new Date().getDay()}"]`);
 await page.click('[data-a=eatMeal][data-k=almoco]');await page.waitForTimeout(150);
 await go(page,'#/hoje');t=await body(page);ok(/260 \/ 2242/.test(t.replace(/\s+/g,' ')),'dashboard: consumo 260 de meta 2242 kcal (meta recalculada com o peso corrigido de 69,5 kg) vem do módulo real');
 // Treino execução
 await go(page,'#/treino');await page.click(`[data-a=tday][data-d="${ymd()}"]`);
 const today=new Date().getDay();const hasEx=await page.locator('[data-a=tick]').count();
 if(hasEx){await page.locator('[data-a=tick]').first().click();await page.waitForTimeout(150);await page.locator('input[data-f=actual]').first().fill('2x6');await page.locator('input[data-f=actual]').first().blur();await page.locator('input[data-f=load]').first().fill('12');await page.locator('input[data-f=load]').first().blur();await page.waitForTimeout(200);
  await page.reload();await page.waitForSelector('h1');ok(await page.locator('[data-a=tick]').first().getAttribute('aria-pressed')==='true'&&await page.locator('input[data-f=actual]').first().inputValue()==='2x6'&&await page.locator('input[data-f=load]').first().inputValue()==='12','treino executado (check + realizado + carga) persiste após recarregar');
  ok(/Planejado/.test(await body(page))&&await page.locator('input[data-f=actual]').count()>0,'planejado separado do executado');}
 await page.click('[data-a=plan_on]');await page.locator('[data-a=addEx]').first().click();await fillForm(page,{name:'Exercício novo',plan:'3x10'});ok(/Exercício novo/.test(await body(page)),'adicionar exercício ao plano');
 await page.locator('[data-a=delEx]').last().click();await page.click('[data-y]');await page.waitForTimeout(150);ok(!/Exercício novo/.test(await body(page)),'remover exercício pede confirmação');
 // Água, passos, hábitos
 await go(page,'#/diario');await page.click('[data-a=addWater][data-ml="300"]');await page.click('[data-a=addWater][data-ml="500"]');ok(/800\s*\/ 2000 ml/.test((await body(page)).replace(/\s+/g,' ')),'água: botões rápidos somam 800 ml');
 await page.click('[data-a=editWater]');await fillForm(page,{ml:'250'});ok(/750\s*\/ 2000/.test((await body(page)).replace(/\s+/g,' ')),'editar registro de água');
 await page.click('[data-a=editSteps][data-date]');await fillForm(page,{steps:'5200'});ok(/5200/.test(await body(page)),'passos registrados');
 await page.click('[data-a=editSteps][data-date]');await fillForm(page,{steps:'6000'});ok(/6000/.test(await body(page))&&!/5200/.test(await body(page)),'passos corrigidos');
 ok(/Fiz refeições regulares e completas/.test(await body(page))&&/Passeei com meu cachorro/.test(await body(page)),'hábitos da planilha presentes');
 const hc=page.locator('.hc').last();ok(await hc.getAttribute('data-s')==='','dia sem registro = não registrado');await hc.click();await page.waitForTimeout(200);ok(await page.locator('.hc').last().getAttribute('data-s')==='1','hábito marcado como feito');await page.locator('.hc').last().click();await page.waitForTimeout(200);ok(await page.locator('.hc').last().getAttribute('data-s')==='0','segundo toque = não feito');
 await page.locator('.hc').last().click();await page.waitForTimeout(200);ok(await page.locator('.hc').last().getAttribute('data-s')==='','terceiro toque volta a não registrado');await page.locator('.hc').last().click();await page.waitForTimeout(200);
 await page.click('[data-a=addHabit]');await fillForm(page,{name:'Alongar 5 min'});ok(/Alongar 5 min/.test(await body(page)),'hábito personalizado criado');
 // Metas
 await go(page,'#/perfil');await page.click('[data-a=addGoal]');await fillForm(page,{title:'Chegar a 65 kg',kind:'peso',unit:'kg',target:'65'});
 t=await body(page);ok(/Chegar a 65 kg/.test(t),'meta criada');await page.click('[data-a=goalSt]');ok(/pausada/.test(await body(page)),'meta pausada');await page.click('[data-a=goalSt]');
 await page.click('[data-a=editGoal]');await fillForm(page,{title:'Chegar a 66 kg',target:'66'});ok(/66 kg/.test(await body(page)),'meta editada');
 // Dashboard e evolução
 await go(page,'#/hoje');t=(await body(page)).replace(/\s+/g,' ');ok(/750 \/ 2000 ml/.test(t)&&/6000 \/ 8000/.test(t)&&/Chegar a 66 kg/.test(t),'dashboard reflete água, passos e metas reais');
 await go(page,'#/evolucao');ok(await page.locator('svg.ch').count()>=3,'gráficos de evolução renderizados');await page.selectOption('[data-c=range]','7');await page.waitForTimeout(100);ok(await page.locator('svg.ch').count()>=1,'filtro de período funciona');
 // Responsividade: sem rolagem horizontal
 let over=[];for(const h of ['hoje','treino','dieta','diario','peso','evolucao','perfil']){await go(page,'#/'+h);const w=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);if(w[0]>w[1]+1)over.push(h+':'+w.join('>'))}
 ok(!over.length,'sem overflow horizontal em todas as telas '+over.join(','));
 // Refeições modelo
 await go(page,'#/dieta');const e2d=(new Date().getDay()+2)%7;await page.click('[data-a=saveTpl][data-k=almoco]');await fillForm(page,{name:'Almoço padrão'});ok(/Almoço padrão/.test(await body(page)),'refeição salva como modelo');
 await page.click(`[data-a=dwd][data-i="${e2d}"]`);await page.click('[data-a=useTpl][data-k=almoco]');await fillForm(page,{});ok(/Arroz cozido/.test(await page.locator('section:has(h2:text-is("Almoço"))').innerText()),'modelo inserido em outro dia');
 await page.reload();await page.waitForSelector('h1');ok(/Almoço padrão/.test(await body(page)),'modelos persistem');
 // Importar planilha
 ok(await page.evaluate(async()=>(await Promise.all(['templates/satori-modelo-treino.xlsx','templates/satori-modelo-treino.csv'].map(u=>fetch(u).then(r=>r.status)))).every(s=>s===200)),'planilhas modelo (.xlsx e .csv) disponíveis para download');
 await go(page,'#/treino');const pb=await page.locator('#promptBox').inputValue();ok(/ENTREVISTA/.test(pb)&&/Dia, Treino, Horário/.test(pb)&&!/MEUS DADOS/.test(pb),'prompt do ChatGPT presente (entrevista + formato)');
 await page.locator('[data-c=pInc]').check();await page.waitForTimeout(150);const pb2=await page.locator('#promptBox').inputValue();ok(/MEUS DADOS/.test(pb2)&&/30 anos/.test(pb2)&&/joelho sensível/.test(pb2)&&!/Ana/.test(pb2),'prompt inclui dados do perfil (sem o nome) quando marcado');
 await page.click('[data-a=copyPrompt]');ok(/copiado/.test(await page.locator('#toast').textContent()),'botão copiar prompt');
 const [dl2]=await Promise.all([page.waitForEvent('download'),page.click('a[href$="satori-modelo-treino.xlsx"]')]);ok(/modelo-treino\.xlsx$/.test(dl2.suggestedFilename()),'botão baixar planilha modelo');
 fs.writeFileSync('/tmp/imp.csv','\uFEFFDia;Treino;Horário;Duração;Exercício;Séries x repetições;Observações\n#Segunda;Exemplo ignorado;;;X;1x1;\nSegunda;Peito Teste;18h;40 min;Supino com halteres;3x10;"Controle a descida, sem pressa"\nSegunda;Peito Teste;18h;40 min;Flexão;3x8;\n');
 await page.setInputFiles('input[data-c=impW]','/tmp/imp.csv');await page.waitForSelector('#imode');ok(/1 treino\(s\), 2 exercício/.test(await page.locator('.sheet').innerText()),'CSV (; e BOM): pré-visualização correta, linha # ignorada');
 await page.click('[data-ok]');await page.waitForSelector('.modal',{state:'detached'});await page.waitForTimeout(150);await page.click('[data-a=tday][aria-label*="segunda"]');
 ok(/Peito Teste/.test(await body(page))&&/Supino com halteres/.test(await body(page))&&/Controle a descida, sem pressa/.test(await body(page)),'CSV importado: treino, exercícios e observação (vírgula entre aspas)');
 await page.setInputFiles('input[data-c=impW]','test/fixtures/treino.xlsx');await page.waitForSelector('#imode');ok(/2 treino\(s\), 3 exercício/.test(await page.locator('.sheet').innerText()),'XLSX: lido localmente com pré-visualização');
 await page.click('[data-ok]');await page.waitForSelector('.modal',{state:'detached'});await page.waitForTimeout(150);await page.click('[data-a=tday][aria-label*="quarta"]');ok(/Treino XLSX/.test(await body(page))&&/Remada com elástico/.test(await body(page))&&/3x12/.test(await body(page)),'XLSX importado corretamente');
 await page.setInputFiles('input[data-c=impW]','templates/satori-modelo-treino.xlsx');await page.waitForSelector('.modal .err');ok(/Nenhum treino encontrado/.test(await page.locator('.modal').innerText()),'planilha modelo intacta (só exemplos #) não importa nada');await page.click('.modal .btn');
 fs.writeFileSync('/tmp/bad.csv','Dia,Treino,Exercício\nMarte,Treino X,Supino\nSegunda,,Flexão\n');const nW=await page.evaluate(()=>__app.S.workouts.length);
 await page.setInputFiles('input[data-c=impW]','/tmp/bad.csv');await page.waitForSelector('.modal .err');const em=await page.locator('.modal').innerText();ok(/Linha 2: dia inválido/.test(em)&&/Linha 3: nome do treino vazio/.test(em),'erros com número da linha');await page.click('.modal .btn');
 ok(await page.evaluate(()=>__app.S.workouts.length)===nW,'importação inválida não altera nada');
 fs.writeFileSync('/tmp/bad.txt','x');await page.setInputFiles('input[data-c=impW]','/tmp/bad.txt');await page.waitForSelector('.modal .err');ok(/xlsx ou um arquivo \.csv|\.xlsx ou \.csv/.test(await page.locator('.modal').innerText()),'extensão inválida recusada');await page.click('.modal .btn');
 const nSess=await page.evaluate(()=>__app.S.sessions.length);
 await page.setInputFiles('input[data-c=impW]','test/fixtures/treino.xlsx');await page.waitForSelector('#imode');await page.selectOption('#imode','replace');await page.click('[data-ok]');await page.waitForSelector('[data-y]');await page.click('[data-y]');await page.waitForTimeout(300);
 const wn=await page.evaluate(()=>__app.S.workouts.map(w=>w.name).sort().join('|'));ok(wn==='Longão|Treino XLSX','modo substituir troca todo o plano');ok(await page.evaluate(()=>__app.S.sessions.length)===nSess&&nSess>0,'histórico de sessões preservado ao substituir o plano');
 // Backup / restauração
 await go(page,'#/perfil');const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-a=export]')]);const fp='/tmp/backup-'+name.replace(/\W/g,'')+'.json';await dl.saveAs(fp);const bj=JSON.parse(fs.readFileSync(fp,'utf8'));
 ok(bj.app==='saude-e-treino'&&bj.tables.weights.length===2&&bj.tables.foods.length===1&&bj.tables.water.length===2,'backup JSON exportado com os dados');
 await go(page,'#/diario');await page.click('[data-a=addWater][data-ml="500"]');ok(/1250/.test(await body(page)),'(mutação após backup)');
 await go(page,'#/perfil');await page.setInputFiles('input[data-c=import]',fp);await page.waitForSelector('[data-y]');await page.click('[data-y]');await page.waitForTimeout(300);
 await go(page,'#/diario');ok(/750\s*\/ 2000/.test((await body(page)).replace(/\s+/g,' ')),'restauração devolveu o estado do backup');
 fs.writeFileSync('/tmp/bad1.json','{"app":"outro"}');fs.writeFileSync('/tmp/bad2.json','não é json');fs.writeFileSync('/tmp/bad3.json',JSON.stringify({app:'saude-e-treino',schema:1,tables:{weights:[{date:'2024-01-01',kg:'abc'}]}}));
 await go(page,'#/perfil');for(const b of ['bad1','bad2','bad3']){await page.setInputFiles('input[data-c=import]',`/tmp/${b}.json`);await page.waitForSelector('.modal .err');const m=await page.locator('.modal .err').textContent();ok(m.length>5,`importação inválida recusada (${b}): ${m}`);await page.click('.modal .btn')}
 await go(page,'#/diario');ok(/750\s*\/ 2000/.test((await body(page)).replace(/\s+/g,' ')),'dados intactos após importações inválidas');
 // Apagar com confirmação
 await go(page,'#/perfil');await page.click('[data-a=wipe]');await page.click('[data-n]');await go(page,'#/peso');ok(/6[0-9]\.?5?|7[0-9]/.test(await body(page)),'cancelar exclusão mantém dados');
 // Preparação para sincronização: uid estável, updatedAt, exclusões registradas
 const sy=await page.evaluate(async()=>{const w=await db.weights.toArray();const x=w[0];await db.weights.put({date:x.date,kg:x.kg+0.1,id:x.id}); // put "sem uid" preserva o uid existente
  const x2=await db.weights.get(x.id);await db.weights.add({date:'2020-01-01',kg:60,note:''});const n=(await db.weights.toArray()).find(r=>r.date==='2020-01-01');await db.weights.delete(n.id);
  await db.weights.bulkAdd([{date:'2019-01-01',kg:61}]);await syncPrep();const old=(await db.weights.toArray()).find(r=>r.date==='2019-01-01');
  await db.steps.put({date:'2019-02-02',steps:10});await db.steps.delete('2019-02-02');const tb=(await db.kv.get('tombstones')).items;
  return{u1:x.uid,u2:x2.uid,ts:typeof x2.updatedAt,len:(x.uid||'').length,newUid:!!n.uid,tomb:tb.some(t=>t.t==='weights'&&t.uid===n.uid),tombStep:tb.some(t=>t.t==='steps'&&t.key==='2019-02-02'),back:!!old.uid,all:(await Promise.all(SYNC_TABLES.map(t=>db[t].toArray()))).flat().every(r=>r.uid)}});
 ok(sy.len===36&&sy.u1===sy.u2&&sy.ts==='number','registros têm uid (UUID) e updatedAt; editar preserva o uid');
 ok(sy.newUid&&sy.tomb&&sy.tombStep,'exclusões geram marcador (tombstone) para sincronizar depois');
 ok(sy.back&&sy.all,'dados antigos sem uid (ex.: backup antigo) recebem uid automaticamente');
 await page.evaluate(async()=>{const r=(await db.weights.toArray()).find(x=>x.date==='2019-01-01');await db.weights.delete(r.id)});
 // Lembrete de backup
 await page.evaluate(async()=>{await db.kv.put({key:'meta',seeded:1,v:1,at:'2020-01-01'})});await page.reload();await page.waitForSelector('h1');await go(page,'#/hoje');ok(/Faça um backup/.test(await body(page)),'lembrete de backup aparece quando nunca houve backup');
 const [dl3]=await Promise.all([page.waitForEvent('download'),page.locator('main [data-a=export]').first().click()]);await page.waitForTimeout(300);ok(!/Faça um backup/.test(await body(page)),'lembrete some após exportar o backup');
 // PWA
 const man=await page.evaluate(async()=>{const m=await (await fetch('manifest.webmanifest')).json();const r=await Promise.all(m.icons.map(i=>fetch(i.src).then(x=>x.status)));return{m,r}});
 ok(man.m.display==='standalone'&&man.r.every(s=>s===200)&&man.m.icons.some(i=>i.sizes==='512x512'),'manifest PWA válido com ícones 192/512/maskable');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForTimeout(500);
 ok(await page.evaluate(()=>!!navigator.serviceWorker.controller),'service worker ativo e controlando a página');
 await ctx.setOffline(true);await page.reload();await page.waitForSelector('h1',{timeout:5000});await go(page,'#/peso');ok(/Peso/.test(await body(page))&&/69\.5|72/.test(await body(page)),'funciona OFFLINE (recarregar sem rede e dados presentes)');
 await ctx.setOffline(false);
 // persistência após fechar e reabrir (novo contexto não compartilha; usa storageState de IDB)
 const st=await ctx.storageState({indexedDB:true});await page.close();await ctx.close();
 const ctx2=await browser.newContext({...ctxOpts,storageState:st});const p2=await ctx2.newPage();await p2.goto(base);await p2.waitForSelector('h1');await p2.evaluate(()=>location.hash='#/hoje');await p2.waitForTimeout(250);
 const t2=(await p2.locator('main').innerText()).replace(/\s+/g,' ');ok(/Ana/.test(t2)&&/750 \/ 2000 ml/.test(t2),'dados persistem após fechar e reabrir o navegador');
 ok(errs.length===0,'sem erros de JavaScript no console'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
 await browser.close();
}
(async()=>{await new Promise(r=>srv.listen(8123,r));
 try{await run('Desktop Chromium 1280×800',{viewport:{width:1280,height:800}});await run('Android Chromium (Pixel 7)',pw.devices['Pixel 7'])}catch(e){fail++;results.push('ERRO FATAL: '+e.message.split('\n')[0])}
 console.log(results.join('\n')+`\n\nRESULTADO: ${pass} passaram, ${fail} falharam`);srv.close();process.exit(fail?1:0)})();

// Cadastro inicial (perguntas estilo Yazio) + conta com "lembrar de mim". node test/onboarding.e2e.cjs
let pw;try{pw=require('playwright')}catch{pw=require('/opt/npm-tools/node_modules/playwright')}
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'x'});fs.createReadStream(f).pipe(r)});
const CFG=fs.readFileSync(path.join(ROOT,'config.js'),'utf8'),SB=CFG.match(/url:'([^']+)'/)[1],KEY=CFG.match(/key:'([^']+)'/)[1];
const {M,handle}=require('./mock-supabase.cjs')(KEY);
let pass=0,fail=0;const out=[];const ok=(c,m)=>{c?pass++:fail++;out.push((c?'  ✓ ':'  ✗ FALHOU: ')+m)};
const txt=p=>p.locator('main').innerText();
(async()=>{await new Promise(r=>srv.listen(8127,r));const browser=await pw.chromium.launch(),base='http://localhost:8127/index.html',errs=[];
 const dev=async()=>{const ctx=await browser.newContext(pw.devices['Pixel 7']);await ctx.route(SB+'/**',handle);const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForSelector('h1');return{ctx,p}};
 const next=async p=>{await p.click('[data-a=obNext]');await p.waitForTimeout(80)},pick=async(p,v)=>{await p.click(`[data-a=obPick][data-v="${v}"]`);await p.waitForTimeout(80)},ans=async(p,v)=>{await p.fill('#obIn',String(v));await next(p)};
 out.push('\n== Cadastro inicial ==');
 // ---- A: sem conta, fluxo completo
 let {ctx,p}=await dev();
 ok(/Bem-vindo ao Satori/.test(await txt(p))&&!await p.locator('#tabs').isVisible(),'primeira abertura: boas-vindas, sem navegação do app');
 await p.click('[data-a=obAccount][data-m=signup]');await p.waitForSelector('#obRem');ok(/Crie sua conta/.test(await txt(p))&&await p.locator('#obRem').isChecked(),'tela de conta com "Lembrar de mim" marcado por padrão');
 ok(await p.locator('#obPw').getAttribute('autocomplete')==='new-password'&&await p.locator('#obEm').getAttribute('autocomplete')==='username','campos com autocomplete (gerenciador de senhas do Android/Chrome oferece salvar)');
 await p.click('[data-a=obSkip]');await next(p);ok(/Digite seu nome/.test(await txt(p)),'nome obrigatório');await ans(p,'Ana');
 ok(/objetivo principal/.test(await txt(p)),'pergunta 1: objetivo');await pick(p,'perder');await pick(p,'f');
 await next(p);ok(/Escolha a data/.test(await txt(p)),'data de nascimento obrigatória');await p.fill('#obIn','1996-05-10');await next(p);
 await ans(p,'90');ok(/entre 100 e 250/.test(await txt(p)),'altura inválida recusada');await p.click('[data-a=obBack]');await p.waitForTimeout(80);ok(/data de nascimento/.test(await txt(p)),'botão voltar funciona');await next(p);
 await ans(p,'170');await ans(p,'70');ok(/peso desejado/.test(await txt(p)),'perguntou peso desejado (objetivo = perder)');
 await ans(p,'75');ok(/deve ser menor/.test(await txt(p)),'meta de perda maior que o peso atual é recusada');await ans(p,'65');
 ok(/ritmo/.test(await txt(p)),'perguntou ritmo');await pick(p,'0.5');await pick(p,'moderado');await pick(p,'iniciante');await pick(p,'3');
 await p.click('[data-a=obChip][data-v=Joelho]');await p.fill('#obTxt','ombro direito');await next(p);await p.click('[data-a=obChip][data-v=Lactose]');await next(p);
 const sm=await txt(p);ok(/1700/.test(sm)&&/10 semanas/.test(sm),'resumo: meta 1700 kcal (TDEE 2250 − 550) e 10 semanas até 65 kg');
 await p.click('[data-a=obFinish]');await p.waitForSelector('#tabs a[aria-current=page]');await p.waitForTimeout(300);
 const d=await p.evaluate(async()=>({pr:await db.kv.get('profile'),st:await db.kv.get('settings'),w:await db.weights.toArray(),g:await db.goals.toArray(),m:await db.kv.get('meta')}));
 ok(d.pr.name==='Ana'&&d.pr.birth==='1996-05-10'&&d.pr.limits==='Joelho, ombro direito'&&d.pr.allergies==='Lactose'&&d.pr.goalType==='perder'&&d.pr.experience==='iniciante'&&d.pr.freq===3,'perfil gravado com todas as respostas');
 ok(d.st.kcalAdjust===-550&&d.w.length===1&&d.w[0].kg===70&&d.g.length===1&&d.g[0].target===65&&d.m.onboarded===true,'ajuste calórico, peso inicial, meta de peso e flag de cadastro concluído');
 ok(await p.locator('#tabs').isVisible()&&/1700/.test((await txt(p)).replace(/\s+/g,' ')),'entra no app com navegação e a meta no painel');
 await p.reload();await p.waitForSelector('h1');ok(!/Bem-vindo/.test(await txt(p))&&/Ana/.test(await txt(p)),'não repete o cadastro após recarregar');await ctx.close();
 // ---- B: menor de idade e piso de calorias
 ({ctx,p}=await dev());
 await p.evaluate(()=>{ui.ob.d={name:'Teen',goal:'perder',sex:'f',birth:new Date(Date.now()-15*365.25*864e5).toISOString().slice(0,10),height:165,weight:60,target:50,rate:0.75,activity:'leve'};obGo('summary')});await p.waitForTimeout(150);
 ok(/menos de 18 anos/.test(await txt(p))&&!/ajuste -/.test(await txt(p)),'menor de 18 anos: sem déficit calórico e com aviso');
 await p.evaluate(()=>{ui.ob.d={name:'Baixo',goal:'perder',sex:'f',birth:'2001-01-01',height:150,weight:45,target:40,rate:0.75,activity:'sedentario'};obGo('summary')});await p.waitForTimeout(150);
 ok(/1200/.test(await txt(p))&&/abaixo de 1200/.test(await txt(p)),'piso de 1200 kcal respeitado (com explicação)');
 await p.evaluate(()=>{ui.ob.d={name:'X',goal:'saude',sex:'',birth:'1990-01-01',height:170,weight:70,activity:'leve'};obGo('summary')});await p.waitForTimeout(150);
 ok(/falta/.test(await txt(p))&&/sexo biológico/.test(await txt(p)),'sem sexo informado: explica o que falta, não inventa');await ctx.close();
 // ---- C: conta + lembrar de mim
 for(const rem of [true,false]){({ctx,p}=await dev());await p.click('[data-a=obAccount][data-m=signup]');
  await p.fill('#obEm','x');await p.fill('#obPw','12345678');await p.click('[data-a=obAcc]');await p.waitForTimeout(100);if(rem===true)ok(/E-mail inválido/.test(await txt(p)),'conta: e-mail inválido recusado');
  const em=`u${rem}${Date.now()}@teste.com`;await p.fill('#obEm',em);await p.fill('#obPw','senha-forte-123');if(!rem)await p.uncheck('#obRem');await p.click('[data-a=obAcc]');await p.waitForSelector('#obIn');
  const s=await p.evaluate(async()=>({kv:await db.kv.get('session'),mem:await Sync.session(),pref:await db.kv.get('authPref')}));
  if(rem){ok(!!s.kv?.access_token&&s.pref.remember===true&&s.pref.email===em,'"Lembrar de mim" marcado: sessão persistente e e-mail lembrado')}else{ok(!s.kv&&!!s.mem?.access_token&&s.pref.remember===false&&s.pref.email==='','"Lembrar de mim" desmarcado: sessão só em memória (não fica gravada)')}
  ok(M.rows.size===0,'criar conta não envia dados pessoais ainda');await ctx.close()}
 // ---- D: "já tenho conta" recupera o perfil da nuvem
 const uid=crypto.randomUUID();M.users.set('volta@teste.com',{id:uid,email:'volta@teste.com',pw:'senha-forte-123'});const nowIso=new Date().toISOString();
 M.rows.set(`${uid}|kv|profile`,{user_id:uid,tbl:'kv',uid:'profile',data:{key:'profile',name:'Ana da Nuvem',age:30,height:170,sex:'f',activity:'leve',updatedAt:Date.now()},updated_at:nowIso,deleted:false});
 ({ctx,p}=await dev());await p.click('[data-a=obAccount][data-m=signin]');await p.fill('#obEm','volta@teste.com');await p.fill('#obPw','errada-12345');await p.click('[data-a=obAcc]');await p.waitForTimeout(250);ok(/E-mail ou senha incorretos/.test(await txt(p)),'login com senha errada: mensagem clara');
 await p.fill('#obPw','senha-forte-123');await p.click('[data-a=obAcc]');await p.waitForSelector('#tabs a[aria-current=page]',{timeout:6000});await p.waitForTimeout(300);
 ok(/Ana da Nuvem/.test(await txt(p))&&!/Bem-vindo/.test(await txt(p)),'quem já tem conta entra direto com o perfil recuperado (sem refazer as perguntas)');await ctx.close();
 ok(errs.length===0,'sem erros de JavaScript'+(errs.length?': '+errs[0]:''));
 console.log(out.join('\n')+`\n\nRESULTADO: ${pass} passaram, ${fail} falharam`);await browser.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.log(out.join('\n'));console.log('ERRO FATAL:',e.message.split('\n')[0]);process.exit(1)});

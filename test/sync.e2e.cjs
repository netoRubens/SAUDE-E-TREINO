// Sincronização contra um Supabase SIMULADO (o real não é acessível aqui). node test/sync.e2e.cjs
let pw;try{pw=require('playwright')}catch{pw=require('/opt/npm-tools/node_modules/playwright')}
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'x'});fs.createReadStream(f).pipe(r)});
const CFG=fs.readFileSync(path.join(ROOT,'config.js'),'utf8'),SB=CFG.match(/url:'([^']+)'/)[1],KEY=CFG.match(/key:'([^']+)'/)[1];
let pass=0,fail=0;const out=[];const ok=(c,m)=>{c?pass++:fail++;out.push((c?'  ✓ ':'  ✗ FALHOU: ')+m)};
/* ---- Supabase simulado: Auth + PostgREST + RLS + trigger keep_newer ---- */
const M={users:new Map(),tok:new Map(),ref:new Map(),rows:new Map(),log:[],refreshCalls:0};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,prefer','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const J=(route,status,body)=>route.fulfill({status,headers:{...cors,'Content-Type':'application/json'},body:body===undefined?'':JSON.stringify(body)});
const sess=(u)=>{const a='at-'+crypto.randomUUID(),r='rt-'+crypto.randomUUID();M.tok.set(a,u.id);M.ref.set(r,u.id);return{access_token:a,refresh_token:r,expires_in:3600,user:{id:u.id,email:u.email}}};
async function handle(route){if(M.down)return route.abort('failed');const rq=route.request(),u=new URL(rq.url()),h=rq.headers();
 if(rq.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 M.log.push({m:rq.method(),p:u.pathname,apikey:h.apikey,auth:h.authorization});
 if(h.apikey!==KEY)return J(route,401,{message:'Invalid API key'});
 const body=()=>{try{return JSON.parse(rq.postData()||'null')}catch{return null}};
 if(u.pathname==='/auth/v1/signup'){const b=body();if(M.users.has(b.email))return J(route,422,{msg:'User already registered'});const usr={id:crypto.randomUUID(),email:b.email,pw:b.password};M.users.set(b.email,usr);return J(route,200,sess(usr))}
 if(u.pathname==='/auth/v1/token'){const b=body(),g=u.searchParams.get('grant_type');
  if(g==='password'){const usr=M.users.get(b.email);if(!usr||usr.pw!==b.password)return J(route,400,{error:'invalid_grant',error_description:'Invalid login credentials'});return J(route,200,sess(usr))}
  if(g==='refresh_token'){M.refreshCalls++;const id=M.ref.get(b.refresh_token);if(!id)return J(route,400,{error:'invalid_grant'});M.ref.delete(b.refresh_token);return J(route,200,sess([...M.users.values()].find(x=>x.id===id)))}}
 if(u.pathname==='/rest/v1/records'){const a=(h.authorization||'').replace('Bearer ',''),uid=M.tok.get(a);if(!uid)return J(route,401,{message:'JWT invalid'});
  if(rq.method()==='POST'){const rows=body();if(rows.some(r=>r.user_id!==uid))return J(route,403,{message:'new row violates row-level security policy'});
   for(const r of rows){const k=`${uid}|${r.tbl}|${r.uid}`,old=M.rows.get(k);if(old&&Date.parse(r.updated_at)<Date.parse(old.updated_at))continue;M.rows.set(k,r)}return J(route,201)}
  if(rq.method()==='GET'){const gte=(u.searchParams.get('updated_at')||'gte.').slice(4),lim=+u.searchParams.get('limit')||1000,off=+u.searchParams.get('offset')||0;
   const rows=[...M.rows.entries()].filter(([k])=>k.startsWith(uid+'|')).map(([,r])=>r).filter(r=>Date.parse(r.updated_at)>=Date.parse(gte)).sort((a,b)=>a.updated_at<b.updated_at?-1:a.updated_at>b.updated_at?1:a.tbl+a.uid<b.tbl+b.uid?-1:1).slice(off,off+lim).map(({tbl,uid,data,updated_at,deleted})=>({tbl,uid,data,updated_at,deleted}));return J(route,200,rows)}}
 return J(route,404,{message:'not found'})}
const mine=(email)=>[...M.rows.entries()].filter(([k])=>k.startsWith(M.users.get(email).id+'|')).map(([,r])=>r);
async function fill(page,vals){for(const[k,v]of Object.entries(vals))await page.locator(`.sheet [name="${k}"]`).fill(v);await page.click('.sheet button[type=submit]')}
(async()=>{await new Promise(r=>srv.listen(8126,r));const browser=await pw.chromium.launch(),base='http://localhost:8126/index.html',errs=[];
 const device=async()=>{const ctx=await browser.newContext({viewport:{width:1280,height:800}});await ctx.route(SB+'/**',handle);const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForSelector('h1');return{ctx,p}};
 const ev=(d,f,a)=>d.p.evaluate(f,a);
 out.push('\n== Sincronização (2 aparelhos, Supabase simulado) ==');
 const A=await device();
 await ev(A,async()=>{const fid=await db.foods.add({name:'Arroz sync',unit:'g',ref:100,kcal:130,p:2.5,c:28,f:0.3,source:'manual'});await db.plan.add({wd:1,slot:'almoco',foodId:fid,qty:150});await db.weights.add({date:'2026-10-01',kg:70,note:''});await db.water.add({date:'2026-11-01',ml:300});await db.steps.put({date:'2026-11-01',steps:4321});
  const h=(await db.habits.toArray())[1];await db.habitlog.put({key:'2026-11-01|'+h.id,date:'2026-11-01',habitId:h.id,done:true});await db.kv.put({key:'profile',name:'Ana',age:30,height:170,sex:'f',activity:'moderado'});
  const w=(await db.workouts.toArray()).find(x=>x.day===2);await db.sessions.add({date:'2026-11-03',wid:w.id,wname:w.name,items:[{name:'Agachamento',plan:'2x10',done:true,actual:'2x10',load:''}],note:'ok'});await db.foodlog.add({date:'2026-11-01',slot:'almoco',foodId:fid,name:'Arroz sync',qty:100,unit:'g',kcal:130,p:2.5,c:28,f:0.3})});
 await A.p.reload();await A.p.waitForSelector('h1');await A.p.evaluate(()=>location.hash='#/perfil');await A.p.waitForTimeout(300);
 // validação de formulário
 await A.p.click('[data-a=signup]');await fill(A.p,{email:'invalido',password:'senha-forte-123'});await A.p.waitForTimeout(150);ok(/E-mail inválido/.test(await A.p.locator('.sheet .err').textContent()),'cadastro: e-mail inválido recusado');
 await A.p.fill('.sheet [name=email]','ana@teste.com');await A.p.fill('.sheet [name=password]','curta');await A.p.click('.sheet button[type=submit]');await A.p.waitForTimeout(150);ok(/8 caracteres/.test(await A.p.locator('.sheet .err').textContent()),'cadastro: senha curta recusada');
 await A.p.fill('.sheet [name=password]','senha-forte-123');await A.p.click('.sheet button[type=submit]');await A.p.waitForSelector('.modal',{state:'detached'});await A.p.waitForTimeout(200);
 ok(/ana@teste\.com/.test(await A.p.locator('main').innerText()),'conta criada e sessão aberta');
 ok(M.rows.size===0,'nada é enviado ao criar a conta (só após confirmar a 1ª sincronização)');
 await A.p.click('[data-a=syncNow]');await A.p.waitForSelector('[data-y]');await A.p.click('[data-y]');await A.p.waitForFunction(()=>/Sincronizado/.test(document.querySelector('#toast').textContent));
 const t=mine('ana@teste.com').reduce((a,r)=>(a[r.tbl]=(a[r.tbl]||0)+1,a),{});
 ok(t.foods===1&&t.plan===1&&t.weights===1&&t.water===1&&t.steps===1&&t.habitlog===1&&t.kv>=1&&t.sessions===1&&t.foodlog===1&&t.workouts===7&&t.habits===4,'enviou todos os módulos: '+JSON.stringify(t));
 const plan=mine('ana@teste.com').find(r=>r.tbl==='plan').data,hl=mine('ana@teste.com').find(r=>r.tbl==='habitlog');
 ok(plan.foodId===undefined&&/^[0-9a-f-]{36}$/.test(plan.foodIdUid)&&/^2026-11-01\|seed-h-1$/.test(hl.uid),'referências enviadas por uid (não por id numérico local)');
 ok(M.log.filter(x=>x.p.startsWith('/rest')).every(x=>/^Bearer at-/.test(x.auth)&&x.apikey===KEY)&&M.log.every(x=>x.auth!=='Bearer '+KEY),'chave publishable só no header apikey; token do usuário no Authorization');
 // Aparelho B
 const B=await device();await B.p.evaluate(()=>location.hash='#/perfil');await B.p.waitForTimeout(200);
 await B.p.click('[data-a=signin]');await fill(B.p,{email:'ana@teste.com',password:'errada-1234'});await B.p.waitForTimeout(250);ok(/E-mail ou senha incorretos/.test(await B.p.locator('.sheet .err').textContent()),'login com senha errada → mensagem clara');
 await B.p.fill('.sheet [name=password]','senha-forte-123');await B.p.click('.sheet button[type=submit]');await B.p.waitForSelector('.modal',{state:'detached'});await B.p.waitForTimeout(200);
 await B.p.click('[data-a=syncNow]');await B.p.waitForSelector('[data-y]');await B.p.click('[data-y]');await B.p.waitForFunction(()=>/Sincronizado/.test(document.querySelector('#toast').textContent));
 const r=await ev(B,async()=>{const f=(await db.foods.toArray()).find(x=>x.name==='Arroz sync'),pl=(await db.plan.toArray())[0],hb=(await db.habits.toArray()).find(h=>h.name==='Bebi água ao longo do dia'),hl=await db.habitlog.get('2026-11-01|'+hb.id),w2=(await db.workouts.toArray()).find(x=>x.day===2),se=(await db.sessions.toArray())[0],fl=(await db.foodlog.toArray())[0],pr=await db.kv.get('profile');
  return{nW:(await db.workouts.count()),nH:(await db.habits.count()),food:!!f,planOk:pl&&f&&pl.foodId===f.id&&pl.qty===150&&pl.wd===1,wt:(await db.weights.toArray()).some(x=>x.date==='2026-10-01'&&x.kg===70),hl:hl&&hl.done===true&&hl.habitId===hb.id,steps:(await db.steps.get('2026-11-01'))?.steps,water:(await db.water.toArray())[0]?.ml,sess:se&&se.wid===w2.id,fl:fl&&fl.foodId===f.id,prof:pr?.name}});
 ok(r.nW===7&&r.nH===4,`sem duplicar treinos/hábitos da planilha (${r.nW} treinos, ${r.nH} hábitos)`);
 ok(r.food&&r.planOk&&r.fl,'B recebeu alimento, plano e consumo com referências corretas (ids locais remapeados)');
 ok(r.wt&&r.steps===4321&&r.water===300&&r.prof==='Ana','B recebeu peso, passos, água e perfil');
 ok(r.hl&&r.sess,'B recebeu hábito marcado e sessão de treino ligados aos itens certos');
 // exclusões
 await ev(A,async()=>{const w=(await db.weights.toArray())[0];await db.weights.delete(w.id);await db.steps.delete('2026-11-01');const h=(await db.habits.toArray())[1];await db.habitlog.delete('2026-11-01|'+h.id);await Sync.syncNow()});
 await ev(B,()=>Sync.syncNow());const d=await ev(B,async()=>({w:(await db.weights.count()),s:await db.steps.get('2026-11-01'),h:await db.habitlog.count()}));
 ok(d.w===0&&d.s===undefined&&d.h===0,'exclusões (peso, passos, hábito) propagadas de A para B');
 // conflito LWW
 await ev(A,async()=>{const f=(await db.foods.toArray()).find(x=>x.name==='Arroz sync');await db.foods.put({...f,kcal:111})});await A.p.waitForTimeout(30);
 await ev(B,async()=>{const f=(await db.foods.toArray()).find(x=>x.name==='Arroz sync');await db.foods.put({...f,kcal:222})});
 await ev(A,()=>Sync.syncNow());await ev(B,()=>Sync.syncNow());await ev(A,()=>Sync.syncNow());
 const kc=[await ev(A,async()=>(await db.foods.toArray()).find(x=>x.name==='Arroz sync').kcal),await ev(B,async()=>(await db.foods.toArray()).find(x=>x.name==='Arroz sync').kcal)];
 ok(kc[0]===222&&kc[1]===222,`conflito: vence a edição mais recente nos dois aparelhos (${kc})`);
 // renovação de sessão
 await ev(A,async()=>{await db.kv.put({...(await db.kv.get('session')),expires_at:Date.now()-1})});const rc=M.refreshCalls;await ev(A,()=>Sync.syncNow());ok(M.refreshCalls===rc+1,'token expirado é renovado automaticamente');
 // offline
 M.down=true;const msg=await ev(A,async()=>{try{await Sync.syncNow();return'ok'}catch(e){return e.message}});M.down=false;
 ok(/Sem conexão/.test(msg),'offline: falha com mensagem clara, dados locais intactos');
 const n1=await ev(A,async()=>(await db.foods.count()));await ev(A,()=>Sync.syncNow());ok(n1>=1,'sincroniza de novo ao voltar a internet');
 // backup não leva tokens
 const bk=await ev(A,async()=>{const t=await (await backupBlob()).text(),s=await db.kv.get('session');return{has:t.includes(s.access_token)||t.includes(s.refresh_token)||/"key": "(session|sync)"/.test(t)}});ok(!bk.has,'backup JSON não contém tokens nem cursor de sincronização');
 // sair e RLS
 await A.p.evaluate(()=>location.hash='#/perfil');await A.p.waitForTimeout(200);await A.p.evaluate(()=>{});await A.p.click('[data-a=signout]');await A.p.waitForSelector('[data-y]');await A.p.click('[data-y]');await A.p.waitForTimeout(200);
 ok(await ev(A,async()=>!(await db.kv.get('session'))&&(await db.foods.count())>=1),'sair remove a sessão e mantém os dados locais');
 const U2={email:'outro@teste.com'};const C=await device();await C.p.evaluate(()=>location.hash='#/perfil');await C.p.waitForTimeout(200);await C.p.click('[data-a=signup]');await fill(C.p,{email:U2.email,password:'outra-senha-123'});await C.p.waitForSelector('.modal',{state:'detached'});
 await C.p.click('[data-a=syncNow]');await C.p.waitForSelector('[data-y]');await C.p.click('[data-y]');await C.p.waitForFunction(()=>/Sincronizado/.test(document.querySelector('#toast').textContent));
 const o=await ev(C,async()=>({f:(await db.foods.toArray()).some(x=>x.name==='Arroz sync'),p:(await db.kv.get('profile'))?.name}));ok(!o.f&&!o.p,'isolamento: outra conta não enxerga os dados da Ana');
 ok(errs.length===0,'sem erros de JavaScript'+(errs.length?': '+errs[0]:''));
 console.log(out.join('\n')+`\n\nRESULTADO: ${pass} passaram, ${fail} falharam`);await browser.close();srv.close();process.exit(fail?1:0)})().catch(e=>{console.log(out.join('\n'));console.log('ERRO FATAL:',e.message.split('\n')[0]);process.exit(1)});

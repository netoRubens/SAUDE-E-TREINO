import {createTracker,restoreTracker} from '../core/running.js';
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ FALHOU: ')+m)};
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
const LAT=-19.9167,LON=-43.9345,prng=s=>()=>((s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296));
function sim(tr,st,segs,{seed=7,noise=1.2}={}){const r=prng(seed);for(const g of segs){for(let i=0;i<g.sec;i++){st.t+=1000;st.y+=g.v;if(g.skip)continue;
  const p={t:st.t,lat:LAT+(st.y+(r()-.5)*2*noise)/111320,lon:LON+((r()-.5)*2*noise)/(111320*Math.cos(LAT*Math.PI/180)),acc:g.acc??6};tr.addPoint(p)}}}
const V=2.78; // ~6:00/km
console.log('\n== Motor de corrida ==');
{const tr=createTracker();tr.start(0);const st={t:0,y:0};sim(tr,st,[{sec:600,v:V}]);const s=tr.snapshot(st.t),tru=600*V;
 ok(near(s.distM,tru,tru*.03),`distância com ruído de GPS ±1,2 m: ${s.distM.toFixed(0)} m (real ${tru.toFixed(0)} m, tolerância 3%)`);
 ok(near(s.avgPaceSecKm,360,12)&&near(s.paceNowSecKm,360,20),`pace médio ${s.avgPaceSecKm?.toFixed(0)}s/km e atual ${s.paceNowSecKm?.toFixed(0)}s/km ≈ 360`)}
{const tr=createTracker();tr.start(0);const st={t:0,y:0},r=prng(3);sim(tr,st,[{sec:200,v:V}]);
 for(const [dy,acc] of [[800,8],[-600,8],[900,8]])tr.addPoint({t:st.t+=1000,lat:LAT+(st.y+dy)/111320,lon:LON,acc}); // saltos
 for(let i=0;i<5;i++)tr.addPoint({t:st.t+=1000,lat:LAT+(st.y+300)/111320,lon:LON,acc:80});  // precisão ruim
 tr.addPoint({t:st.t-400000,lat:LAT+(st.y)/111320,lon:LON,acc:5}); // timestamp anterior ao último ponto aceito
 sim(tr,st,[{sec:200,v:V}]);const s=tr.snapshot(st.t);
 ok(s.rejected.speed===3&&s.rejected.acc===5&&s.rejected.order===1,`saltos (${s.rejected.speed}), precisão ruim (${s.rejected.acc}) e timestamp inválido (${s.rejected.order}) rejeitados`);
 ok(near(s.distM,(400+8)*V,(400+8)*V*.04),`distância não foi inflada pelos saltos: ${s.distM.toFixed(0)} m`)}
{const mk=ap=>{const tr=createTracker({autoPause:ap});tr.start(0);const st={t:0,y:0};sim(tr,st,[{sec:120,v:V},{sec:40,v:0},{sec:120,v:V}]);return tr.snapshot(st.t)};
 const a=mk(true),b=mk(false);
 ok(near(a.activeMs,240000,6000),`pausa automática: 280 s totais, 40 s parado → ativo ${(a.activeMs/1000).toFixed(0)} s (≈240)`);
 ok(b.activeMs===280000,'pausa automática desativada: tempo ativo = 280 s');
 ok(near(a.distM,240*V,240*V*.04),`distância durante parada não soma (${a.distM.toFixed(0)} m)`)}
{const tr=createTracker();tr.start(0);const st={t:0,y:0};sim(tr,st,[{sec:100,v:V},{sec:60,v:V,skip:1},{sec:100,v:V}]);const s=tr.snapshot(st.t);
 ok(near(s.gapMs,60000,2500)&&s.distM<220*V,`perda de sinal de 60 s: gap registrado (${(s.gapMs/1000).toFixed(0)} s) e sem linha reta inventada (${s.distM.toFixed(0)} m < ${(200*V).toFixed(0)}+gap)`)}
{const tr=createTracker();tr.start(0);const st={t:0,y:0};sim(tr,st,[{sec:60,v:V}]);const d0=tr.snapshot(st.t).distM;tr.pause(st.t);sim(tr,st,[{sec:30,v:V}]);
 ok(tr.snapshot(st.t).distM===d0,'pausado manualmente: deslocamento não é contado');tr.resume(st.t);sim(tr,st,[{sec:60,v:V}]);const s=tr.snapshot(st.t);
 ok(near(s.activeMs,120000,100)&&near(s.distM,120*V,120*V*.04),`após retomar: tempo ativo ${(s.activeMs/1000)} s, sem salto de distância (${s.distM.toFixed(0)} m)`)}
{const A=createTracker({id:'x'});A.start(0);const sa={t:0,y:0},sb={t:0,y:0};sim(A,sa,[{sec:150,v:V}],{seed:5});
 const B=createTracker({id:'x'});B.start(0);sim(B,sb,[{sec:150,v:V}],{seed:5});
 const R=restoreTracker(JSON.parse(JSON.stringify(B.toJSON())));      // fechamento inesperado + recuperação
 const r2=prng(99);const more=[{sec:100,v:V}];sim(A,sa,more,{seed:99});sim(R,sb,more,{seed:99});
 ok(JSON.stringify(A.snapshot(sa.t))===JSON.stringify(R.snapshot(sb.t)),'recuperação: estado salvo/restaurado dá resultado idêntico ao da corrida sem interrupção');
 ok(R.snapshot(0).id==='x','id da atividade preservado (evita duplicidade na sincronização)')}
console.log('\n== Escopo ==');
{const tr=createTracker();tr.start(0);const st={t:0,y:0};sim(tr,st,[{sec:60,v:V}]);const k=Object.keys(tr.snapshot(st.t)).join(',');
 ok(!/kcal|cal/i.test(k)&&!('walkCalories' in await import('../core/running.js')),'motor não calcula nem expõe calorias (decisão do projeto: sem estimativa de gasto na corrida)')}
console.log(`\nRESULTADO: ${pass} passaram, ${fail} falharam`);process.exit(fail?1:0);

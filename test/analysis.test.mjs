import {createTracker} from '../core/running.js';
import {normalize,splits,gapPace,bestEffort,prs,riegel,predictions,thresholdPace,zoneTimes,fitness,loadOf,insights,toGPX,parseGPX,gpxToActivity} from '../core/analysis.js';
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ✓ ':'  ✗ FALHOU: ')+m)};const near=(a,b,t)=>Math.abs(a-b)<=t;
const LAT=-19.9167,LON=-43.9345,prng=s=>()=>((s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296));
/* corrida sintética: segmentos {m: metros, pace: s/km, dAlt: metros de subida no trecho} */
function run(segs,{seed=3,altNoise=1,t0=1.7e12,alt0=800}={}){const tr=createTracker({autoPause:false}),r=prng(seed);tr.start(t0);let t=t0,y=0,alt=alt0;
  for(const g of segs){const v=1000/g.pace,n=Math.round(g.m/v);for(let i=0;i<n;i++){t+=1000;y+=v;alt+=(g.dAlt||0)/n;tr.addPoint({t,lat:LAT+(y+(r()-.5)*2)/111320,lon:LON+(r()-.5)*2/111320,acc:6,...(g.noAlt?{}:{alt:alt+(r()-.5)*2*altNoise,altAcc:5})})}}
  tr.finish(t);return{tr,s:tr.snapshot(t),route:tr.route(),t}}
const mkAct=(res,extra={})=>({id:extra.id||1,date:'2026-11-01',startedAt:res.route[0].t,endedAt:res.t,activeMs:res.s.activeMs,distM:res.s.distM,avgPaceSecKm:res.s.avgPaceSecKm,gainM:res.s.gainM,route:res.route.map(p=>[p.lat,p.lon,p.t,p.brk?1:0,p.alt??null,Math.round(p.cum),p.act]),...extra});
console.log('\n== Análises de corrida ==');
{const R=run([{m:3200,pace:360}]);const sp=splits(normalize(R.route));
 ok(sp.length===4&&sp.slice(0,3).every(s=>near(s.paceSecKm,360,12))&&sp[3].partial&&near(sp[3].distM,200,60),`parciais: 3 km a ~6:00/km + parcial de ${Math.round(sp[3].distM)} m`)}
{const flat=run([{m:3000,pace:360,dAlt:0}],{altNoise:1.5}),hill=run([{m:1000,pace:360,dAlt:0},{m:1000,pace:360,dAlt:40},{m:1000,pace:360,dAlt:0}]),nog=run([{m:2000,pace:360,noAlt:1}]);
 ok(flat.s.gainM<6,`elevação: ruído de ±1,5 m em 3 km plano não vira subida (${flat.s.gainM.toFixed(1)} m)`);
 ok(near(hill.s.gainM,40,10),`elevação: subida real de 40 m medida ${hill.s.gainM.toFixed(1)} m`);
 ok(nog.s.gainM===null,'sem altitude no GPS: ganho = null (não inventa)');
 const sp=splits(normalize(hill.route));ok(sp[1].dAlt>25&&sp[1].gapSecKm<sp[1].paceSecKm,`km em subida: ritmo ajustado (${sp[1].gapSecKm.toFixed(0)}s) mais rápido que o real (${sp[1].paceSecKm.toFixed(0)}s)`)}
ok(gapPace(420,.05)<330&&gapPace(420,.05)>300&&gapPace(420,-.05)>420&&near(gapPace(420,0),420,.01),`RAI: +5% → ${gapPace(420,.05).toFixed(0)}s/km, −5% → ${gapPace(420,-.05).toFixed(0)}s/km, plano = igual`);
{const R=run([{m:1000,pace:360},{m:1000,pace:300},{m:1000,pace:360}]),P=normalize(R.route),b=bestEffort(P,1000);ok(near(b/1000,300,6),`melhor 1 km num trecho rápido: ${(b/1000).toFixed(0)} s (esperado ~300)`);
 ok(bestEffort(P,5000)===null,'não inventa recorde de distância que não foi corrida');
 const a=mkAct(R),pr=prs([a]);ok(pr['1 km']&&!pr['5 km']&&near(pr['1 km'].ms/1000,300,6),'recordes pessoais por distância (só as percorridas)')}
ok(near(riegel(1500,5000,10000),3127,2),`previsão (Riegel): 5 km em 25:00 → 10 km em ${(riegel(1500,5000,10000)/60).toFixed(1)} min`);
{const R=run([{m:5200,pace:300}]),pr=prs([mkAct(R)]),pd=predictions(pr);ok(pd&&pd.base.D===5000&&pd.list.map(x=>x.n).join()==='5 km,10 km,Meia maratona,42,195 km'.replace('42,195 km','42,195 km'),'previsões a partir do melhor esforço');
 const T=thresholdPace(pr,[],0);ok(near(T,pr['5 km'].ms/1000/5*1.05,.01),`ritmo de limiar estimado ${T.toFixed(0)}s/km (5 km × 1,05)`);ok(thresholdPace({},[],330)===330,'ritmo de limiar manual tem prioridade');
 const zf=zoneTimes(normalize(R.route),T),tot=zf.reduce((a,b)=>a+b);ok(tot>R.s.activeMs*.9&&zf[4]>tot*.5,`zonas: ritmo de 5 km cai na Z5 (${zf.map(x=>Math.round(x/1000)).join('/')} s)`);
 const E=run([{m:2500,pace:380}]),ze=zoneTimes(normalize(E.route),T),te=ze.reduce((a,b)=>a+b);ok(ze[1]>te*.5,`zonas: ritmo leve (6:20/km) fica na Z2 (${ze.map(x=>Math.round(x/1000)).join('/')} s)`)}
{const acts=[];for(let i=0;i<60;i++)acts.push({date:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),activeMs:3e6,distM:8000});const f=fitness(acts,330,'2026-10-30',90),L=f[f.length-1];
 ok(f.length>0&&L.ctl>L.atl*0.3&&near(L.atl,loadOf(acts[0],330),8)&&near(L.tsb,L.ctl-L.atl,1e-9),`forma/fadiga: carga diária ${loadOf(acts[0],330).toFixed(0)} → fadiga ${L.atl.toFixed(0)}, forma ${L.ctl.toFixed(0)}, frescor ${L.tsb.toFixed(0)}`);
 ok(loadOf({activeMs:0,distM:0},330)===0&&fitness([],330,'2026-10-30').length===0,'sem corridas: carga zero, sem série')}
{const first=run([{m:2000,pace:360}]),neg=run([{m:2000,pace:390},{m:2000,pace:330}]),a0=mkAct(first,{id:1,date:'2026-10-01'}),a1=mkAct(neg,{id:2,date:'2026-11-01'}),ins=insights(a1,[a0,a1]);
 ok(ins.some(t=>/negative split/.test(t)),'insight: negative split detectado');ok(ins.some(t=>/km mais rápido/.test(t)),'insight: km mais rápido');ok(ins.some(t=>/Primeira vez.*1 km|Novo recorde.*1 km/.test(t)||ins.some(t=>/recorde|Primeira vez/.test(t))),'insight: recorde/primeira vez')}
{const R=run([{m:1500,pace:340}]),a=mkAct(R,{name:'Teste <&> "x"'}),gpx=toGPX(a);ok(/&lt;&amp;&gt;/.test(gpx)&&!/<&>/.test(gpx),'GPX: nome escapado (sem injeção de XML)');
 const g=parseGPX(gpx);ok(g.points.length===a.route.length&&near(g.points[3].lat,a.route[3][0],1e-9)&&g.hasTime,`GPX: exporta e relê ${g.points.length} pontos`);
 const imp=gpxToActivity(g);ok(near(imp.distM,R.s.distM,R.s.distM*.01),`GPX → atividade pelo mesmo motor: ${Math.round(imp.distM)} m (original ${Math.round(R.s.distM)} m)`);
 let e1,e2,e3;try{parseGPX('<html></html>')}catch(x){e1=x.message}try{parseGPX('<gpx><trk><trkseg><trkpt lat="95" lon="0"><time>2026-01-01T00:00:00Z</time></trkpt></trkseg></trk></gpx>')}catch(x){e2=x.message}try{gpxToActivity(parseGPX('<gpx><trk><trkseg><trkpt lat="1" lon="1"></trkpt><trkpt lat="1.001" lon="1"></trkpt></trkseg></trk></gpx>'))}catch(x){e3=x.message}
 ok(/GPX válido/.test(e1)&&/Coordenada inválida/.test(e2)&&/não tem horários/.test(e3),'GPX inválido, coordenada fora do mundo e GPX sem horário são recusados com mensagem clara')}
console.log(`\nRESULTADO: ${pass} passaram, ${fail} falharam`);process.exit(fail?1:0);

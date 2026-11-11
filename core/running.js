/* Motor de corrida do Satori — JavaScript puro, sem dependências de navegador.
   Roda igual no site, no app (React Native/Expo) e no Node (testes). Recebe pontos GPS; não acessa GPS. */
export const CFG={maxAcc:25,maxSpeed:12.5,minStep:3,gapMs:30000,stillMs:10000,moveSpeed:0.8,paceWinMs:30000};
const R=6371008.8,rad=d=>d*Math.PI/180;
export const haversine=(a,b)=>{const h=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
export function createTracker(opts={},init=null){
  const c={...CFG,autoPause:true,...opts};
  const s=init?structuredClone(init):{id:opts.id??null,status:'idle',pts:[],pauses:[],dist:0,rej:{acc:0,speed:0,order:0,invalid:0},gapMs:0,startT:null,endT:null,anchor:null,lastMoveT:null};
  const open=()=>s.pauses.find(p=>p.end==null),autoOpen=()=>open()?.kind==='auto';
  const closeAuto=t=>{if(autoOpen())open().end=t};
  const pausedMs=t=>s.pauses.reduce((a,p)=>a+Math.max(0,Math.min(p.end??t,t)-p.start),0);
  const activeAt=t=>Math.max(0,t-s.startT-pausedMs(t));
  const push=(p,brk=false)=>s.pts.push({t:p.t,lat:p.lat,lon:p.lon,cum:s.dist,act:activeAt(p.t),...(brk?{brk:1}:{})});
  const pin=(p)=>({lat:p.lat,lon:p.lon,t:p.t,seen:p.t});
  return{
    start(t){if(s.status!=='idle')return;s.status='running';s.startT=t;s.lastMoveT=t},
    pause(t){if(s.status!=='running')return;closeAuto(t);s.pauses.push({start:t,end:null,kind:'manual'});s.status='paused'},
    resume(t){if(s.status!=='paused')return;open().end=t;s.status='running';s.lastMoveT=t;if(s.anchor)s.anchor.seen=t},
    finish(t){if(s.status!=='running'&&s.status!=='paused')return;const o=open();if(o)o.end=t;s.status='finished';s.endT=t},
    addPoint(p){
      if(s.status!=='running'&&s.status!=='paused')return'ignored';
      if(![p.lat,p.lon,p.t].every(Number.isFinite)||Math.abs(p.lat)>90||Math.abs(p.lon)>180){s.rej.invalid++;return'invalid'}
      if(!(p.acc<=c.maxAcc)){s.rej.acc++;return'acc'}            // precisão ausente também é rejeitada
      const a=s.anchor;if(a&&p.t<=a.seen){s.rej.order++;return'order'}
      if(s.status==='paused'){s.anchor=pin(p);return'paused'}   // reposiciona sem somar distância
      if(!a){s.anchor=pin(p);push(p);s.lastMoveT=p.t;return'ok'}
      if(p.t-a.seen>c.gapMs){s.gapMs+=p.t-a.seen;closeAuto(p.t);s.anchor=pin(p);push(p,true);s.lastMoveT=p.t;return'gap'} // sem linha reta inventada
      const d=haversine(a,p);
      if(d/((p.t-a.t)/1000)>c.maxSpeed){s.rej.speed++;return'speed'}
      const sp=d/((p.t-a.seen)/1000),moving=d>=c.minStep&&(Number.isFinite(p.spd)?p.spd:sp)>=c.moveSpeed;
      if(moving){closeAuto(p.t);s.dist+=d;s.anchor=pin(p);push(p);s.lastMoveT=p.t;return'ok'}
      if(d>=c.minStep&&!autoOpen()){s.dist+=d;s.anchor=pin(p);push(p)}else a.seen=p.t; // parado: trava a posição (sem jitter)
      if(c.autoPause&&!open()&&p.t-s.lastMoveT>=c.stillMs)s.pauses.push({start:s.lastMoveT,end:null,kind:'auto'});
      return'still'},
    snapshot(now){
      const end=s.status==='finished'?s.endT:now,act=s.startT==null?0:activeAt(end),km=s.dist/1000,L=s.pts[s.pts.length-1];let paceNow=null;
      if(L&&s.status==='running'&&!autoOpen()&&now-L.t<=15000){let B=s.pts[0];for(const q of s.pts){if(q.t<=L.t-c.paceWinMs)B=q;else break}const dd=L.cum-B.cum,da=(L.act-B.act)/1000;if(dd>=10&&da>0)paceNow=da/(dd/1000)}
      return{id:s.id,status:s.status,autoPaused:autoOpen(),distM:s.dist,activeMs:act,avgPaceSecKm:s.dist>=10?act/1000/km:null,avgKmh:s.dist>=10&&act>0?km/(act/3.6e6):null,paceNowSecKm:paceNow,gapMs:s.gapMs,rejected:{...s.rej},points:s.pts.length}},
    route:()=>s.pts.map(({t,lat,lon,brk})=>({t,lat,lon,...(brk?{brk:1}:{})})),
    toJSON:()=>structuredClone(s)}}  // persistir periodicamente → recuperação: createTracker(opts, estadoSalvo)
export const restoreTracker=(state,opts)=>createTracker(opts,state);

// Lysets Sti – p5.js version (drop-in til din index.html)
// Canvas 1227 x 637 (fra din kode)

let W = 1227, H = 637;
let GRID_COLS = 10, GRID_ROWS = 4; // 10x4 = 40 felter
let margin = 32, cellGap = 6;
let cellW, cellH;

const FIELD_TYPES = [
  'N','N','D','N','S','N','H','N','D','L',
  'N','D','N','E','N','D','N','S','N','H',
  'N','D','N','L','N','D','N','S','N','H',
  'N','D','N','L','N','D','N','E','S','G'
]; // 0..39

const SINS = ['Stolthed','Grådighed','Vrede','Misundelse','Dovenskab','Utugt','Frådseri'];

const DILEMMAS = [
  d('En ven bliver mobbet','Vil du gribe ind og hjælpe, eller se væk?',
    c('Hjælp (mist 1 tur, +2 Lys)', (G,p)=>{p.skipTurns++; p.light+=2; log(`🕊️ ${p.name} hjælper (+2 Lys, mister næste tur).`);}),
    c('Se væk (ryk +3, +1 Skygge)', (G,p)=>{move(G,p,3); giveSin(G,p); log(`😶 ${p.name} ser væk (+3, +1 Skygge).`);})
  ),
  d('Du bliver såret af en ven','Tilgiver du – eller hævner du dig?',
    c('Tilgiv (fjern 1 Skygge, +1 Lys)', (G,p)=>{removeSin(p); p.light+=1; log(`🌿 ${p.name} tilgiver ( -1 Skygge, +1 Lys ).`);}),
    c('Hævn (+1 Skygge, ryk +2)', (G,p)=>{giveSin(G,p); move(G,p,2); log(`🔥 ${p.name} hævner sig (+1 Skygge, +2).`);})
  ),
  d('Klimavalget','Billig flytur nu – eller grønt valg?',
    c('Vælg toget (+2 Lys)', (G,p)=>{p.light+=2; log(`🚆 ${p.name} vælger toget (+2 Lys).`);}),
    c('Vælg fly (ryk +4, +1 Skygge)', (G,p)=>{move(G,p,4); giveSin(G,p); log(`✈️ ${p.name} vælger fly (+4, +1 Skygge).`);})
  ),
  d('Du snyder til en prøve','Tilstår du – eller skjuler du det?',
    c('Tilstå (mist 1 tur, +1 Lys)', (G,p)=>{p.skipTurns++; p.light+=1; log(`📖 ${p.name} tilstår (+1 Lys, mister næste tur).`);}),
    c('Skjul (ryk +3, +1 Skygge)', (G,p)=>{move(G,p,3); giveSin(G,p); log(`🕳️ ${p.name} skjuler (+3, +1 Skygge).`);})
  ),
  d('Uretfærdig straf','Stå op for retfærdighed?',
    c('Støt (mist 1 tur, +1 Lys)', (G,p)=>{p.skipTurns++; p.light+=1; log(`⚖️ ${p.name} støtter (+1 Lys, mister næste tur).`);}),
    c('Tie (+1 Skygge, ryk +2)', (G,p)=>{giveSin(G,p); move(G,p,2); log(`🤐 ${p.name} tier (+1 Skygge, +2).`);})
  ),
  d('Tab & sorg','Accepterer du – eller benægter?',
    c('Accepter (+1 Lys)', (G,p)=>{p.light+=1; log(`🕊️ ${p.name} accepterer (+1 Lys).`);}),
    c('Benægt (+1 Skygge, ryk +2)', (G,p)=>{giveSin(G,p); move(G,p,2); log(`🌫️ ${p.name} benægter (+1 Skygge, +2).`);})
  ),
  d('Hjælp med lektier','Hjælper du – eller ikke?',
    c('Hjælp (mist 1 tur, +2 Lys)', (G,p)=>{p.skipTurns++; p.light+=2; log(`📚 ${p.name} hjælper (+2 Lys, mister næste tur).`);}),
    c('Sig nej (ryk +2, +1 Skygge)', (G,p)=>{move(G,p,2); giveSin(G,p); log(`🙅 ${p.name} siger nej (+2, +1 Skygge).`);})
  ),
];

const ACTIONS = [
  {title:'Del dit Lys', text:'Giv 1 Lys til en anden – begge +1 Lys ekstra.',
   use:(G,p)=>{ const t=pickOther(G,p); if(!t) return; if(p.light<=0){log(`${p.name} har ikke Lys at dele.`);return;}
     p.light--; t.light++; p.light++; log(`🤲 ${p.name} deler Lys med ${t.name} (begge +1).`);} },
  {title:'Tilgiv én spiller', text:'Fjern 1 Skygge fra en anden.',
   use:(G,p)=>{ const t=pickOther(G,p); if(!t) return; if(t.sins.length===0){log(`${t.name} har ingen Skygger.`);return;}
     t.sins.pop(); log(`🌿 ${p.name} tilgiver ${t.name} ( -1 Skygge ).`);} },
  {title:'Fjern egen Skygge', text:'Fjern 1 Skygge fra dig selv.',
   use:(G,p)=>{ if(p.sins.length===0){log(`${p.name} har ingen Skygger.`);return;} p.sins.pop(); log(`🧼 ${p.name} renser 1 Skygge.`);} },
  {title:'Byt plads', text:'Byt felt med en anden spiller.',
   use:(G,p)=>{ const t=pickOther(G,p); if(!t) return; const a=p.pos; p.pos=t.pos; t.pos=a; log(`🔁 ${p.name} bytter plads med ${t.name}.`);} },
  {title:'Ofre 1 tur → +2 Lys', text:'Spring næste tur over og få 2 Lys.',
   use:(G,p)=>{ p.skipTurns++; p.light+=2; log(`🕯️ ${p.name} ofrer næste tur (+2 Lys).`);} },
  {title:'Omdan skygge', text:'Omdan 1 Skygge til 1 Lys.',
   use:(G,p)=>{ if(p.sins.length===0){log(`${p.name} har ingen Skygger.`);return;} p.sins.pop(); p.light++; log(`✨ ${p.name} omdanner 1 Skygge til 1 Lys.`);} },
  {title:'Beskyt spiller', text:'En spiller ignorerer næste straf.',
   use:(G,p)=>{ const t=pickAny(G); if(!t) return; t.shield=true; log(`🛡️ ${p.name} beskytter ${t.name}.`);} },
  {title:'Tag 1 Lys', text:'+1 Lys.',
   use:(G,p)=>{ p.light++; log(`💡 ${p.name} får +1 Lys.`);} },
];

const EVENTS = [
  {title:'Klima-katastrofe', text:'Alle mister 1 Lys. Én kan ofre 1 Lys for at redde alle.',
   run:(G)=>{ const name = prompt(`Hvem ofrer 1 Lys? (${G.players.map(p=>p.name).join(', ')})`); 
     const p = G.players.find(x=>x.name.toLowerCase()===(name||'').toLowerCase());
     if(p && p.light>0){ p.light--; log(`🌍 ${p.name} ofrer 1 Lys og redder alle.`); }
     else { G.players.forEach(pl=>{ if(pl.light>0) pl.light--; }); log(`🌪️ Ingen ofrede. Alle mister 1 Lys (hvis muligt).`); } } },
  {title:'Fællesskabets styrke', text:'Hvis alle giver 1 Lys, får alle 1 tilbage – ellers 1 Skygge til alle.',
   run:(G)=>{ const ok = G.players.every(p=>p.light>0);
     if(ok){ G.players.forEach(p=>p.light--); G.players.forEach(p=>p.light++); log(`🫂 Alle gav 1 og fik 1 igen.`); }
     else { G.players.forEach(p=>giveSin(G,p)); log(`🪤 Ikke alle kunne give – alle får 1 Skygge.`); } } },
  {title:'Fristelsens storm', text:'Alle vælger: ryk +3 & +1 Skygge, eller bliv & +1 Lys.',
   run:(G)=>{ G.players.forEach(p=>{
      const ok = confirm(`${p.name}: OK = +3 & +1 Skygge, Annuller = bliv & +1 Lys`);
      if(ok){ move(G,p,3); giveSin(G,p); } else { p.light++; }
   }); log(`🌬️ Fristelsens storm over.`);} },
];

// ---------- Game state ----------
const Game = { started:false, players:[], turn:0, lastDie:null, log:[], modal:null };

function makePlayer(name, color){
  return { name, color, pos:0, light:1, sins:[], skipTurns:0, shield:false };
}

// ---------- p5 setup/draw ----------
function setup(){
  let canvas = createCanvas(W, H);
  canvas.position(5,5);
  cellW = (W - margin*2 - cellGap*(GRID_COLS-1)) / GRID_COLS;
  cellH = (H - margin*2 - 150 - cellGap*(GRID_ROWS-1)) / GRID_ROWS; // 150px til top-UI

  // læg to standardspillere
  Game.players.push(makePlayer('Spiller 1', color(96,165,250)));
  Game.players.push(makePlayer('Spiller 2', color(244,114,182)));
}

function draw(){
  background(10, 15, 24);
  drawHeader();
  drawBoard();
  drawPlayers();
  drawSidebar();
  if(Game.modal) drawModal(Game.modal);
}

// ---------- UI tegning ----------
function drawHeader(){
  fill(255); textSize(18); textAlign(LEFT, CENTER);
  text('Lysets Sti — p5 prototype', margin, 24);

  // Instruktioner
  fill(180); textSize(12);
  text('R = rul terning · Enter = afslut tur · N = tilføj spiller (før start) · Klik på kortvalg for at vælge', margin, 48);

  // Knapper (simple)
  const y = 70;
  drawButton(margin, y, 110, 30, 'Start / Reset', ()=>resetGame());
  drawButton(margin+120, y, 110, 30, 'Rul terning (R)', ()=>rollDie());
  drawButton(margin+240, y, 110, 30, 'Afslut tur (Enter)', ()=>endTurn());

  // Tur-info
  fill(200);
  const p = current();
  textAlign(LEFT, CENTER);
  text(Game.started ? `Tur: ${p.name}${p.skipTurns>0?' (springer næste tur)':''}` : 'Ikke startet', margin+370, y+15);

  // Sidste rul
  textAlign(RIGHT, CENTER);
  text(Game.lastDie ? `Sidste rul: ${Game.lastDie}` : '', width - margin, y+15);
}

function drawBoard(){
  // 10x4 grid, slange-layout (række 0 fra venstre->højre, række 1 højre->venstre, osv.)
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      const idx = gridToIndex(c, r);
      const x = margin + (slitherX(c,r)) * (cellW + cellGap);
      const y = margin + 110 + r * (cellH + cellGap);
      // felt baggrund
      const t = FIELD_TYPES[idx];
      const col = fieldColor(t);
      fill(col.r, col.g, col.b);
      stroke(40); strokeWeight(1);
      rect(x, y, cellW, cellH, 10);
      // index + tag
      noStroke(); fill(200); textSize(11); textAlign(LEFT, TOP);
      text(`#${idx}`, x+6, y+4);
      // tag
      fill(170);
      text(tagLabel(t), x+6, y+20);

      // goal outline
      if(t==='G'){ noFill(); stroke(245, 158, 11); strokeWeight(2); rect(x, y, cellW, cellH, 10); }
    }
  }
}

function drawPlayers(){
  for(let i=0;i<Game.players.length;i++){
    const p = Game.players[i];
    const pos = p.pos;
    const cr = indexToGrid(pos);
    const x = margin + slitherX(cr.c,cr.r) * (cellW + cellGap);
    const y = margin + 110 + cr.r * (cellH + cellGap);
    const pad = 8, size = 16;
    const px = x + pad + (i%3)* (size+6);
    const py = y + cellH - pad - size - floor(i/3)*(size+6);
    noStroke(); fill(p.color); circle(px, py, size);
  }
}

function drawSidebar(){
  // højre log/status
  const x = width - 320, y = 110;
  noStroke(); fill(17,24,39,200); rect(x-10, y-10, 300, height - y - 20, 12);
  fill(199,210,254); textSize(14); textAlign(LEFT, TOP); text('Status & log', x, y);
  fill(160); textSize(12);
  const sumLight = Game.players.reduce((a,b)=>a+b.light,0);
  text(`Samlet Lys: ${sumLight}`, x, y+20);

  let yy = y+44;
  // spillerstatus
  Game.players.forEach(p=>{
    fill(230); text(`${p.name} — Felt ${p.pos} · Lys: ${p.light} · Skygger: ${p.sins.length}${p.shield?' · 🛡️':''}${p.skipTurns>0?' · (springer næste tur)':''}`, x, yy);
    yy += 16;
    if(p.sins.length>0){
      fill(255,180,180);
      text('Synd: '+p.sins.join(', '), x, yy); yy+=16;
    } else { yy+=4; }
    yy += 6;
  });

  yy += 6;
  // log
  fill(199,210,254); text('Log:', x, yy); yy+=16;
  fill(205); textSize(12);
  let shown = 0;
  for(let i=Game.log.length-1;i>=0 && shown<18;i--){
    text('• '+Game.log[i], x, yy); yy+=14; shown++;
  }
}

// ---------- Modal (kort) ----------
function drawModal(mod){
  push();
  // dim
  noStroke(); fill(0, 0, 0, 150); rect(0,0,width,height);
  // kort
  const mw = 640, mh = 300, mx = (width-mw)/2, my = (height-mh)/2;
  fill(12,18,32); stroke(39,49,72); rect(mx, my, mw, mh, 12);
  fill(200); textAlign(LEFT, TOP); textSize(16);
  text(`${mod.kind}: ${mod.title}`, mx+16, my+12);
  fill(180); textSize(13); text(mod.text, mx+16, my+40, mw-32, 200);

  // choices
  const btnH = 36, btnW = mw-32; let by = my + mh - 16 - mod.choices.length*(btnH+8);
  mod.choices.forEach((choice, idx)=>{
    const bx = mx+16;
    const hover = mouseX>bx && mouseX<bx+btnW && mouseY>by && mouseY<by+btnH;
    fill(hover? color(30,45,70) : color(18,26,42)); stroke(50,65,90);
    rect(bx, by, btnW, btnH, 8);
    fill(220); noStroke(); textAlign(LEFT, CENTER); textSize(13);
    text(choice.label, bx+12, by+btnH/2);
    choice._bbox = {x:bx,y:by,w:btnW,h:btnH};
    by += btnH+8;
  });
  pop();
}

// ---------- Helpers ----------
function gridToIndex(c,r){
  // slange-layout: lige rækker venstre->højre, ulige rækker højre->venstre
  if(r%2===0) return r*GRID_COLS + c;
  else return r*GRID_COLS + (GRID_COLS-1 - c);
}
function indexToGrid(idx){
  const r = floor(idx / GRID_COLS);
  const offset = idx - r*GRID_COLS;
  const c = (r%2===0) ? offset : GRID_COLS-1 - offset;
  return {c,r};
}
function slitherX(c,r){ return (r%2===0) ? c : (GRID_COLS-1 - c); }

function fieldColor(t){
  switch(t){
    case 'G': return {r:45,g:35,b:10};
    case 'D': return {r:20,g:22,b:44};
    case 'H': return {r:18,g:38,b:30};
    case 'E': return {r:38,g:32,b:18};
    case 'L': return {r:32,g:28,b:10};
    case 'S': return {r:40,g:18,b:22};
    default:  return {r:16,g:18,b:28};
  }
}
function tagLabel(t){
  return ({N:'Neutral',D:'Dilemma',H:'Handling',S:'Skygge',L:'Lys',E:'Hændelse',G:'Lysets Kirke'})[t] || '';
}

function log(msg){ Game.log.push(msg); if(Game.log.length>200) Game.log.shift(); }
function current(){ return Game.players[Game.turn]; }

function nextTurn(){
  Game.turn = (Game.turn+1) % Game.players.length;
  const p = current();
  if(p.skipTurns>0){ p.skipTurns--; log(`⏭️ ${p.name} springer sin tur over.`); nextTurn(); return; }
}

function move(G,p,steps){
  p.pos = Math.min(p.pos + steps, FIELD_TYPES.length-1);
  if(p.pos===FIELD_TYPES.length-1) checkWin(p);
}

function giveSin(G,p){
  if(p.shield){ p.shield=false; log(`🛡️ ${p.name} ignorerer en straf.`); return; }
  const sin = random(SINS);
  p.sins.push(sin);
  if(sin==='Dovenskab'){ p.skipTurns++; }
}

function removeSin(p){ if(p.sins.length>0) p.sins.pop(); }

function applyField(p){
  const t = FIELD_TYPES[p.pos];
  if(t==='N' || t==='G') return;
  if(t==='S'){ giveSin(Game,p); log(`🌑 ${p.name} rammer Skyggefelt.`); return; }
  if(t==='L'){ p.light++; log(`🔆 ${p.name} får 1 Lys.`); return; }
  if(t==='H'){ const card = random(ACTIONS); openAction(card); return; }
  if(t==='D'){ const card = random(DILEMMAS); openDilemma(card); return; }
  if(t==='E'){ const card = random(EVENTS); openEvent(card); return; }
}

function checkWin(p){
  const ok = (p.light>=3 && p.sins.length<=2);
  if(ok){
    log(`🏁 ${p.name} træder ind i Lysets Kirke og vinder!`);
    noLoop();
  } else {
    log(`⛔ ${p.name} nåede kirken men opfylder ikke kravene (Lys: ${p.light}, Skygger: ${p.sins.length}).`);
  }
}

// ---------- Kort fabrik ----------
function d(title, text, ...choices){ return {kind:'Dilemma', title, text, choices}; }
function c(label, effect){ return {label, effect}; }

// ---------- Modal åbning ----------
function openDilemma(card){
  Game.modal = {
    kind:'Dilemma',
    title:card.title, text:card.text,
    choices: card.choices.map(ch=>({label:ch.label, effect:()=>{ ch.effect(Game,current()); Game.modal=null; }}))
  };
}
function openAction(card){
  Game.modal = {
    kind:'Handling',
    title:card.title, text:card.text,
    choices: [{label:'Brug', effect:()=>{ card.use(Game,current()); Game.modal=null; }}]
  };
}
function openEvent(card){
  Game.modal = {
    kind:'Hændelse',
    title:card.title, text:card.text,
    choices: [{label:'Udfør', effect:()=>{ card.run(Game); Game.modal=null; }}]
  };
}

// ---------- Input ----------
function mousePressed(){
  if(!Game.modal) return;
  // klik på modal-knapper
  for(const ch of Game.modal.choices){
    const b = ch._bbox;
    if(!b) continue;
    if(mouseX>b.x && mouseX<b.x+b.w && mouseY>b.y && mouseY<b.y+b.h){
      ch.effect();
      return;
    }
  }
}

function keyPressed(){
  if(key==='r' || key==='R') rollDie();
  if(keyCode===ENTER) endTurn();
  if(key==='n' || key==='N') addPlayer();
}

function rollDie(){
  if(Game.modal) return;
  Game.started = true;
  const p = current();
  if(p.skipTurns>0){ log(`⏭️ ${p.name} springer sin tur.`); p.skipTurns--; nextTurn(); return; }
  const die = 1 + Math.floor(Math.random()*6);
  Game.lastDie = die;
  log(`🎲 ${p.name} slår ${die}.`);
  move(Game,p,die);
  applyField(p);
}

function endTurn(){
  if(Game.modal) return; // afvent kortvalg
  nextTurn();
}

function addPlayer(){
  if(Game.started){ log('Kan ikke tilføje spillere efter start.'); return; }
  if(Game.players.length>=4){ log('Max 4 spillere.'); return; }
  const name = prompt('Spillernavn?');
  if(!name) return;
  const colors = [color(96,165,250), color(244,114,182), color(52,211,153), color(245,158,11)];
  Game.players.push(makePlayer(name, colors[Game.players.length]));
  log(`➕ Tilføjet spiller: ${name}`);
}

function resetGame(){
  // reset alt
  Game.started=false; Game.turn=0; Game.lastDie=null; Game.log=[];
  const names = Game.players.map(p=>p.name);
  Game.players = names.slice(0, Math.max(2, Math.min(4, names.length))).map((n,i)=>{
    const colors = [color(96,165,250), color(244,114,182), color(52,211,153), color(245,158,11)];
    return makePlayer(n || `Spiller ${i+1}`, colors[i]);
  });
  if(Game.players.length<2){
    Game.players = [makePlayer('Spiller 1', color(96,165,250)), makePlayer('Spiller 2', color(244,114,182))];
  }
  loop();
}

// ---------- Button helper ----------
function drawButton(x,y,w,h,label, onClick){
  const hover = mouseX>x && mouseX<x+w && mouseY>y && mouseY<y+h;
  fill(hover ? color(39,55,82) : color(31,41,55)); stroke(43,54,74);
  rect(x,y,w,h,8);
  noStroke(); fill(230); textAlign(CENTER, CENTER); textSize(12); text(label, x+w/2, y+h/2);
  // klik
  if(mouseIsPressed && hover && !Game._btnLatch){
    onClick();
    Game._btnLatch = true;
  }
  if(!mouseIsPressed) Game._btnLatch = false;
}

function pickOther(G,p){
  const others = G.players.filter(pl=>pl!==p);
  if(others.length===0) return null;
  const name = prompt(`Vælg spiller: ${others.map(o=>o.name).join(', ')}`);
  return others.find(o=>o.name.toLowerCase()===(name||'').toLowerCase()) || null;
}
function pickAny(G){
  const name = prompt(`Vælg spiller: ${G.players.map(o=>o.name).join(', ')}`);
  return G.players.find(o=>o.name.toLowerCase()===(name||'').toLowerCase()) || null;
}

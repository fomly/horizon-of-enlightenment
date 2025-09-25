// Lysets Sti – p5.js version med sidebar + automatisk turskift (manuelt rul)
// Nu med navne-label over hver brik + navnevalg for alle spillere ved Start/Reset.

let W = 1227, H = 637;

// Board layout
let GRID_COLS = 10, GRID_ROWS = 4; // 10x4 = 40 felter
let margin = 32, cellGap = 6;
let cellW, cellH;

// Fast sidebar
const SIDEBAR_W = 320;

// Auto-tur (kun skift tur; IKKE auto-rul)
const AUTO_TURN = true;
const TURN_DELAY = 600;   // ms pause før turen gives videre

// Farvepalette (RGB), bruges til spillerfarver
const PALETTE = [
  [96,165,250],  // blå
  [244,114,182], // pink
  [52,211,153],  // grøn
  [245,158,11]   // orange
];

const FIELD_TYPES = [
  'N','N','D','N','S','N','H','N','D','L',
  'N','D','N','E','N','D','N','S','N','H',
  'N','D','N','L','N','D','N','S','N','H',
  'N','D','N','L','N','D','N','E','S','G'
]; // 0..39

const SINS = ['Stolthed','Grådighed','Vrede','Misundelse','Dovenskab','Utugt','Frådseri'];

// --- Kort (forkortet sæt; udvid gerne arrays'ene) ---
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
const Game = { started:false, players:[], turn:0, lastDie:null, log:[], modal:null, ended:false };

function makePlayer(name, col){
  return { name, color: col, pos:0, light:1, sins:[], skipTurns:0, shield:false };
}

// Hjælp: farve fra palette-index
function colorFromPalette(i){
  const [r,g,b] = PALETTE[i % PALETTE.length];
  return color(r,g,b);
}

// ---------- p5 setup/draw ----------
function setup(){
  const canvas = createCanvas(W, H);
  canvas.position(5,5);

  // cellW tager højde for sidebar-bredden
  cellW = (W - SIDEBAR_W - margin*2 - cellGap*(GRID_COLS-1)) / GRID_COLS;
  cellH = (H - margin*2 - 150 - cellGap*(GRID_ROWS-1)) / GRID_ROWS; // 150px til top-UI

  initPlayers(); // <-- vælg antal og navne ved start
}

function draw(){
  background(10, 15, 24);
  drawHeader();
  drawBoard();
  drawPlayers();
  drawSidebar();
  if(Game.modal) drawModal(Game.modal);
}

// ---------- Init spillere (navne & antal) ----------
function initPlayers(){
  Game.players = [];
  Game.started = false; Game.turn = 0; Game.lastDie = null; Game.log = []; Game.modal = null; Game.ended = false;

  let n = parseInt(prompt('Hvor mange spillere? (2-4)', '2'));
  if(isNaN(n)) n = 2;
  n = constrain(n, 2, 4);

  for(let i=0; i<n; i++){
    let name = prompt(`Navn for spiller ${i+1}?`, `Spiller ${i+1}`);
    if(!name || !name.trim()) name = `Spiller ${i+1}`;
    Game.players.push(makePlayer(name.trim(), colorFromPalette(i)));
  }
  log(`👥 Spillere: ${Game.players.map(p=>p.name).join(', ')}`);
}

// ---------- UI tegning ----------
function drawHeader(){
  fill(255); textSize(18); textAlign(LEFT, CENTER);
  text('Lysets Sti — p5 prototype (auto-tur, manuelt rul)', margin, 24);

  fill(180); textSize(12);
  text('Start/Reset = vælg antal & navne · R = rul terning · N = tilføj spiller (før start) · Klik på kortvalg', margin, 48);

  const y = 70;
  drawButton(margin, y, 140, 30, 'Start / Reset', ()=>resetGame());
  drawButton(margin+150, y, 140, 30, 'Rul terning (R)', ()=>rollDie());

  fill(200);
  const p = current();
  textAlign(LEFT, CENTER);
  text(Game.started ? `Tur: ${p.name}${p.skipTurns>0?' (springer næste tur)':''}` : 'Ikke startet', margin+310, y+15);

  textAlign(RIGHT, CENTER);
  text(Game.lastDie ? `Sidste rul: ${Game.lastDie}` : '', width - SIDEBAR_W - margin, y+15);
}

function drawBoard(){
  for(let r=0; r<GRID_ROWS; r++){
    for(let c=0; c<GRID_COLS; c++){
      const idx = gridToIndex(c, r);
      const x = margin + (slitherX(c,r)) * (cellW + cellGap);
      const y = margin + 110 + r * (cellH + cellGap);
      const t = FIELD_TYPES[idx];
      const col = fieldColor(t);
      fill(col.r, col.g, col.b);
      stroke(40); strokeWeight(1);
      rect(x, y, cellW, cellH, 10);
      noStroke(); fill(200); textSize(11); textAlign(LEFT, TOP);
      text(`#${idx}`, x+6, y+4);
      fill(170); text(tagLabel(t), x+6, y+20);
      if(t==='G'){ noFill(); stroke(245, 158, 11); strokeWeight(2); rect(x, y, cellW, cellH, 10); }
    }
  }
}

// ---------- BRIKKE + NAVNESKILT ----------
function drawPlayers(){
  const pad = 8, size = 16;   // brikstørrelse
  textSize(11);
  for(let i=0;i<Game.players.length;i++){
    const p = Game.players[i];
    const pos = p.pos;
    const cr = indexToGrid(pos);
    const x = margin + slitherX(cr.c,cr.r) * (cellW + cellGap);
    const y = margin + 110 + cr.r * (cellH + cellGap);

    // Plads i feltet (så flere spillere i samme felt ikke ligger oveni hinanden)
    const px = x + pad + (i%3) * (size+6);
    const py = y + cellH - pad - size - floor(i/3) * (size+6);

    // Brik
    noStroke(); fill(p.color); circle(px, py, size);

    // Navneskilt lige over brikken
    drawNameTag(px, py - size/2, p.name);
  }
}

// Navne-label helper
function drawNameTag(cx, topY, label){
  push();
  textSize(11);
  textAlign(CENTER, BOTTOM);
  const pad = 4, th = 14;
  const tw = textWidth(label) + pad*2;
  noStroke();
  fill(0, 0, 0, 160);               // semitransparent sort baggrund
  rect(cx - tw/2, topY - th - 2, tw, th, 6);
  fill(255);
  text(label, cx, topY - 4);
  pop();
}

function drawSidebar(){
  const x = width - SIDEBAR_W + 10, y = 110;
  noStroke(); fill(17,24,39,200);
  rect(x-10, y-10, SIDEBAR_W - 20, height - y - 20, 12);

  fill(199,210,254); textSize(14); textAlign(LEFT, TOP); text('Status & log', x, y);
  fill(160); textSize(12);
  const sumLight = Game.players.reduce((a,b)=>a+b.light,0);
  text(`Samlet Lys: ${sumLight}`, x, y+20);

  let yy = y+44;
  Game.players.forEach(p=>{
    fill(230); text(`${p.name} — Felt ${p.pos} · Lys: ${p.light} · Skygger: ${p.sins.length}${p.shield?' · 🛡️':''}${p.skipTurns>0?' · (springer næste tur)':''}`, x, yy);
    yy += 16;
    if(p.sins.length>0){ fill(255,180,180); text('Synd: '+p.sins.join(', '), x, yy); yy+=16; }
    else { yy+=4; }
    yy += 6;
  });

  yy += 6;
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
  noStroke(); fill(0, 0, 0, 150); rect(0,0,width,height);
  const mw = 640, mh = 300, mx = (width-mw)/2, my = (height-mh)/2;
  fill(12,18,32); stroke(39,49,72); rect(mx, my, mw, mh, 12);
  fill(200); textAlign(LEFT, TOP); textSize(16);
  text(`${mod.kind}: ${mod.title}`, mx+16, my+12);
  fill(180); textSize(13); text(mod.text, mx+16, my+40, mw-32, 200);

  const btnH = 36, btnW = mw-32; let by = my + mh - 16 - mod.choices.length*(btnH+8);
  mod.choices.forEach(choice=>{
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
  if(r%2===0) return r*GRID_COLS + c; else return r*GRID_COLS + (GRID_COLS-1 - c);
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
function tagLabel(t){ return ({N:'Neutral',D:'Dilemma',H:'Handling',S:'Skygge',L:'Lys',E:'Hændelse',G:'Lysets Kirke'})[t] || ''; }

function log(msg){ Game.log.push(msg); if(Game.log.length>200) Game.log.shift(); }
function current(){ return Game.players[Game.turn]; }

// --- Auto scheduling helpers (kun tur-skift) ---
function schedule(fn, ms = TURN_DELAY){ setTimeout(fn, ms); }
function scheduleNextTurn(){
  if(!AUTO_TURN) return;
  if(Game.modal || Game.ended) return;
  schedule(()=>{ if(!Game.modal && !Game.ended) nextTurn(); });
}

function nextTurn(){
  Game.turn = (Game.turn+1) % Game.players.length;
  const p = current();

  if(p.skipTurns > 0){
    p.skipTurns--;
    log(`⏭️ ${p.name} springer sin tur over.`);
    nextTurn(); // gå straks videre til næste
    return;
  }

  log(`➡️ Det er nu ${p.name}s tur. Tryk R for at rulle.`);
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
    Game.ended = true;
    noLoop();
  } else {
    log(`⛔ ${p.name} nåede kirken men opfylder ikke kravene (Lys: ${p.light}, Skygger: ${p.sins.length}).`);
  }
}

// ---------- Kort fabrik ----------
function d(title, text, ...choices){ return {kind:'Dilemma', title, text, choices}; }
function c(label, effect){ return {label, effect}; }

// ---------- Modal åbning (auto-tur når lukket) ----------
function openDilemma(card){
  Game.modal = {
    kind:'Dilemma',
    title:card.title, text:card.text,
    choices: card.choices.map(ch=>({
      label:ch.label,
      effect:()=>{ ch.effect(Game,current()); Game.modal=null; scheduleNextTurn(); }
    }))
  };
}
function openAction(card){
  Game.modal = {
    kind:'Handling',
    title:card.title, text:card.text,
    choices: [{
      label:'Brug',
      effect:()=>{ card.use(Game,current()); Game.modal=null; scheduleNextTurn(); }
    }]
  };
}
function openEvent(card){
  Game.modal = {
    kind:'Hændelse',
    title:card.title, text:card.text,
    choices: [{
      label:'Udfør',
      effect:()=>{ card.run(Game); Game.modal=null; scheduleNextTurn(); }
    }]
  };
}

// ---------- Input ----------
function mousePressed(){
  if(!Game.modal) return;
  for(const ch of Game.modal.choices){
    const b = ch._bbox;
    if(!b) continue;
    if(mouseX>b.x && mouseX<b.x+b.w && mouseY>b.y && mouseY<b.y+b.h){
      ch.effect(); return;
    }
  }
}

function keyPressed(){
  if(key==='r' || key==='R') rollDie();
  if(key==='n' || key==='N') addPlayer();
}

function rollDie(){
  if(Game.modal || Game.ended) return;
  Game.started = true;
  const p = current();

  if(p.skipTurns>0){
    log(`⏭️ ${p.name} springer sin tur.`);
    p.skipTurns--;
    nextTurn();
    return;
  }

  const die = 1 + Math.floor(Math.random()*6);
  Game.lastDie = die;
  log(`🎲 ${p.name} slår ${die}.`);
  move(Game,p,die);
  applyField(p);

  if(!Game.modal && !Game.ended){
    setTimeout(()=>scheduleNextTurn(), 50);
  }
}

function addPlayer(){
  if(Game.started){ log('Kan ikke tilføje spillere efter start.'); return; }
  if(Game.players.length>=4){ log('Max 4 spillere.'); return; }
  const name = prompt('Navn på ny spiller?');
  if(!name || !name.trim()){ log('Ingen spiller tilføjet.'); return; }
  const idx = Game.players.length;
  Game.players.push(makePlayer(name.trim(), colorFromPalette(idx)));
  log(`➕ Tilføjet spiller: ${name.trim()}`);
}

function resetGame(){
  initPlayers(); // spørg igen om antal + navne
  loop();
}

// ---------- Button helper ----------
function drawButton(x,y,w,h,label, onClick){
  const hover = mouseX>x && mouseX<x+w && mouseY>y && mouseY<h+y;
  fill(hover ? color(39,55,82) : color(31,41,55)); stroke(43,54,74);
  rect(x,y,w,h,8);
  noStroke(); fill(230); textAlign(CENTER, CENTER); textSize(12); text(label, x+w/2, y+h/2);
  if(mouseIsPressed && hover && !Game._btnLatch){ onClick(); Game._btnLatch = true; }
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

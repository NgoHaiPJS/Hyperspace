// starfield + warp effect
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let w=0,h=0,stars=[];
const STAR_COUNT = 300;
let warp=false,warpTimer=0;

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1,2);
  w = canvas.width = Math.floor(window.innerWidth * dpr);
  h = canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth+'px';
  canvas.style.height = window.innerHeight+'px';
  ctx.scale(dpr,dpr);
}

class Star{
  constructor(){
    this.reset(true);
  }
  reset(init){
    this.x = Math.random()*w - w/2;
    this.y = Math.random()*h - h/2;
    this.z = Math.random()*w; // distance
    this.size = Math.random()*1.2 + 0.2;
    this.baseSpeed = 0.0008 + Math.random()*0.0022;
    if(!init && Math.random()<0.5){
      // recycle
      this.x = (Math.random()*w - w/2) * 0.2;
      this.y = (Math.random()*h - h/2) * 0.2;
      this.z = w*0.9;
    }
  }
  update(dt){
    const speed = this.baseSpeed * (warp ? 6.5 : 1);
    this.z -= dt * speed * w;
    if(this.z <= 0){ this.reset(false); }
  }
  draw(){
    const sx = (this.x / this.z) * w + w/2;
    const sy = (this.y / this.z) * h + h/2;
    const r = (1 - this.z / w) * (this.size*2.8);
    if(sx< -50 || sx> w+50 || sy< -50 || sy> h+50) return;
    const alpha = Math.min(1, (1 - this.z / w) + 0.1);
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 247, 255, ${alpha})`;
    ctx.arc(sx, sy, Math.max(0.2,r), 0, Math.PI*2);
    ctx.fill();
  }
}

function initStars(){
  stars = [];
  for(let i=0;i<STAR_COUNT;i++) stars.push(new Star());
}

let last=performance.now();
function loop(t){
  const dt = Math.min(40, t-last);
  last = t;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // subtle purple vignette
  const grad = ctx.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,'rgba(10,4,20,0.45)');
  grad.addColorStop(1,'rgba(15,6,30,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  stars.forEach(s=>{ s.update(dt); s.draw(); });

  if(warp){
    warpTimer -= dt;
    if(warpTimer <= 0) disableWarp();
    // radial streaks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0;i<40;i++){
      const x = (Math.random()-0.5)*w;
      const y = (Math.random()-0.5)*h;
      const len = Math.random()*120 + 50;
      const a = Math.random()*0.06;
      ctx.strokeStyle = `rgba(160,120,255,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w/2 + x/8, h/2 + y/8);
      ctx.lineTo(w/2 + x/8 + (x>0?len:-len), h/2 + y/8 + (y>0?len:-len));
      ctx.stroke();
    }
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

function enableWarp(){
  if(warp) return;
  warp=true; warpTimer=1400; // ms
  document.getElementById('status').textContent = 'Warp engaged — Hold on.';
  flash(true);
  playHum();
}
function disableWarp(){
  warp=false; document.getElementById('status').textContent = 'Drift mode.'; flash(false);
}

// small flash overlay
let flashEl;
function ensureFlash(){ if(!flashEl){ flashEl = document.createElement('div'); flashEl.className='flash'; document.body.appendChild(flashEl);} }
function flash(on){ ensureFlash(); if(on) flashEl.classList.add('active'); else flashEl.classList.remove('active'); }

// small audio hum using WebAudio
let audioCtx,humOsc,gain;
function playHum(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    humOsc = audioCtx.createOscillator();
    gain = audioCtx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.value = 90;
    gain.gain.value = 0.0001;
    humOsc.connect(gain);
    gain.connect(audioCtx.destination);
    humOsc.start();
    // ramp
    gain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.15);
    // release
    setTimeout(()=>{ gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6); setTimeout(()=>{ humOsc.stop(); }, 700); }, 700);
  }catch(e){console.warn('audio blocked',e)}
}

// attach events
window.addEventListener('resize', () => { resize(); initStars(); });
document.getElementById('warpBtn').addEventListener('click', ()=>{
  enableWarp();
});

// initial
resize(); initStars(); requestAnimationFrame(loop);

// friendly initial status
document.getElementById('status').textContent = 'Drift mode.';

// ---- Solar system / planets ----
const solarEl = document.getElementById('solar');
let planets = [];
const planetsData = [
  {name:'Mercury', size:8, color:'#bdbdbd', orbitFactor:0.08, speed:0.02},
  {name:'Venus', size:12, color:'#e6c28a', orbitFactor:0.14, speed:0.014},
  {name:'Earth', size:14, color:'#4aa3ff', orbitFactor:0.20, speed:0.01},
  {name:'Mars', size:10, color:'#ff6b4d', orbitFactor:0.27, speed:0.008},
  {name:'Jupiter', size:28, color:'#d1a26b', orbitFactor:0.40, speed:0.004},
  {name:'Saturn', size:24, color:'#e0caa2', orbitFactor:0.52, speed:0.0035}
];

function createPlanets(){
  // avoid duplicates on repeated calls
  solarEl.innerHTML = '';
  planets = [];
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  planetsData.forEach((p,i)=>{
    const orbit = Math.floor(minDim * p.orbitFactor) + i*8;
    const orbitWrap = document.createElement('div');
    orbitWrap.className = 'orbit';
    orbitWrap.style.setProperty('--orbit', orbit + 'px');
    orbitWrap.style.setProperty('--size', p.size + 'px');
    orbitWrap.style.setProperty('--glow', p.color);

    const ring = document.createElement('div');
    ring.className = 'ring';
    orbitWrap.appendChild(ring);

    const planet = document.createElement('div');
    planet.className = 'planet';
    planet.style.width = p.size + 'px';
    planet.style.height = p.size + 'px';
    planet.style.background = p.color;
    planet.style.setProperty('--orbit', orbit + 'px');
    planet.title = p.name;
    // click to show name
    planet.addEventListener('click', (e)=>{ e.stopPropagation(); document.getElementById('status').textContent = p.name; });
    orbitWrap.appendChild(planet);

    solarEl.appendChild(orbitWrap);

    planets.push({el: orbitWrap, speed: p.speed, angle: Math.random()*360, meta: p});
  });
}

// integrate orbital updates into main loop
const originalLoop = loop;
function loop(t){
  const dt = Math.min(40, t-last);
  // update planet angles
  planets.forEach(pl=>{
    pl.angle += pl.speed * (warp?6.5:1) * (dt/16); // scale with dt
    pl.angle %= 360;
    pl.el.style.transform = `translate(-50%,-50%) rotate(${pl.angle}deg)`;
  });
  // continue original canvas loop behavior
  originalLoop(t);
}

// recreate planets when resizing
window.addEventListener('resize', ()=>{ createPlanets(); });
createPlanets();

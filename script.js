// starfield + warp effect
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let w=0,h=0,stars=[];
const STAR_COUNT = 220;
let warp=false,warpTimer=0;

function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1,2);
  w = canvas.width = Math.floor(window.innerWidth * dpr);
  h = canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth+'px';
  canvas.style.height = window.innerHeight+'px';
  // reset transform before applying DPR to avoid cumulative scaling
  if (ctx.setTransform) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else {
    ctx.scale(dpr, dpr);
  }
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
    this.baseSpeed = 0.00006 + Math.random()*0.00018;
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

// ---- Solar system / planets ----
const solarEl = document.getElementById('solar');
let planets = [];
// periods are approximate orbital period (days)
const planetsData = [
  {name:'Sun', size:64, color:'#ffd77a', orbitFactor:0, periodDays:0},
  {name:'Mercury', size:8, color:'#bdbdbd', orbitFactor:0.06, periodDays:88},
  {name:'Venus', size:12, color:'#e6c28a', orbitFactor:0.09, periodDays:225},
  {name:'Earth', size:14, color:'#4aa3ff', orbitFactor:0.13, periodDays:365},
  {name:'Mars', size:11, color:'#ff6b4d', orbitFactor:0.17, periodDays:687},
  {name:'Jupiter', size:28, color:'#d1a26b', orbitFactor:0.27, periodDays:4333},
  {name:'Saturn', size:24, color:'#e0caa2', orbitFactor:0.36, periodDays:10759},
  {name:'Uranus', size:18, color:'#a0e3ff', orbitFactor:0.45, periodDays:30687},
  {name:'Neptune', size:18, color:'#7aaaff', orbitFactor:0.52, periodDays:60190}
];

function createPlanets(){
  solarEl.innerHTML = '';
  planets = [];
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  // visual earth orbit time (ms) — Earth completes one orbit in this many ms for the animation
  const earthOrbitMs = 40000; // ~40s for Earth orbit (adjustable)
  const earthSpeed = 360 / earthOrbitMs; // deg per ms for Earth

  planetsData.forEach((p,i)=>{
    if(p.name === 'Sun'){
      const sun = document.createElement('div');
      sun.className = 'sun';
      sun.style.width = p.size + 'px';
      sun.style.height = p.size + 'px';
      sun.style.background = `radial-gradient(circle at 30% 30%, #fff7d6, ${p.color})`;
      solarEl.appendChild(sun);
      // sun has no orbit
      // add a small label for Sun
      const sunLabel = document.createElement('div');
      sunLabel.className = 'planet-label';
      sunLabel.style.setProperty('--orbit', '0px');
      sunLabel.style.setProperty('--size', p.size + 'px');
      sunLabel.innerHTML = `<small>${p.name}</small>`;
      solarEl.appendChild(sunLabel);
      planets.push({el: sun, speed:0, angle:0, meta:p, isSun:true});
      return;
    }

    const orbit = Math.floor(minDim * p.orbitFactor) + i * 6 + 60;
    const orbitWrap = document.createElement('div');
    orbitWrap.className = 'orbit';
    orbitWrap.style.setProperty('--orbit', orbit + 'px');
    orbitWrap.style.setProperty('--glow', p.color);
    orbitWrap.style.setProperty('--size', p.size + 'px');

    const ring = document.createElement('div');
    ring.className = 'ring';
    orbitWrap.appendChild(ring);

    const planet = document.createElement('div');
    planet.className = 'planet visible';
    planet.style.width = p.size + 'px';
    planet.style.height = p.size + 'px';
    planet.style.background = p.color;
    planet.style.setProperty('--orbit', orbit + 'px');
    planet.title = p.name;
    planet.addEventListener('click', (e)=>{ e.stopPropagation(); document.getElementById('status').textContent = p.name; });
    orbitWrap.appendChild(planet);

    // label
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.style.setProperty('--orbit', orbit + 'px');
    label.style.setProperty('--size', p.size + 'px');
    label.innerHTML = `<small>${p.name}</small>`;
    orbitWrap.appendChild(label);

    solarEl.appendChild(orbitWrap);

    // compute visual speed relative to Earth's visual orbit time
    const speed = (365 / p.periodDays) * earthSpeed; // deg per ms
    planets.push({el: orbitWrap, planetEl: planet, speed: speed, angle: Math.random()*360, meta: p, isSun:false});
  });
}

let last=performance.now();
function loop(t){
  const dt = Math.min(40, t - last);
  last = t;

  // update planet orbit wrappers (rotate the wrapper to move the planet in a circle)
  planets.forEach(pl=>{
    if(pl.isSun) return; // sun doesn't orbit
    // pl.speed is in degrees per ms
    const speed = pl.speed * (warp ? 6.5 : 1);
    pl.angle = (pl.angle + speed * dt) % 360;
    pl.el.style.transform = `translate(-50%,-50%) rotate(${pl.angle}deg)`;
  });

  // draw starfield background
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const grad = ctx.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,'rgba(10,4,20,0.45)');
  grad.addColorStop(1,'rgba(15,6,30,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);
  stars.forEach(s=>{ s.update(dt); s.draw(); });

  // warp visual streaks (unchanged)
  if(warp){
    warpTimer -= dt;
    if(warpTimer <= 0) disableWarp();
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
window.addEventListener('resize', () => { resize(); initStars(); createPlanets(); });
document.getElementById('warpBtn').addEventListener('click', ()=>{
  enableWarp();
});

// initial
resize(); initStars(); createPlanets(); requestAnimationFrame(loop);

// friendly initial status
document.getElementById('status').textContent = 'Drift mode.';


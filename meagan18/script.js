/*======================================
MEAGAN'S MIDSUMMER NIGHT DREAM - V24.8
(High-Performance Optimized Edition)
======================================*/
document.head.appendChild(Object.assign(document.createElement("style"), {
    textContent: `@keyframes cinematicPush { 0% { opacity:0; transform:translateY(18px) scale(0.97); filter:blur(4px); } 100% { opacity:1; transform:translateY(0) scale(1); filter:blur(0px); } } canvas { will-change:transform; transform-style:preserve-3d; transform-origin:center; position:absolute; inset:0; pointer-events:none; }`
}));

// Performance Core Tools
const PI2 = Math.PI * 2;
const rand = (min, max) => Math.random() * (max - min) + min;
const qs = id => document.getElementById(id);

const cvs = { bg: qs("bg-canvas"), star: qs("stars"), ripple: qs("ripples"), firefly: qs("fireflies"), trail: qs("cursor-trail"), mask: document.createElement("canvas") };
const ctxs = Object.fromEntries(Object.entries(cvs).map(([k, v]) => [k, v.getContext("2d")]));

let oldW = window.innerWidth, oldH = window.innerHeight, baseScale = Math.max(window.innerWidth / 1440, 0.75);
const bgImage = new Image(); bgImage.src = 'assets/images/dreamy background.jpeg';

// ==========================================
// AUDIO SETUP
// ==========================================
const dingSound = new Audio('assets/audio/ding.mp3');
const playDing = () => {
    dingSound.currentTime = 0; 
    dingSound.play().catch(err => console.log("Audio play blocked by browser:", err));
};

const bgmSound = new Audio('assets/audio/midnight dream.mp3');
bgmSound.loop = true; 
let bgmStarted = false; 

const fairyDustSound = new Audio('assets/audio/fairy dust.mp3');

const fadeOutAudio = (audio, duration) => {
    if (audio.volume === 0) return;
    const fadeStep = 50; 
    const volumeDecrease = audio.volume / (duration / fadeStep);
    
    const fadeInterval = setInterval(() => {
        if (audio.volume > volumeDecrease) {
            audio.volume -= volumeDecrease;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fadeInterval);
        }
    }, fadeStep);
};

let isPainting = false, isFading = false, bgRevealed = false, masterpieceAlpha = 0, paintProgress = 0;
let transitionLocked = false, isFairyMode = false, isFlocking = false;
let targetTx = 0, targetTy = 0, curTx = 0, curTy = 0;

/*======================================
PARTICLE CLASSES (Optimized)
======================================*/
class Star {
    constructor() { this.reset(); }
    reset() { this.x = rand(0, innerWidth); this.y = rand(0, innerHeight); this.r = rand(0.3, 1.4) * baseScale; this.a = rand(0.4, 0.9); this.dir = Math.random() > 0.5 ? 1 : -1; this.s = rand(0.002, 0.01); }
    update() { this.a += this.s * this.dir; if (this.a >= 0.95) this.dir = -1; if (this.a <= 0.35) this.dir = 1; }
    draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, PI2); ctx.fillStyle = `rgba(252, 250, 242, ${this.a})`; ctx.fill(); }
}

class Ripple {
    constructor(x, y) { this.x = x; this.y = y; this.r = 0; this.a = 0.8; this.s = rand(0.7, 1.2) * baseScale; }
    get dead() { return this.a <= 0; }
    update() { this.r += this.s; this.a -= 0.004; }
    draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, PI2); ctx.strokeStyle = `rgba(242, 225, 213, ${this.a * 0.45})`; ctx.lineWidth = 1.2 * baseScale; ctx.stroke(); }
}

class Firefly {
    constructor(type = "ambient") {
        this.type = type; this.x = rand(0, innerWidth); this.y = rand(0, innerHeight);
        this.sx = rand(-0.15, 0.15); this.sy = rand(-0.45, -0.2);
        this.ang = rand(0, PI2); this.wave = rand(0.008, 0.023); this.swirl = Math.random() > 0.5 ? 1 : -1;
        this.setMode(false);
        if (type === "sharpGold") { this.baseR = rand(0.6, 1.2); this.a = rand(0.35, 0.6); this.blur = 4.5; }
        else if (type === "tinySpark") { this.baseR = rand(0.8, 1.2); this.a = rand(0.75, 1); this.blur = rand(4, 7.5); }
        else { this.baseR = rand(2.5, 6); this.a = rand(0.12, 0.34); this.blur = 18; }
    }
    setMode(fairy) { 
        if (this.type === "tinySpark") {
            this.gold = this.gold ?? (Math.random() > 0.35);
            this.c = fairy ? (this.gold?"255,200,120":"255,185,205") : (this.gold?"255,190,100":"254,160,185");
            this.g = fairy ? (this.gold?"255,130,30":"252,70,130") : (this.gold?"255,140,40":"252,90,140");
        } else if (this.type === "sharpGold") { this.c = fairy?"252,140,175":"255,210,50"; this.g = fairy?"252,100,140":"255,210,50";
        } else { this.c = fairy?"255,192,203":"245,195,152"; this.g = fairy?"255,182,193":"245,195,152"; }
    }
    update() {
        if (isFlocking) {
            let dx = innerWidth/2 - this.x, dy = innerHeight/2 - this.y;
            this.x += dx * rand(0.03, 0.08) + dy * 0.08 * this.swirl;
            this.y += dy * rand(0.03, 0.08) - dx * 0.08 * this.swirl;
            this.a = Math.min(1, this.a + 0.05); this.blur = Math.min(30, this.blur + 2);
            this.c = "255,255,255"; this.g = "255,255,255"; this.baseR = Math.max(1, this.baseR - 0.02);
        } else {
            this.x += (this.sx + Math.sin(this.ang) * 0.18) * baseScale; this.y += this.sy * baseScale; this.ang += this.wave;
            if (this.x < 0) this.x = innerWidth; if (this.x > innerWidth) this.x = 0; if (this.y < -20) this.y = innerHeight + 20;
        }
    }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.baseR * baseScale, 0, PI2);
        ctx.fillStyle = `rgba(${this.c}, ${this.a * (0.8 + Math.sin(this.ang) * 0.2)})`;
        ctx.shadowColor = `rgba(${this.g}, 0.95)`; ctx.shadowBlur = this.blur * baseScale;
        ctx.fill(); ctx.shadowBlur = 0;
    }
}

class LeafParticle {
    constructor(x, y) {
        this.x = x; this.y = y; this.s = rand(4, 9) * baseScale; this.a = 1;
        this.sx = rand(-0.6, 0.6); this.sy = rand(0.4, 0.9); this.ang = rand(0, PI2); this.spin = rand(-0.02, 0.02); this.decay = rand(0.015, 0.03);
    }
    get dead() { return this.a <= 0; }
    update() { this.x += this.sx; this.y += this.sy; this.ang += this.spin; this.a -= this.decay; }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.ang); ctx.beginPath();
        ctx.moveTo(0, -this.s); ctx.quadraticCurveTo(this.s*0.5, 0, 0, this.s); ctx.quadraticCurveTo(-this.s*0.5, 0, 0, -this.s);
        ctx.fillStyle = `rgba(180, 194, 166, ${this.a * 0.85})`; ctx.shadowColor = "rgba(229, 191, 161, 0.6)"; ctx.shadowBlur = 6 * baseScale; ctx.fill(); ctx.restore();
    }
}

class PinkRipple {
    constructor(x, y) { this.x = x; this.y = y; this.r = 2 * baseScale; this.a = 1; this.s = 1.4 * baseScale; }
    get dead() { return this.a <= 0; }
    update() { this.s *= 0.93; this.r += this.s; this.a -= 0.014; }
    draw(ctx) {
        let grad = ctx.createRadialGradient(this.x, this.y, this.r * 0.4, this.x, this.y, this.r);
        grad.addColorStop(0, `rgba(252, 163, 183, 0)`); grad.addColorStop(0.8, `rgba(252, 163, 183, ${this.a * 0.12})`); grad.addColorStop(1, `rgba(252, 163, 183, 0)`);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, PI2);
        ctx.fillStyle = grad; ctx.strokeStyle = `rgba(252, 163, 183, ${this.a * 0.35})`; ctx.lineWidth = 0.6 * baseScale; ctx.fill(); ctx.stroke();
    }
}

class DustParticle {
    constructor(x, y, isGold) {
        this.isGold = isGold; this.x = x; this.y = y; this.a = 1; 
        this.c = isGold ? "229,191,161" : "252,163,183";
    }
    get dead() { return this.a <= 0; }
    update() { this.sx *= 0.97; this.sy *= 0.97; this.x += this.sx; this.y += this.sy; this.a -= this.decay; }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, PI2);
        ctx.fillStyle = `rgba(${this.c}, ${this.a * 0.85})`; ctx.shadowColor = `rgba(${this.c}, ${this.isGold?0.9:0.5})`; 
        ctx.shadowBlur = (this.isGold?8:3) * baseScale; ctx.fill(); ctx.shadowBlur = 0;
    }
}

class PaintingButterfly {
    constructor(x, y) {
        this.x = x; this.y = y; this.oX = x; this.oY = y; this.s = rand(16, 28) * baseScale; this.spd = rand(4, 7.5);
        this.ang = rand(0, PI2); this.angC = rand(-0.12, 0.12); this.wing = rand(0, PI2); this.a = 0; this.fSpd = rand(0.01, 0.025); this.fading = false;
    }
    get dead() { return this.fading && this.a <= 0; }
    update() {
        this.oX = this.x; this.oY = this.y;
        this.a = this.fading ? Math.max(0, this.a - 0.02) : Math.min(1, this.a + this.fSpd);
        this.ang += this.angC; if (Math.random() > 0.88) this.angC = rand(-0.2, 0.2);
        this.x += Math.cos(this.ang) * this.spd * baseScale; this.y += Math.sin(this.ang) * this.spd * baseScale;
        if (this.x < -150 || this.x > innerWidth+150 || this.y < -150 || this.y > innerHeight+150) this.ang += Math.PI;

        ctxs.mask.strokeStyle = `rgba(255, 255, 255, ${this.a * 0.65})`; ctxs.mask.lineCap = "round";
        for (let b = 0; b < 6; b++) {
            let off = rand(-45, 45) * baseScale;
            ctxs.mask.lineWidth = rand(120, 270) * baseScale; ctxs.mask.beginPath();
            ctxs.mask.moveTo(this.oX + off, this.oY + off); ctxs.mask.lineTo(this.x + off, this.y + off); ctxs.mask.stroke();
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.ang + Math.PI / 2); this.wing += 0.28; let f = Math.sin(this.wing);
        ctx.fillStyle = `rgba(254, 160, 185, ${this.a * 0.95})`; ctx.shadowColor = `rgba(252, 90, 140, ${this.a})`; ctx.shadowBlur = 18 * baseScale;
        const dW = m => { ctx.beginPath(); ctx.ellipse(this.s*0.5*f*m, -this.s*0.2, this.s*0.6*Math.abs(f), this.s*0.4, (Math.PI/6)*m, 0, PI2);
            ctx.ellipse(this.s*0.4*f*m, this.s*0.2, this.s*0.4*Math.abs(f), this.s*0.3, (-Math.PI/6)*m, 0, PI2); ctx.fill(); };
        dW(-1); dW(1); ctx.restore();
    }
}

/*======================================
SYSTEM INIT & RENDER LOOP
======================================*/
const col = {
    stars: Array.from({length: 140}, () => new Star()),
    fireflies: [...Array.from({length: 25}, () => new Firefly("ambient")), ...Array.from({length: 20}, () => new Firefly("sharpGold")), ...Array.from({length: 35}, () => new Firefly("tinySpark"))],
    butterflies: [], ripples: [], leaves: [], pinkDust: [], goldDust: []
};

let lastRpl = performance.now(), nxtRpl = rand(600, 1800);
const spawnRipple = (x=rand(0, innerWidth), y=rand(0, innerHeight)) => col.ripples.push(new Ripple(x, y));

const runP = (arr, ctx) => {
    for (let i = arr.length - 1; i >= 0; i--) { arr[i].update(); arr[i].draw(ctx); if (arr[i].dead) arr.splice(i, 1); }
};

window.addEventListener("resize", () => {
    let tmp = null;
    if (isPainting || isFading || bgRevealed) { tmp = document.createElement("canvas"); tmp.width = cvs.mask.width; tmp.height = cvs.mask.height; tmp.getContext("2d").drawImage(cvs.mask, 0, 0); }
    Object.values(cvs).forEach(c => { c.width = innerWidth; c.height = innerHeight; });
    if (tmp) ctxs.mask.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, innerWidth, innerHeight);
    baseScale = Math.max(innerWidth / 1440, 0.75);
    Object.values(col).flat().forEach(p => { p.x *= innerWidth/oldW; p.y *= innerHeight/oldH; });
    oldW = innerWidth; oldH = innerHeight;
});
Object.values(cvs).forEach(c => { c.width = oldW; c.height = oldH; });

const ptr = qs("custom-pointer"); const isTouch = window.matchMedia("(max-width: 768px)");
window.addEventListener("mousemove", e => {
    if (isTouch.matches) return;
    ptr.style.left = `${e.clientX}px`; ptr.style.top = `${e.clientY}px`;
    if (Math.random() > 0.3) col.leaves.push(new LeafParticle(e.clientX, e.clientY));
    targetTx = (e.clientY - innerHeight/2) / (innerHeight/2); targetTy = (e.clientX - innerWidth/2) / (innerWidth/2);
});

// Play ding on any global screen click/tap (Advances Dialogue)
window.addEventListener("pointerdown", e => {
    // Avoid triggering if they clicked the skip button
    if (e.target.id === "skip-btn") return;

    if (!bgmStarted) {
        bgmSound.play().catch(err => console.log("BGM blocked by browser:", err));
        bgmStarted = true;
    }

    if (transitionLocked || (qs('lotus-container') && qs('lotus-container').classList.contains('show'))) return;
    playDing(); 
    
    col.pinkDust.push(new PinkRipple(e.clientX, e.clientY));
    for (let i=0; i<(isTouch.matches?12:8); i++) {
        let p = new DustParticle(e.clientX + rand(-12, 12), e.clientY + rand(-12, 12), false);
        p.sx = rand(-1,1); p.sy = rand(-1,1); p.r = rand(0.5, 1.7); p.decay = rand(0.005, 0.013); col.pinkDust.push(p);
    }
    spawnRipple(e.clientX, e.clientY); nextDialogue();
});

const pCfg = [ {el:cvs.bg, z:1.5, t:8}, {el:cvs.star, z:2, t:15}, {el:cvs.ripple, z:2, t:12}, {el:cvs.firefly, z:2.5, t:22}, {el:cvs.trail, z:3.5, t:30} ];

function animate(t = performance.now()) {
    if (!isTouch.matches && (Math.abs(targetTx-curTx)>0.001 || Math.abs(targetTy-curTy)>0.001)) {
        curTx += (targetTx - curTx) * 0.06; curTy += (targetTy - curTy) * 0.06;
        pCfg.forEach(c => c.el.style.transform = `perspective(1200px) scale(1.05) rotateX(${-curTx*c.z}deg) rotateY(${curTy*c.z}deg) translate(${-curTy*c.t}px, ${-curTx*c.t}px)`);
    }

    Object.entries(ctxs).forEach(([k, c]) => k!=="mask" && c.clearRect(0,0,innerWidth,innerHeight));

    let rI = bgImage.width / bgImage.height, rC = innerWidth / innerHeight;
    let dw = rC>rI ? innerWidth : innerHeight*rI, dh = rC>rI ? innerWidth/rI : innerHeight;
    let dx = rC>rI ? 0 : (innerWidth-dw)/2, dy = rC>rI ? (innerHeight-dh)/2 : 0;

    if (bgRevealed || isPainting || isFading) {
        if (col.butterflies.length > 0) { 
            runP(col.butterflies, ctxs.trail); 
            if (isPainting) {
                paintProgress++;
                if (paintProgress > 150) { 
                    isPainting = false; isFading = true; 
                    col.butterflies.forEach(b => b.fading = true); 
                }
            } 
        }
        ctxs.bg.save(); ctxs.bg.globalAlpha = masterpieceAlpha; ctxs.bg.drawImage(bgImage, dx, dy, dw, dh); ctxs.bg.restore();
        if (!bgRevealed) {
            masterpieceAlpha += (isPainting ? 0.008 : 0.02);
            if (masterpieceAlpha >= 1) { masterpieceAlpha = 1; isFading = false; bgRevealed = true; }
            ctxs.bg.save(); ctxs.bg.drawImage(cvs.mask, 0, 0); ctxs.bg.globalCompositeOperation = "source-in"; ctxs.bg.drawImage(bgImage, dx, dy, dw, dh); ctxs.bg.restore();
        }
    }
    if (t - lastRpl > nxtRpl) { spawnRipple(); lastRpl = t; nxtRpl = rand(600, 1800); }
    runP(col.stars, ctxs.star); runP(col.ripples, ctxs.ripple); runP(col.fireflies, ctxs.firefly); 
    runP(col.leaves, ctxs.trail); runP(col.pinkDust, ctxs.trail); runP(col.goldDust, ctxs.trail);
    requestAnimationFrame(animate);
} animate();

/*======================================
DIALOGUE NARRATIVE
======================================*/
const dCont = qs("dialogue-content"), spk = qs("speaker"), dTxt = qs("dialogue-text"), dPr = qs("continue");
const story = [
    { spk: "A MIDSUMMER NIGHT", txt: "Some stories begin long before they are told." },
    { spk: "THE GARDEN", txt: "This midsummer, another chapter blooms within <em>The Garden</em>." },
    { spk: "THE GARDEN", txt: "A letter rests on the flowerbed, waiting for your arrival." },
    { spk: "THE GARDEN", txt: "Will you unfold the page prepared for you?" }
];
let cSc = 0, cLet = 0, isTyping = false, tInt;

function startDialogue() {
    let ln = story[cSc]; spk.style.display = ln.spk ? "block" : "none"; if (ln.spk) spk.textContent = ln.spk;
    dTxt.style.animation = "none"; void dTxt.offsetWidth; dTxt.style.animation = "cinematicPush 0.85s cubic-bezier(0.25, 1, 0.5, 1) forwards";
    dTxt.innerHTML = ""; dPr.style.opacity = 0; cLet = 0; isTyping = true; let cHTML = "";
    tInt = setInterval(() => {
        if (cLet < ln.txt.length) {
            if (ln.txt[cLet] === '<') { let t = ""; while(ln.txt[cLet]!=='>') { t+=ln.txt[cLet++]; } cHTML+=t+'>'; cLet++; } 
            else cHTML+=ln.txt[cLet++];
            dTxt.innerHTML = cHTML;
        } else { clearInterval(tInt); isTyping = false; dPr.style.opacity = .8; }
    }, 40);
}

function nextDialogue(){
    if (transitionLocked || (qs('lotus-container') && qs('lotus-container').classList.contains('show'))) return;
    if(isTyping){ clearInterval(tInt); dTxt.innerHTML = story[cSc].txt; dPr.style.opacity = .8; isTyping = false; return; }
    if (cSc === 0) {
        transitionLocked = true; isTyping = false; clearInterval(tInt); dCont.style.opacity = "0";
        for (let i=0; i<160; i++) {
            let g = new DustParticle(innerWidth/2 + rand(-250, 250), innerHeight/2 + rand(-40, 40), true);
            g.sx = rand(-2, 2); g.sy = rand(-2.5, -0.5); g.r = rand(1, 3.5); g.decay = rand(0.007, 0.017); col.goldDust.push(g);
        }
        setTimeout(() => { 
            paintProgress = 0; 
            for(let i=0; i<7; i++) col.butterflies.push(new PaintingButterfly(innerWidth/2, innerHeight/2)); 
            isPainting = true; 
        }, 1200);
        setTimeout(() => { cSc++; Object.assign(dCont.style, {position:"fixed", bottom:"0", left:"0", width:"100%", maxWidth:"100%", borderRadius:"0", border:"none", padding:"90px 50px 45px 50px", background:"linear-gradient(to top, rgba(26,15,9,0.95), rgba(92,72,57,0.5) 65%, transparent)"}); startDialogue(); dCont.style.opacity="1"; transitionLocked=false; }, 2000);
        return;
    }
    if (cSc === 1) {
        transitionLocked = true; dCont.style.opacity = "0"; dCont.style.pointerEvents = "none";
        setTimeout(() => { qs('lotus-container').classList.add('show'); let b = qs("closer-look-btn"); if(b){b.style.pointerEvents="none"; setTimeout(()=>b.style.pointerEvents="auto", 1200);} transitionLocked = false; }, 800);
        return; 
    }
    if (cSc === 3) { transitionLocked = true; dCont.style.opacity = "0"; dCont.style.pointerEvents = "none"; setTimeout(() => { document.querySelectorAll(".scroll-text").forEach(e=>e.classList.add("show")); qs("scroll-seal").classList.add("active"); transitionLocked = false; }, 1000); return; }
    cSc++; startDialogue();
} startDialogue();


/*======================================
DYNAMIC LOADING SCREEN SETUP 
(Clean 5-Petal Flower Design)
======================================*/
if (qs("white-flash")) {
    const flowerSVGPaths = `
        <path d="M 50 48 C 42 38, 20 15, 50 4 C 80 15, 58 38, 50 48 Z" />
        <path d="M 50 48 C 42 38, 20 15, 50 4 C 80 15, 58 38, 50 48 Z" transform="rotate(72 50 50)" />
        <path d="M 50 48 C 42 38, 20 15, 50 4 C 80 15, 58 38, 50 48 Z" transform="rotate(144 50 50)" />
        <path d="M 50 48 C 42 38, 20 15, 50 4 C 80 15, 58 38, 50 48 Z" transform="rotate(216 50 50)" />
        <path d="M 50 48 C 42 38, 20 15, 50 4 C 80 15, 58 38, 50 48 Z" transform="rotate(288 50 50)" />
    `;
    
    qs("white-flash").innerHTML = `
    <div id="loading-screen">
        <div class="loading-content">
            <div class="lotus-loading-wrapper">
                <svg class="lotus-loading lotus-outline" viewBox="0 0 100 100">${flowerSVGPaths}</svg>
                <svg class="lotus-loading lotus-fill" viewBox="0 0 100 100">${flowerSVGPaths}</svg>
            </div>
            <div class="ui-flourish flourish-loading">⊹ ─── ✦ ─── ⊹</div>
            <p class="loading-text">Unfolding the dream...</p>
            <div class="ui-flourish flourish-loading">⊹ ─── ✦ ─── ⊹</div>
        </div>
    </div>`;
}


/*======================================
EVENT INTERACTIONS
======================================*/
document.addEventListener("DOMContentLoaded", () => {
    
    // --- NEW: Skip Button Logic ---
    qs("skip-btn").addEventListener("click", function(e) {
        e.stopPropagation(); 
        playDing(); 
        fairyDustSound.play().catch(err => console.log("Fairy dust blocked by browser:", err));
        
        // Hide UI elements to transition cleanly
        transitionLocked = true;
        this.style.opacity = "0"; 
        this.style.pointerEvents = "none";
        
        if (qs('lotus-container')) qs('lotus-container').style.opacity = "0";
        if (qs("scroll-container")) qs("scroll-container").style.opacity = "0";
        if (qs("dialogue-content")) qs("dialogue-content").style.opacity = "0";

        // Trigger flash immediately
        qs("white-flash").classList.add("active");

        // Fade out music a bit faster for the skip
        fadeOutAudio(bgmSound, 4000); 
        
        // Show Loading Screen after flash settles (600ms)
        setTimeout(() => { 
            qs("loading-screen").classList.add("show"); 
            
            // Redirect after allowing the lotus SVG fill to naturally complete (4 seconds is optimal for skip)
            setTimeout(() => {
                window.location.href = "https://podcastwaiver.my.canva.site/meagans18th";
            }, 4000); 

        }, 600); 
    });


    // Play ding on "Take a Closer Look" button
    qs("closer-look-btn").addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation(); 
        playDing(); 
        
        isFairyMode = true; 
        col.fireflies.forEach(f => f.setMode(true)); 
        let bR = e.target.getBoundingClientRect();
        for(let i=0; i<40; i++) {
            let g = new DustParticle(bR.left+rand(0,bR.width), bR.top+rand(0,bR.height), true);
            g.sx = rand(-2,2); g.sy = rand(-2.5,-0.5); g.r = rand(1, 3.5); g.decay = rand(0.007, 0.017); col.goldDust.push(g);
        }
        e.target.style.opacity = "0"; e.target.style.pointerEvents = "none"; qs('lotus-container').classList.add('lotus-push-anim');
        setTimeout(() => {
            qs('lotus-container').classList.remove('show', 'lotus-push-anim'); qs("scroll-container").classList.add("show"); cSc = 2; 
            dTxt.innerHTML = ""; spk.innerHTML = ""; dCont.style.transition = "opacity 0.6s ease-in-out"; dCont.style.pointerEvents = "auto"; dCont.style.opacity = "1";
            setTimeout(() => { startDialogue(); dCont.style.transition = "opacity 1.5s ease-in-out, background 1.5s ease-in-out, padding 1s ease-in-out"; }, 500);
        }, 1400);
    });

    // Play ding on Scroll Seal click
    qs("scroll-seal").addEventListener("click", function(e) {
        e.stopPropagation(); 
        playDing(); 
        
        fairyDustSound.play().catch(err => console.log("Fairy dust blocked by browser:", err));
        
        this.classList.remove("active"); isFlocking = true; 
        
        // Hide Skip Button since we're concluding anyway
        let skipBtn = qs("skip-btn");
        if (skipBtn) { skipBtn.style.opacity = "0"; skipBtn.style.pointerEvents = "none"; }
        
        document.querySelectorAll(".scroll-text").forEach(e=>e.classList.remove("show")); qs("scroll-container").style.opacity = "0";
        setTimeout(() => {
            let cx = innerWidth/2, cy = innerHeight/2;
            for(let i=0; i<450; i++) {
                let rng = i < 150, ang = rng ? ((i/150)*PI2) : rand(0,PI2), spd = rng ? 28 : rand(10,40);
                let p = new DustParticle(cx+Math.cos(ang)*15, cy+Math.sin(ang)*15, false);
                p.sx = Math.cos(ang)*spd; p.sy = Math.sin(ang)*spd; p.r = rand(1.5,4.5)*baseScale; p.decay = rng ? 0.015 : rand(0.01,0.03); col.pinkDust.push(p);
                if (i%2===0) { 
                    let g = new DustParticle(p.x, p.y, true); g.sx = Math.cos(ang)*(spd*1.25); g.sy = Math.sin(ang)*(spd*1.25);
                    g.r = rand(1,3.5)*baseScale; g.decay = rng ? 0.012 : rand(0.01,0.03); col.goldDust.push(g);
                }
            }
            let sw = new PinkRipple(cx, cy); sw.r = 10; sw.s = 35*baseScale; sw.a = 1.2; col.pinkDust.push(sw);
            
            qs("white-flash").classList.add("active");

            fadeOutAudio(bgmSound, 5500); 
            
            setTimeout(() => { 
                qs("loading-screen").classList.add("show"); 
                
                setTimeout(() => {
                    window.location.href = "https://podcastwaiver.my.canva.site/meagans18th";
                }, 5500); 

            }, 600); 
            
        }, 1800);
    });
});
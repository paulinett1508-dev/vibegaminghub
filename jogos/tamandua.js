// =====================================================================
// tamandua.js — Jogo Tamandua Runner v2.0 (Chrome Dino style)
// =====================================================================
// Runner automatico com tamandua procedural (formas simples, sem IK)
// Inspirado no Chrome Dino: fisica arcade, spawn por distancia
// Toque/Space para pular, colete formigas, sem game over
// =====================================================================

(function () {
    'use strict';

    // ---- Configuracao ----
    var CONF = {
        // Cores base
        BG: '#050a14',
        SKY_TOP: '#0a0a2e',
        SKY_BOTTOM: '#0f1a3a',
        GROUND_COLOR: '#1a3a1a',
        GRASS_COLOR: '#2d5a2d',
        GRASS_TIP: '#3d7a3d',
        DIRT_COLOR: '#1a2a10',

        // Tamandua
        BODY: '#8B4513',
        BODY_LIGHT: '#D2691E',
        BODY_DARK: '#5C3317',
        SNOUT: '#DEB887',
        SNOUT_TIP: '#1a1a1a',
        TAIL: '#654321',
        TAIL_LIGHT: '#8B6914',
        EYE: '#0f172a',
        EYE_WHITE: '#f5f0e0',
        TONGUE: '#e8658a',
        LEG: '#6B3410',
        CLAW: '#3a2010',

        // Formigas
        ANT_BODY: '#cc3333',
        ANT_DARK: '#8b1a1a',
        ANT_LEG: '#660000',

        // Obstaculos
        LOG_COLOR: '#4a3020',
        LOG_LIGHT: '#6a4a30',
        LOG_RING: '#3a2010',
        ROCK_COLOR: '#4a4a4a',
        ROCK_LIGHT: '#6a6a6a',
        ROCK_DARK: '#2a2a2a',
        ANTHILL_COLOR: '#5a3a1a',
        ANTHILL_LIGHT: '#7a5a2a',

        // Parallax
        MOUNTAIN_COLOR: '#0d1a30',
        MOUNTAIN_LIGHT: '#132040',
        CLOUD_COLOR: 'rgba(100,120,160,0.15)',
        STAR_COLOR: '#ffffff',

        // Fisica (Chrome Dino style)
        GRAVITY: 0.6,
        JUMP_VELOCITY: -12,
        SPEED_DROP_COEFF: 3,
        INITIAL_SPEED: 4.5,
        MAX_SPEED: 11,
        ACCELERATION: 0.002,
        COYOTE_FRAMES: 6,

        // Gameplay
        STUMBLE_DURATION: 45,
        STUMBLE_SPEED_MULT: 0.4,
        INVINCIBLE_FRAMES: 60,
        CELEBRATE_EVERY: 10,

        // Obstacle spawn
        MIN_GAP: 140,
        MAX_GAP: 320,
        GAP_SPEED_FACTOR: 8,

        // Tamandua size
        TAMA_W: 60,
        TAMA_H: 35,
        TAMA_X: 0.15, // fraction of screen width
    };

    // ---- Audio (Web Audio API) ----
    function SomTamandua() {
        this.ctx = null;
        this._lastStep = 0;
    }

    SomTamandua.prototype.init = function () {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.ctx = null;
        }
    };

    SomTamandua.prototype._resume = function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    };

    SomTamandua.prototype._tone = function (type, freq, dur, vol, freqEnd) {
        if (!this.ctx) return;
        this._resume();
        var t = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t + dur);
        gain.gain.setValueAtTime(vol || 0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
    };

    SomTamandua.prototype._noise = function (dur, vol) {
        if (!this.ctx) return;
        this._resume();
        var t = this.ctx.currentTime;
        var bufSize = Math.floor(this.ctx.sampleRate * dur);
        var buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        var src = this.ctx.createBufferSource();
        src.buffer = buf;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol || 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(t);
    };

    SomTamandua.prototype.pulo = function () {
        this._tone('sine', 300, 0.08, 0.12, 700);
    };

    SomTamandua.prototype.pouso = function () {
        this._tone('triangle', 80, 0.04, 0.1);
    };

    SomTamandua.prototype.passo = function () {
        var now = Date.now();
        if (now - this._lastStep < 250) return;
        this._lastStep = now;
        this._noise(0.04, 0.04);
    };

    SomTamandua.prototype.coletar = function () {
        this._tone('sine', 880, 0.06, 0.15, 1200);
        var self = this;
        setTimeout(function () {
            self._tone('sine', 1100, 0.08, 0.12, 1400);
        }, 60);
    };

    SomTamandua.prototype.tropeco = function () {
        this._tone('sawtooth', 100, 0.12, 0.12, 60);
    };

    SomTamandua.prototype.milestone = function () {
        this._tone('sine', 1000, 0.03, 0.08);
    };

    SomTamandua.prototype.celebrar = function () {
        var self = this;
        self._tone('sine', 523, 0.1, 0.15); // C
        setTimeout(function () { self._tone('sine', 659, 0.1, 0.15); }, 100); // E
        setTimeout(function () { self._tone('sine', 784, 0.15, 0.18); }, 200); // G
    };

    SomTamandua.prototype.fechar = function () {
        if (this.ctx) {
            try { this.ctx.close(); } catch (e) { /* ignore */ }
            this.ctx = null;
        }
    };

    // ---- Desenho do Tamandua ----
    function desenharTamandua(ctx, x, y, w, h, frame, state, tongueTimer, lookDir) {
        // x,y = bottom-center of tamandua
        var bx = x - w / 2;
        var by = y - h;
        var runFrame = frame % 12 < 6 ? 0 : 1;
        var isJumping = state === 'JUMP';
        var isStumble = state === 'STUMBLE';

        ctx.save();

        // Stumble wobble
        if (isStumble) {
            ctx.translate(x, y);
            ctx.rotate(Math.sin(frame * 0.5) * 0.15);
            ctx.translate(-x, -y);
        }

        // ---- Cauda (behind body) ----
        var tailBaseX = bx + 2;
        var tailBaseY = by + h * 0.4;
        var tailWag = Math.sin(frame * 0.15) * 8;
        var tailEndX = tailBaseX - w * 0.6;
        var tailEndY = tailBaseY - h * 0.3 + tailWag;
        var tailMidX = tailBaseX - w * 0.35;
        var tailMidY = tailBaseY + h * 0.1 + tailWag * 0.5;

        // Tail body (thick curve)
        ctx.strokeStyle = CONF.TAIL;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailBaseX, tailBaseY);
        ctx.quadraticCurveTo(tailMidX, tailMidY, tailEndX, tailEndY);
        ctx.stroke();

        // Tail fur (perpendicular hairs)
        ctx.strokeStyle = CONF.TAIL_LIGHT;
        ctx.lineWidth = 2;
        for (var fi = 0; fi < 8; fi++) {
            var t = (fi + 1) / 9;
            var fx = tailBaseX + (tailEndX - tailBaseX) * t + (tailMidX - tailBaseX) * 2 * t * (1 - t) * 0.3;
            var fy = tailBaseY + (tailEndY - tailBaseY) * t + (tailMidY - tailBaseY) * 2 * t * (1 - t) * 0.3;
            var hairLen = 6 + t * 8;
            var hairAngle = Math.sin(frame * 0.1 + fi) * 0.3;
            ctx.beginPath();
            ctx.moveTo(fx, fy - hairLen * Math.cos(hairAngle));
            ctx.lineTo(fx + hairLen * Math.sin(hairAngle) * 0.5, fy + hairLen * Math.cos(hairAngle));
            ctx.stroke();
        }

        // ---- Pernas (behind body) ----
        var legW = 7;
        var legH = h * 0.5;
        var legY = y - legH;
        var legSpacing = w * 0.25;

        // Back legs (behind body)
        var backLeg1X = bx + w * 0.2;
        var backLeg2X = bx + w * 0.35;
        var backOff1 = 0, backOff2 = 0;
        if (!isJumping) {
            backOff1 = runFrame === 0 ? -6 : 6;
            backOff2 = runFrame === 0 ? 6 : -6;
        }

        ctx.fillStyle = CONF.LEG;
        // Back leg 1
        ctx.fillRect(backLeg1X + backOff1, legY + h * 0.1, legW, legH);
        // Back leg 2
        ctx.fillRect(backLeg2X + backOff2, legY + h * 0.1, legW, legH);
        // Claws
        ctx.fillStyle = CONF.CLAW;
        ctx.fillRect(backLeg1X + backOff1 - 2, y - 3, legW + 4, 3);
        ctx.fillRect(backLeg2X + backOff2 - 2, y - 3, legW + 4, 3);

        // ---- Corpo (elipse) ----
        ctx.fillStyle = CONF.BODY;
        ctx.beginPath();
        ctx.ellipse(x, by + h * 0.45, w * 0.48, h * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body gradient overlay (belly lighter)
        ctx.fillStyle = CONF.BODY_LIGHT;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(x, by + h * 0.55, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Dark stripe on back
        ctx.fillStyle = CONF.BODY_DARK;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(x - w * 0.05, by + h * 0.25, w * 0.3, h * 0.12, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ---- Front Pernas ----
        var frontLeg1X = bx + w * 0.55;
        var frontLeg2X = bx + w * 0.7;
        var frontOff1 = 0, frontOff2 = 0;
        if (!isJumping) {
            frontOff1 = runFrame === 0 ? 6 : -6;
            frontOff2 = runFrame === 0 ? -6 : 6;
        } else {
            // Legs tucked when jumping
            legH *= 0.6;
        }

        ctx.fillStyle = CONF.LEG;
        ctx.fillRect(frontLeg1X + frontOff1, legY + h * 0.15, legW, legH);
        ctx.fillRect(frontLeg2X + frontOff2, legY + h * 0.15, legW, legH);
        ctx.fillStyle = CONF.CLAW;
        if (!isJumping) {
            ctx.fillRect(frontLeg1X + frontOff1 - 2, y - 3, legW + 4, 3);
            ctx.fillRect(frontLeg2X + frontOff2 - 2, y - 3, legW + 4, 3);
        }

        // ---- Cabeca ----
        var headR = h * 0.38;
        var headX = bx + w * 0.85;
        var headY = by + h * 0.3;

        ctx.fillStyle = CONF.BODY;
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // ---- Orelhas ----
        ctx.fillStyle = CONF.BODY_DARK;
        ctx.beginPath();
        ctx.arc(headX - 5, headY - headR + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(headX + 3, headY - headR + 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // ---- Focinho ----
        var snoutLen = w * 0.45;
        var snoutH = h * 0.16;
        var snoutX = headX + headR * 0.6;
        var snoutY = headY + 2;

        // Snout shape (tapered rectangle)
        ctx.fillStyle = CONF.SNOUT;
        ctx.beginPath();
        ctx.moveTo(snoutX, snoutY - snoutH / 2);
        ctx.lineTo(snoutX + snoutLen, snoutY - snoutH / 4);
        ctx.lineTo(snoutX + snoutLen, snoutY + snoutH / 4);
        ctx.lineTo(snoutX, snoutY + snoutH / 2);
        ctx.closePath();
        ctx.fill();

        // Nose tip
        ctx.fillStyle = CONF.SNOUT_TIP;
        ctx.beginPath();
        ctx.arc(snoutX + snoutLen, snoutY, 3, 0, Math.PI * 2);
        ctx.fill();

        // ---- Lingua (ao coletar formiga) ----
        if (tongueTimer > 0) {
            var tongueLen = snoutLen * 0.6 * (tongueTimer / 15);
            ctx.strokeStyle = CONF.TONGUE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(snoutX + snoutLen, snoutY);
            ctx.lineTo(snoutX + snoutLen + tongueLen, snoutY + 3);
            ctx.stroke();
        }

        // ---- Olho ----
        ctx.fillStyle = CONF.EYE_WHITE;
        ctx.beginPath();
        ctx.arc(headX + headR * 0.3, headY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CONF.EYE;
        ctx.beginPath();
        ctx.arc(headX + headR * 0.35 + lookDir * 1, headY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(headX + headR * 0.4, headY - 3.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // ---- Glow effect ----
        ctx.shadowColor = CONF.BODY_LIGHT;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = CONF.BODY_LIGHT;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(x, by + h * 0.45, w * 0.5, h * 0.44, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    // ---- Desenho de Formiga ----
    function desenharFormiga(ctx, x, y, frame, size) {
        var s = size || 6;
        var legPhase = frame % 8 < 4 ? 1 : -1;

        // Body segments
        ctx.fillStyle = CONF.ANT_BODY;
        ctx.beginPath();
        ctx.arc(x - s, y, s * 0.7, 0, Math.PI * 2); // abdomen
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); // thorax
        ctx.fill();
        ctx.fillStyle = CONF.ANT_DARK;
        ctx.beginPath();
        ctx.arc(x + s * 0.8, y - 1, s * 0.45, 0, Math.PI * 2); // head
        ctx.fill();

        // Legs (3 pairs)
        ctx.strokeStyle = CONF.ANT_LEG;
        ctx.lineWidth = 1;
        for (var i = 0; i < 3; i++) {
            var lx = x - s * 0.5 + i * s * 0.6;
            var angle = Math.sin(frame * 0.4 + i * 1.5) * 0.5 * legPhase;
            ctx.beginPath();
            ctx.moveTo(lx, y);
            ctx.lineTo(lx - 3 + angle * 2, y + s + Math.abs(angle) * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lx, y);
            ctx.lineTo(lx + 3 - angle * 2, y + s + Math.abs(angle) * 2);
            ctx.stroke();
        }

        // Antennae
        ctx.beginPath();
        ctx.moveTo(x + s * 0.8, y - s * 0.4);
        ctx.lineTo(x + s * 1.5, y - s * 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.8, y - s * 0.3);
        ctx.lineTo(x + s * 1.6, y - s * 0.8);
        ctx.stroke();
    }

    // ---- Desenho de Obstaculos ----
    function desenharObstaculo(ctx, o) {
        var x = o.x, y = o.y, w = o.w, h = o.h;

        if (o.type === 'log') {
            // Tronco
            ctx.fillStyle = CONF.LOG_COLOR;
            ctx.fillRect(x, y, w, h);
            // Wood rings
            ctx.strokeStyle = CONF.LOG_RING;
            ctx.lineWidth = 1;
            for (var r = 0; r < 3; r++) {
                ctx.beginPath();
                ctx.arc(x + w / 2, y + h / 2, 4 + r * 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Highlight
            ctx.fillStyle = CONF.LOG_LIGHT;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x + 2, y + 2, w - 4, 4);
            ctx.globalAlpha = 1;
        } else if (o.type === 'rock') {
            // Pedra (polygon)
            ctx.fillStyle = CONF.ROCK_COLOR;
            ctx.beginPath();
            ctx.moveTo(x + w * 0.1, y + h);
            ctx.lineTo(x, y + h * 0.5);
            ctx.lineTo(x + w * 0.2, y + h * 0.1);
            ctx.lineTo(x + w * 0.5, y);
            ctx.lineTo(x + w * 0.8, y + h * 0.1);
            ctx.lineTo(x + w, y + h * 0.4);
            ctx.lineTo(x + w * 0.9, y + h);
            ctx.closePath();
            ctx.fill();
            // Highlight
            ctx.fillStyle = CONF.ROCK_LIGHT;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(x + w * 0.3, y + h * 0.15);
            ctx.lineTo(x + w * 0.5, y + 2);
            ctx.lineTo(x + w * 0.7, y + h * 0.2);
            ctx.lineTo(x + w * 0.5, y + h * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (o.type === 'anthill') {
            // Formigueiro (mound)
            ctx.fillStyle = CONF.ANTHILL_COLOR;
            ctx.beginPath();
            ctx.moveTo(x, y + h);
            ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.2, x + w * 0.5, y);
            ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.2, x + w, y + h);
            ctx.closePath();
            ctx.fill();
            // Hole
            ctx.fillStyle = '#1a0a00';
            ctx.beginPath();
            ctx.ellipse(x + w * 0.5, y + h * 0.5, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Texture dots
            ctx.fillStyle = CONF.ANTHILL_LIGHT;
            ctx.globalAlpha = 0.3;
            for (var d = 0; d < 5; d++) {
                var dx = x + w * (0.2 + Math.sin(d * 2.3) * 0.3);
                var dy = y + h * (0.3 + Math.cos(d * 1.7) * 0.25);
                ctx.beginPath();
                ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h + 2, w * 0.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- Game Object ----
    var TamanduaGame = {
        canvas: null,
        ctx: null,
        animFrame: null,
        som: null,
        state: 'WAITING', // WAITING, RUNNING, STUMBLE
        _onKey: null,
        _onTouch: null,
        _onClick: null,
        _onResize: null,
        _timeouts: [],

        // Game state
        speed: 0,
        distance: 0,
        score: 0,
        frameCount: 0,

        // Tamandua
        tamaX: 0,
        tamaY: 0,
        tamaVY: 0,
        tamaW: CONF.TAMA_W,
        tamaH: CONF.TAMA_H,
        grounded: true,
        coyoteCounter: 0,
        tongueTimer: 0,

        // Stumble
        stumbleTimer: 0,
        invincibleTimer: 0,

        // Shake
        shakeX: 0,
        shakeY: 0,
        shakeIntensity: 0,

        // Entities
        obstacles: [],
        ants: [],
        particles: [],
        clouds: [],
        stars: [],
        grassTufts: [],
        groundPebbles: [],

        // Spawn tracking
        nextObstacleDist: 0,
        nextAntDist: 0,
        lastMilestone: 0,

        // Celebration
        celebrateTimer: 0,

        // Ground
        groundOffset: 0,

        // Scenery
        mountains: [],

        abrir: function () {
            var self = this;

            // Reset state
            this.state = 'WAITING';
            this.speed = 0;
            this.distance = 0;
            this.score = 0;
            this.frameCount = 0;
            this.tamaVY = 0;
            this.grounded = true;
            this.coyoteCounter = 0;
            this.tongueTimer = 0;
            this.stumbleTimer = 0;
            this.invincibleTimer = 0;
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
            this.obstacles = [];
            this.ants = [];
            this.particles = [];
            this.nextObstacleDist = 300;
            this.nextAntDist = 200;
            this.lastMilestone = 0;
            this.celebrateTimer = 0;
            this.groundOffset = 0;
            this._timeouts = [];

            // Audio
            this.som = new SomTamandua();
            this.som.init();

            // DOM overlay
            var overlay = document.createElement('div');
            overlay.id = 'tamandua-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:' + CONF.BG + ';';

            var canvas = document.createElement('canvas');
            canvas.id = 'tamandua-canvas';
            canvas.style.cssText = 'display:block;width:100%;height:100%;';
            overlay.appendChild(canvas);

            // Score display
            var scoreDiv = document.createElement('div');
            scoreDiv.id = 'tamandua-score';
            scoreDiv.style.cssText = 'position:absolute;top:16px;right:20px;color:#fff;font-family:"JetBrains Mono","Courier New",monospace;font-size:clamp(1rem,3vw,1.5rem);text-shadow:0 0 10px rgba(210,105,30,0.6);pointer-events:none;text-align:right;';
            scoreDiv.innerHTML = '<div id="tamandua-dist" style="font-size:clamp(1.2rem,4vw,2rem);font-weight:bold;">00000</div><div id="tamandua-ants" style="margin-top:4px;color:#cc3333;font-size:clamp(0.8rem,2.5vw,1.2rem);"><span style="font-family:\'Material Icons\';font-size:inherit;vertical-align:middle;">pest_control</span> <span id="tamandua-ant-count">0</span></div>';
            overlay.appendChild(scoreDiv);

            // Close button
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = 'position:absolute;top:12px;left:12px;width:64px;height:64px;border:none;background:rgba(0,0,0,0.4);color:#fff;border-radius:50%;font-size:32px;cursor:pointer;z-index:10001;display:flex;align-items:center;justify-content:center;font-family:"Material Icons";touch-action:manipulation;';
            closeBtn.textContent = 'close';
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                self.fechar();
            });
            overlay.appendChild(closeBtn);

            document.body.appendChild(overlay);

            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');

            // Size
            this._resize();

            // Pre-compute scenery
            this._initScenery();

            // Events
            this._onResize = function () { self._resize(); self._initScenery(); };
            window.addEventListener('resize', this._onResize);

            this._onKey = function (e) {
                if (e.key === 'Escape') { self.fechar(); return; }
                if (e.key === ' ' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    self._jump();
                }
            };
            document.addEventListener('keydown', this._onKey);

            this._onTouch = function (e) {
                // Don't jump if tapping close button
                if (e.target === closeBtn) return;
                e.preventDefault();
                self._jump();
            };
            overlay.addEventListener('touchstart', this._onTouch, { passive: false });

            this._onClick = function (e) {
                if (e.target === closeBtn) return;
                self._jump();
            };
            overlay.addEventListener('click', this._onClick);

            // Start loop
            var loop = function () {
                if (!self.ctx) return;
                self._update();
                self._render();
                self.animFrame = requestAnimationFrame(loop);
            };
            this.animFrame = requestAnimationFrame(loop);
        },

        fechar: function () {
            if (this.animFrame) {
                cancelAnimationFrame(this.animFrame);
                this.animFrame = null;
            }
            if (this._onKey) {
                document.removeEventListener('keydown', this._onKey);
                this._onKey = null;
            }
            if (this._onResize) {
                window.removeEventListener('resize', this._onResize);
                this._onResize = null;
            }
            // Touch and click are on overlay, removed when overlay is removed
            this._onTouch = null;
            this._onClick = null;

            if (this.som) {
                this.som.fechar();
                this.som = null;
            }
            this._timeouts.forEach(clearTimeout);
            this._timeouts = [];

            var overlay = document.getElementById('tamandua-overlay');
            if (overlay) overlay.remove();

            this.ctx = null;
            this.canvas = null;
        },

        _resize: function () {
            if (!this.canvas) return;
            var W = window.innerWidth;
            var H = window.innerHeight;
            var dpr = window.devicePixelRatio || 1;
            this.canvas.width = W * dpr;
            this.canvas.height = H * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.W = W;
            this.H = H;
            this.groundY = H * 0.78;
            this.tamaX = W * CONF.TAMA_X;
            if (this.state === 'WAITING') {
                this.tamaY = this.groundY;
            }
        },

        _initScenery: function () {
            var W = this.W;
            var H = this.H;

            // Stars (pre-computed)
            this.stars = [];
            for (var i = 0; i < 40; i++) {
                this.stars.push({
                    x: Math.random() * W,
                    y: Math.random() * H * 0.5,
                    size: Math.random() * 1.5 + 0.5,
                    twinkle: Math.random() * Math.PI * 2,
                });
            }

            // Mountains
            this.mountains = [];
            var mx = 0;
            while (mx < W + 300) {
                var mw = 120 + Math.random() * 200;
                var mh = 50 + Math.random() * 100;
                this.mountains.push({ x: mx, w: mw, h: mh, offset: 0 });
                mx += mw * 0.6 + Math.random() * 80;
            }

            // Clouds
            this.clouds = [];
            for (var c = 0; c < 5; c++) {
                this.clouds.push({
                    x: Math.random() * W,
                    y: H * 0.1 + Math.random() * H * 0.25,
                    w: 60 + Math.random() * 100,
                    h: 20 + Math.random() * 20,
                    speed: 0.1 + Math.random() * 0.2,
                });
            }

            // Grass tufts (pre-computed relative positions)
            this.grassTufts = [];
            for (var g = 0; g < 30; g++) {
                this.grassTufts.push({
                    offset: Math.random() * W * 2,
                    h: 4 + Math.random() * 8,
                    blades: 2 + Math.floor(Math.random() * 3),
                });
            }

            // Ground pebbles
            this.groundPebbles = [];
            for (var p = 0; p < 20; p++) {
                this.groundPebbles.push({
                    offset: Math.random() * W * 2,
                    y: 2 + Math.random() * 10,
                    r: 1 + Math.random() * 2,
                });
            }
        },

        _jump: function () {
            if (this.state === 'WAITING') {
                // Start game
                this.state = 'RUNNING';
                this.speed = CONF.INITIAL_SPEED;
                this.distance = 0;
                this.score = 0;
                this.obstacles = [];
                this.ants = [];
                this.nextObstacleDist = 300;
                this.nextAntDist = 150;
                if (this.som) this.som.pulo();
                this.tamaVY = CONF.JUMP_VELOCITY;
                this.grounded = false;
                return;
            }

            // In air: fast-fall
            if (!this.grounded && this.coyoteCounter <= 0) {
                this.tamaVY += CONF.GRAVITY * CONF.SPEED_DROP_COEFF;
                return;
            }

            // Jump (grounded or coyote time)
            if (this.grounded || this.coyoteCounter > 0) {
                this.tamaVY = CONF.JUMP_VELOCITY;
                this.grounded = false;
                this.coyoteCounter = 0;
                if (this.som) this.som.pulo();
            }
        },

        _update: function () {
            this.frameCount++;

            if (this.state === 'WAITING') return;

            var gY = this.groundY;

            // Speed increase
            if (this.stumbleTimer > 0) {
                this.stumbleTimer--;
                if (this.stumbleTimer <= 0) {
                    this.state = 'RUNNING';
                }
            } else {
                if (this.speed < CONF.MAX_SPEED) {
                    this.speed += CONF.ACCELERATION;
                }
            }

            var effectiveSpeed = this.stumbleTimer > 0 ? this.speed * CONF.STUMBLE_SPEED_MULT : this.speed;

            // Distance
            this.distance += effectiveSpeed;
            this.groundOffset += effectiveSpeed;

            // Invincibility
            if (this.invincibleTimer > 0) this.invincibleTimer--;

            // Tongue timer
            if (this.tongueTimer > 0) this.tongueTimer--;

            // Gravity / jump
            this.tamaVY += CONF.GRAVITY;
            this.tamaY += this.tamaVY;

            // Ground collision
            if (this.tamaY >= gY) {
                if (!this.grounded) {
                    // Landing
                    this.grounded = true;
                    if (this.som) this.som.pouso();
                    this._spawnDust(this.tamaX, gY);
                }
                this.tamaY = gY;
                this.tamaVY = 0;
                this.coyoteCounter = CONF.COYOTE_FRAMES;
            } else {
                this.grounded = false;
                if (this.coyoteCounter > 0) this.coyoteCounter--;
            }

            // Step sound
            if (this.grounded && this.stumbleTimer <= 0) {
                if (this.som) this.som.passo();
            }

            // Screen shake decay
            if (this.shakeIntensity > 0) {
                this.shakeIntensity *= 0.85;
                this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
                this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
                if (this.shakeIntensity < 0.5) {
                    this.shakeIntensity = 0;
                    this.shakeX = 0;
                    this.shakeY = 0;
                }
            }

            // Spawn obstacles
            if (this.distance >= this.nextObstacleDist) {
                this._spawnObstacle();
                var minGap = Math.max(CONF.MIN_GAP, CONF.MAX_GAP - this.speed * CONF.GAP_SPEED_FACTOR);
                var maxGap = minGap + 80;
                this.nextObstacleDist = this.distance + minGap + Math.random() * (maxGap - minGap);
            }

            // Spawn ants
            if (this.distance >= this.nextAntDist) {
                this._spawnAnt();
                this.nextAntDist = this.distance + 150 + Math.random() * 200;
            }

            // Update obstacles
            for (var oi = this.obstacles.length - 1; oi >= 0; oi--) {
                var o = this.obstacles[oi];
                o.x -= effectiveSpeed;
                if (o.x + o.w < -50) {
                    this.obstacles.splice(oi, 1);
                    continue;
                }

                // Collision check
                if (this.invincibleTimer <= 0) {
                    var tx = this.tamaX;
                    var ty = this.tamaY;
                    var tw = this.tamaW * 0.6; // Forgiving hitbox
                    var th = this.tamaH * 0.7;

                    if (tx + tw / 2 > o.x + o.w * 0.1 &&
                        tx - tw / 2 < o.x + o.w * 0.9 &&
                        ty > o.y + o.h * 0.1 &&
                        ty - th < o.y + o.h) {
                        this._stumble();
                    }
                }
            }

            // Update ants
            for (var ai = this.ants.length - 1; ai >= 0; ai--) {
                var a = this.ants[ai];
                a.x -= effectiveSpeed;
                a.frame++;
                if (a.x < -30) {
                    this.ants.splice(ai, 1);
                    continue;
                }

                // Collection check
                var dx = this.tamaX + this.tamaW * 0.3 - a.x;
                var dy = this.tamaY - this.tamaH * 0.3 - a.y;
                if (Math.sqrt(dx * dx + dy * dy) < 40) {
                    this.score++;
                    this.tongueTimer = 15;
                    this.ants.splice(ai, 1);
                    if (this.som) this.som.coletar();
                    this._updateScoreUI();
                    this._spawnCollectParticles(a.x, a.y);

                    if (this.score % CONF.CELEBRATE_EVERY === 0) {
                        this._celebrate();
                    }
                }
            }

            // Update particles
            for (var pi = this.particles.length - 1; pi >= 0; pi--) {
                var p = this.particles[pi];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // particle gravity
                p.life -= p.decay;
                if (p.life <= 0) {
                    this.particles.splice(pi, 1);
                }
            }

            // Clouds scroll
            for (var ci = 0; ci < this.clouds.length; ci++) {
                this.clouds[ci].x -= effectiveSpeed * this.clouds[ci].speed;
                if (this.clouds[ci].x + this.clouds[ci].w < 0) {
                    this.clouds[ci].x = this.W + 50;
                }
            }

            // Mountains parallax
            for (var mi = 0; mi < this.mountains.length; mi++) {
                this.mountains[mi].offset += effectiveSpeed * 0.15;
            }

            // Distance milestones
            var distScore = Math.floor(this.distance / 10);
            var milestoneCheck = Math.floor(distScore / 100);
            if (milestoneCheck > this.lastMilestone) {
                this.lastMilestone = milestoneCheck;
                if (this.som) this.som.milestone();
                // Flash distance display
                var distEl = document.getElementById('tamandua-dist');
                if (distEl) {
                    distEl.style.color = '#fde047';
                    var t = this._timeouts;
                    t.push(setTimeout(function () {
                        if (distEl) distEl.style.color = '#fff';
                    }, 300));
                }
            }

            // Update distance display
            var distEl2 = document.getElementById('tamandua-dist');
            if (distEl2) {
                distEl2.textContent = String(distScore).padStart(5, '0');
            }

            // Celebration timer
            if (this.celebrateTimer > 0) this.celebrateTimer--;
        },

        _stumble: function () {
            this.state = 'STUMBLE';
            this.stumbleTimer = CONF.STUMBLE_DURATION;
            this.invincibleTimer = CONF.INVINCIBLE_FRAMES;
            this.shakeIntensity = 8;
            if (this.som) this.som.tropeco();

            // Impact particles
            for (var i = 0; i < 6; i++) {
                this.particles.push({
                    x: this.tamaX + this.tamaW * 0.3,
                    y: this.tamaY - this.tamaH * 0.3,
                    vx: (Math.random() - 0.3) * 4,
                    vy: -(Math.random() * 3 + 1),
                    life: 1,
                    decay: 0.03,
                    color: '#fde047',
                    size: 2 + Math.random() * 3,
                });
            }
        },

        _spawnDust: function (x, y) {
            for (var i = 0; i < 6; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 20,
                    y: y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -(Math.random() * 2 + 0.5),
                    life: 0.8,
                    decay: 0.025,
                    color: 'rgba(150,130,100,0.6)',
                    size: 2 + Math.random() * 3,
                });
            }
        },

        _spawnCollectParticles: function (x, y) {
            for (var i = 0; i < 5; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: -(Math.random() * 4 + 1),
                    life: 1,
                    decay: 0.03,
                    color: '#34d399',
                    size: 2 + Math.random() * 2,
                });
            }
        },

        _spawnObstacle: function () {
            var W = this.W;
            var gY = this.groundY;
            var dist = this.distance;

            // Determine available types
            var types = ['log_small'];
            if (dist > 500) types.push('log_big', 'rock');
            if (dist > 1500) types.push('anthill');

            var type = types[Math.floor(Math.random() * types.length)];
            var w, h, drawType;

            if (type === 'log_small') {
                w = 28 + Math.random() * 8;
                h = 35 + Math.random() * 10;
                drawType = 'log';
            } else if (type === 'log_big') {
                w = 38 + Math.random() * 12;
                h = 50 + Math.random() * 15;
                drawType = 'log';
            } else if (type === 'rock') {
                w = 35 + Math.random() * 15;
                h = 35 + Math.random() * 20;
                drawType = 'rock';
            } else {
                w = 40 + Math.random() * 15;
                h = 50 + Math.random() * 20;
                drawType = 'anthill';
            }

            this.obstacles.push({
                x: W + 20,
                y: gY - h,
                w: w,
                h: h,
                type: drawType,
            });
        },

        _spawnAnt: function () {
            var gY = this.groundY;
            // Ants on ground or floating
            var floating = Math.random() > 0.6;
            var ay = floating ? gY - 40 - Math.random() * 60 : gY - 8;

            this.ants.push({
                x: this.W + 20,
                y: ay,
                frame: 0,
                size: 5 + Math.random() * 3,
            });
        },

        _celebrate: function () {
            this.celebrateTimer = 90;
            if (this.som) this.som.celebrar();

            // Confetti
            var W = this.W;
            var colors = ['#fde047', '#f472b6', '#38bdf8', '#34d399', '#fb923c', '#818cf8'];
            for (var i = 0; i < 25; i++) {
                this.particles.push({
                    x: W / 2 + (Math.random() - 0.5) * W * 0.5,
                    y: this.H * 0.3,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -(Math.random() * 6 + 2),
                    life: 1,
                    decay: 0.008 + Math.random() * 0.008,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 3 + Math.random() * 5,
                });
            }
        },

        _updateScoreUI: function () {
            var el = document.getElementById('tamandua-ant-count');
            if (el) el.textContent = this.score;
            var scoreDiv = document.getElementById('tamandua-score');
            if (scoreDiv) {
                scoreDiv.style.transform = 'scale(1.3)';
                var self = this;
                self._timeouts.push(setTimeout(function () {
                    if (scoreDiv) scoreDiv.style.transform = 'scale(1)';
                }, 150));
            }
        },

        _render: function () {
            var ctx = this.ctx;
            var W = this.W;
            var H = this.H;
            var gY = this.groundY;

            ctx.save();

            // Screen shake
            if (this.shakeIntensity > 0) {
                ctx.translate(this.shakeX, this.shakeY);
            }

            // ---- Sky gradient ----
            // Progresses with speed
            var speedRatio = Math.min(1, this.speed / CONF.MAX_SPEED);
            var skyR = 10 + speedRatio * 15;
            var skyG = 10 + speedRatio * 5;
            var skyB = 46 + speedRatio * 20;
            var grad = ctx.createLinearGradient(0, 0, 0, gY);
            grad.addColorStop(0, 'rgb(' + Math.floor(skyR) + ',' + Math.floor(skyG) + ',' + Math.floor(skyB) + ')');
            grad.addColorStop(1, CONF.SKY_BOTTOM);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // ---- Stars ----
            var starAlpha = Math.max(0, 1 - speedRatio * 1.5);
            if (starAlpha > 0) {
                ctx.fillStyle = CONF.STAR_COLOR;
                for (var si = 0; si < this.stars.length; si++) {
                    var star = this.stars[si];
                    var twinkle = Math.sin(this.frameCount * 0.03 + star.twinkle) * 0.4 + 0.6;
                    ctx.globalAlpha = starAlpha * twinkle;
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // ---- Clouds ----
            ctx.fillStyle = CONF.CLOUD_COLOR;
            for (var ci = 0; ci < this.clouds.length; ci++) {
                var cl = this.clouds[ci];
                ctx.beginPath();
                ctx.ellipse(cl.x, cl.y, cl.w / 2, cl.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cl.x - cl.w * 0.3, cl.y + 5, cl.w * 0.3, cl.h * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cl.x + cl.w * 0.25, cl.y + 3, cl.w * 0.25, cl.h * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- Mountains ----
            for (var mi = 0; mi < this.mountains.length; mi++) {
                var m = this.mountains[mi];
                var mx = ((m.x - m.offset) % (W + m.w + 300));
                if (mx < -m.w) mx += W + m.w + 300;

                ctx.fillStyle = CONF.MOUNTAIN_COLOR;
                ctx.beginPath();
                ctx.moveTo(mx, gY);
                ctx.lineTo(mx + m.w * 0.3, gY - m.h * 0.7);
                ctx.lineTo(mx + m.w * 0.5, gY - m.h);
                ctx.lineTo(mx + m.w * 0.7, gY - m.h * 0.6);
                ctx.lineTo(mx + m.w, gY);
                ctx.closePath();
                ctx.fill();

                // Mountain highlight
                ctx.fillStyle = CONF.MOUNTAIN_LIGHT;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(mx + m.w * 0.5, gY - m.h);
                ctx.lineTo(mx + m.w * 0.55, gY - m.h * 0.85);
                ctx.lineTo(mx + m.w * 0.65, gY - m.h * 0.65);
                ctx.lineTo(mx + m.w * 0.5, gY - m.h * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // ---- Ground ----
            ctx.fillStyle = CONF.GROUND_COLOR;
            ctx.fillRect(0, gY, W, H - gY);

            // Ground top line (grass border)
            ctx.fillStyle = CONF.GRASS_COLOR;
            ctx.fillRect(0, gY - 2, W, 4);

            // Grass tufts
            var gOffset = this.groundOffset % (W * 2);
            ctx.strokeStyle = CONF.GRASS_TIP;
            ctx.lineWidth = 1.5;
            for (var gi = 0; gi < this.grassTufts.length; gi++) {
                var gt = this.grassTufts[gi];
                var gx = ((gt.offset - gOffset) % (W * 2));
                if (gx < -20) gx += W * 2;
                if (gx > W + 20) continue;

                for (var b = 0; b < gt.blades; b++) {
                    var bx = gx + b * 3;
                    var angle = Math.sin(this.frameCount * 0.05 + gi) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(bx, gY);
                    ctx.lineTo(bx + Math.sin(angle) * gt.h * 0.5, gY - gt.h);
                    ctx.stroke();
                }
            }

            // Ground pebbles
            ctx.fillStyle = 'rgba(80,80,60,0.3)';
            for (var pi = 0; pi < this.groundPebbles.length; pi++) {
                var pb = this.groundPebbles[pi];
                var px = ((pb.offset - gOffset) % (W * 2));
                if (px < -10) px += W * 2;
                if (px > W + 10) continue;
                ctx.beginPath();
                ctx.arc(px, gY + pb.y, pb.r, 0, Math.PI * 2);
                ctx.fill();
            }

            // Dirt texture lines
            ctx.strokeStyle = CONF.DIRT_COLOR;
            ctx.lineWidth = 0.5;
            for (var dl = 0; dl < 5; dl++) {
                var dlx = ((dl * W * 0.4 - gOffset * 0.8) % (W * 2.5));
                if (dlx < -W) dlx += W * 2.5;
                ctx.beginPath();
                ctx.moveTo(dlx, gY + 15 + dl * 12);
                ctx.lineTo(dlx + 30 + dl * 10, gY + 15 + dl * 12);
                ctx.stroke();
            }

            // ---- Obstacles ----
            for (var oi = 0; oi < this.obstacles.length; oi++) {
                desenharObstaculo(ctx, this.obstacles[oi]);
            }

            // ---- Ants ----
            for (var ai = 0; ai < this.ants.length; ai++) {
                var ant = this.ants[ai];
                desenharFormiga(ctx, ant.x, ant.y, ant.frame, ant.size);
            }

            // ---- Tamandua ----
            // Blink during invincibility
            if (this.invincibleTimer > 0 && this.frameCount % 6 < 3) {
                ctx.globalAlpha = 0.4;
            }

            var tamaState = this.stumbleTimer > 0 ? 'STUMBLE' :
                            !this.grounded ? 'JUMP' : 'RUN';

            desenharTamandua(
                ctx,
                this.tamaX,
                this.tamaY,
                this.tamaW,
                this.tamaH,
                this.frameCount,
                tamaState,
                this.tongueTimer,
                1 // lookDir: always looking right
            );
            ctx.globalAlpha = 1;

            // ---- Particles ----
            for (var pai = 0; pai < this.particles.length; pai++) {
                var pt = this.particles[pai];
                ctx.globalAlpha = Math.max(0, pt.life);
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // ---- Stumble flash ----
            if (this.stumbleTimer > 0) {
                var flashAlpha = 0.2 * (this.stumbleTimer / CONF.STUMBLE_DURATION);
                ctx.fillStyle = 'rgba(255,80,50,' + flashAlpha + ')';
                ctx.fillRect(0, 0, W, H);
            }

            // ---- Celebration ----
            if (this.celebrateTimer > 0) {
                var cAlpha = Math.min(1, this.celebrateTimer / 30);
                ctx.globalAlpha = cAlpha;
                ctx.fillStyle = '#fde047';
                ctx.font = 'bold clamp(2rem,8vw,4rem) "Russo One",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#fde047';
                ctx.shadowBlur = 30;
                ctx.fillText('Parabens!', W / 2, H * 0.3);
                ctx.font = 'clamp(1rem,4vw,1.8rem) "Russo One",sans-serif';
                ctx.fillStyle = '#D2691E';
                ctx.shadowColor = '#D2691E';
                ctx.shadowBlur = 15;
                ctx.fillText(this.score + ' formigas!', W / 2, H * 0.3 + 50);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }

            // ---- Waiting screen ----
            if (this.state === 'WAITING') {
                // Pulsing text
                var pulse = Math.sin(this.frameCount * 0.06) * 0.3 + 0.7;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold clamp(1.2rem,5vw,2.5rem) "Russo One",sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#D2691E';
                ctx.shadowBlur = 20;
                ctx.fillText('Toque para correr!', W / 2, H * 0.45);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;

                // Draw tamandua standing
                desenharTamandua(
                    ctx,
                    this.tamaX,
                    this.tamaY,
                    this.tamaW,
                    this.tamaH,
                    0, // no animation
                    'RUN',
                    0,
                    1
                );
            }

            ctx.restore();
        },
    };

    window.TamanduaGame = TamanduaGame;
})();

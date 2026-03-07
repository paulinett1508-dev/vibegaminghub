// =====================================================================
// sonic.js — Jogo Sonic Runner v2.0 (Green Hill Zone)
// =====================================================================
// Fisica baseada no Retro Engine / Sonic 1 (Sega Genesis)
// Spin Dash, spin-invincibility, molas, 3 tipos de inimigo
// Tap/Space = pular | Botao SD / Z = spin dash | ESC = sair
// Inspirado em: EmanuelNogueira/Sonic_game, RSDKModding/RSDKv4-Decompilation
// =====================================================================

(function () {
    'use strict';

    // ---- Fisica (valores Retro Engine escalados para canvas px/frame) ----
    var PHY = {
        JUMP:          -13.5,   // velocidade inicial do pulo
        GRAVITY:        0.40,   // gravidade (0.21875 * 2 escala)
        SPRING:        -19,     // boost da mola
        SD_BASE:        8,      // velocidade base do spin dash
        SD_PER_LEVEL:   1.3,    // velocidade extra por nivel de carga
        SD_MAX_LEVEL:   8,
        SD_FRAMES_PER_LEVEL: 10, // frames por nivel de carga
        SD_BOOST_DURATION:  45, // frames de boost ao soltar
        WORLD_INIT:     5.5,
        WORLD_MAX:      13,
        WORLD_ACCEL:    0.003,
    };

    // ---- Cores (paleta Green Hill Zone autentica) ----
    var C = {
        SKY_TOP:    '#4878C8', SKY_BOT:    '#98C8F8',
        HILL_FAR:   '#3858A8', HILL_MID:   '#3A7028', HILL_NEAR:  '#509040',
        CHECK_D:    '#7A4818', CHECK_L:    '#A06828',
        GROUND_G:   '#509040', GROUND_DG:  '#387028', GROUND_B:   '#985820',
        CLOUD:      'rgba(255,255,255,0.90)',
        BLUE:       '#1E50D8', BLUE_D:     '#143898', BLUE_L:     '#4070F8',
        BELLY:      '#F0C060', MUZZLE:     '#E8B040',
        EYE_W:      '#FFFFFF', EYE_G:      '#185818', EYE_P:      '#08080E',
        GLOVE:      '#F8F8F8',
        SHOE:       '#C02020', SHOE_W:     '#E0E0D8', BUCKLE:     '#F0D020',
        RING:       '#F8B800', RING_L:     '#FFE040',
    };

    // ---- Variaveis globais ----
    var overlay, canvas, ctx, W, H, GY;
    var animFrame = null, ac = null;
    var _kh = null, _th = null, _rh = null;
    var inputJump = false, inputSD = false;
    var sdBtnEl = null;
    var S; // estado do jogo

    // ---- Estado inicial ----
    function initState() {
        GY = H * 0.62;
        S = {
            t: 0, scroll: 0,
            worldSpeed: PHY.WORLD_INIT,
            sdBoostFrames: 0, sdBoostVal: 0,

            // Sonic
            x: W * 0.22, y: GY,
            ysp: 0, onGround: true,
            phase: 'run', // run|jump|roll|spindash|hurt
            sdLevel: 0, sdHoldTimer: 0,
            hurtTimer: 0,

            // Stats
            rings: 0, score: 0,
            invincible: 0, celebrating: 0,

            // Objetos
            ringItems: [], obstacles: [],
            scattered: [], confetti: [],
            dust: [], popups: [],

            // Spawn
            nextRing: 80, nextObs: 160, obsInterval: 160,
        };
    }

    // ---- Audio ----
    function initAC() {
        if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
        if (ac && ac.state === 'suspended') ac.resume();
    }

    function tone(f1, f2, dur, type, vol, delay) {
        if (!ac) return;
        var o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = type || 'sine';
        var t0 = ac.currentTime + (delay || 0);
        o.frequency.setValueAtTime(f1, t0);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur * 0.85);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.05);
    }

    // Som autentico do anel Sonic (dois tons ascendentes)
    function sfxRing()      { tone(880, null, 0.07, 'sine', 0.18); tone(1760, null, 0.16, 'sine', 0.12, 0.07); }
    function sfxJump()      { tone(300, 620, 0.18, 'square', 0.12); }
    function sfxSpring()    { tone(380, 1200, 0.12, 'sine', 0.18); tone(1200, 750, 0.2, 'sine', 0.12, 0.12); }
    function sfxHurt()      { tone(240, 75, 0.42, 'sawtooth', 0.14); }
    function sfxSDCharge(l) { tone(160 + l * 50, 200 + l * 50, 0.1, 'sawtooth', 0.07); }
    function sfxSDRelease() { tone(380, 900, 0.22, 'square', 0.14); }
    function sfxEnemy()     { tone(350, 140, 0.14, 'triangle', 0.13); }
    function sfxCelebrate() {
        [523, 659, 784, 1047].forEach(function (f, i) { tone(f, null, 0.2, 'triangle', 0.13, i * 0.09); });
    }

    // ---- Spawn ----
    function spawnRings() {
        var count = 2 + Math.floor(Math.random() * 4);
        var sx = W + 55;
        var pattern = Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var ry = pattern === 0 ? GY - 22 - Math.random() * 55
                   : pattern === 1 ? GY - 20 - i * 24
                   : GY - 28;
            S.ringItems.push({ x: sx + (pattern === 2 ? i * 30 : i * 22), y: ry, ph: Math.random() * 6.28 });
        }
    }

    function spawnObstacle() {
        // Pesos: crabmeat 30%, motobug 30%, spike 25%, spring 15%
        var r = Math.random(), type;
        if      (r < 0.30) type = 'crabmeat';
        else if (r < 0.60) type = 'motobug';
        else if (r < 0.85) type = 'spike';
        else               type = 'spring';
        S.obstacles.push({ x: W + 90, y: GY, type: type, t: 0, compressed: 0 });
    }

    function spawnConfetti() {
        var cols = ['#F8B800','#F472B6','#38BDF8','#34D399','#A855F7','#FB923C'];
        for (var i = 0; i < 36; i++) {
            S.confetti.push({
                x: S.x, y: S.y - 25,
                vx: (Math.random() - 0.5) * 13, vy: -2 - Math.random() * 9,
                color: cols[Math.floor(Math.random() * cols.length)],
                size: 4 + Math.random() * 4, life: 55 + Math.floor(Math.random() * 20),
            });
        }
    }

    // ---- Update / Fisica ----
    function update() {
        S.t++;

        // Velocidade do mundo (aumenta com o tempo)
        S.worldSpeed = Math.min(PHY.WORLD_MAX, PHY.WORLD_INIT + S.t * PHY.WORLD_ACCEL);

        // Velocidade de scroll = mundo + boost do spin dash
        var sp = S.worldSpeed;
        if (S.sdBoostFrames > 0) {
            sp += S.sdBoostVal * (S.sdBoostFrames / PHY.SD_BOOST_DURATION);
            S.sdBoostFrames--;
        }
        S.scroll += sp;

        // ---- Maquina de estados do Sonic ----

        // Spin Dash
        if (S.phase === 'spindash') {
            if (inputSD) {
                S.sdHoldTimer++;
                if (S.sdHoldTimer % PHY.SD_FRAMES_PER_LEVEL === 0 && S.sdLevel < PHY.SD_MAX_LEVEL) {
                    S.sdLevel++;
                    sfxSDCharge(S.sdLevel);
                }
                if (S.t % 3 === 0) addDust(S.x - 15, S.y - 10, -2, (Math.random() - 0.5) * 2, 14);
            } else {
                // Soltar: calcular boost e mudar para roll
                S.sdBoostVal    = PHY.SD_BASE + S.sdLevel * PHY.SD_PER_LEVEL;
                S.sdBoostFrames = PHY.SD_BOOST_DURATION;
                S.sdLevel = 0; S.sdHoldTimer = 0;
                S.phase = 'roll';
                sfxSDRelease();
                for (var b = 0; b < 18; b++) addDust(S.x - 20, S.y - 10, -(Math.random() * 7 + 2), (Math.random() - 0.5) * 5, 22);
            }
        } else if (inputSD && S.onGround && S.phase !== 'hurt') {
            S.phase = 'spindash'; S.sdLevel = 0; S.sdHoldTimer = 0;
            sfxSDCharge(0);
        }

        // Pulo
        if (inputJump) {
            if (S.onGround && S.phase !== 'spindash' && S.phase !== 'hurt') {
                S.ysp = PHY.JUMP; S.onGround = false;
                S.phase = 'jump'; sfxJump();
            }
            inputJump = false;
        }

        // Fisica vertical
        if (!S.onGround) {
            S.ysp += PHY.GRAVITY;
            S.y   += S.ysp;
            if (S.y >= GY) {
                S.y = GY; S.ysp = 0; S.onGround = true;
                if (S.phase === 'jump') S.phase = 'run';
                else if (S.phase === 'roll' && S.sdBoostFrames <= 0) S.phase = 'run';
            }
        }

        // Roll termina quando boost acaba
        if (S.phase === 'roll' && S.sdBoostFrames <= 0 && S.onGround) S.phase = 'run';

        // Hurt timer
        if (S.phase === 'hurt') {
            S.hurtTimer++;
            if (S.hurtTimer > 55) { S.phase = 'run'; S.hurtTimer = 0; }
        }

        if (S.invincible > 0) S.invincible--;

        // ---- Spawn ----
        if (--S.nextRing <= 0) { spawnRings(); S.nextRing = 80; }
        if (--S.nextObs  <= 0) {
            spawnObstacle();
            S.obsInterval = Math.max(50, S.obsInterval * 0.968);
            S.nextObs = Math.floor(S.obsInterval);
        }

        // ---- Aneis ----
        S.ringItems = S.ringItems.filter(function (r) {
            r.x -= sp;
            if (S.phase !== 'hurt') {
                var dx = r.x - S.x, dy = r.y - S.y;
                if (dx * dx + dy * dy < 32 * 32) {
                    S.rings++; S.score += 10; sfxRing();
                    if (S.rings % 10 === 0) { S.celebrating = 70; sfxCelebrate(); spawnConfetti(); }
                    return false;
                }
            }
            return r.x > -30;
        });

        // ---- Obstaculos ----
        var isSpinning = S.phase === 'jump' || S.phase === 'roll';

        S.obstacles = S.obstacles.filter(function (o) {
            o.x -= sp; o.t++;
            if (o.compressed > 0) o.compressed = Math.max(0, o.compressed - 0.09);

            var dx = Math.abs(o.x - S.x);
            var dy = Math.abs((o.y - 28) - S.y);

            if (o.type === 'spring') {
                // Mola: ativar ao cair sobre ela
                if (dx < 22 && Math.abs(o.y - 20 - S.y) < 22 && S.ysp >= -1) {
                    o.compressed = 1;
                    S.ysp = PHY.SPRING; S.phase = 'jump'; S.onGround = false;
                    sfxSpring();
                }
                return o.x > -70;
            }

            var isEnemy = o.type === 'crabmeat' || o.type === 'motobug';
            var hitW = o.type === 'spike' ? 32 : 28;
            var hitH = o.type === 'spike' ? 36 : 40;

            if (S.invincible === 0 && S.phase !== 'hurt' && dx < hitW && dy < hitH) {
                if (isSpinning && isEnemy) {
                    // Derrotar inimigo girando!
                    S.ysp = -8; S.onGround = false;
                    S.score += 100; sfxEnemy();
                    S.popups.push({ x: o.x, y: o.y - 42, text: '+100', life: 42 });
                    addDust(o.x, o.y - 20, 0, -3, 20);
                    return false;
                } else if (!isSpinning || o.type === 'spike') {
                    // Levar dano
                    S.invincible = 120; S.phase = 'hurt'; S.hurtTimer = 0;
                    S.ysp = -9; S.onGround = false;
                    var lost = Math.min(S.rings, 3 + Math.floor(Math.random() * 5));
                    for (var i = 0; i < lost; i++) {
                        var ang = (i / Math.max(lost, 1)) * Math.PI * 2;
                        S.scattered.push({ x: S.x, y: S.y - 20, vx: Math.cos(ang) * 5.5, vy: Math.sin(ang) * 5.5 - 3, life: 65, t: 0 });
                    }
                    S.rings = Math.max(0, S.rings - lost); sfxHurt();
                }
            }
            return o.x > -85;
        });

        // Aneis espalhados
        S.scattered = S.scattered.filter(function (r) {
            r.x += r.vx - sp * 0.35; r.vy += 0.28; r.y += r.vy; r.t++; r.life--;
            return r.life > 0;
        });

        // Poeira
        S.dust = S.dust.filter(function (p) {
            p.x += p.vx - sp * 0.18; p.vy += 0.06; p.y += p.vy; p.life--;
            return p.life > 0;
        });

        // Confetti
        if (S.celebrating > 0) S.celebrating--;
        S.confetti = S.confetti.filter(function (c) {
            c.x += c.vx - sp * 0.12; c.vy += 0.2; c.y += c.vy; c.life--;
            return c.life > 0;
        });

        // Popups de pontuacao
        S.popups = S.popups.filter(function (p) { p.x -= sp; p.y -= 0.6; p.life--; return p.life > 0; });
    }

    function addDust(x, y, vx, vy, life) {
        S.dust.push({ x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life });
    }

    // ---- Render principal ----
    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawBG();

        // Aneis do nivel
        S.ringItems.forEach(function (r) { drawRing(r.x, r.y, r.ph); });

        // Aneis espalhados (piscando)
        S.scattered.forEach(function (r) {
            ctx.globalAlpha = (r.life / 65) * (Math.floor(r.t / 4) % 2 === 0 ? 1 : 0.4);
            drawRing(r.x, r.y, 0);
            ctx.globalAlpha = 1;
        });

        // Poeira
        S.dust.forEach(function (p) {
            ctx.globalAlpha = (p.life / p.maxLife) * 0.55;
            ctx.fillStyle = '#C8906A';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 + (1 - p.life / p.maxLife) * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Obstaculos
        S.obstacles.forEach(drawObstacle);

        // Confetti
        S.confetti.forEach(function (c) {
            ctx.globalAlpha = c.life / 70;
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
        });
        ctx.globalAlpha = 1;

        // Sonic
        drawSonic();

        // Popups
        S.popups.forEach(function (p) {
            ctx.globalAlpha = p.life / 42;
            ctx.fillStyle = '#FFE040';
            ctx.font = 'bold 16px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.globalAlpha = 1;
        });

        drawHUD();
        if (S.celebrating > 0) drawCelebration();
    }

    // ================================================================
    // BACKGROUND — Green Hill Zone, 4 camadas de parallax
    // ================================================================

    function drawBG() {
        var sc = S.scroll;

        // Ceu
        var skyG = ctx.createLinearGradient(0, 0, 0, GY * 0.9);
        skyG.addColorStop(0, C.SKY_TOP);
        skyG.addColorStop(1, C.SKY_BOT);
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, W, GY + 5);

        // Nuvens (parallax 0.05)
        drawClouds(sc * 0.05);

        // Colinas distantes azuladas (parallax 0.15)
        drawHills(sc * 0.15, C.HILL_FAR, GY * 0.45, 170, W * 0.65);

        // Colinas medias verdes (parallax 0.30)
        drawHills(sc * 0.30, C.HILL_MID, GY * 0.58, 130, W * 0.48);

        // Colinas proximas (parallax 0.55)
        drawHills(sc * 0.55, C.HILL_NEAR, GY * 0.70, 95, W * 0.38);

        // Tabuleiro de xadrez — parede do cliff (parallax 0.75)
        drawCheckerboard(sc * 0.75);

        // Chao
        var cliffBot = GY + 4 * 20;
        ctx.fillStyle = C.GROUND_G;
        ctx.fillRect(0, cliffBot, W, 15);
        ctx.fillStyle = C.GROUND_DG;
        ctx.fillRect(0, cliffBot + 15, W, 10);
        ctx.fillStyle = C.GROUND_B;
        ctx.fillRect(0, cliffBot + 25, W, H - cliffBot - 25);
    }

    function drawClouds(off) {
        var defs = [
            { rx: 0.10, ry: 0.08, w: 95,  h: 30 },
            { rx: 0.38, ry: 0.05, w: 130, h: 38 },
            { rx: 0.68, ry: 0.09, w: 88,  h: 26 },
            { rx: 0.88, ry: 0.06, w: 105, h: 33 },
            { rx: 1.20, ry: 0.11, w: 72,  h: 22 },
        ];
        ctx.fillStyle = C.CLOUD;
        defs.forEach(function (d) {
            var cx = ((d.rx * W - off) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
            cloud(cx, d.ry * H, d.w, d.h);
        });
    }

    function cloud(x, y, w, h) {
        ctx.beginPath();
        ctx.arc(x,            y,          h * 0.55, 0, Math.PI * 2);
        ctx.arc(x + w * 0.22, y - h * 0.2, h * 0.45, 0, Math.PI * 2);
        ctx.arc(x + w * 0.46, y - h * 0.1, h * 0.50, 0, Math.PI * 2);
        ctx.arc(x + w * 0.72, y - h * 0.05, h * 0.42, 0, Math.PI * 2);
        ctx.arc(x + w,        y,          h * 0.40, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawHills(off, color, centerY, r, period) {
        ctx.fillStyle = color;
        for (var i = -1; i < 5; i++) {
            var hx = i * period - (off % period) + period * 0.5;
            ctx.beginPath();
            ctx.arc(hx, centerY + r * 0.3, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCheckerboard(off) {
        var sz = 20, rows = 4;
        var colOff = off % (sz * 2);
        for (var row = 0; row < rows; row++) {
            for (var col = -2; col < Math.ceil(W / sz) + 3; col++) {
                var cx = col * sz - colOff;
                var cy = GY + row * sz;
                ctx.fillStyle = (col + row) % 2 === 0 ? C.CHECK_L : C.CHECK_D;
                ctx.fillRect(cx, cy, sz, sz);
            }
        }
    }

    // ================================================================
    // SONIC — desenho procedural (proporcoes classicas 16-bit)
    // ================================================================
    //
    // Proporcoes (pes em y=0):
    //   Sapato topo:   y=-8    Body centro:   y=-20   Head centro:   y=-38
    //   Espinho topo:  y=-60   Largura total: ~50px
    //
    // Cores fieis ao sprite original Genesis

    function drawSonic() {
        ctx.save();
        ctx.translate(S.x, S.y);

        // Piscar quando invencivel
        if (S.invincible > 0 && Math.floor(S.t / 4) % 2 === 1) ctx.globalAlpha = 0.32;

        switch (S.phase) {
            case 'spindash': sonicSD();      break;
            case 'jump':
            case 'roll':     sonicSpin();    break;
            case 'hurt':     sonicHurt();    break;
            default:         sonicRun();     break;
        }

        ctx.restore();
    }

    // ---- Pose de corrida ----
    function sonicRun() {
        // Angulo de inclinacao baseado na velocidade do scroll
        var sp = S.worldSpeed + (S.sdBoostFrames > 0 ? S.sdBoostVal * (S.sdBoostFrames / PHY.SD_BOOST_DURATION) : 0);
        var lean = Math.min(sp / PHY.WORLD_MAX * 0.32, 0.28);
        ctx.rotate(lean);

        // Ciclo de pernas
        var cyc = (S.t * (0.13 + sp * 0.025)) % (Math.PI * 2);
        var la  = Math.sin(cyc) * 13;       // perna A
        var lb  = -Math.sin(cyc) * 13;      // perna B
        var armSwing = Math.sin(cyc + Math.PI) * 9;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.beginPath(); ctx.ellipse(2, 1, 19, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Pernas
        leg(ctx, -4 + la * 0.28, -8, la * 0.025);
        leg(ctx,  5 + lb * 0.28, -8, lb * 0.025);

        // Sapatos
        shoe(ctx, -5 + la * 0.52, 0, la * 0.018);
        shoe(ctx,  6 + lb * 0.52, 0, lb * 0.018);

        // Corpo
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.ellipse(1, -19, 13, 16, 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.ellipse(0, -20, 12, 15, 0.05, 0, Math.PI * 2); ctx.fill();

        // Barriga
        ctx.fillStyle = C.BELLY;
        ctx.beginPath(); ctx.ellipse(4, -17, 7, 10, 0.12, 0, Math.PI * 2); ctx.fill();

        // Braco (visivel, swing)
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.ellipse(4 + armSwing * 0.28, -21, 5, 9, armSwing * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.ellipse(3 + armSwing * 0.28, -22, 4.5, 8, armSwing * 0.04, 0, Math.PI * 2); ctx.fill();

        // Luva
        ctx.fillStyle = C.GLOVE;
        ctx.beginPath(); ctx.arc(4 + armSwing * 0.52, -22 + 9, 5.5, 0, Math.PI * 2); ctx.fill();

        // Cabeca (por cima do corpo)
        sonicHead(false);
    }

    // ---- Pose em bola giratoria (pulo / roll) ----
    function sonicSpin() {
        var sp = S.worldSpeed + (S.sdBoostFrames > 0 ? S.sdBoostVal * (S.sdBoostFrames / PHY.SD_BOOST_DURATION) : 0);
        var spinRate = 0.22 + sp * 0.03;
        ctx.save();
        ctx.rotate((S.t * spinRate) % (Math.PI * 2));

        // Bola
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.arc(0, -18, 23, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.arc(0, -18, 22, 0, Math.PI * 2); ctx.fill();

        // Barriga visivel
        ctx.fillStyle = C.BELLY;
        ctx.beginPath(); ctx.ellipse(-3, -16, 12, 9, -0.25, 0, Math.PI * 2); ctx.fill();

        // Espinho principal
        spike(ctx, -15, -30, -2.25, 20, 8);

        // Olho (pequeno, visivel)
        ctx.fillStyle = C.EYE_W;
        ctx.beginPath(); ctx.ellipse(12, -18, 7, 6, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.EYE_G;
        ctx.beginPath(); ctx.arc(13, -18, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.EYE_P;
        ctx.beginPath(); ctx.arc(14, -18, 2.2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ---- Pose spin dash (agachado carregando) ----
    function sonicSD() {
        var vib = S.sdLevel > 0 ? (Math.random() - 0.5) * S.sdLevel * 1.8 : 0;
        ctx.save(); ctx.translate(vib, 0);

        // Sapatos (lado a lado, agachado)
        shoe(ctx, -8, 0, 0);
        shoe(ctx,  7, 0, 0);

        // Corpo agachado
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.arc(0, -19, 21, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.arc(0, -20, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BELLY;
        ctx.beginPath(); ctx.ellipse(4, -18, 10, 8, 0.1, 0, Math.PI * 2); ctx.fill();

        // Espinhos aparecem
        spike(ctx, -12, -32, -2.28, 24, 9);
        spike(ctx, -17, -24, -2.05, 20, 8);

        // Olho determinado
        ctx.fillStyle = C.EYE_W;
        ctx.beginPath(); ctx.ellipse(12, -26, 7, 6, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.EYE_G;
        ctx.beginPath(); ctx.arc(13, -26, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.EYE_P;
        ctx.beginPath(); ctx.arc(14, -26, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.BLUE_D; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(6, -31); ctx.lineTo(18, -30); ctx.stroke();

        // Estrelas de carga girando
        for (var i = 0; i < S.sdLevel; i++) {
            var ang = (i / PHY.SD_MAX_LEVEL) * Math.PI * 2 + S.t * 0.16;
            var rr = 30 + S.sdLevel * 1.8;
            ctx.fillStyle = i % 2 === 0 ? '#FFE040' : '#FF8822';
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * rr, -20 + Math.sin(ang) * rr, 3 + S.sdLevel * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ---- Pose de dano ----
    function sonicHurt() {
        ctx.save(); ctx.rotate(S.t * 0.18);

        ctx.fillStyle = C.BLUE_D; ctx.beginPath(); ctx.arc(0, -20, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;   ctx.beginPath(); ctx.arc(0, -20, 19, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BELLY;  ctx.beginPath(); ctx.ellipse(3, -19, 9, 7, 0.1, 0, Math.PI * 2); ctx.fill();

        // Bracos abertos
        ctx.strokeStyle = C.BLUE_D; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-18, -22); ctx.lineTo(-29, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(18, -22);  ctx.lineTo(29, -12);  ctx.stroke();
        ctx.fillStyle = C.GLOVE;
        ctx.beginPath(); ctx.arc(-29, -12, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(29, -12, 6, 0, Math.PI * 2); ctx.fill();

        sonicHead(true);
        ctx.restore();
    }

    // ---- Cabeca do Sonic (proporcoes classicas) ----
    // Cabeca centralizada em (3, -38) relativo aos pes
    function sonicHead(isHurt) {
        var hx = 3, hy = -38;

        // Espinhos (desenhados ANTES da cabeca para ficarem atras)
        spike(ctx, hx - 3,  hy - 10, -2.40, 26, 10);
        spike(ctx, hx - 10, hy - 3,  -2.08, 22, 9);
        spike(ctx, hx - 15, hy + 6,  -1.82, 18, 8);

        // Cabeca oval
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.ellipse(hx + 1, hy + 1, 21, 20, -0.08, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.ellipse(hx, hy, 20, 19, -0.08, 0, Math.PI * 2); ctx.fill();

        // Focinho (muzzle) — area mais clara no lado direito/frente
        ctx.fillStyle = C.MUZZLE;
        ctx.beginPath(); ctx.ellipse(hx + 12, hy + 6, 11, 9, 0.18, 0, Math.PI * 2); ctx.fill();

        // Nariz
        ctx.fillStyle = '#0A0A0A';
        ctx.beginPath(); ctx.arc(hx + 20, hy + 2, 2.5, 0, Math.PI * 2); ctx.fill();

        if (!isHurt) {
            // Olho — elemento mais iconico do Sonic
            ctx.fillStyle = C.EYE_W;
            ctx.beginPath(); ctx.ellipse(hx + 8, hy - 6, 9, 8, -0.15, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C.EYE_G;
            ctx.beginPath(); ctx.arc(hx + 10, hy - 5, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = C.EYE_P;
            ctx.beginPath(); ctx.arc(hx + 11, hy - 5, 3, 0, Math.PI * 2); ctx.fill();
            // Brilho
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(hx + 13, hy - 7, 2, 0, Math.PI * 2); ctx.fill();
            // Sobrancelha determinada (inclinada para o centro)
            ctx.strokeStyle = C.BLUE_D; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(hx + 1, hy - 13); ctx.lineTo(hx + 17, hy - 11); ctx.stroke();
            // Sorriso
            ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(hx + 14, hy + 7, 5, 0.15, Math.PI * 0.85); ctx.stroke();
        } else {
            // Olhos em X (tomou dano)
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(hx + 3, hy - 10); ctx.lineTo(hx + 13, hy - 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(hx + 13, hy - 10); ctx.lineTo(hx + 3, hy - 2); ctx.stroke();
        }

        // Orelha (pequeno triangulo no topo esq.)
        ctx.fillStyle = C.BLUE;
        ctx.beginPath();
        ctx.moveTo(hx - 8, hy - 16);
        ctx.lineTo(hx - 14, hy - 25);
        ctx.lineTo(hx - 1, hy - 18);
        ctx.closePath(); ctx.fill();
    }

    // ---- Helpers de desenho ----
    function spike(ctx, bx, by, angle, length, width) {
        ctx.save(); ctx.translate(bx, by); ctx.rotate(angle);
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.moveTo(-width / 2 + 1, 1); ctx.lineTo(0, -length); ctx.lineTo(width / 2 + 1, 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.moveTo(-width / 2, 0); ctx.lineTo(0, -length); ctx.lineTo(width / 2, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function leg(ctx, x, y, angle) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.fillStyle = C.BLUE_D;
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.BLUE;
        ctx.beginPath(); ctx.ellipse(-0.5, -0.5, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function shoe(ctx, x, y, angle) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
        // Sola preta
        ctx.fillStyle = '#111111';
        ctx.beginPath(); ctx.ellipse(0, 1, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        // Tenis vermelho
        ctx.fillStyle = C.SHOE;
        ctx.beginPath(); ctx.ellipse(0, -1, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Faixa branca
        ctx.fillStyle = C.SHOE_W;
        ctx.fillRect(-12, -2, 24, 3);
        // Fivela dourada
        ctx.fillStyle = C.BUCKLE;
        ctx.beginPath(); ctx.arc(0, -0.5, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath(); ctx.arc(0, -0.5, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ================================================================
    // ANEL
    // ================================================================
    function drawRing(x, y, ph) {
        ctx.save(); ctx.translate(x, y);
        var scX = Math.abs(Math.cos((S.t + ph) * 0.07)) * 0.55 + 0.45;
        ctx.scale(scX, 1);
        ctx.strokeStyle = C.RING;  ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.RING_L; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(-2, -2, 5, Math.PI * 1.3, Math.PI * 2.1); ctx.stroke();
        ctx.fillStyle = '#FFFACC';
        ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ================================================================
    // OBSTACULOS
    // ================================================================
    function drawObstacle(o) {
        ctx.save(); ctx.translate(o.x, o.y);
        switch (o.type) {
            case 'spike':    drawSpikes();        break;
            case 'crabmeat': drawCrabmeat(o.t);  break;
            case 'motobug':  drawMotobug(o.t);   break;
            case 'spring':   drawSpring(o);       break;
        }
        ctx.restore();
    }

    function drawSpikes() {
        ctx.fillStyle = '#8090A8';
        for (var i = -1; i <= 1; i++) {
            var bx = i * 20;
            ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 8, -34); ctx.lineTo(bx + 16, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#B8C8D8';
            ctx.beginPath(); ctx.moveTo(bx + 5, 0); ctx.lineTo(bx + 8, -28); ctx.lineTo(bx + 7, 0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8090A8';
        }
        ctx.fillStyle = '#606878'; ctx.fillRect(-24, -5, 64, 6);
    }

    // Crabmeat — caranguejo classico de Sonic 1
    function drawCrabmeat(t) {
        var bob = Math.sin(t * 0.12) * 4;

        // Shell
        ctx.fillStyle = '#B81818'; ctx.beginPath(); ctx.ellipse(0, -24 + bob, 24, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#D83030'; ctx.beginPath(); ctx.ellipse(-1, -26 + bob, 16, 10, -0.1, 0, Math.PI * 2); ctx.fill();
        // Linha do casco
        ctx.strokeStyle = '#901010'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-20, -24 + bob); ctx.quadraticCurveTo(0, -14 + bob, 20, -24 + bob); ctx.stroke();

        // Bracos / Garras
        ctx.strokeStyle = '#B81818'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-20, -22 + bob); ctx.lineTo(-32, -22 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, -22 + bob);  ctx.lineTo(32, -22 + bob);  ctx.stroke();
        // Garra esq
        ctx.fillStyle = '#B81818';
        ctx.beginPath(); ctx.ellipse(-34, -22 + bob, 9, 7, 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-40, -17 + bob); ctx.lineTo(-44, -11 + bob); ctx.lineTo(-38, -14 + bob); ctx.closePath(); ctx.fill();
        // Garra dir
        ctx.beginPath(); ctx.ellipse(34, -22 + bob, 9, 7, -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(40, -17 + bob); ctx.lineTo(44, -11 + bob); ctx.lineTo(38, -14 + bob); ctx.closePath(); ctx.fill();

        // Olhos em hastes
        ctx.strokeStyle = '#C03030'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-9, -34 + bob); ctx.lineTo(-9, -44 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, -34 + bob);  ctx.lineTo(9, -44 + bob);  ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(-9, -45 + bob, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9,  -45 + bob, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0A0A0A';
        ctx.beginPath(); ctx.arc(-8, -45 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -45 + bob, 3, 0, Math.PI * 2); ctx.fill();

        // Pernas
        ctx.strokeStyle = '#901010'; ctx.lineWidth = 3;
        for (var l = -2; l <= 2; l++) {
            var lp = Math.sin(t * 0.14 + l) * 5;
            ctx.beginPath(); ctx.moveTo(l * 8, -10 + bob); ctx.lineTo(l * 9 + lp, 0); ctx.stroke();
        }
    }

    // Motobug — escaravelho rolante de Sonic 1
    function drawMotobug(t) {
        var spin = t * 0.28;
        // Roda
        ctx.fillStyle = '#222222';
        ctx.beginPath(); ctx.arc(0, -14, 17, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#444444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, -14, 15, 0, Math.PI * 2); ctx.stroke();
        // Raios
        ctx.save(); ctx.translate(0, -14); ctx.rotate(spin);
        ctx.strokeStyle = '#555555'; ctx.lineWidth = 2;
        for (var r = 0; r < 4; r++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(r * Math.PI / 2) * 15, Math.sin(r * Math.PI / 2) * 15);
            ctx.stroke();
        }
        ctx.restore();
        // Centro da roda
        ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, -14, 4, 0, Math.PI * 2); ctx.fill();

        // Cuerpo vermelho em cima
        ctx.fillStyle = '#C02828';
        ctx.beginPath(); ctx.ellipse(0, -29, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E03838';
        ctx.beginPath(); ctx.ellipse(-1, -30, 9, 7, -0.1, 0, Math.PI * 2); ctx.fill();

        // Antena
        ctx.strokeStyle = '#C02828'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-2, -37); ctx.lineTo(-4, -48); ctx.stroke();
        ctx.fillStyle = '#F03838'; ctx.beginPath(); ctx.arc(-4, -49, 3.5, 0, Math.PI * 2); ctx.fill();

        // Olhos
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(-4, -31, 4, 3.5, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();            ctx.ellipse(5, -31, 4, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0A0A0A'; ctx.beginPath(); ctx.arc(-4, -31, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();           ctx.arc(5, -31, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Mola (Spring) — vermelho e amarelo como em GHZ
    function drawSpring(o) {
        var comp = o.compressed || 0;
        var h = 22 - comp * 14;
        // Base cinza
        ctx.fillStyle = '#909090'; ctx.fillRect(-15, -4, 30, 5);
        // Espirais
        ctx.strokeStyle = '#E02018'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        var coils = 4;
        for (var c = 0; c < coils; c++) {
            var y1 = -4 - (c / coils) * h;
            var y2 = -4 - ((c + 0.5) / coils) * h;
            var y3 = -4 - ((c + 1) / coils) * h;
            ctx.beginPath(); ctx.moveTo(-12, y1); ctx.lineTo(12, y2); ctx.lineTo(-12, y3); ctx.stroke();
        }
        // Plataforma topo amarela
        ctx.fillStyle = '#F8D820'; ctx.fillRect(-15, -6 - h, 30, 6);
        // Estrela no centro
        ctx.fillStyle = '#E08010'; ctx.beginPath(); ctx.arc(0, -9 - h, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    // ================================================================
    // HUD
    // ================================================================
    function drawHUD() {
        // Fundo semi-transparente para o painel de aneis
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.beginPath();
        ctx.arc(W - 110, 38, 30, Math.PI * 0.5, Math.PI * 2.5);
        ctx.fill();
        ctx.fillRect(W - 110, 8, 100, 60);
        ctx.beginPath();
        ctx.arc(W - 10, 38, 30, Math.PI * 1.5, Math.PI * 0.5);
        ctx.fill();

        // Icone anel
        ctx.strokeStyle = C.RING; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(W - 98, 38, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.RING_L; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W - 100, 36, 5, Math.PI * 1.3, Math.PI * 2.1); ctx.stroke();

        // Contador de aneis
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px "Russo One", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(S.rings, W - 80, 45);

        // Score (menor, abaixo)
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px "Russo One", sans-serif';
        ctx.fillText(S.score, W - 80, 60);

        // Indicador de velocidade (pontinhos azuis, canto esq)
        var pct = (S.worldSpeed - PHY.WORLD_INIT) / (PHY.WORLD_MAX - PHY.WORLD_INIT);
        var dots = Math.round(pct * 5);
        for (var i = 0; i < 5; i++) {
            ctx.fillStyle = i < dots ? '#38BDF8' : 'rgba(255,255,255,0.18)';
            ctx.beginPath(); ctx.arc(18 + i * 15, 30, 5, 0, Math.PI * 2); ctx.fill();
        }

        // Barra de SD (se estiver carregando)
        if (S.phase === 'spindash' && S.sdLevel > 0) {
            var barW = 120, barX = W / 2 - barW / 2;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX - 4, H - 60, barW + 8, 20);
            ctx.fillStyle = '#F8B800';
            ctx.fillRect(barX, H - 58, barW * (S.sdLevel / PHY.SD_MAX_LEVEL), 16);
            ctx.strokeStyle = '#FFE040'; ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, H - 58, barW, 16);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px "Russo One", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SPIN DASH', W / 2, H - 65);
        }
    }

    function drawCelebration() {
        var a = Math.min(1, S.celebrating / 25);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(0, H / 2 - 62, W, 68);
        ctx.fillStyle = '#F8B800';
        ctx.font = 'bold clamp(20px,6vw,34px) "Russo One", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(S.rings + ' aneis!', W / 2, H / 2 - 18);
        ctx.restore();
    }

    // ================================================================
    // LOOP PRINCIPAL
    // ================================================================
    function gameLoop() {
        update();
        draw();
        animFrame = requestAnimationFrame(gameLoop);
    }

    // ================================================================
    // INPUT
    // ================================================================
    function setupInput() {
        // Teclado
        _kh = function (e) {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault(); inputJump = true;
            }
            if (e.key === 'z' || e.key === 'Z' || e.key === 'ArrowDown' || e.key === 's') {
                e.preventDefault(); inputSD = true;
            }
            if (e.key === 'Escape') window.SonicGame.fechar();
        };
        var _ku = function (e) {
            if (e.key === 'z' || e.key === 'Z' || e.key === 'ArrowDown' || e.key === 's') inputSD = false;
        };
        window.addEventListener('keydown', _kh);
        window.addEventListener('keyup',   _ku);
        _kh._up = _ku; // salvar referencia para remover

        // Touch: metade direita = pulo | botao SD = spin dash
        _th = function (e) {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
                var tx = e.changedTouches[i].clientX;
                if (tx > W * 0.5) inputJump = true;
            }
        };
        canvas.addEventListener('touchstart', _th, { passive: false });
        canvas.addEventListener('click', function (e) {
            if (e.clientX > W * 0.5) inputJump = true;
        });

        // Resize
        _rh = function () {
            W = window.innerWidth; H = window.innerHeight;
            GY = H * 0.62;
            canvas.width = W; canvas.height = H;
            S.x = W * 0.22;
            if (S.y > GY) S.y = GY;
        };
        window.addEventListener('resize', _rh);
    }

    function removeInput() {
        if (_kh) { window.removeEventListener('keydown', _kh); if (_kh._up) window.removeEventListener('keyup', _kh._up); _kh = null; }
        if (_th && canvas) { canvas.removeEventListener('touchstart', _th); _th = null; }
        if (_rh) { window.removeEventListener('resize', _rh); _rh = null; }
        if (sdBtnEl) { sdBtnEl.remove(); sdBtnEl = null; }
    }

    // ---- Botao Spin Dash (mobile) ----
    function createSDBtn() {
        sdBtnEl = document.createElement('button');
        sdBtnEl.style.cssText = [
            'position:fixed', 'bottom:28px', 'left:28px', 'z-index:9100',
            'width:72px', 'height:72px', 'border-radius:50%',
            'background:linear-gradient(135deg,#C02020,#801010)',
            'border:3px solid #FFE040',
            'color:#FFE040', 'font-family:"Russo One",sans-serif',
            'font-size:11px', 'cursor:pointer',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
            '-webkit-tap-highlight-color:transparent',
            'user-select:none', '-webkit-user-select:none',
        ].join(';');
        sdBtnEl.innerHTML = '<span style="font-size:22px;">&#9654;</span><span style="font-size:9px;margin-top:2px;">SPIN</span>';
        sdBtnEl.addEventListener('touchstart', function (e) { e.preventDefault(); inputSD = true; initAC(); }, { passive: false });
        sdBtnEl.addEventListener('touchend',   function (e) { e.preventDefault(); inputSD = false; }, { passive: false });
        sdBtnEl.addEventListener('mousedown',  function () { inputSD = true;  initAC(); });
        sdBtnEl.addEventListener('mouseup',    function () { inputSD = false; });
        overlay.appendChild(sdBtnEl);
    }

    // ================================================================
    // API PUBLICA
    // ================================================================
    window.SonicGame = {
        abrir: function () {
            overlay = document.createElement('div');
            overlay.id = 'sonic-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:#000;';

            canvas = document.createElement('canvas');
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = W; canvas.height = H;
            canvas.style.cssText = 'display:block;touch-action:none;';
            overlay.appendChild(canvas);

            // Botao voltar
            var backBtn = document.createElement('button');
            backBtn.style.cssText = [
                'position:fixed', 'top:16px', 'left:16px', 'z-index:9100',
                'background:rgba(0,0,0,0.55)', 'border:1px solid rgba(255,255,255,0.22)',
                'color:#fff', 'border-radius:50%', 'width:44px', 'height:44px',
                'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
                '-webkit-tap-highlight-color:transparent',
            ].join(';');
            backBtn.innerHTML = '<span class="material-icons" style="font-size:22px;">arrow_back</span>';
            backBtn.addEventListener('click', function () { window.SonicGame.fechar(); });
            overlay.appendChild(backBtn);

            document.body.appendChild(overlay);
            ctx = canvas.getContext('2d');

            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}

            initState();
            createSDBtn();
            setupInput();
            gameLoop();
        },

        fechar: function () {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            removeInput();
            if (ac) { ac.close().catch(function () {}); ac = null; }
            if (overlay) { overlay.remove(); overlay = null; canvas = null; ctx = null; }
        },
    };

})();

// =====================================================================
// sonic.js — Jogo Sonic Runner v3.0 (Sprite System)
// =====================================================================
// Fisica Retro Engine, Spin Dash, inimigos, molas
// Sprites: offscreen canvas de baixa resolucao + imageSmoothingEnabled=false
//          → look pixel-art autentico sem arquivos externos
//
// Para usar sprites REAIS (recomendado):
//   Veja assets/sprites/sonic/README.md
// =====================================================================

(function () {
    'use strict';

    // ---- Fisica (Retro Engine escalado) ----
    var PHY = {
        JUMP:                -13.5,
        GRAVITY:              0.40,
        SPRING:              -19,
        SD_BASE:              8,
        SD_PER_LEVEL:         1.3,
        SD_MAX_LEVEL:         8,
        SD_FRAMES_PER_LEVEL:  10,
        SD_BOOST_DURATION:    45,
        WORLD_INIT:           5.5,
        WORLD_MAX:            13,
        WORLD_ACCEL:          0.003,
    };

    // ---- Paleta GHZ + Sonic ----
    var C = {
        SKY_TOP:  '#4878C8', SKY_BOT:   '#98C8F8',
        HILL_FAR: '#3858A8', HILL_MID:  '#3A7028', HILL_NEAR: '#509040',
        CHECK_D:  '#7A4818', CHECK_L:   '#A06828',
        GROUND_G: '#509040', GROUND_DG: '#387028', GROUND_B:  '#985820',
        CLOUD:    'rgba(255,255,255,0.90)',
        BLUE:     '#1E50D8', BLUE_D:    '#143898', BLUE_L:    '#4070F8',
        BELLY:    '#F0C060', MUZZLE:    '#E8B040',
        EYE_W:    '#FFFFFF', EYE_G:     '#185818', EYE_P:     '#08080E',
        GLOVE:    '#F8F8F8',
        SHOE:     '#C02020', SHOE_W:    '#E0E0D8', BUCKLE:    '#F0D020',
        RING:     '#F8B800', RING_L:    '#FFE040',
    };

    // ---- Sprite system ----
    // Sprites gerados em offscreen canvas 32x48 px por frame,
    // exibidos em 2x com imageSmoothingEnabled=false = pixel art.
    // Se assets/sprites/sonic/sonic.png existir, usa drawImage direto.
    var SS   = 2.0;   // escala de exibicao
    var SCW  = 32;    // cell width no sheet
    var SCH  = 48;    // cell height no sheet
    var SPVX = 16;    // pivot X (pes) dentro do cell
    var SPVY = 42;    // pivot Y (pes) dentro do cell

    var _sheet      = null;
    var _sheetIsImg = false;
    var _sheetReady = false;

    // GIF sprites (animados, fundo branco removido por pixel)
    var _gifs = { run: null, jump: null };
    var _gifsReady = false;

    // Assets de cenário e inimigos
    var _bgImg      = null; // fundo.png GHZ
    var _eggmanImg  = null; // eggman.gif

    // Cache de offscreen canvas por chave (sonic, eggman)
    var _gifCanvases = {}, _gifCtxs = {};

    // Mapa para PNG externo. Formato: [sx, sy, sw, sh, pivX, pivY]
    // Ajuste se o seu spritesheet tiver dimensoes diferentes.
    var SPRITE_MAP = {
        run: [
            [  2, 97, 30, 42, 14, 42], [ 34, 97, 30, 42, 14, 42],
            [ 66, 97, 30, 42, 14, 42], [ 98, 97, 30, 42, 14, 42],
            [130, 97, 30, 42, 14, 42], [162, 97, 30, 42, 14, 42],
            [194, 97, 30, 42, 14, 42], [226, 97, 30, 42, 14, 42],
        ],
        spin:     [ [2,141,28,28,14,28],[32,141,28,28,14,28],[62,141,28,28,14,28],[92,141,28,28,14,28] ],
        idle:     [ [2, 1, 30, 42, 14, 42] ],
        spindash: [ [2,183,30,36,14,36],[34,183,30,36,14,36] ],
        hurt:     [ [2,221,30,42,14,42] ],
    };

    function initSprites() {
        // Sem PNG externo: gerar sheet procedural imediatamente (GIFs têm prioridade)
        _sheet = _buildSheet(); _sheetIsImg = false; _sheetReady = true;
    }

    function initGifs() {
        var loaded = 0;
        function onDone() { loaded++; if (loaded >= 2) _gifsReady = true; }
        ['run', 'jump'].forEach(function (name) {
            var img = new Image();
            img.onload  = function () { _gifs[name] = img; onDone(); };
            img.onerror = onDone;
            img.src = 'assets/sprites/sonic/' + name + '.gif';
        });
    }

    function initAssets() {
        _bgImg = new Image();
        _bgImg.src = 'assets/sprites/sonic/fundo.png';
        _eggmanImg = new Image();
        _eggmanImg.src = 'assets/sprites/sonic/eggman.gif';
    }

    // Renderiza GIF animado removendo fundo branco via mini offscreen canvas.
    // key: string de cache ('sonic'|'eggman'), targetH: altura alvo em px,
    // ax: fração horizontal do ponto de ancoragem (0=esq, 0.5=centro)
    function _renderGif(key, img, targetH, ax) {
        if (!img || !img.naturalHeight) return;
        var scale = targetH / img.naturalHeight;
        var dw = Math.round(img.naturalWidth * scale);
        var dh = targetH;

        var oc = _gifCanvases[key];
        var ox = _gifCtxs[key];
        if (!oc || oc.width !== dw || oc.height !== dh) {
            oc = _gifCanvases[key] = document.createElement('canvas');
            oc.width = dw; oc.height = dh;
            ox = _gifCtxs[key] = oc.getContext('2d', { willReadFrequently: true });
        }
        ox.clearRect(0, 0, dw, dh);
        ox.drawImage(img, 0, 0, dw, dh);
        var id = ox.getImageData(0, 0, dw, dh);
        var d  = id.data;
        for (var i = 0; i < d.length; i += 4) {
            if (d[i] > 230 && d[i+1] > 230 && d[i+2] > 230) d[i+3] = 0;
        }
        ox.putImageData(id, 0, 0);
        ctx.drawImage(oc, -(ax || 0.5) * dw, -dh, dw, dh);
    }

    // ---- Gerar sprite sheet em offscreen canvas ----
    // Layout: 8 colunas x 3 linhas de 32x48px
    //   Linha 0: corrida (8 frames)
    //   Linha 1: bola giratoria (8 frames)
    //   Linha 2: idle | sd0 | sd1 | hurt
    function _buildSheet() {
        var sc  = document.createElement('canvas');
        sc.width  = SCW * 8;
        sc.height = SCH * 3;
        var sx  = sc.getContext('2d');
        sx.imageSmoothingEnabled = false;

        // Linha 0: corrida
        for (var f = 0; f < 8; f++) {
            sx.save();
            sx.translate(f * SCW + SPVX, SCH * 0 + SPVY);
            _paintRun(sx, f);
            sx.restore();
        }
        // Linha 1: spin
        for (var f = 0; f < 8; f++) {
            sx.save();
            sx.translate(f * SCW + SPVX, SCH * 1 + SPVY);
            _paintSpin(sx, f);
            sx.restore();
        }
        // Linha 2: outros
        ['idle','sd0','sd1','hurt'].forEach(function (pose, i) {
            sx.save();
            sx.translate(i * SCW + SPVX, SCH * 2 + SPVY);
            _paintPose(sx, pose);
            sx.restore();
        });

        return sc;
    }

    // ------ Funcoes de pintura (coordenadas: pes em (0,0), acima = neg Y) ------

    function _paintRun(sx, frame) {
        var legCyc = Math.sin(frame / 8 * Math.PI * 2);
        var la = legCyc * 7;
        var lb = -legCyc * 7;
        sx.rotate(0.10); // lean forward

        // Sombra no chao
        sx.fillStyle = 'rgba(0,0,0,0.10)';
        sx.beginPath(); sx.ellipse(1, 0, 10, 2, 0, 0, Math.PI * 2); sx.fill();

        // Espinhos (atras da cabeca)
        _spike(sx, -7, -27, -2.38, 12, 5);
        _spike(sx, -9, -22, -2.10, 10, 4);
        _spike(sx, -10,-17, -1.85,  9, 3.5);

        // Pernas
        sx.fillStyle = C.BLUE_D;
        sx.beginPath(); sx.ellipse(-2 + la*0.22, -6, 2.5, 4.5, la*0.025, 0, Math.PI*2); sx.fill();
        sx.beginPath(); sx.ellipse( 3 + lb*0.22, -6, 2.5, 4.5, lb*0.025, 0, Math.PI*2); sx.fill();

        // Sapatos
        _shoe(sx, -2 + la * 0.42, 0);
        _shoe(sx,  3 + lb * 0.42, 0);

        // Corpo
        sx.fillStyle = C.BLUE_D; sx.beginPath(); sx.ellipse( 0,-14, 8, 8, 0.05, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.BLUE;   sx.beginPath(); sx.ellipse(-1,-15, 7, 7, 0.05, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.BELLY;  sx.beginPath(); sx.ellipse( 2,-13, 4, 5.5, 0.1, 0, Math.PI*2); sx.fill();

        // Braco
        sx.strokeStyle = C.BLUE_D; sx.lineWidth = 4; sx.lineCap = 'round';
        var armSwing = Math.sin(legCyc * Math.PI + Math.PI) * 5;
        sx.beginPath(); sx.moveTo(2, -15); sx.lineTo(6 + armSwing * 0.3, -9); sx.stroke();
        sx.fillStyle = C.GLOVE; sx.beginPath(); sx.arc(6 + armSwing * 0.4, -9, 3, 0, Math.PI*2); sx.fill();

        // Cabeca
        _head(sx, 1, -26);
    }

    function _paintSpin(sx, frame) {
        var angle = (frame / 8) * Math.PI * 2;
        sx.save(); sx.rotate(angle);
        var r = 13, cy = -r - 1;
        sx.fillStyle = C.BLUE_D; sx.beginPath(); sx.arc(0, cy, r+1, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.BLUE;   sx.beginPath(); sx.arc(0, cy, r,   0, Math.PI*2); sx.fill();
        sx.fillStyle = C.BELLY;  sx.beginPath(); sx.ellipse(-3, cy+2, 7, 5, -0.2, 0, Math.PI*2); sx.fill();
        _spike(sx, -9, cy - 4, -2.3, 10, 4);
        sx.fillStyle = C.EYE_W; sx.beginPath(); sx.ellipse(7, cy-3, 4.5, 4, -0.1, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.EYE_G; sx.beginPath(); sx.arc(8, cy-3, 2.5, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.EYE_P; sx.beginPath(); sx.arc(9, cy-3, 1.5, 0, Math.PI*2); sx.fill();
        sx.restore();
    }

    function _paintPose(sx, pose) {
        if (pose === 'idle') {
            sx.rotate(0.05);
            _spike(sx, -7,-27,-2.38,12,5); _spike(sx, -9,-22,-2.1,10,4); _spike(sx,-10,-17,-1.85,9,3.5);
            sx.fillStyle = C.BLUE_D;
            sx.beginPath(); sx.ellipse(-2,-6,2.5,4.5,0,0,Math.PI*2); sx.fill();
            sx.beginPath(); sx.ellipse( 3,-6,2.5,4.5,0,0,Math.PI*2); sx.fill();
            _shoe(sx,-3,0); _shoe(sx,4,0);
            sx.fillStyle=C.BLUE_D; sx.beginPath(); sx.ellipse(0,-14,8,8,0,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BLUE;   sx.beginPath(); sx.ellipse(-1,-15,7,7,0,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BELLY;  sx.beginPath(); sx.ellipse(2,-13,4,5.5,0.1,0,Math.PI*2); sx.fill();
            _head(sx, 1, -26);

        } else if (pose === 'sd0' || pose === 'sd1') {
            if (pose === 'sd1') sx.translate(1, 0);
            _shoe(sx,-5,0); _shoe(sx,4,0);
            sx.fillStyle=C.BLUE_D; sx.beginPath(); sx.arc(0,-14,14,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BLUE;   sx.beginPath(); sx.arc(0,-14,13,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BELLY;  sx.beginPath(); sx.ellipse(3,-12,7,6,0.1,0,Math.PI*2); sx.fill();
            _spike(sx,-8,-24,-2.3,12,5); _spike(sx,-10,-18,-2.0,10,4);
            sx.fillStyle=C.EYE_W; sx.beginPath(); sx.ellipse(9,-19,5,4,-0.1,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.EYE_G; sx.beginPath(); sx.arc(10,-19,3,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.EYE_P; sx.beginPath(); sx.arc(11,-19,1.8,0,Math.PI*2); sx.fill();
            // Brow
            sx.strokeStyle=C.BLUE_D; sx.lineWidth=1.5; sx.lineCap='round';
            sx.beginPath(); sx.moveTo(5,-23); sx.lineTo(15,-22); sx.stroke();

        } else { // hurt
            sx.rotate(0.12);
            sx.fillStyle=C.BLUE_D; sx.beginPath(); sx.arc(0,-16,13,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BLUE;   sx.beginPath(); sx.arc(0,-16,12,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BELLY;  sx.beginPath(); sx.ellipse(3,-15,5,6,0.1,0,Math.PI*2); sx.fill();
            sx.strokeStyle=C.BLUE_D; sx.lineWidth=5; sx.lineCap='round';
            sx.beginPath(); sx.moveTo(-11,-17); sx.lineTo(-17,-10); sx.stroke();
            sx.beginPath(); sx.moveTo( 11,-17); sx.lineTo( 17,-10); sx.stroke();
            sx.fillStyle=C.GLOVE; sx.beginPath(); sx.arc(-17,-10,4,0,Math.PI*2); sx.fill();
            sx.beginPath(); sx.arc(17,-10,4,0,Math.PI*2); sx.fill();
            _spike(sx,-7,-27,-2.38,12,5); _spike(sx,-9,-22,-2.1,10,4);
            sx.fillStyle=C.BLUE_D; sx.beginPath(); sx.ellipse(2,  -25,12,11,-0.05,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.BLUE;   sx.beginPath(); sx.ellipse(1,  -26,11,10,-0.05,0,Math.PI*2); sx.fill();
            sx.fillStyle=C.MUZZLE; sx.beginPath(); sx.ellipse(10, -21,6.5,4.5,0.15,0,Math.PI*2); sx.fill();
            sx.strokeStyle='#fff'; sx.lineWidth=2; sx.lineCap='round';
            sx.beginPath(); sx.moveTo(3,-30); sx.lineTo(9,-24); sx.stroke();
            sx.beginPath(); sx.moveTo(9,-30); sx.lineTo(3,-24); sx.stroke();
        }
    }

    // ---- Head (sem espinhos, chamado apos eles) ----
    function _head(sx, hx, hy) {
        sx.fillStyle = C.BLUE_D; sx.beginPath(); sx.ellipse(hx+1, hy+1, 12,11,-0.05,0,Math.PI*2); sx.fill();
        sx.fillStyle = C.BLUE;   sx.beginPath(); sx.ellipse(hx,   hy,   11,10,-0.05,0,Math.PI*2); sx.fill();
        sx.fillStyle = C.MUZZLE; sx.beginPath(); sx.ellipse(hx+9, hy+5, 6.5,4.5,0.15,0,Math.PI*2); sx.fill();
        // Olho
        sx.fillStyle = C.EYE_W; sx.beginPath(); sx.ellipse(hx+5,hy-3,5.5,5,-0.1,0,Math.PI*2); sx.fill();
        sx.fillStyle = C.EYE_G; sx.beginPath(); sx.arc(hx+6,hy-3,3.2,0,Math.PI*2); sx.fill();
        sx.fillStyle = C.EYE_P; sx.beginPath(); sx.arc(hx+7,hy-3,1.8,0,Math.PI*2); sx.fill();
        sx.fillStyle = '#FFF';   sx.beginPath(); sx.arc(hx+8,hy-4.5,1.1,0,Math.PI*2); sx.fill();
        // Sobrancelha
        sx.strokeStyle = C.BLUE_D; sx.lineWidth = 1.5; sx.lineCap = 'round';
        sx.beginPath(); sx.moveTo(hx,hy-8); sx.lineTo(hx+10,hy-7); sx.stroke();
        // Nariz
        sx.fillStyle = '#111'; sx.beginPath(); sx.arc(hx+11,hy+1,1.5,0,Math.PI*2); sx.fill();
        // Orelha
        sx.fillStyle = C.BLUE; sx.beginPath();
        sx.moveTo(hx-5,hy-9); sx.lineTo(hx-9,hy-16); sx.lineTo(hx-1,hy-11);
        sx.closePath(); sx.fill();
    }

    function _spike(sx, bx, by, angle, length, width) {
        sx.save(); sx.translate(bx, by); sx.rotate(angle);
        sx.fillStyle = C.BLUE_D;
        sx.beginPath(); sx.moveTo(-width/2+0.5,0.5); sx.lineTo(0,-length); sx.lineTo(width/2+0.5,0.5); sx.closePath(); sx.fill();
        sx.fillStyle = C.BLUE;
        sx.beginPath(); sx.moveTo(-width/2,0); sx.lineTo(0,-length); sx.lineTo(width/2,0); sx.closePath(); sx.fill();
        sx.restore();
    }

    function _shoe(sx, x, y) {
        sx.save(); sx.translate(x, y);
        sx.fillStyle = '#111';    sx.beginPath(); sx.ellipse(0, 0.5, 9, 3.5, 0, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.SHOE;    sx.beginPath(); sx.ellipse(0,-1,   9, 4,   0, 0, Math.PI*2); sx.fill();
        sx.fillStyle = C.SHOE_W;  sx.fillRect(-7, -2, 14, 2);
        sx.fillStyle = C.BUCKLE;  sx.beginPath(); sx.arc(0,-1,2.5,0,Math.PI*2); sx.fill();
        sx.fillStyle = '#1A1A1A'; sx.beginPath(); sx.arc(0,-1,1.2,0,Math.PI*2); sx.fill();
        sx.restore();
    }

    // ================================================================
    // RENDER DO SONIC (usa sprite sheet)
    // ================================================================

    function _runFrame() {
        var sp = S.worldSpeed + (S.sdBoostFrames > 0 ? S.sdBoostVal * (S.sdBoostFrames / PHY.SD_BOOST_DURATION) : 0);
        return Math.floor(S.t * (0.12 + sp * 0.03)) % 8;
    }

    function _spinFrame() {
        return Math.floor(S.t * 0.22) % 8;
    }

    function drawSonic() {
        if (!_sheetReady) return;
        ctx.save();
        ctx.translate(S.x, S.y);
        if (S.invincible > 0 && Math.floor(S.t / 4) % 2 === 1) ctx.globalAlpha = 0.30;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.beginPath(); ctx.ellipse(2, 0, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

        ctx.imageSmoothingEnabled = false;

        if (_gifsReady && S.phase !== 'spindash') {
            _drawFromGIF();
        } else if (_sheetIsImg) {
            _drawFromPNG();
        } else {
            _drawFromGenerated();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function _drawFromGIF() {
        var isSpinning = S.phase === 'jump' || S.phase === 'roll';
        var img = isSpinning ? (_gifs.jump || _gifs.run) : _gifs.run;
        _renderGif('sonic', img, 90, 0.40);
    }

    function _drawFromGenerated() {
        var col, row;
        switch (S.phase) {
            case 'jump': case 'roll': row = 1; col = _spinFrame(); break;
            case 'spindash':  row = 2; col = 1 + (Math.floor(S.t / 6) % 2); break;
            case 'hurt':      row = 2; col = 3; break;
            default:          row = 0; col = _runFrame(); break;
        }
        // Coordenada de origem no sheet
        var sx_ = col * SCW, sy_ = row * SCH;
        // Desenhar com pivot alinhado a (0,0) = pes
        ctx.drawImage(_sheet, sx_, sy_, SCW, SCH,
            -SPVX * SS, -SPVY * SS,
            SCW * SS,   SCH * SS);
    }

    function _drawFromPNG() {
        var map, fi;
        switch (S.phase) {
            case 'jump': case 'roll': map = SPRITE_MAP.spin;     fi = _spinFrame() % SPRITE_MAP.spin.length; break;
            case 'spindash':          map = SPRITE_MAP.spindash; fi = Math.floor(S.t / 6) % SPRITE_MAP.spindash.length; break;
            case 'hurt':              map = SPRITE_MAP.hurt;     fi = 0; break;
            default:                  map = SPRITE_MAP.run;      fi = _runFrame(); break;
        }
        var f = map[fi];
        var scale = (SCH * SS) / f[3];
        ctx.drawImage(_sheet, f[0], f[1], f[2], f[3],
            -f[4] * scale, -f[5] * scale,
            f[2] * scale,  f[3] * scale);
    }

    // ================================================================
    // VARIAVEIS E ESTADO
    // ================================================================

    var overlay, canvas, ctx, W, H, GY;
    var animFrame = null, ac = null;
    var _kh = null, _rh = null;
    var inputJump = false, inputSD = false, inputJumpHeld = false;
    var sdBtnEl = null, jumpBtnEl = null;
    var rotateHintEl = null;
    var orientationLocked = false;
    var S;

    // ---- Orientation (mesma logica de snes.js/donkeykong.js) ----
    function tryLockLandscape() {
        if (orientationLocked) return;
        try {
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                var p = screen.orientation.lock('landscape');
                if (p && typeof p.then === 'function') {
                    p.then(function () { orientationLocked = true; })
                     .catch(function () { /* fallback vira hint */ });
                }
            }
        } catch (e) { /* ignora */ }
    }
    function unlockOrientation() {
        try {
            if (screen.orientation && typeof screen.orientation.unlock === 'function') {
                screen.orientation.unlock();
            }
        } catch (e) { /* ignora */ }
        orientationLocked = false;
    }
    function updateRotateHint() {
        if (!rotateHintEl) return;
        rotateHintEl.style.display = (window.innerHeight > window.innerWidth) ? 'flex' : 'none';
    }

    function initState() {
        GY = H * 0.62;
        S = {
            t: 0, scroll: 0,
            worldSpeed: PHY.WORLD_INIT,
            sdBoostFrames: 0, sdBoostVal: 0,
            x: W * 0.22, y: GY,
            ysp: 0, onGround: true,
            phase: 'run',
            sdLevel: 0, sdHoldTimer: 0, hurtTimer: 0,
            rings: 0, score: 0,
            invincible: 0, celebrating: 0,
            _restartQueued: false, _bestScore: (S && S._bestScore) || 0,
            ringItems: [], obstacles: [],
            scattered: [], confetti: [],
            dust: [], popups: [],
            nextRing: 80, nextObs: 160, obsInterval: 160,
        };
    }

    // ================================================================
    // AUDIO
    // ================================================================

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

    function sfxRing()      { tone(880,null,0.07,'sine',0.18); tone(1760,null,0.16,'sine',0.12,0.07); }
    function sfxJump()      { tone(300,620,0.18,'square',0.12); }
    function sfxSpring()    { tone(380,1200,0.12,'sine',0.18); tone(1200,750,0.2,'sine',0.12,0.12); }
    function sfxHurt()      { tone(240,75,0.42,'sawtooth',0.14); }
    function sfxSDCharge(l) { tone(160+l*50,200+l*50,0.1,'sawtooth',0.07); }
    function sfxSDRelease() { tone(380,900,0.22,'square',0.14); }
    function sfxEnemy()     { tone(350,140,0.14,'triangle',0.13); }
    function sfxCelebrate() { [523,659,784,1047].forEach(function(f,i){tone(f,null,0.2,'triangle',0.13,i*0.09);}); }

    // ================================================================
    // SPAWN
    // ================================================================

    function spawnRings() {
        var count = 2 + Math.floor(Math.random() * 4);
        var sx_ = W + 55, pattern = Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var ry = pattern === 0 ? GY - 22 - Math.random() * 55
                   : pattern === 1 ? GY - 20 - i * 24
                   : GY - 28;
            S.ringItems.push({ x: sx_ + (pattern === 2 ? i * 30 : i * 22), y: ry, ph: Math.random() * 6.28 });
        }
    }

    function spawnObstacle() {
        var r = Math.random(), type;
        if      (r < 0.22) type = 'crabmeat';
        else if (r < 0.40) type = 'motobug';
        else if (r < 0.58) type = 'eggman';
        else if (r < 0.82) type = 'spike';
        else               type = 'spring';
        // Eggman flutua 30px acima do chão (pode ser atingido pelo pulo)
        var oy = (type === 'eggman') ? GY - 30 : GY;
        S.obstacles.push({ x: W + 90, y: oy, type: type, t: 0, compressed: 0 });
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

    function addDust(x, y, vx, vy, life) {
        S.dust.push({ x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life });
    }

    // ================================================================
    // UPDATE
    // ================================================================

    function update() {
        S.t++;
        S.worldSpeed = Math.min(PHY.WORLD_MAX, PHY.WORLD_INIT + S.t * PHY.WORLD_ACCEL);
        var sp = S.worldSpeed;
        if (S.sdBoostFrames > 0) { sp += S.sdBoostVal * (S.sdBoostFrames / PHY.SD_BOOST_DURATION); S.sdBoostFrames--; }
        S.scroll += sp;

        // Spin Dash
        if (S.phase === 'spindash') {
            if (inputSD) {
                S.sdHoldTimer++;
                if (S.sdHoldTimer % PHY.SD_FRAMES_PER_LEVEL === 0 && S.sdLevel < PHY.SD_MAX_LEVEL) { S.sdLevel++; sfxSDCharge(S.sdLevel); }
                if (S.t % 3 === 0) addDust(S.x - 15, S.y - 10, -2, (Math.random() - 0.5) * 2, 14);
            } else {
                S.sdBoostVal = PHY.SD_BASE + S.sdLevel * PHY.SD_PER_LEVEL;
                S.sdBoostFrames = PHY.SD_BOOST_DURATION;
                S.sdLevel = 0; S.sdHoldTimer = 0;
                S.phase = 'roll'; sfxSDRelease();
                for (var b = 0; b < 18; b++) addDust(S.x - 20, S.y - 10, -(Math.random() * 7 + 2), (Math.random() - 0.5) * 5, 22);
            }
        } else if (inputSD && S.onGround && S.phase !== 'hurt') {
            S.phase = 'spindash'; S.sdLevel = 0; S.sdHoldTimer = 0; sfxSDCharge(0);
        }

        if (inputJump) {
            if (S.onGround && S.phase !== 'spindash' && S.phase !== 'hurt') {
                S.ysp = PHY.JUMP; S.onGround = false; S.phase = 'jump'; sfxJump();
            }
            inputJump = false;
        }

        if (!S.onGround) {
            // Pulo variável: soltar cedo = cortar impulso
            if (!inputJumpHeld && S.phase === 'jump' && S.ysp < -5) S.ysp = -5;
            S.ysp += PHY.GRAVITY; S.y += S.ysp;
            if (S.y >= GY) {
                S.y = GY; S.ysp = 0; S.onGround = true;
                if (S.phase === 'jump') S.phase = 'run';
                else if (S.phase === 'roll' && S.sdBoostFrames <= 0) S.phase = 'run';
            }
        }
        if (S.phase === 'roll' && S.sdBoostFrames <= 0 && S.onGround) S.phase = 'run';
        if (S.phase === 'hurt') {
            S.hurtTimer++;
            if (S.hurtTimer > 55) {
                if (S._restartQueued) {
                    // Sem anéis: reiniciar gentilmente (sem tela de game over)
                    var best = S.score;
                    initState();
                    S._bestScore = best;
                    sfxCelebrate();
                } else {
                    S.phase = 'run'; S.hurtTimer = 0;
                }
            }
        }
        if (S.invincible > 0) S.invincible--;

        if (--S.nextRing <= 0) { spawnRings(); S.nextRing = 80; }
        if (--S.nextObs  <= 0) { spawnObstacle(); S.obsInterval = Math.max(50, S.obsInterval * 0.968); S.nextObs = Math.floor(S.obsInterval); }

        // Aneis
        S.ringItems = S.ringItems.filter(function (r) {
            r.x -= sp;
            if (S.phase !== 'hurt') {
                var dx = r.x - S.x, dy = r.y - S.y;
                if (dx*dx + dy*dy < 32*32) {
                    S.rings++; S.score += 10; sfxRing();
                    if (S.rings % 10 === 0) { S.celebrating = 70; sfxCelebrate(); spawnConfetti(); }
                    return false;
                }
            }
            return r.x > -30;
        });

        var isSpinning = S.phase === 'jump' || S.phase === 'roll';
        S.obstacles = S.obstacles.filter(function (o) {
            o.x -= sp; o.t++;
            if (o.compressed > 0) o.compressed = Math.max(0, o.compressed - 0.09);
            // Centro de colisão: para Eggman usa centro fixo (ignora bob visual)
            var oc_cy = (o.type === 'eggman') ? (o.y - 50) : (o.y - 28);
            var dx = Math.abs(o.x - S.x), dy = Math.abs(oc_cy - S.y);
            var isEnemy = o.type === 'crabmeat' || o.type === 'motobug' || o.type === 'eggman';

            if (o.type === 'spring') {
                if (dx < 22 && Math.abs(o.y - 20 - S.y) < 22 && S.ysp >= -1) {
                    o.compressed = 1; S.ysp = PHY.SPRING; S.phase = 'jump'; S.onGround = false; sfxSpring();
                }
                return o.x > -70;
            }

            // Eggman y=GY-30, centro=GY-80. Sonic y=GY. dy=80 → hitH deve ser >80
            var hitW = o.type === 'spike' ? 32 : (o.type === 'eggman' ? 42 : 28);
            var hitH = o.type === 'spike' ? 36 : (o.type === 'eggman' ? 90 : 40);
            if (S.invincible === 0 && S.phase !== 'hurt' && dx < hitW && dy < hitH) {
                if (isSpinning && isEnemy) {
                    S.ysp = -8; S.onGround = false; S.score += 100; sfxEnemy();
                    S.popups.push({ x: o.x, y: o.y - 42, text: '+100', life: 42 });
                    addDust(o.x, o.y - 20, 0, -3, 20); return false;
                } else if (!isSpinning || o.type === 'spike') {
                    S.invincible = 120; S.phase = 'hurt'; S.hurtTimer = 0;
                    S.ysp = -9; S.onGround = false;
                    if (S.rings === 0) {
                        // Sem anéis: agenda restart após animação hurt
                        S._restartQueued = true;
                    } else {
                        var lost = Math.min(S.rings, 3 + Math.floor(Math.random() * 5));
                        for (var i = 0; i < lost; i++) {
                            var ang = (i / Math.max(lost,1)) * Math.PI * 2;
                            S.scattered.push({ x:S.x,y:S.y-20, vx:Math.cos(ang)*5.5, vy:Math.sin(ang)*5.5-3, life:65, t:0 });
                        }
                        S.rings = Math.max(0, S.rings - lost);
                    }
                    sfxHurt();
                }
            }
            return o.x > -85;
        });

        S.scattered = S.scattered.filter(function(r){ r.x+=r.vx-sp*0.35; r.vy+=0.28; r.y+=r.vy; r.t++; r.life--; return r.life>0; });
        S.dust      = S.dust.filter(function(p){ p.x+=p.vx-sp*0.18; p.vy+=0.06; p.y+=p.vy; p.life--; return p.life>0; });
        if (S.celebrating > 0) S.celebrating--;
        S.confetti  = S.confetti.filter(function(c){ c.x+=c.vx-sp*0.12; c.vy+=0.2; c.y+=c.vy; c.life--; return c.life>0; });
        S.popups    = S.popups.filter(function(p){ p.x-=sp; p.y-=0.6; p.life--; return p.life>0; });
    }

    // ================================================================
    // DRAW PRINCIPAL
    // ================================================================

    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawBG();

        S.ringItems.forEach(function(r){ drawRing(r.x, r.y, r.ph); });

        S.scattered.forEach(function(r){
            ctx.globalAlpha = (r.life/65) * (Math.floor(r.t/4)%2===0 ? 1 : 0.4);
            drawRing(r.x, r.y, 0); ctx.globalAlpha = 1;
        });

        S.dust.forEach(function(p){
            ctx.globalAlpha = (p.life / p.maxLife) * 0.55;
            ctx.fillStyle = '#C8906A';
            ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (1-p.life/p.maxLife)*5, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        });

        S.obstacles.forEach(drawObstacle);

        S.confetti.forEach(function(c){
            ctx.globalAlpha = c.life / 70;
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x - c.size/2, c.y - c.size/2, c.size, c.size);
        });
        ctx.globalAlpha = 1;

        drawSonic();

        S.popups.forEach(function(p){
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
    // BACKGROUND — Green Hill Zone 4 camadas
    // ================================================================

    function drawBG() {
        if (_bgImg && _bgImg.naturalWidth) {
            _drawBGImage();
            return;
        }
        // Fallback procedural
        var sc = S.scroll;
        var skyG = ctx.createLinearGradient(0,0,0,GY*0.9);
        skyG.addColorStop(0, C.SKY_TOP); skyG.addColorStop(1, C.SKY_BOT);
        ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, GY+5);
        drawClouds(sc * 0.05);
        drawHills(sc * 0.15, C.HILL_FAR,  GY * 0.45, 170, W * 0.65);
        drawHills(sc * 0.30, C.HILL_MID,  GY * 0.58, 130, W * 0.48);
        drawHills(sc * 0.55, C.HILL_NEAR, GY * 0.70,  95, W * 0.38);
        drawChecker(sc * 0.75);
        var cb = GY + 4 * 20;
        ctx.fillStyle = C.GROUND_G;  ctx.fillRect(0, cb,      W, 15);
        ctx.fillStyle = C.GROUND_DG; ctx.fillRect(0, cb + 15, W, 10);
        ctx.fillStyle = C.GROUND_B;  ctx.fillRect(0, cb + 25, W, H - cb - 25);
    }

    function _drawBGImage() {
        var iw = _bgImg.naturalWidth;   // 1022
        var ih = _bgImg.naturalHeight;  // 498

        // Escalar para cobrir 58% da altura da tela (strip de cenário)
        var dh = H * 0.58;
        var dw = iw * (dh / ih);

        // Grama do fundo.png está em ~77% da imagem (385/498)
        // Posicionar para que essa linha coincida com GY
        var GRASS_FRAC = 385 / 498;
        var bgY = GY - dh * GRASS_FRAC;

        // Céu sólido acima da imagem (cor do GHZ: azul escuro)
        ctx.fillStyle = '#101070';
        ctx.fillRect(0, 0, W, bgY + dh * 0.08);

        // Parallax lento (35% da velocidade do foreground)
        var off = (S.scroll * 0.35) % dw;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(_bgImg, -off,      bgY, dw, dh);
        ctx.drawImage(_bgImg, -off + dw, bgY, dw, dh);

        // Solo marrom abaixo da imagem
        var soilY = bgY + dh;
        if (soilY < H) {
            ctx.fillStyle = '#7A4010';
            ctx.fillRect(0, soilY, W, H - soilY);
        }
    }

    function drawClouds(off) {
        var defs = [{rx:.10,ry:.08,w:95,h:30},{rx:.38,ry:.05,w:130,h:38},{rx:.68,ry:.09,w:88,h:26},{rx:.88,ry:.06,w:105,h:33},{rx:1.20,ry:.11,w:72,h:22}];
        ctx.fillStyle = C.CLOUD;
        defs.forEach(function(d){
            var cx = ((d.rx*W - off) % (W*1.4) + W*1.4) % (W*1.4) - W*0.2;
            ctx.beginPath();
            ctx.arc(cx,           d.ry*H,          d.h*0.55, 0, Math.PI*2);
            ctx.arc(cx+d.w*0.22, d.ry*H-d.h*0.20, d.h*0.45, 0, Math.PI*2);
            ctx.arc(cx+d.w*0.46, d.ry*H-d.h*0.10, d.h*0.50, 0, Math.PI*2);
            ctx.arc(cx+d.w*0.72, d.ry*H-d.h*0.05, d.h*0.42, 0, Math.PI*2);
            ctx.arc(cx+d.w,      d.ry*H,           d.h*0.40, 0, Math.PI*2);
            ctx.fill();
        });
    }

    function drawHills(off, color, cy, r, period) {
        ctx.fillStyle = color;
        for (var i = -1; i < 5; i++) {
            var hx = i * period - (off % period) + period * 0.5;
            ctx.beginPath(); ctx.arc(hx, cy + r * 0.3, r, 0, Math.PI*2); ctx.fill();
        }
    }

    function drawChecker(off) {
        var sz = 20, colOff = off % (sz*2);
        for (var row = 0; row < 4; row++) {
            for (var col = -2; col < Math.ceil(W/sz)+3; col++) {
                ctx.fillStyle = (col+row)%2===0 ? C.CHECK_L : C.CHECK_D;
                ctx.fillRect(col*sz - colOff, GY + row*sz, sz, sz);
            }
        }
    }

    // ================================================================
    // ANEL
    // ================================================================

    function drawRing(x, y, ph) {
        ctx.save(); ctx.translate(x, y);
        ctx.scale(Math.abs(Math.cos((S.t+ph)*0.07))*0.55+0.45, 1);
        ctx.strokeStyle = C.RING;   ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle = C.RING_L; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(-2,-2,5,Math.PI*1.3,Math.PI*2.1); ctx.stroke();
        ctx.fillStyle = '#FFFACC'; ctx.beginPath(); ctx.arc(-4,-5,2,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // ================================================================
    // OBSTACULOS
    // ================================================================

    function drawObstacle(o) {
        ctx.save(); ctx.translate(o.x, o.y);
        switch (o.type) {
            case 'spike':    drawSpikes();       break;
            case 'crabmeat': drawCrabmeat(o.t); break;
            case 'motobug':  drawMotobug(o.t);  break;
            case 'spring':   drawSpring(o);      break;
            case 'eggman':   drawEggman(o);      break;
        }
        ctx.restore();
    }

    function drawEggman(o) {
        // Bob vertical suave (apenas visual, colisão usa centro fixo)
        var bob = Math.sin(o.t * 0.06) * 10;
        ctx.save();
        ctx.translate(0, -30 + bob); // desenha ~30px acima do chão + bob
        if (_eggmanImg && _eggmanImg.naturalWidth) {
            _renderGif('eggman', _eggmanImg, 100, 0.52);
        } else {
            // Fallback simples
            ctx.fillStyle = '#C02828';
            ctx.beginPath(); ctx.arc(0, -50, 38, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(10, -52, 10, 8, -0.2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#0A0A0A';
            ctx.beginPath(); ctx.arc(13, -52, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    function drawSpikes() {
        ctx.fillStyle = '#8090A8';
        for (var i = -1; i <= 1; i++) {
            var bx = i * 20;
            ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx+8,-34); ctx.lineTo(bx+16,0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#B8C8D8';
            ctx.beginPath(); ctx.moveTo(bx+5,0); ctx.lineTo(bx+8,-28); ctx.lineTo(bx+7,0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8090A8';
        }
        ctx.fillStyle = '#606878'; ctx.fillRect(-24,-5,64,6);
    }

    function drawCrabmeat(t) {
        var bob = Math.sin(t*0.12)*4;
        ctx.fillStyle='#B81818'; ctx.beginPath(); ctx.ellipse(0,-24+bob,24,15,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#D83030'; ctx.beginPath(); ctx.ellipse(-1,-26+bob,16,10,-0.1,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#901010'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-20,-24+bob); ctx.quadraticCurveTo(0,-14+bob,20,-24+bob); ctx.stroke();
        ctx.strokeStyle='#B81818'; ctx.lineWidth=5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-20,-22+bob); ctx.lineTo(-32,-22+bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,-22+bob); ctx.lineTo(32,-22+bob); ctx.stroke();
        ctx.fillStyle='#B81818';
        ctx.beginPath(); ctx.ellipse(-34,-22+bob,9,7,0.35,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(34,-22+bob,9,7,-0.35,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-40,-17+bob); ctx.lineTo(-44,-11+bob); ctx.lineTo(-38,-14+bob); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(40,-17+bob); ctx.lineTo(44,-11+bob); ctx.lineTo(38,-14+bob); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#C03030'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(-9,-34+bob); ctx.lineTo(-9,-44+bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9,-34+bob); ctx.lineTo(9,-44+bob); ctx.stroke();
        ctx.fillStyle='#FFF'; ctx.beginPath(); ctx.arc(-9,-45+bob,5.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(9,-45+bob,5.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#0A0A0A'; ctx.beginPath(); ctx.arc(-8,-45+bob,3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10,-45+bob,3,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#901010'; ctx.lineWidth=3;
        for (var l=-2;l<=2;l++){var lp=Math.sin(t*0.14+l)*5; ctx.beginPath(); ctx.moveTo(l*8,-10+bob); ctx.lineTo(l*9+lp,0); ctx.stroke();}
    }

    function drawMotobug(t) {
        var spin = t*0.28;
        ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(0,-14,17,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#444'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,-14,15,0,Math.PI*2); ctx.stroke();
        ctx.save(); ctx.translate(0,-14); ctx.rotate(spin);
        ctx.strokeStyle='#555'; ctx.lineWidth=2;
        for(var r=0;r<4;r++){ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(r*Math.PI/2)*15,Math.sin(r*Math.PI/2)*15); ctx.stroke();}
        ctx.restore();
        ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(0,-14,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#C02828'; ctx.beginPath(); ctx.ellipse(0,-29,13,10,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#E03838'; ctx.beginPath(); ctx.ellipse(-1,-30,9,7,-0.1,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#C02828'; ctx.lineWidth=2.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-2,-37); ctx.lineTo(-4,-48); ctx.stroke();
        ctx.fillStyle='#F03838'; ctx.beginPath(); ctx.arc(-4,-49,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#FFF'; ctx.beginPath(); ctx.ellipse(-4,-31,4,3.5,-0.2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5,-31,4,3.5,0.2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#0A0A0A'; ctx.beginPath(); ctx.arc(-4,-31,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5,-31,2,0,Math.PI*2); ctx.fill();
    }

    function drawSpring(o) {
        var h = 22 - (o.compressed||0) * 14;
        ctx.fillStyle='#909090'; ctx.fillRect(-15,-4,30,5);
        ctx.strokeStyle='#E02018'; ctx.lineWidth=5; ctx.lineCap='round';
        for(var c=0;c<4;c++){
            var y1=-4-(c/4)*h, y2=-4-((c+0.5)/4)*h, y3=-4-((c+1)/4)*h;
            ctx.beginPath(); ctx.moveTo(-12,y1); ctx.lineTo(12,y2); ctx.lineTo(-12,y3); ctx.stroke();
        }
        ctx.fillStyle='#F8D820'; ctx.fillRect(-15,-6-h,30,6);
        ctx.fillStyle='#E08010'; ctx.beginPath(); ctx.arc(0,-9-h,4.5,0,Math.PI*2); ctx.fill();
    }

    // ================================================================
    // HUD
    // ================================================================

    function drawHUD() {
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.beginPath(); ctx.arc(W-110,38,30,Math.PI*0.5,Math.PI*2.5); ctx.fill();
        ctx.fillRect(W-110,8,100,60);
        ctx.beginPath(); ctx.arc(W-10,38,30,Math.PI*1.5,Math.PI*0.5); ctx.fill();

        ctx.strokeStyle=C.RING; ctx.lineWidth=3.5; ctx.beginPath(); ctx.arc(W-98,38,10,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle=C.RING_L; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(W-100,36,5,Math.PI*1.3,Math.PI*2.1); ctx.stroke();
        ctx.fillStyle='#FFF'; ctx.font='bold 22px "Russo One",sans-serif'; ctx.textAlign='left'; ctx.fillText(S.rings, W-80, 45);
        ctx.fillStyle='#94A3B8'; ctx.font='12px "Russo One",sans-serif'; ctx.fillText(S.score, W-80, 60);

        var pct = (S.worldSpeed - PHY.WORLD_INIT) / (PHY.WORLD_MAX - PHY.WORLD_INIT);
        for(var i=0;i<5;i++){ctx.fillStyle=i<Math.round(pct*5)?'#38BDF8':'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(18+i*15,30,5,0,Math.PI*2); ctx.fill();}

        if (S.phase === 'spindash' && S.sdLevel > 0) {
            var bw=120, bx=W/2-60;
            ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx-4,H-60,bw+8,20);
            ctx.fillStyle='#F8B800'; ctx.fillRect(bx,H-58,bw*(S.sdLevel/PHY.SD_MAX_LEVEL),16);
            ctx.strokeStyle='#FFE040'; ctx.lineWidth=1.5; ctx.strokeRect(bx,H-58,bw,16);
            ctx.fillStyle='#fff'; ctx.font='bold 11px "Russo One",sans-serif'; ctx.textAlign='center'; ctx.fillText('SPIN DASH',W/2,H-65);
        }
    }

    function drawCelebration() {
        var a = Math.min(1, S.celebrating / 25);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, H/2-62, W, 68);
        ctx.fillStyle = '#F8B800'; ctx.font = 'bold clamp(20px,6vw,34px) "Russo One",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(S.rings + ' aneis!', W/2, H/2-18);
        ctx.restore();
    }

    // ================================================================
    // LOOP
    // ================================================================

    function gameLoop() { update(); draw(); animFrame = requestAnimationFrame(gameLoop); }

    // ================================================================
    // INPUT
    // ================================================================

    function setupInput() {
        var _ku;
        _kh = function(e) {
            if (e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){e.preventDefault();inputJump=true;inputJumpHeld=true;}
            if (e.key==='z'||e.key==='Z'||e.key==='ArrowDown'||e.key==='s'){e.preventDefault();inputSD=true;}
            if (e.key==='Escape'){if(window.fecharJoguinhos)window.fecharJoguinhos();else window.SonicGame.fechar();}
        };
        _ku = function(e){
            if(e.key==='z'||e.key==='Z'||e.key==='ArrowDown'||e.key==='s') inputSD=false;
            if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W') inputJumpHeld=false;
        };
        window.addEventListener('keydown',_kh); window.addEventListener('keyup',_ku); _kh._up=_ku;

        _rh = function(){
            W=window.innerWidth;H=window.innerHeight;GY=H*0.62;
            canvas.width=W;canvas.height=H;
            S.x=W*0.22;if(S.y>GY)S.y=GY;
            updateRotateHint();
        };
        window.addEventListener('resize',_rh);
        window.addEventListener('orientationchange',_rh);
    }

    function removeInput() {
        if(_kh){window.removeEventListener('keydown',_kh);if(_kh._up)window.removeEventListener('keyup',_kh._up);_kh=null;}
        if(_rh){window.removeEventListener('resize',_rh);window.removeEventListener('orientationchange',_rh);_rh=null;}
        if(sdBtnEl){sdBtnEl.remove();sdBtnEl=null;}
        if(jumpBtnEl){jumpBtnEl.remove();jumpBtnEl=null;}
        if(rotateHintEl){rotateHintEl.remove();rotateHintEl=null;}
    }

    function createSDBtn() {
        sdBtnEl = document.createElement('button');
        sdBtnEl.style.cssText=['position:fixed','top:50%','left:24px','transform:translateY(-50%)','z-index:9100','width:92px','height:92px','border-radius:50%','background:linear-gradient(135deg,#C02020,#801010)','border:3px solid #FFE040','color:#FFE040','font-family:"Russo One",sans-serif','font-size:12px','cursor:pointer','display:flex','flex-direction:column','align-items:center','justify-content:center','-webkit-tap-highlight-color:transparent','user-select:none','touch-action:none','box-shadow:0 6px 18px rgba(192,32,32,.5)'].join(';');
        sdBtnEl.innerHTML='<span style="font-size:28px;line-height:1;">&#9654;</span><span style="font-size:10px;margin-top:3px;letter-spacing:1px;">SPIN</span>';
        var down=function(e){if(e)e.preventDefault();inputSD=true;initAC();sdBtnEl.style.opacity='0.75';sdBtnEl.style.transform='translateY(-50%) scale(0.93)';};
        var up=function(e){if(e)e.preventDefault();inputSD=false;sdBtnEl.style.opacity='';sdBtnEl.style.transform='translateY(-50%)';};
        sdBtnEl.addEventListener('pointerdown',down);
        sdBtnEl.addEventListener('pointerup',up);
        sdBtnEl.addEventListener('pointerleave',up);
        sdBtnEl.addEventListener('pointercancel',up);
        overlay.appendChild(sdBtnEl);
    }

    function createJumpBtn() {
        jumpBtnEl = document.createElement('button');
        jumpBtnEl.style.cssText=['position:fixed','top:50%','right:24px','transform:translateY(-50%)','z-index:9100','width:110px','height:110px','border-radius:50%','background:linear-gradient(135deg,#F8B800,#C07000)','border:3px solid #FFE040','color:#fff','font-family:"Russo One",sans-serif','font-size:16px','cursor:pointer','display:flex','flex-direction:column','align-items:center','justify-content:center','-webkit-tap-highlight-color:transparent','user-select:none','touch-action:none','box-shadow:0 6px 22px rgba(248,184,0,.55)','letter-spacing:1px'].join(';');
        jumpBtnEl.innerHTML='<span class="material-icons" style="font-size:40px;pointer-events:none;">arrow_upward</span><span style="font-size:12px;margin-top:2px;pointer-events:none;">JUMP</span>';
        var down=function(e){if(e)e.preventDefault();inputJump=true;inputJumpHeld=true;initAC();jumpBtnEl.style.opacity='0.75';jumpBtnEl.style.transform='translateY(-50%) scale(0.93)';};
        var up=function(e){if(e)e.preventDefault();inputJumpHeld=false;jumpBtnEl.style.opacity='';jumpBtnEl.style.transform='translateY(-50%)';};
        jumpBtnEl.addEventListener('pointerdown',down);
        jumpBtnEl.addEventListener('pointerup',up);
        jumpBtnEl.addEventListener('pointerleave',up);
        jumpBtnEl.addEventListener('pointercancel',up);
        overlay.appendChild(jumpBtnEl);
    }

    function createRotateHint() {
        rotateHintEl = document.createElement('div');
        rotateHintEl.style.cssText=['position:fixed','inset:0','background:rgba(15,23,42,0.95)','display:none','flex-direction:column','align-items:center','justify-content:center','gap:16px','color:#f1f5f9','font-family:"Russo One",sans-serif','z-index:9300','pointer-events:none'].join(';');
        rotateHintEl.innerHTML='<span class="material-icons" style="font-size:64px;color:#F8B800;">screen_rotation</span><div style="font-size:1.1rem;letter-spacing:1px;">Gire o celular</div>';
        overlay.appendChild(rotateHintEl);
    }

    // ================================================================
    // API
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

            var backBtn = document.createElement('button');
            backBtn.style.cssText = ['position:fixed','top:16px','left:16px','z-index:9100','background:rgba(0,0,0,0.55)','border:1px solid rgba(255,255,255,0.22)','color:#fff','border-radius:50%','width:44px','height:44px','cursor:pointer','display:flex','align-items:center','justify-content:center','-webkit-tap-highlight-color:transparent'].join(';');
            backBtn.innerHTML = '<span class="material-icons" style="font-size:22px;">arrow_back</span>';
            backBtn.addEventListener('click', function () { if(window.fecharJoguinhos)window.fecharJoguinhos();else window.SonicGame.fechar(); });
            overlay.appendChild(backBtn);

            document.body.appendChild(overlay);
            ctx = canvas.getContext('2d');

            try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}

            initState();
            initSprites(); // carrega PNG ou gera sprites
            initGifs();    // carrega GIFs animados (run + jump)
            initAssets();  // carrega fundo.png + eggman.gif
            createSDBtn();
            createJumpBtn();
            createRotateHint();
            tryLockLandscape();
            updateRotateHint();
            setupInput();
            gameLoop();
        },

        fechar: function () {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            removeInput();
            unlockOrientation();
            if (ac) { ac.close().catch(function(){}); ac = null; }
            if (overlay) { overlay.remove(); overlay = null; canvas = null; ctx = null; }
        },
    };

})();

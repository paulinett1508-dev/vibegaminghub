// =====================================================================
// joguinhos-modal.js — Sistema de Navegacao v2.0
// =====================================================================
// Gerencia 3 telas: Splash → Hub → Jogo
// Desenha personagens animados no splash (garotinho Jose + fundo)
// Monta grid de jogos no hub
// =====================================================================

(function () {
    'use strict';

    // ---- Registro de jogos ----
    const JOGOS = [
        {
            id: 'penaltis',
            nome: 'Penaltis',
            icon: 'sports_soccer',
            cor: 'linear-gradient(135deg,#10b981,#059669)',
            abrir: function () {
                if (!window.PenaltisGame) return;
                const container = document.getElementById('jogo-container');
                container.innerHTML = '';
                const inner = document.createElement('div');
                inner.id = 'penaltis-inner';
                inner.style.cssText = 'max-width:420px;width:100%;';
                container.appendChild(inner);
                window.PenaltisGame.abrir('penaltis-inner');
            },
            fechar: function () {
                if (window.PenaltisGame) window.PenaltisGame.fechar();
            }
        },
        {
            id: 'escorpiao',
            nome: 'Escorpiao',
            icon: 'pest_control',
            cor: 'linear-gradient(135deg,#f59e0b,#b45309)',
            abrir: function () {
                if (window.EscorpiaoGame) window.EscorpiaoGame.abrir();
            },
            fechar: function () {
                if (window.EscorpiaoGame) window.EscorpiaoGame.fechar();
            }
        },
        {
            id: 'reptil',
            nome: 'Reptil',
            icon: 'gesture',
            cor: 'linear-gradient(135deg,#10b981,#047857)',
            abrir: function () {
                if (window.ReptilGame) window.ReptilGame.abrir();
            },
            fechar: function () {
                if (window.ReptilGame) window.ReptilGame.fechar();
            }
        },
        {
            id: 'pacman',
            nome: 'Pac-Man',
            icon: 'adjust',
            cor: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            abrir: function () {
                if (window.PacmanGame) window.PacmanGame.abrir();
            },
            fechar: function () {
                if (window.PacmanGame) window.PacmanGame.fechar();
            }
        }
    ];

    let jogoAtual = null;
    let splashAnimFrame = null;
    let joseAnimFrame = null;

    // ---- Música da Splash ----
    var _splashAC = null;
    var _splashMusicActive = false;
    var _splashNoteTimer = null;
    // Melodia pentatonica feliz [freq Hz, duração s]
    var _MELODY = [
        [523, 0.18], // C5
        [659, 0.18], // E5
        [784, 0.18], // G5
        [880, 0.25], // A5
        [784, 0.18], // G5
        [659, 0.18], // E5
        [523, 0.35], // C5 longa
        [0,   0.15]  // pausa
    ];

    function _tocarNotaSplash(freq, dur) {
        if (!_splashAC || _splashAC.state !== 'running') return;
        if (freq <= 0) return;
        var osc = _splashAC.createOscillator();
        var gain = _splashAC.createGain();
        osc.connect(gain);
        gain.connect(_splashAC.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var now = _splashAC.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.015);
        gain.gain.setValueAtTime(0.07, now + dur * 0.72);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.95);
        osc.start(now);
        osc.stop(now + dur);
    }

    function _agendarNota(idx) {
        if (!_splashMusicActive) return;
        var note = _MELODY[idx];
        _tocarNotaSplash(note[0], note[1]);
        var next = (idx + 1) % _MELODY.length;
        _splashNoteTimer = setTimeout(function () { _agendarNota(next); }, note[1] * 1000);
    }

    function iniciarMusicaSplash() {
        _splashMusicActive = true;
        if (!_splashAC) {
            try { _splashAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        }
        if (_splashAC.state === 'suspended') {
            _splashAC.resume().then(function () {
                if (_splashMusicActive && !_splashNoteTimer) _agendarNota(0);
            });
        } else {
            _agendarNota(0);
        }
    }

    function pararMusicaSplash() {
        _splashMusicActive = false;
        if (_splashNoteTimer) { clearTimeout(_splashNoteTimer); _splashNoteTimer = null; }
    }

    // ---- Navegacao entre telas ----

    function mostrarTela(id) {
        document.querySelectorAll('.tela').forEach(function (t) {
            t.classList.add('hidden');
        });
        var tela = document.getElementById(id);
        if (tela) tela.classList.remove('hidden');
    }

    function irParaHub() {
        pararSplashAnim();
        mostrarTela('tela-hub');
    }

    function irParaSplash() {
        if (jogoAtual) {
            jogoAtual.fechar();
            jogoAtual = null;
        }
        var container = document.getElementById('jogo-container');
        if (container) container.innerHTML = '';
        mostrarTela('tela-splash');
        iniciarSplashAnim();
    }

    function irParaJogo(jogo) {
        jogoAtual = jogo;
        mostrarTela('tela-jogo');
        // Jogos com overlay proprio (fullscreen) escondem a tela-jogo
        if (jogo.id === 'escorpiao' || jogo.id === 'reptil' || jogo.id === 'pacman') {
            document.getElementById('tela-jogo').classList.add('hidden');
        }
        jogo.abrir();
    }

    function voltarDoJogo() {
        if (jogoAtual) {
            jogoAtual.fechar();
            jogoAtual = null;
        }
        var container = document.getElementById('jogo-container');
        if (container) container.innerHTML = '';
        mostrarTela('tela-hub');
    }

    // ---- Montar grid do hub ----

    function montarHub() {
        var grid = document.getElementById('hub-grid');
        if (!grid) return;
        grid.innerHTML = '';

        JOGOS.forEach(function (jogo) {
            var card = document.createElement('button');
            card.className = 'hub-card';
            card.setAttribute('aria-label', jogo.nome);
            card.innerHTML =
                '<div class="hub-card-icon" style="background:' + jogo.cor + ';">' +
                    '<span class="material-icons">' + jogo.icon + '</span>' +
                '</div>' +
                '<div class="hub-card-name">' + jogo.nome + '</div>';

            card.addEventListener('click', function () {
                irParaJogo(jogo);
            });
            grid.appendChild(card);
        });

        // Card "em breve" placeholders
        for (var i = 0; i < 1; i++) {
            var placeholder = document.createElement('div');
            placeholder.className = 'hub-card locked';
            placeholder.innerHTML =
                '<div class="hub-card-icon" style="background:rgba(255,255,255,0.05);">' +
                    '<span class="material-icons" style="color:rgba(255,255,255,0.2);">lock</span>' +
                '</div>' +
                '<div class="hub-card-name" style="color:rgba(255,255,255,0.2);">Em breve</div>';
            grid.appendChild(placeholder);
        }
    }

    // ---- Splash: Desenhar rosto do Jose (estilo fofo) ----

    function desenharJose() {
        var canvas = document.getElementById('jose-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;
        var t = 0;

        // Paleta de cores
        var skin = '#e8c4a0';
        var skinDark = '#d4a88a';
        var hairBlue = '#2d7fc1';
        var hairLight = '#4a9ee0';
        var hairDark = '#1a5a8c';

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            var cx = W / 2;
            var cy = H / 2 + 5;
            var bounce = Math.sin(t * 0.04) * 2;

            ctx.save();

            // Leve rotacao divertida
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(t * 0.02) * 0.03);
            ctx.translate(-cx, -cy);

            // ===== ORELHAS =====
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.ellipse(cx - 50, cy + 8 + bounce, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 50, cy + 8 + bounce, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== ROSTO =====
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.arc(cx, cy + 4 + bounce, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.arc(cx, cy + bounce, 47, 0, Math.PI * 2);
            ctx.fill();

            // ===== CABELO AZUL =====
            ctx.fillStyle = hairDark;
            ctx.beginPath();
            ctx.arc(cx, cy - 15 + bounce, 50, Math.PI, 0);
            ctx.fill();

            // Cachinhos
            var curls = [
                { x: 0, y: -60, r: 16 },
                { x: -20, y: -55, r: 15 }, { x: 20, y: -55, r: 15 },
                { x: -38, y: -45, r: 14 }, { x: 38, y: -45, r: 14 },
                { x: -12, y: -62, r: 12 }, { x: 12, y: -62, r: 12 },
                { x: -30, y: -52, r: 13 }, { x: 30, y: -52, r: 13 },
                { x: -45, y: -32, r: 12 }, { x: 45, y: -32, r: 12 },
                { x: 0, y: -68, r: 11 }
            ];

            curls.forEach(function(c, i) {
                var wobble = Math.sin(t * 0.025 + i * 0.5) * 2;
                ctx.fillStyle = hairBlue;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble, cy + c.y + bounce, c.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hairLight;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble - 3, cy + c.y + bounce - 4, c.r * 0.35, 0, Math.PI * 2);
                ctx.fill();
            });

            // ===== OLHOS SIMPLES E FOFOS =====
            var blink = (t % 180 < 8) ? 0.1 : 1;
            var eyeY = cy + 2 + bounce;
            var eyeSpacing = 18;

            // Olhos pretos simples
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, 8, 9 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, 8, 9 * blink, 0, 0, Math.PI * 2);
            ctx.fill();

            // Brilhos
            if (blink > 0.5) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing + 3, eyeY - 3, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing + 3, eyeY - 3, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // ===== SOBRANCELHAS =====
            ctx.strokeStyle = hairDark;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 28, cy - 12 + bounce);
            ctx.quadraticCurveTo(cx - 18, cy - 18 + bounce, cx - 10, cy - 14 + bounce);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 14 + bounce);
            ctx.quadraticCurveTo(cx + 18, cy - 18 + bounce, cx + 28, cy - 12 + bounce);
            ctx.stroke();

            // ===== NARIZ =====
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 18 + bounce, 5, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== BOCHECHAS =====
            ctx.fillStyle = 'rgba(255, 130, 130, 0.4)';
            ctx.beginPath();
            ctx.ellipse(cx - 32, cy + 16 + bounce, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 32, cy + 16 + bounce, 11, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== SORRISO SIMPLES E ALEGRE =====
            // Boca (arco simples)
            ctx.fillStyle = '#a04040';
            ctx.beginPath();
            ctx.arc(cx, cy + 32 + bounce, 16, 0.1, Math.PI - 0.1);
            ctx.fill();

            // Dentes (arco branco simples)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx, cy + 32 + bounce, 14, 0.15, Math.PI - 0.15);
            ctx.lineTo(cx - 13, cy + 32 + bounce);
            ctx.fill();

            // Contorno do sorriso
            ctx.strokeStyle = '#803030';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy + 32 + bounce, 16, 0.1, Math.PI - 0.1);
            ctx.stroke();

            ctx.restore();

            joseAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    // ---- Splash: Fundo estilo arcade/games ----

    function desenharFundoSplash() {
        var canvas = document.getElementById('splash-bg-canvas');
        if (!canvas) return;

        var W, H;
        function resize() {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        }
        resize();
        window.addEventListener('resize', resize);

        var ctx = canvas.getContext('2d');
        var t = 0;

        // Particulas geometricas (triangulos, quadrados, circulos)
        var particulas = [];
        var shapes = ['circle', 'triangle', 'square', 'diamond', 'star'];
        for (var i = 0; i < 35; i++) {
            particulas.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: 4 + Math.random() * 12,
                speedY: 0.3 + Math.random() * 0.8,
                speedX: (Math.random() - 0.5) * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.03,
                phase: Math.random() * Math.PI * 2,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                color: ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#a855f7', '#22d3ee'][Math.floor(Math.random() * 7)],
                opacity: 0.15 + Math.random() * 0.35
            });
        }

        // Funcao para desenhar formas
        function drawShape(x, y, size, shape, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();

            switch (shape) {
                case 'circle':
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    break;
                case 'triangle':
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.866, size * 0.5);
                    ctx.lineTo(-size * 0.866, size * 0.5);
                    ctx.closePath();
                    break;
                case 'square':
                    ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
                    break;
                case 'diamond':
                    ctx.moveTo(0, -size);
                    ctx.lineTo(size * 0.6, 0);
                    ctx.lineTo(0, size);
                    ctx.lineTo(-size * 0.6, 0);
                    ctx.closePath();
                    break;
                case 'star':
                    for (var i = 0; i < 5; i++) {
                        var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                        var px = Math.cos(angle) * size;
                        var py = Math.sin(angle) * size;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    break;
            }
            ctx.fill();
            ctx.restore();
        }

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            // Grid neon sutil no fundo
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
            ctx.lineWidth = 1;
            var gridSize = 60;
            var gridOffset = (t * 0.3) % gridSize;

            // Linhas horizontais
            for (var gy = -gridSize + gridOffset; gy < H + gridSize; gy += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(W, gy);
                ctx.stroke();
            }
            // Linhas verticais
            for (var gx = 0; gx < W; gx += gridSize) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, H);
                ctx.stroke();
            }

            // Glow central (atras do mascote)
            var glowPulse = 0.3 + Math.sin(t * 0.02) * 0.1;
            var centerGlow = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, Math.min(W, H) * 0.5);
            centerGlow.addColorStop(0, 'rgba(139, 92, 246, ' + (glowPulse * 0.3) + ')');
            centerGlow.addColorStop(0.5, 'rgba(168, 85, 247, ' + (glowPulse * 0.15) + ')');
            centerGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
            ctx.fillStyle = centerGlow;
            ctx.fillRect(0, 0, W, H);

            // Particulas geometricas flutuando
            particulas.forEach(function (p) {
                // Mover particula
                p.y -= p.speedY;
                p.x += p.speedX + Math.sin(t * 0.01 + p.phase) * 0.3;
                p.rotation += p.rotSpeed;

                // Wrap around
                if (p.y < -p.size * 2) {
                    p.y = H + p.size * 2;
                    p.x = Math.random() * W;
                }
                if (p.x < -p.size * 2) p.x = W + p.size * 2;
                if (p.x > W + p.size * 2) p.x = -p.size * 2;

                // Pulsar opacidade
                var pulse = p.opacity * (0.7 + Math.sin(t * 0.03 + p.phase) * 0.3);
                ctx.globalAlpha = pulse;
                ctx.fillStyle = p.color;
                drawShape(p.x, p.y, p.size, p.shape, p.rotation);
            });

            // Icones de game nos cantos (gamepad silhuetas)
            ctx.globalAlpha = 0.08;

            // Gamepad canto inferior esquerdo
            var padX = W * 0.12;
            var padY = H * 0.88 + Math.sin(t * 0.025) * 8;
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.roundRect(padX - 25, padY - 12, 50, 24, 8);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(padX - 12, padY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(padX + 12, padY, 6, 0, Math.PI * 2);
            ctx.fill();

            // Gamepad canto inferior direito
            var pad2X = W * 0.88;
            var pad2Y = H * 0.85 + Math.sin(t * 0.025 + 2) * 8;
            ctx.fillStyle = '#22d3ee';
            ctx.beginPath();
            ctx.roundRect(pad2X - 25, pad2Y - 12, 50, 24, 8);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pad2X - 12, pad2Y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pad2X + 12, pad2Y, 6, 0, Math.PI * 2);
            ctx.fill();

            // Estrelas brilhantes nos cantos
            ctx.fillStyle = '#fbbf24';
            var starPositions = [
                { x: 0.08, y: 0.12 }, { x: 0.92, y: 0.1 }, { x: 0.15, y: 0.25 },
                { x: 0.85, y: 0.28 }, { x: 0.05, y: 0.5 }, { x: 0.95, y: 0.45 }
            ];
            starPositions.forEach(function (sp, si) {
                var sx = sp.x * W;
                var sy = sp.y * H;
                var twinkle = 0.5 + Math.sin(t * 0.06 + si * 1.5) * 0.5;
                ctx.globalAlpha = 0.1 + twinkle * 0.15;

                // Estrela de 4 pontas
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(t * 0.01 + si);
                var starSize = 6 + twinkle * 8;
                ctx.beginPath();
                ctx.moveTo(0, -starSize);
                ctx.lineTo(starSize * 0.2, -starSize * 0.2);
                ctx.lineTo(starSize, 0);
                ctx.lineTo(starSize * 0.2, starSize * 0.2);
                ctx.lineTo(0, starSize);
                ctx.lineTo(-starSize * 0.2, starSize * 0.2);
                ctx.lineTo(-starSize, 0);
                ctx.lineTo(-starSize * 0.2, -starSize * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });

            ctx.globalAlpha = 1;

            splashAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    function iniciarSplashAnim() {
        desenharJose();
        desenharFundoSplash();
        iniciarMusicaSplash();
    }

    function pararSplashAnim() {
        if (splashAnimFrame) {
            cancelAnimationFrame(splashAnimFrame);
            splashAnimFrame = null;
        }
        if (joseAnimFrame) {
            cancelAnimationFrame(joseAnimFrame);
            joseAnimFrame = null;
        }
        pararMusicaSplash();
    }

    // ---- Inicializacao ----

    function init() {
        // Montar hub
        montarHub();

        // Botao jogar no splash
        var btnJogar = document.getElementById('btn-jogar');
        if (btnJogar) {
            btnJogar.addEventListener('click', irParaHub);
        }

        // Botao voltar no hub
        var hubBack = document.getElementById('hub-back-btn');
        if (hubBack) {
            hubBack.addEventListener('click', irParaSplash);
        }

        // Botao voltar do jogo
        var jogoVoltar = document.getElementById('jogo-voltar-btn');
        if (jogoVoltar) {
            jogoVoltar.addEventListener('click', voltarDoJogo);
        }

        // Iniciar animacoes do splash
        iniciarSplashAnim();

        // Musica: resume AudioContext na primeira interacao com a splash
        // (necessario para mobile onde AC começa suspenso)
        var splashEl = document.getElementById('tela-splash');
        if (splashEl) {
            splashEl.addEventListener('pointerdown', function () {
                if (_splashAC && _splashAC.state === 'suspended' && _splashMusicActive) {
                    _splashAC.resume().then(function () {
                        if (_splashMusicActive && !_splashNoteTimer) _agendarNota(0);
                    });
                }
            });
        }
    }

    // Exposicao global (retrocompatibilidade)
    window.abrirJoguinhos = irParaHub;
    window.fecharJoguinhos = voltarDoJogo;

    // Rodar ao carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

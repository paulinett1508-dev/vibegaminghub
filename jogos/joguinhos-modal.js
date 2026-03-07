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
        },
        {
            id: 'tamandua',
            nome: 'Tamandua',
            icon: 'pets',
            cor: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
            abrir: function () {
                if (window.TamanduaGame) window.TamanduaGame.abrir();
            },
            fechar: function () {
                if (window.TamanduaGame) window.TamanduaGame.fechar();
            }
        }
    ];

    let jogoAtual = null;
    let splashAnimFrame = null;
    let joseAnimFrame = null;
    var _splashResizeHandler = null;

    // ---- Música da Splash ----
    var _splashAC = null;
    var _splashMusicActive = false;
    var _splashNoteTimer = null;
    // Melodia pentatonica longa (~30s) [freq Hz, duração s]
    // Notas: C4=262, D4=294, E4=330, G4=392, A4=440, C5=523, D5=587, E5=659, G5=784, A5=880
    var _MELODY = [
        // Frase 1: Abertura suave ascendente
        [262, 0.3], [330, 0.3], [392, 0.3], [440, 0.4], [0, 0.2],
        [392, 0.25], [330, 0.25], [262, 0.5], [0, 0.3],
        // Frase 2: Saltitante
        [523, 0.15], [440, 0.15], [523, 0.15], [659, 0.3], [0, 0.15],
        [587, 0.2], [523, 0.2], [440, 0.3], [392, 0.4], [0, 0.25],
        // Frase 3: Melodia descendente calma
        [784, 0.35], [659, 0.25], [587, 0.25], [523, 0.35], [0, 0.2],
        [440, 0.3], [392, 0.3], [330, 0.4], [262, 0.5], [0, 0.4],
        // Frase 4: Brincalhona com notas rapidas
        [330, 0.12], [392, 0.12], [440, 0.12], [523, 0.12], [587, 0.2],
        [523, 0.12], [440, 0.12], [392, 0.12], [330, 0.25], [0, 0.2],
        [294, 0.15], [330, 0.15], [392, 0.3], [440, 0.4], [0, 0.3],
        // Frase 5: Ponte tranquila
        [262, 0.4], [0, 0.15], [330, 0.4], [0, 0.15], [392, 0.5], [0, 0.3],
        [440, 0.35], [392, 0.35], [330, 0.5], [0, 0.4],
        // Frase 6: Subida animada
        [262, 0.2], [294, 0.2], [330, 0.2], [392, 0.2], [440, 0.25],
        [523, 0.25], [587, 0.25], [659, 0.35], [0, 0.25],
        [784, 0.2], [659, 0.2], [523, 0.3], [0, 0.2],
        // Frase 7: Eco suave
        [440, 0.3], [0, 0.1], [440, 0.2], [0, 0.15],
        [392, 0.3], [0, 0.1], [392, 0.2], [0, 0.15],
        [330, 0.4], [262, 0.5], [0, 0.4],
        // Frase 8: Variacao com oitava alta
        [523, 0.25], [659, 0.25], [784, 0.3], [880, 0.4], [0, 0.2],
        [784, 0.2], [659, 0.2], [523, 0.3], [440, 0.4], [0, 0.3],
        // Frase 9: Descida lenta e majestosa
        [880, 0.4], [784, 0.35], [659, 0.35], [587, 0.35],
        [523, 0.4], [440, 0.35], [392, 0.35], [330, 0.5], [0, 0.4],
        // Frase 10: Final suave antes de repetir
        [262, 0.3], [330, 0.25], [262, 0.4], [0, 0.2],
        [294, 0.3], [262, 0.5], [0, 0.6],
        // Pausa longa antes de reiniciar
        [0, 1.5]
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
        if (_splashAC) { _splashAC.close().catch(function () {}); _splashAC = null; }
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
        if (jogo.id === 'escorpiao' || jogo.id === 'reptil' || jogo.id === 'pacman' || jogo.id === 'tamandua') {
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

    // ---- Splash: Desenhar rosto do Jose (estilo referencia) ----

    function desenharJose() {
        var canvas = document.getElementById('jose-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width;
        var H = canvas.height;
        var t = 0;

        // Paleta de cores
        var skin = '#f5dfc5';
        var skinDark = '#e8c9a8';
        var hairColor = '#1a1a1a';
        var hairLight = '#3a3a3a';
        var hairDark = '#0a0a0a';

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            var cx = W / 2;
            var cy = H / 2 + 10;
            var bounce = Math.sin(t * 0.04) * 1.5;

            ctx.save();

            // Leve rotacao divertida
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(t * 0.02) * 0.02);
            ctx.translate(-cx, -cy);

            // ===== ORELHAS =====
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.ellipse(cx - 52, cy + 5 + bounce, 12, 16, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 52, cy + 5 + bounce, 12, 16, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // ===== ROSTO =====
            // Sombra sutil
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 6 + bounce, 52, 48, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rosto principal
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.ellipse(cx, cy + bounce, 50, 46, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== CABELO AZUL (mais volumoso) =====
            // Base do cabelo
            ctx.fillStyle = hairDark;
            ctx.beginPath();
            ctx.arc(cx, cy - 10 + bounce, 55, Math.PI, 0);
            ctx.fill();

            // Cachinhos maiores e mais organicos
            var curls = [
                { x: 0, y: -62, r: 18 },
                { x: -22, y: -58, r: 17 }, { x: 22, y: -58, r: 17 },
                { x: -42, y: -45, r: 16 }, { x: 42, y: -45, r: 16 },
                { x: -10, y: -68, r: 14 }, { x: 10, y: -68, r: 14 },
                { x: -32, y: -55, r: 15 }, { x: 32, y: -55, r: 15 },
                { x: -50, y: -30, r: 14 }, { x: 50, y: -30, r: 14 },
                { x: 0, y: -72, r: 12 },
                { x: -55, y: -15, r: 12 }, { x: 55, y: -15, r: 12 }
            ];

            curls.forEach(function(c, i) {
                var wobble = Math.sin(t * 0.02 + i * 0.4) * 1.5;
                ctx.fillStyle = hairColor;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble, cy + c.y + bounce, c.r, 0, Math.PI * 2);
                ctx.fill();
                // Brilho no cabelo
                ctx.fillStyle = hairLight;
                ctx.beginPath();
                ctx.arc(cx + c.x + wobble - 4, cy + c.y + bounce - 5, c.r * 0.3, 0, Math.PI * 2);
                ctx.fill();
            });

            // ===== OLHOS GRANDES E EXPRESSIVOS =====
            var blink = (t % 200 < 8) ? 0.1 : 1;
            var eyeY = cy + bounce;
            var eyeSpacing = 22;

            // Branco dos olhos
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, 14, 16 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, 14, 16 * blink, 0, 0, Math.PI * 2);
            ctx.fill();

            // Iris (marrom escuro)
            if (blink > 0.5) {
                ctx.fillStyle = '#3d2314';
                ctx.beginPath();
                ctx.ellipse(cx - eyeSpacing + 2, eyeY + 2, 9, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cx + eyeSpacing + 2, eyeY + 2, 9, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Pupila
                ctx.fillStyle = '#1a0f0a';
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing + 2, eyeY + 3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing + 2, eyeY + 3, 5, 0, Math.PI * 2);
                ctx.fill();

                // Brilhos grandes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing + 5, eyeY - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing + 5, eyeY - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                // Brilhos pequenos
                ctx.beginPath();
                ctx.arc(cx - eyeSpacing - 1, eyeY + 5, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + eyeSpacing - 1, eyeY + 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // ===== SOBRANCELHAS SUAVES =====
            ctx.strokeStyle = hairDark;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 34, cy - 18 + bounce);
            ctx.quadraticCurveTo(cx - 22, cy - 24 + bounce, cx - 10, cy - 20 + bounce);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, cy - 20 + bounce);
            ctx.quadraticCurveTo(cx + 22, cy - 24 + bounce, cx + 34, cy - 18 + bounce);
            ctx.stroke();

            // ===== NARIZ PEQUENO =====
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 18 + bounce, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== BOCHECHAS ROSADAS =====
            ctx.fillStyle = 'rgba(255, 160, 140, 0.35)';
            ctx.beginPath();
            ctx.ellipse(cx - 36, cy + 18 + bounce, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 36, cy + 18 + bounce, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // ===== SORRISO FELIZ =====
            // Boca aberta
            ctx.fillStyle = '#c45c5c';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 32 + bounce, 18, 12, 0, 0, Math.PI);
            ctx.fill();

            // Dentes superiores
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
        if (_splashResizeHandler) window.removeEventListener('resize', _splashResizeHandler);
        _splashResizeHandler = resize;
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
        if (_splashResizeHandler) {
            window.removeEventListener('resize', _splashResizeHandler);
            _splashResizeHandler = null;
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

        // Musica: resume AudioContext na primeira interacao do usuario
        // (necessario para mobile onde AC comeca suspenso)
        function tentarIniciarMusica() {
            if (!_splashAC || _splashAC.state !== 'suspended' || !_splashMusicActive) return;
            // Remover listeners apos primeira interacao bem-sucedida
            ['click', 'touchstart', 'keydown'].forEach(function (evt) {
                document.removeEventListener(evt, tentarIniciarMusica);
            });
            _splashAC.resume().then(function () {
                if (_splashMusicActive && !_splashNoteTimer) _agendarNota(0);
            });
        }
        // Capturar qualquer interacao no documento
        ['click', 'touchstart', 'keydown'].forEach(function (evt) {
            document.addEventListener(evt, tentarIniciarMusica, { passive: true });
        });
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

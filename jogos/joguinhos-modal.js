// =====================================================================
// joguinhos-modal.js — Sistema de Navegacao v2.0
// =====================================================================
// Gerencia 3 telas: Splash → Hub → Jogo
// Splash com fundo decorativo + hub de jogos
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
            icon: 'pest_control_rodent',
            cor: 'linear-gradient(135deg,#10b981,#f97316)',
            abrir: function () { mostrarPickerReptil(); },
            fechar: function () {
                var p = document.getElementById('reptil-picker');
                if (p) p.remove();
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
        },
        {
            id: 'aranha',
            nome: 'Aranha',
            icon: 'pest_control',
            cor: 'linear-gradient(135deg,#1a1a2e,#6c2bd9)',
            abrir: function () { if (window.AranhaGame) window.AranhaGame.abrir(); },
            fechar: function () { if (window.AranhaGame) window.AranhaGame.fechar(); }
        },
        {
            id: 'arco',
            nome: 'Arco',
            icon: 'sports',
            cor: 'linear-gradient(135deg, #1a3a1a, #2d7a2d)',
            abrir: function () { if (window.ArcoGame) window.ArcoGame.abrir(); },
            fechar: function () { if (window.ArcoGame) window.ArcoGame.fechar(); }
        },
        {
            id: 'sonic',
            nome: 'Sonic',
            icon: 'speed',
            iconCanvas: true,
            cor: 'linear-gradient(135deg,#1a3a9e,#0ea5e9)',
            abrir: function () { if (window.MegadriveGame) window.MegadriveGame.abrir(); },
            fechar: function () { if (window.MegadriveGame) window.MegadriveGame.fechar(); }
        },
        {
            id: 'donkeykong',
            nome: 'Donkey Kong',
            icon: 'emoji_nature',
            cor: 'linear-gradient(135deg,#92400e,#f59e0b)',
            abrir: function () { if (window.DonkeyKongGame) window.DonkeyKongGame.abrir(); },
            fechar: function () { if (window.DonkeyKongGame) window.DonkeyKongGame.fechar(); }
        },
        {
            id: 'snes',
            nome: 'SNES',
            icon: 'sports_esports',
            cor: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
            abrir: function () { if (window.SNESGame) window.SNESGame.abrir(); },
            fechar: function () { if (window.SNESGame) window.SNESGame.fechar(); }
        }
    ];

    // Atalhos de performance (window._PERF vem de perf-detect.js)
    var _P = function () { return window._PERF || {}; };
    var _low = function () { return _P().low; };

    let jogoAtual = null;
    let splashAnimFrame = null;
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
        _telaAtual = 'hub';
        history.pushState({ tela: 'hub' }, '');
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
        _telaAtual = 'splash';
    }

    function irParaJogo(jogo) {
        jogoAtual = jogo;
        mostrarTela('tela-jogo');
        // Jogos com overlay proprio (fullscreen) escondem a tela-jogo
        if (jogo.id === 'escorpiao' || jogo.id === 'reptil' || jogo.id === 'pacman' || jogo.id === 'tamandua' || jogo.id === 'sonic' || jogo.id === 'aranha' || jogo.id === 'arco' || jogo.id === 'donkeykong' || jogo.id === 'snes') {
            document.getElementById('tela-jogo').classList.add('hidden');
        }
        jogo.abrir();
        _telaAtual = 'jogo';
        history.pushState({ tela: 'jogo', jogoId: jogo.id }, '');
    }

    function voltarDoJogo() {
        if (jogoAtual) {
            jogoAtual.fechar();
            jogoAtual = null;
        }
        var container = document.getElementById('jogo-container');
        if (container) container.innerHTML = '';
        mostrarTela('tela-hub');
        _telaAtual = 'hub';
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

            var iconInner = jogo.iconCanvas
                ? '<canvas width="52" height="52" style="display:block;"></canvas>'
                : '<span class="material-icons">' + jogo.icon + '</span>';

            card.innerHTML =
                '<div class="hub-card-icon" style="background:' + jogo.cor + ';">' +
                    iconInner +
                '</div>' +
                '<div class="hub-card-name">' + jogo.nome + '</div>';

            card.addEventListener('click', function () { irParaJogo(jogo); });
            grid.appendChild(card);

            if (jogo.iconCanvas) {
                var cv = card.querySelector('canvas');
                if (cv) _drawSonicIcon(cv);
            }
        });
    }

    function _drawSonicIcon(cv) {
        var c = cv.getContext('2d');
        var W = cv.width, H = cv.height;
        var cx = W / 2, cy = H / 2;
        var t = 0;

        function frame() {
            if (!cv.isConnected) return; // para quando o canvas sair do DOM
            t++;
            c.clearRect(0, 0, W, H);

            // Anel girando
            var spin = (t * 0.05) % (Math.PI * 2);
            var scaleX = Math.abs(Math.cos(spin)) * 0.5 + 0.5;
            c.save();
            c.translate(cx, cy - 2);
            c.scale(scaleX, 1);

            // Anel dourado
            c.strokeStyle = '#F8B800'; c.lineWidth = 5;
            c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.stroke();
            // Brilho interno
            c.strokeStyle = '#FFE040'; c.lineWidth = 2.5;
            c.beginPath(); c.arc(-3, -3, 9, Math.PI * 1.2, Math.PI * 2.0); c.stroke();
            // Ponto de brilho
            c.fillStyle = '#FFFDE7';
            c.beginPath(); c.arc(-8, -9, 3.5, 0, Math.PI * 2); c.fill();
            c.restore();

            // Estrelinhas de velocidade
            var lines = [[-15, 4, 8], [-13, 9, 5], [-16, 14, 10]];
            c.strokeStyle = 'rgba(255,255,255,0.60)'; c.lineWidth = 2; c.lineCap = 'round';
            lines.forEach(function (l) {
                var pulse = 0.4 + Math.sin(t * 0.12 + l[2]) * 0.6;
                c.globalAlpha = pulse;
                c.beginPath();
                c.moveTo(cx + l[0], cy + l[1]);
                c.lineTo(cx + l[0] - l[2], cy + l[1]);
                c.stroke();
            });
            c.globalAlpha = 1;

            requestAnimationFrame(frame);
        }
        frame();
    }

    // ---- Splash: Fundo decorativo ----

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

        // Formas decorativas fixas (estilo Stitch design)
        var FORMAS_FIXAS = [
            // Estrelas
            { x: 0.08, y: 0.82, size: 18, shape: 'star',     color: '#fbbf24', phase: 0.0 },
            { x: 0.92, y: 0.72, size: 16, shape: 'star',     color: '#38bdf8', phase: 1.2 },
            { x: 0.18, y: 0.12, size: 14, shape: 'star',     color: '#f472b6', phase: 2.4 },
            { x: 0.82, y: 0.18, size: 15, shape: 'star',     color: '#FFD700', phase: 0.8 },
            // Triangulos
            { x: 0.06, y: 0.35, size: 14, shape: 'triangle', color: '#34d399', phase: 1.6 },
            { x: 0.94, y: 0.42, size: 13, shape: 'triangle', color: '#fbbf24', phase: 0.4 },
            { x: 0.25, y: 0.88, size: 12, shape: 'triangle', color: '#38bdf8', phase: 2.0 },
            { x: 0.75, y: 0.85, size: 13, shape: 'triangle', color: '#f472b6', phase: 1.0 },
            // Circulos
            { x: 0.88, y: 0.55, size: 10, shape: 'circle',   color: '#fbbf24', phase: 1.8 },
            { x: 0.12, y: 0.58, size: 11, shape: 'circle',   color: '#22d3ee', phase: 0.6 },
            { x: 0.55, y: 0.90, size: 9,  shape: 'circle',   color: '#FFD700', phase: 2.2 },
            { x: 0.45, y: 0.06, size: 10, shape: 'circle',   color: '#34d399', phase: 1.4 },
            { x: 0.78, y: 0.06, size: 8,  shape: 'circle',   color: '#fbbf24', phase: 0.2 },
            { x: 0.22, y: 0.06, size: 8,  shape: 'circle',   color: '#38bdf8', phase: 1.9 },
        ];

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

            // Grid de cruzes (estilo brutalist, skip em low-end)
            if (!_low()) {
                var gridSize = 48;
                ctx.strokeStyle = 'rgba(240, 234, 216, 0.08)';
                ctx.lineWidth = 1;
                for (var gy = gridSize; gy < H; gy += gridSize) {
                    for (var gx = gridSize; gx < W; gx += gridSize) {
                        ctx.beginPath();
                        ctx.moveTo(gx - 3, gy); ctx.lineTo(gx + 3, gy);
                        ctx.moveTo(gx, gy - 3); ctx.lineTo(gx, gy + 3);
                        ctx.stroke();
                    }
                }
            }

            // Formas decorativas fixas com leve flutuacao
            FORMAS_FIXAS.forEach(function(f) {
                var fx = f.x * W;
                var fy = f.y * H + Math.sin(t * 0.025 + f.phase) * 6;
                var rot = Math.sin(t * 0.015 + f.phase) * 0.25;
                var pulse = 0.75 + Math.sin(t * 0.03 + f.phase) * 0.25;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = f.color;
                drawShape(fx, fy, f.size, f.shape, rot);
            });

            ctx.globalAlpha = 1;
            splashAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    // ---- Picker de sub-tipo do Reptil ----

    function mostrarPickerReptil() {
        var picker = document.createElement('div');
        picker.id = 'reptil-picker';
        picker.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:9998',
            'background:rgba(5,10,20,0.96)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center', 'gap:20px',
        ].join(';');

        var titulo = document.createElement('div');
        titulo.style.cssText = [
            'font-family:"Space Grotesk",sans-serif',
            'font-weight:700',
            'font-size:clamp(1.2rem,5vw,1.8rem)',
            'color:#FFD700', 'margin-bottom:8px', 'text-align:center',
        ].join(';');
        titulo.textContent = 'Qual reptil?';
        picker.appendChild(titulo);

        var opcoes = [
            { tipo: 'lagarto', nome: 'Lagarto', icon: 'gesture',            cor: 'linear-gradient(135deg,#10b981,#047857)' },
            { tipo: 'lacraia', nome: 'Lacraia', icon: 'pest_control_rodent', cor: 'linear-gradient(135deg,#f97316,#c2410c)' },
        ];

        opcoes.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.style.cssText = [
                'width:min(260px,78vw)', 'min-height:80px',
                'background:' + opt.cor,
                'border:2px solid #f0ead8', 'border-radius:6px',
                'font-family:"Space Grotesk",sans-serif',
                'font-weight:700',
                'font-size:clamp(1.1rem,4.5vw,1.4rem)',
                'color:#fff', 'cursor:pointer',
                'display:flex', 'align-items:center', 'justify-content:center', 'gap:14px',
                'box-shadow:5px 5px 0 0 #f0ead8',
                '-webkit-tap-highlight-color:transparent',
                'transition:all 0.15s cubic-bezier(0.4,0,0.2,1)',
            ].join(';');
            btn.innerHTML = '<span class="material-icons" style="font-size:30px;">' + opt.icon + '</span>' + opt.nome;
            btn.addEventListener('click', function () {
                picker.remove();
                if (window.ReptilGame) window.ReptilGame.abrir(opt.tipo);
            });
            picker.appendChild(btn);
        });

        var btnVoltar = document.createElement('button');
        btnVoltar.style.cssText = [
            'margin-top:8px', 'background:transparent',
            'border:2px solid #f0ead8', 'color:#b8b0a0',
            'border-radius:4px', 'padding:12px 28px',
            'font-family:"Space Grotesk",sans-serif', 'font-weight:600', 'font-size:0.9rem', 'cursor:pointer',
            'box-shadow:3px 3px 0 0 #f0ead8',
            'transition:all 0.15s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        btnVoltar.textContent = 'Voltar';
        btnVoltar.addEventListener('click', function () {
            picker.remove();
            voltarDoJogo();
        });
        picker.appendChild(btnVoltar);

        document.body.appendChild(picker);
    }

    function iniciarSplashAnim() {
        desenharFundoSplash();
        // Musica inicia apenas apos gesto do usuario (ver tentarIniciarMusica)
    }

    function pararSplashAnim() {
        if (splashAnimFrame) {
            cancelAnimationFrame(splashAnimFrame);
            splashAnimFrame = null;
        }
        if (_splashResizeHandler) {
            window.removeEventListener('resize', _splashResizeHandler);
            _splashResizeHandler = null;
        }
        pararMusicaSplash();
    }

    // ---- Dialogo de confirmacao com Jose ----

    var _confirmacaoOv = null;
    var _confirmacaoRAF = null;
    var _telaAtual = 'splash'; // rastreia tela ativa para popstate

    function _fecharConfirmacao() {
        if (_confirmacaoRAF) { cancelAnimationFrame(_confirmacaoRAF); _confirmacaoRAF = null; }
        if (_confirmacaoOv) { _confirmacaoOv.remove(); _confirmacaoOv = null; }
        var s = document.getElementById('jose-confirm-styles');
        if (s) s.remove();
    }

    /**
     * Mostra dialogo de confirmacao com o mascote Jose.
     * @param {Object} opcoes
     * @param {string} opcoes.texto - Texto no balao (ex: "Sair?", "Tchau?")
     * @param {string} opcoes.btnFicarTexto - Texto do botao ficar
     * @param {string} opcoes.btnFicarIcon - Material icon do botao ficar
     * @param {string} opcoes.btnSairTexto - Texto do botao sair
     * @param {string} opcoes.btnSairIcon - Material icon do botao sair
     * @param {Function} opcoes.onSair - Callback ao confirmar saida
     * @param {Function} [opcoes.onFicar] - Callback ao cancelar (opcional)
     */
    function mostrarConfirmacaoJose(opcoes) {
        if (_confirmacaoOv) return; // ja aberto

        // Overlay
        var ov = document.createElement('div');
        ov.id = 'jose-confirm-ov';
        ov.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:10000',
            'background:rgba(17,17,17,0.94)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            '-webkit-tap-highlight-color:transparent',
            'opacity:0', 'transition:opacity 0.2s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        _confirmacaoOv = ov;

        // Card central
        var card = document.createElement('div');
        card.style.cssText = [
            'position:relative',
            'background:#1a1a1a',
            'border:3px solid #f0ead8',
            'border-radius:6px',
            'padding:24px 28px 28px',
            'display:flex', 'flex-direction:column', 'align-items:center',
            'gap:12px',
            'box-shadow:8px 8px 0 0 #f0ead8',
            'transform:scale(0.8)', 'transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            'max-width:min(320px, 88vw)',
            'width:100%',
        ].join(';');

        // Icone do dialogo
        var iconWrap = document.createElement('div');
        iconWrap.style.cssText = [
            'width:80px', 'height:80px', 'margin:0 auto',
            'background:var(--bg-surface,#2a2a2a)',
            'border:2px solid #f0ead8', 'border-radius:4px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'box-shadow:3px 3px 0 0 #f0ead8',
        ].join(';');
        iconWrap.innerHTML = '<span class="material-icons" style="font-size:40px;color:#FFD700;">sports_esports</span>';
        card.appendChild(iconWrap);

        // Balao de fala
        var balao = document.createElement('div');
        balao.style.cssText = [
            'position:relative',
            'background:#FFD700',
            'color:#111',
            'font-family:"Space Grotesk",sans-serif',
            'font-weight:700',
            'font-size:clamp(1.4rem,6vw,2rem)',
            'padding:14px 32px',
            'border:2px solid #f0ead8',
            'border-radius:4px',
            'text-align:center',
            'box-shadow:3px 3px 0 0 #f0ead8',
            'margin-top:4px',
        ].join(';');
        balao.textContent = opcoes.texto || 'Sair?';

        // Setinha do balao (triangulo apontando pra cima)
        var seta = document.createElement('div');
        seta.style.cssText = [
            'position:absolute', 'top:-10px', 'left:50%', 'transform:translateX(-50%)',
            'width:0', 'height:0',
            'border-left:12px solid transparent',
            'border-right:12px solid transparent',
            'border-bottom:12px solid #FFD700',
        ].join(';');
        balao.appendChild(seta);
        card.appendChild(balao);

        // Container dos botoes
        var btns = document.createElement('div');
        btns.style.cssText = [
            'display:flex', 'gap:16px', 'margin-top:8px', 'width:100%',
            'justify-content:center',
        ].join(';');

        // Botao FICAR (verde, proeminente)
        var btnFicar = document.createElement('button');
        btnFicar.style.cssText = [
            'flex:1', 'min-height:72px',
            'background:#34d399',
            'border:2px solid #f0ead8', 'border-radius:4px',
            'color:#111', 'cursor:pointer',
            'font-family:"Space Grotesk",sans-serif',
            'font-weight:700',
            'font-size:clamp(1rem,4vw,1.3rem)',
            'display:flex', 'align-items:center', 'justify-content:center', 'gap:8px',
            'box-shadow:3px 3px 0 0 #f0ead8',
            '-webkit-tap-highlight-color:transparent',
            'transition:all 0.15s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        btnFicar.innerHTML = '<span class="material-icons" style="font-size:28px;">' +
            (opcoes.btnFicarIcon || 'arrow_back') + '</span>' +
            (opcoes.btnFicarTexto || 'Voltar');
        btnFicar.addEventListener('click', function () {
            _fecharConfirmacao();
            if (opcoes.onFicar) opcoes.onFicar();
        });

        // Botao SAIR (sutil)
        var btnSair = document.createElement('button');
        btnSair.style.cssText = [
            'flex:1', 'min-height:72px',
            'background:rgba(42,42,42,0.8)',
            'border:2px solid #f0ead8', 'border-radius:4px',
            'color:#b8b0a0', 'cursor:pointer',
            'font-family:"Space Grotesk",sans-serif',
            'font-weight:600',
            'font-size:clamp(0.9rem,3.5vw,1.1rem)',
            'display:flex', 'align-items:center', 'justify-content:center', 'gap:8px',
            'box-shadow:3px 3px 0 0 #f0ead8',
            '-webkit-tap-highlight-color:transparent',
            'transition:all 0.15s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        btnSair.innerHTML = '<span class="material-icons" style="font-size:24px;">' +
            (opcoes.btnSairIcon || 'exit_to_app') + '</span>' +
            (opcoes.btnSairTexto || 'Sair');
        btnSair.addEventListener('click', function () {
            _fecharConfirmacao();
            if (opcoes.onSair) opcoes.onSair();
        });

        btns.appendChild(btnFicar);
        btns.appendChild(btnSair);
        card.appendChild(btns);
        ov.appendChild(card);

        // Keyframes
        var style = document.createElement('style');
        style.id = 'jose-confirm-styles';
        style.textContent = '';
        document.head.appendChild(style);

        document.body.appendChild(ov);

        // Animacao de entrada (fade in + scale)
        requestAnimationFrame(function () {
            ov.style.opacity = '1';
            card.style.transform = 'scale(1)';
            // sem animacao pulsante — brutalist e direto
        });

        // Som de "pop" curto
        try {
            var ac = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ac.createOscillator();
            var g = ac.createGain();
            osc.connect(g); g.connect(ac.destination);
            osc.type = 'sine'; osc.frequency.value = 600;
            var now = ac.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.08, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.frequency.linearRampToValueAtTime(900, now + 0.08);
            osc.start(now); osc.stop(now + 0.15);
            setTimeout(function () { ac.close().catch(function () {}); }, 300);
        } catch (e) { /* audio nao disponivel */ }
    }

    // ---- History API & popstate ----

    function _telaAtualDetectar() {
        // Detecta tela visivel baseado no DOM
        if (jogoAtual) return 'jogo';
        var hub = document.getElementById('tela-hub');
        if (hub && !hub.classList.contains('hidden')) return 'hub';
        return 'splash';
    }

    function _popstateHandler(e) {
        // Se ja tem dialogo aberto, ignora
        if (_confirmacaoOv) {
            // Re-empilha estado para nao perder
            history.pushState({ tela: _telaAtual }, '');
            return;
        }

        var tela = _telaAtualDetectar();

        if (tela === 'jogo') {
            // Re-empilha estado para manter na pilha
            history.pushState({ tela: 'jogo' }, '');
            mostrarConfirmacaoJose({
                texto: 'Sair?',
                btnFicarTexto: 'Continuar',
                btnFicarIcon: 'sports_esports',
                btnSairTexto: 'Sair',
                btnSairIcon: 'exit_to_app',
                onSair: function () {
                    voltarDoJogo();
                    // Substitui o estado atual por hub (voltarDoJogo nao empilha)
                    history.replaceState({ tela: 'hub' }, '');
                    _telaAtual = 'hub';
                },
            });
        } else if (tela === 'hub') {
            history.pushState({ tela: 'hub' }, '');
            mostrarConfirmacaoJose({
                texto: 'Sair?',
                btnFicarTexto: 'Voltar',
                btnFicarIcon: 'arrow_back',
                btnSairTexto: 'Sair',
                btnSairIcon: 'exit_to_app',
                onSair: function () {
                    irParaSplash();
                    history.replaceState({ tela: 'splash' }, '');
                    _telaAtual = 'splash';
                },
            });
        } else {
            // Splash — perguntar se quer sair do app
            history.pushState({ tela: 'splash' }, '');
            mostrarConfirmacaoJose({
                texto: 'Sair?',
                btnFicarTexto: 'Voltar',
                btnFicarIcon: 'arrow_back',
                btnSairTexto: 'Sair',
                btnSairIcon: 'exit_to_app',
                onSair: function () {
                    // Sair de verdade: remove o estado extra e faz back real
                    _ignorarProximoPopstate = true;
                    history.back();
                },
            });
        }
    }

    var _ignorarProximoPopstate = false;
    window.addEventListener('popstate', function (e) {
        if (_ignorarProximoPopstate) {
            _ignorarProximoPopstate = false;
            return;
        }
        _popstateHandler(e);
    });

    // ---- Inicializacao ----

    function init() {
        // Estado inicial do History API
        history.replaceState({ tela: 'splash' }, '');
        _telaAtual = 'splash';

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

        // Botao voltar do jogo — usa history.back() para manter a pilha de
        // history em sincronia e passar pelo dialogo "Sair?" do popstate handler
        var jogoVoltar = document.getElementById('jogo-voltar-btn');
        if (jogoVoltar) {
            jogoVoltar.addEventListener('click', function () { history.back(); });
        }

        // Iniciar animacoes do splash
        iniciarSplashAnim();

        // Musica: inicia apenas apos primeira interacao do usuario
        var _musicaIniciada = false;
        function tentarIniciarMusica() {
            if (_musicaIniciada) return;
            _musicaIniciada = true;
            ['click', 'touchstart', 'keydown'].forEach(function (evt) {
                document.removeEventListener(evt, tentarIniciarMusica);
            });
            iniciarMusicaSplash();
        }
        ['click', 'touchstart', 'keydown'].forEach(function (evt) {
            document.addEventListener(evt, tentarIniciarMusica, { passive: true });
        });
    }

    // Exposicao global (retrocompatibilidade)
    // fecharJoguinhos usa history.back() em vez de voltarDoJogo() direto.
    // Motivo: voltarDoJogo() fecha sem dialog e sem popar o estado 'jogo' da
    // pilha de history, deixando estados fantasmas que confundem o popstate
    // handler (back fisico dispara "Tchau?" enquanto hub esta visivel, etc).
    // history.back() → popstate → "Sair?" dialog → voltarDoJogo() + replaceState.
    window.abrirJoguinhos = irParaHub;
    window.fecharJoguinhos = function () { history.back(); };

    // Rodar ao carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

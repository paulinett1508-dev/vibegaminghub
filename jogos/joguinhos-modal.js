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
        }
    ];

    let jogoAtual = null;
    let splashAnimFrame = null;
    let joseAnimFrame = null;

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
        // Escorpiao cria seu proprio overlay, entao esconde a tela-jogo
        if (jogo.id === 'escorpiao') {
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
        for (var i = 0; i < 2; i++) {
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

    // ---- Splash: Desenhar garotinho Jose ----

    function desenharJose() {
        var canvas = document.getElementById('jose-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = 120, H = 120;
        var t = 0;

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            var cx = W / 2;
            var cy = H / 2 + 4;
            var bounce = Math.sin(t * 0.06) * 3;

            // Sombra no chao
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 38, 22, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Corpo (camiseta azul)
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.roundRect(cx - 16, cy - 5 + bounce, 32, 28, 8);
            ctx.fill();

            // Listras da camiseta
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(cx - 12, cy + 4 + bounce, 24, 3);
            ctx.fillRect(cx - 12, cy + 11 + bounce, 24, 3);

            // Pernas (bermuda)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 10, cy + 22 + bounce, 8, 10);
            ctx.fillRect(cx + 2, cy + 22 + bounce, 8, 10);

            // Pes
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(cx - 12, cy + 31 + bounce, 10, 5);
            ctx.fillRect(cx + 2, cy + 31 + bounce, 10, 5);

            // Bracos (acenando)
            var wave = Math.sin(t * 0.08) * 15;
            // Braco esquerdo
            ctx.save();
            ctx.translate(cx - 16, cy + 2 + bounce);
            ctx.rotate((-30 + wave) * Math.PI / 180);
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(-4, -2, 6, 20);
            // Mao
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(0, 18, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Braco direito (acena mais)
            ctx.save();
            ctx.translate(cx + 16, cy + 2 + bounce);
            ctx.rotate((30 - wave * 1.5) * Math.PI / 180);
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(-2, -2, 6, 20);
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(2, 18, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Cabeca
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(cx, cy - 16 + bounce, 18, 0, Math.PI * 2);
            ctx.fill();

            // Cabelo (castanho)
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.arc(cx, cy - 22 + bounce, 18, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 18, cy - 22 + bounce, 36, 6);
            // Franja
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 28 + bounce, 8, 0.2, Math.PI - 0.2);
            ctx.fill();

            // Olhos
            var blink = (t % 180 < 6) ? 0.5 : 3;
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.ellipse(cx - 6, cy - 17 + bounce, 3, blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 6, cy - 17 + bounce, 3, blink, 0, 0, Math.PI * 2);
            ctx.fill();

            // Brilho nos olhos
            if (blink > 1) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath();
                ctx.arc(cx - 5, cy - 18 + bounce, 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 7, cy - 18 + bounce, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Sorriso
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy - 12 + bounce, 8, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // Bochechas
            ctx.fillStyle = 'rgba(251,113,133,0.3)';
            ctx.beginPath();
            ctx.ellipse(cx - 13, cy - 11 + bounce, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 13, cy - 11 + bounce, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            joseAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    // ---- Splash: Fundo com personagens dos jogos ----

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

        // Particulas flutuantes (bolas, estrelas)
        var particulas = [];
        for (var i = 0; i < 20; i++) {
            particulas.push({
                x: Math.random() * 1000,
                y: Math.random() * 1000,
                r: 2 + Math.random() * 4,
                speed: 0.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                color: ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#fb923c'][Math.floor(Math.random() * 6)],
                opacity: 0.15 + Math.random() * 0.25
            });
        }

        function frame() {
            t++;
            ctx.clearRect(0, 0, W, H);

            // Particulas de fundo
            particulas.forEach(function (p) {
                var px = (p.x / 1000) * W;
                var py = (p.y / 1000) * H + Math.sin(t * 0.02 + p.phase) * 20;
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(px, py, p.r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Bola de futebol flutuante (canto inferior esquerdo)
            ctx.globalAlpha = 0.12;
            var ballX = W * 0.15;
            var ballY = H * 0.78 + Math.sin(t * 0.03) * 10;
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath();
            ctx.arc(ballX, ballY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
            ctx.fill();

            // Mini escorpiao silhueta (canto inferior direito)
            ctx.globalAlpha = 0.1;
            var escX = W * 0.82;
            var escY = H * 0.75 + Math.sin(t * 0.025 + 1) * 8;
            ctx.fillStyle = '#fbbf24';
            // Corpo simplificado
            for (var s = 0; s < 5; s++) {
                var sr = 6 - s;
                ctx.beginPath();
                ctx.arc(escX + s * 8, escY + Math.sin(t * 0.04 + s * 0.5) * 3, sr, 0, Math.PI * 2);
                ctx.fill();
            }

            // Estrelinhas
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#fbbf24';
            var starPositions = [
                { x: 0.1, y: 0.15 }, { x: 0.85, y: 0.12 }, { x: 0.5, y: 0.08 },
                { x: 0.25, y: 0.3 }, { x: 0.75, y: 0.35 }, { x: 0.92, y: 0.5 }
            ];
            starPositions.forEach(function (sp, si) {
                var sx = sp.x * W;
                var sy = sp.y * H;
                var twinkle = 0.5 + Math.sin(t * 0.05 + si * 1.2) * 0.5;
                ctx.globalAlpha = 0.06 + twinkle * 0.08;
                ctx.font = (8 + twinkle * 6) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('\u2726', sx, sy);
            });

            ctx.globalAlpha = 1;

            splashAnimFrame = requestAnimationFrame(frame);
        }
        frame();
    }

    function iniciarSplashAnim() {
        desenharJose();
        desenharFundoSplash();
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

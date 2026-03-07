// =====================================================================
// escorpiao.js — Jogo Escorpiao Standalone v3.1
// =====================================================================
// 3 fases fechadas com condicoes de vitoria e derrota
// Maca (+10pts, cresce) | Brocolis (-5pts, encolhe)
// 3 macas ignoradas -> game over | corpo minimo -> game over
// pontos zerados -> game over | Fase 3 completa -> vitoria!
// =====================================================================

(function () {
    'use strict';

    function _lerp(a, b, t) { return a + (b - a) * t; }

    const CONF = {
        BODY_START:          1,
        TAIL_LEN:            6,
        HEAD_LERP:           0.10,
        SEG_DIST:            22,
        EAT_RADIUS:          32,
        FOOD_MARGIN:         70,
        INITIAL_SEGS:        7,
        GAMEOVER_SEGS:       4,
        MAX_SEGS:            34,
        GROW_AMOUNT:         3,
        SHRINK_AMOUNT:       3,
        BLINK_THRESHOLD:     90,
        MAX_MISSED:          3,    // macas ignoradas antes do game over
        POINTS_APPLE:        10,
        POINTS_LOST_BROC:    5,
        FASE_BONUS:          50,   // bonus ao passar de fase
        FASES: [
            { spawnInterval: 180, foodLife: 420, maxFoods: 3 },
            { spawnInterval: 120, foodLife: 240, maxFoods: 4 },
            { spawnInterval:  80, foodLife: 180, maxFoods: 5 },
        ],
        C: {
            LIGHT: '#fde047',
            MID:   '#d97706',
            DARK:  '#78350f',
            AMBER: '#fbbf24',
            LEG:   'rgba(180,118,18,0.75)',
            BG:    '#050a14',
            GRID:  '#0a1628',
        },
    };

    const EscorpiaoGame = {
        segs:         [],
        targetX:      0,
        targetY:      0,
        animFrame:    null,
        frameCount:   0,
        ctx:          null,
        canvas:       null,
        _onKey:       null,
        _onResize:    null,
        comidas:      [],
        spawnTimer:   0,
        faseIdx:      0,
        score:        0,
        missedApples: 0,
        particulas:   [],
        ac:           null,
        ambientNode:  null,
        ambientGain:  null,
        _bloqueado:   false,
        _timeouts:    [],

        _getFase() {
            return CONF.FASES[Math.min(this.faseIdx, CONF.FASES.length - 1)];
        },

        abrir() {
            const cx = window.innerWidth  / 2;
            const cy = window.innerHeight / 2;
            this.faseIdx      = 0;
            this.score        = 0;
            this.missedApples = 0;
            this._resetEstado(cx, cy);

            // Overlay
            const overlay = document.createElement('div');
            overlay.id = 'escorpiao-overlay';
            overlay.style.cssText = [
                'position:fixed', 'inset:0',
                `background:${CONF.C.BG}`,
                'z-index:9999', 'overflow:hidden', 'cursor:none',
            ].join(';');

            // Canvas
            const canvas = document.createElement('canvas');
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.cssText = 'display:block;';
            this.canvas = canvas;
            this.ctx    = canvas.getContext('2d');

            // Botao fechar
            const closeBtn = document.createElement('button');
            closeBtn.id = 'escorpiao-close';
            closeBtn.style.cssText = [
                'position:absolute', 'top:20px', 'right:20px',
                'background:#0f172a', 'border:1px solid #1e3a5f',
                'color:#475569', 'border-radius:50%',
                'width:44px', 'height:44px', 'cursor:auto',
                'display:flex', 'align-items:center',
                'justify-content:center', 'z-index:10', 'transition:all 0.2s',
            ].join(';');
            closeBtn.innerHTML = '<span class="material-icons" style="font-size:20px;">close</span>';
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background  = '#1e293b';
                closeBtn.style.color       = '#94a3b8';
                closeBtn.style.borderColor = '#334155';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background  = '#0f172a';
                closeBtn.style.color       = '#475569';
                closeBtn.style.borderColor = '#1e3a5f';
            });
            closeBtn.addEventListener('click', () =>
                window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar()
            );

            // Indicador de fase (canto superior esquerdo)
            const faseEl = document.createElement('div');
            faseEl.id = 'escorpiao-fase';
            faseEl.style.cssText = [
                'position:absolute', 'top:20px', 'left:20px',
                'font-family:"Russo One",sans-serif',
                'font-size:0.8rem', 'color:#475569',
                'pointer-events:none', 'user-select:none', 'z-index:5',
            ].join(';');
            faseEl.textContent = 'Fase 1 / 3';

            // Pontuacao (centro superior)
            const scoreEl = document.createElement('div');
            scoreEl.id = 'escorpiao-score';
            scoreEl.style.cssText = [
                'position:absolute', 'top:12px', 'left:50%',
                'transform:translateX(-50%)',
                'font-family:"Russo One",sans-serif',
                'font-size:2rem', 'color:#fde047',
                'text-shadow:0 0 20px rgba(253,224,71,0.5)',
                'pointer-events:none', 'user-select:none',
                'transition:transform 0.1s', 'z-index:5', 'white-space:nowrap',
            ].join(';');
            scoreEl.textContent = '0';

            // Contador de macas perdidas (abaixo do score)
            const missEl = document.createElement('div');
            missEl.id = 'escorpiao-miss';
            missEl.style.cssText = [
                'position:absolute', 'top:52px', 'left:50%',
                'transform:translateX(-50%)',
                'display:flex', 'gap:6px', 'align-items:center',
                'pointer-events:none', 'user-select:none', 'z-index:5',
            ].join(';');
            this._buildMissDOM(missEl);

            // Label instrucao
            const label = document.createElement('div');
            label.style.cssText = [
                'position:absolute', 'bottom:28px', 'left:50%',
                'transform:translateX(-50%)',
                'font-family:Inter,-apple-system,sans-serif',
                'font-size:0.75rem', 'color:#1e3a5f', 'white-space:nowrap',
                'pointer-events:none', 'transition:opacity 1.5s', 'user-select:none',
            ].join(';');
            label.textContent = 'Toque para guiar o escorpiao  |  ESC para sair';

            overlay.appendChild(canvas);
            overlay.appendChild(closeBtn);
            overlay.appendChild(faseEl);
            overlay.appendChild(scoreEl);
            overlay.appendChild(missEl);
            overlay.appendChild(label);
            document.body.appendChild(overlay);

            this._timeouts.push(setTimeout(() => { label.style.opacity = '0'; }, 3500));

            // Toque / clique
            overlay.addEventListener('click', (e) => {
                if (closeBtn.contains(e.target)) return;
                if (document.getElementById('escorpiao-fim')) return;
                EscorpiaoGame._toqueEm(e.clientX, e.clientY);
            });
            overlay.addEventListener('touchstart', (e) => {
                if (closeBtn.contains(e.target)) return;
                if (document.getElementById('escorpiao-fim')) return;
                e.preventDefault();
                EscorpiaoGame._toqueEm(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            // ESC
            this._onKey = (e) => {
                if (e.key === 'Escape')
                    (window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar());
            };
            document.addEventListener('keydown', this._onKey);

            // Resize
            this._onResize = () => {
                if (EscorpiaoGame.canvas) {
                    EscorpiaoGame.canvas.width  = window.innerWidth;
                    EscorpiaoGame.canvas.height = window.innerHeight;
                }
            };
            window.addEventListener('resize', this._onResize);

            // Game loop
            const loop = () => {
                if (!EscorpiaoGame.ctx) return;
                EscorpiaoGame.frameCount++;
                EscorpiaoGame._atualizar();
                EscorpiaoGame._renderizar();
                EscorpiaoGame.animFrame = requestAnimationFrame(loop);
            };
            loop();
        },

        _resetEstado(cx, cy) {
            this.segs = [];
            for (let i = 0; i < CONF.INITIAL_SEGS; i++) {
                this.segs.push({ x: cx, y: cy + i * CONF.SEG_DIST });
            }
            this.targetX    = cx;
            this.targetY    = cy;
            this.frameCount = 0;
            this.comidas    = [];
            this.spawnTimer = this._getFase().spawnInterval - 80;
            this.particulas = [];
            this._bloqueado = false;
        },

        fechar() {
            if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
            if (this._onKey)    { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
            if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
            this._timeouts.forEach(clearTimeout); this._timeouts = [];
            this._pararAmbiente();
            if (this.ac)        { this.ac.close(); this.ac = null; }
            const overlay = document.getElementById('escorpiao-overlay');
            if (overlay) overlay.remove();
            this.ctx        = null;
            this.canvas     = null;
            this.comidas    = [];
            this.particulas = [];
        },

        // ---- Fisica e logica ----
        _atualizar() {
            if (this._bloqueado) return;

            const segs = this.segs;
            segs[0].x += (this.targetX - segs[0].x) * CONF.HEAD_LERP;
            segs[0].y += (this.targetY - segs[0].y) * CONF.HEAD_LERP;

            for (let i = 1; i < segs.length; i++) {
                const dx   = segs[i].x - segs[i - 1].x;
                const dy   = segs[i].y - segs[i - 1].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > CONF.SEG_DIST) {
                    const f   = (dist - CONF.SEG_DIST) / dist;
                    segs[i].x -= dx * f;
                    segs[i].y -= dy * f;
                }
            }

            // Comidas: tick, verificar comer, expirar
            for (let i = this.comidas.length - 1; i >= 0; i--) {
                const c = this.comidas[i];
                c.t++;
                c.vida--;

                if (c.vida <= 0) {
                    this._spawnParticulas(c.x, c.y, '#334155', 6);
                    this.comidas.splice(i, 1);
                    if (c.tipo === 'maca') {
                        this.missedApples++;
                        this._atualizarMissDOM();
                        if (this.missedApples >= CONF.MAX_MISSED) {
                            this._gameOver('missed');
                        }
                    }
                    continue;
                }

                const d = Math.hypot(segs[0].x - c.x, segs[0].y - c.y);
                if (d < CONF.EAT_RADIUS) {
                    this._comerFood(c);
                    this.comidas.splice(i, 1);
                }
            }

            // Spawn timer
            const fase = this._getFase();
            if (this.comidas.length < fase.maxFoods) {
                if (++this.spawnTimer >= fase.spawnInterval) {
                    this._spawnComida();
                    this.spawnTimer = 0;
                }
            } else {
                this.spawnTimer = 0;
            }

            // Particulas
            this.particulas = this.particulas.filter(p => {
                p.x  += p.vx; p.y  += p.vy;
                p.vy += 0.15; p.vx *= 0.93;
                p.vida -= p.decaimento;
                return p.vida > 0;
            });
        },

        // ---- Renderizacao ----
        _renderizar() {
            const ctx  = this.ctx;
            const W    = this.canvas.width;
            const H    = this.canvas.height;
            const segs = this.segs;
            const t    = this.frameCount;

            ctx.fillStyle = CONF.C.BG;
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = CONF.C.GRID;
            for (let x = 21; x < W; x += 42) {
                for (let y = 21; y < H; y += 42) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            this._desenharParticulas(ctx);
            this._desenharComidas(ctx);

            const dx        = segs.length > 1 ? segs[0].x - segs[1].x : 1;
            const dy        = segs.length > 1 ? segs[0].y - segs[1].y : 0;
            const headAngle = Math.atan2(dy, dx);

            this._desenharCorpo(ctx, segs, t);
            this._desenharCauda(ctx, segs);
            this._desenharCabeca(ctx, segs[0], headAngle, t);
        },

        // ---- Spawnar comida ----
        _spawnComida() {
            if (!this.canvas) return;
            const W    = this.canvas.width;
            const H    = this.canvas.height;
            const m    = CONF.FOOD_MARGIN;
            const fase = this._getFase();

            const macasNaTela = this.comidas.filter(c => c.tipo === 'maca').length;
            const probMaca    = macasNaTela >= 2 ? 0.35 : 0.62;
            const tipo        = Math.random() < probMaca ? 'maca' : 'brocolis';
            const cor         = tipo === 'maca' ? '#ef4444' : '#22c55e';

            let x, y, tentativas = 0, ok = false;
            while (!ok && tentativas < 20) {
                x  = m + Math.random() * (W - m * 2);
                y  = m + Math.random() * (H - m * 2);
                const longeDeComidas = this.comidas.every(c => Math.hypot(x - c.x, y - c.y) > 80);
                const longeDaCabeca  = Math.hypot(x - this.segs[0].x, y - this.segs[0].y) > 100;
                ok = longeDeComidas && longeDaCabeca;
                tentativas++;
            }

            this.comidas.push({ x, y, tipo, cor, t: 0, vida: fase.foodLife });
            this._somAparecer();
        },

        // ---- Comer ----
        _comerFood(food) {
            this._spawnParticulas(food.x, food.y, food.cor, 24);
            this._somComer(food.tipo);

            if (food.tipo === 'maca') {
                this.score += CONF.POINTS_APPLE;
                this._atualizarScoreDOM();
                this._animarScore();

                const tIdx = Math.max(1, this.segs.length - CONF.TAIL_LEN);
                const ref  = this.segs[tIdx - 1];
                for (let i = 0; i < CONF.GROW_AMOUNT; i++) {
                    if (this.segs.length < CONF.MAX_SEGS)
                        this.segs.splice(tIdx, 0, { x: ref.x, y: ref.y });
                }
                // Verificar condicao de vitoria ou avanco de fase
                if (this.segs.length >= CONF.MAX_SEGS) {
                    if (this.faseIdx >= CONF.FASES.length - 1) {
                        this._ganhou();
                    } else {
                        this._passarDeFase();
                    }
                }
            } else {
                // Brocolis: perde pontos e encolhe
                this.score -= CONF.POINTS_LOST_BROC;
                if (this.score <= 0) {
                    this.score = 0;
                    this._atualizarScoreDOM();
                    this._gameOver('score');
                    return;
                }
                this._atualizarScoreDOM();
                this._animarScore();

                const tIdx       = Math.max(1, this.segs.length - CONF.TAIL_LEN);
                const removeFrom = Math.max(1, tIdx - CONF.SHRINK_AMOUNT);
                const maxRemove  = this.segs.length - CONF.GAMEOVER_SEGS;
                const count      = Math.min(tIdx - removeFrom, maxRemove);
                if (count > 0) this.segs.splice(removeFrom, count);
                if (this.segs.length <= CONF.GAMEOVER_SEGS) {
                    this._gameOver('body');
                }
            }
        },

        // ---- Passar de fase ----
        _passarDeFase() {
            if (this._bloqueado) return;
            this._bloqueado = true;
            this.comidas    = [];
            this.segs.splice(CONF.INITIAL_SEGS);

            this.faseIdx++;
            this.score      += CONF.FASE_BONUS;
            this.spawnTimer  = this._getFase().spawnInterval - 80;

            this._atualizarScoreDOM();
            this._mostrarMensagem(`Fase ${this.faseIdx + 1}!`, '#fde047');

            const faseEl = document.getElementById('escorpiao-fase');
            if (faseEl) faseEl.textContent = `Fase ${this.faseIdx + 1} / 3`;

            this._timeouts.push(setTimeout(() => { EscorpiaoGame._bloqueado = false; }, 2000));
        },

        // ---- Vitoria ----
        _ganhou() {
            if (this._bloqueado) return;
            this._bloqueado = true;
            this.comidas    = [];
            this.score      += CONF.FASE_BONUS;
            this._atualizarScoreDOM();

            this._mostrarTelaFinal({
                titulo:    'Parabens Jose Afonso!',
                subtitulo: 'voce venceu o desafio!',
                corTitulo: '#fde047',
                score:     this.score,
                botoes: [
                    { texto: 'Jogar Novamente', acao: () => EscorpiaoGame._reiniciarCompleto() },
                    { texto: 'Outro Jogo',       acao: () => window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar() },
                ],
            });
        },

        // ---- Game Over ----
        _gameOver(motivo) {
            if (this._bloqueado) return;
            this._bloqueado = true;
            this.comidas    = [];

            const motivos = {
                missed: 'Deixou passar 3 macas!',
                score:  'Perdeu todos os pontos!',
                body:   'Ficou pequenininho!',
            };

            this._mostrarTelaFinal({
                titulo:    'Fim de Jogo',
                subtitulo: motivos[motivo] || '',
                corTitulo: '#ef4444',
                score:     this.score,
                botoes: [
                    { texto: 'Tentar de Novo', acao: () => EscorpiaoGame._reiniciarCompleto() },
                    { texto: 'Outro Jogo',      acao: () => window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar() },
                ],
            });
        },

        // ---- Reinicio completo ----
        _reiniciarCompleto() {
            const fim = document.getElementById('escorpiao-fim');
            if (fim) fim.remove();

            this.faseIdx      = 0;
            this.score        = 0;
            this.missedApples = 0;

            const cx = this.canvas ? this.canvas.width  / 2 : window.innerWidth  / 2;
            const cy = this.canvas ? this.canvas.height / 2 : window.innerHeight / 2;
            this._resetEstado(cx, cy);

            const faseEl  = document.getElementById('escorpiao-fase');
            const missEl  = document.getElementById('escorpiao-miss');
            if (faseEl)  faseEl.textContent = 'Fase 1 / 3';
            this._atualizarScoreDOM();
            if (missEl) this._buildMissDOM(missEl);
        },

        // ---- Tela final (vitoria ou game over) ----
        _mostrarTelaFinal({ titulo, subtitulo, corTitulo, score, botoes }) {
            const overlay = document.getElementById('escorpiao-overlay');
            if (!overlay) return;

            const fim = document.createElement('div');
            fim.id = 'escorpiao-fim';
            fim.style.cssText = [
                'position:absolute', 'inset:0', 'z-index:30',
                'display:flex', 'flex-direction:column',
                'align-items:center', 'justify-content:center',
                'gap:16px', 'padding:24px',
                'background:rgba(5,10,20,0.93)',
                'cursor:auto',
            ].join(';');

            const mk = (tag, css, txt) => {
                const el = document.createElement(tag);
                el.style.cssText = css;
                if (txt !== undefined) el.textContent = txt;
                return el;
            };

            fim.appendChild(mk('div', [
                'font-family:"Russo One",sans-serif',
                `font-size:clamp(1.8rem,7vw,3.5rem)`,
                `color:${corTitulo}`,
                `text-shadow:0 0 30px ${corTitulo}`,
                'text-align:center', 'line-height:1.2',
            ].join(';'), titulo));

            if (subtitulo) {
                fim.appendChild(mk('div', [
                    'font-family:Inter,sans-serif',
                    'font-size:clamp(0.9rem,3vw,1.2rem)',
                    'color:#94a3b8', 'text-align:center',
                ].join(';'), subtitulo));
            }

            fim.appendChild(mk('div', [
                'font-family:"Russo One",sans-serif',
                'font-size:clamp(1rem,4vw,1.6rem)',
                'color:#fde047', 'margin-top:8px',
            ].join(';'), `Pontuacao: ${score}`));

            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:16px;width:min(280px,80vw);';

            botoes.forEach((b, i) => {
                const btn = document.createElement('button');
                btn.style.cssText = [
                    'padding:14px 24px',
                    'border-radius:12px',
                    'font-family:"Russo One",sans-serif',
                    'font-size:1rem',
                    'cursor:pointer',
                    'border:none',
                    'transition:opacity 0.2s',
                    i === 0
                        ? 'background:#fde047;color:#0f172a;'
                        : 'background:#1e293b;color:#94a3b8;border:1px solid #334155;',
                ].join(';');
                btn.textContent = b.texto;
                btn.addEventListener('click', b.acao);
                btnWrap.appendChild(btn);
            });

            fim.appendChild(btnWrap);
            overlay.appendChild(fim);
        },

        // ---- Mensagem temporaria (transicao de fase) ----
        _mostrarMensagem(texto, cor) {
            const overlay = document.getElementById('escorpiao-overlay');
            if (!overlay) return;
            if (!document.getElementById('escKF')) {
                const s = document.createElement('style');
                s.id = 'escKF';
                s.textContent = '@keyframes escFadeOut{0%{opacity:0;transform:scale(0.5)}20%{opacity:1;transform:scale(1.08)}80%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.8)}}';
                document.head.appendChild(s);
            }
            const el = document.createElement('div');
            el.style.cssText = 'position:absolute;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;pointer-events:none;';
            el.innerHTML = `<span style="font-family:'Russo One',sans-serif;font-size:clamp(2.5rem,10vw,5rem);color:${cor};text-shadow:0 0 40px ${cor};animation:escFadeOut 2s forwards;">${texto}</span>`;
            overlay.appendChild(el);
            this._timeouts.push(setTimeout(() => el.remove(), 2100));
        },

        // ---- Toque ----
        _toqueEm(x, y) {
            if (this._bloqueado) return;
            this._initAudio();
            this.targetX = x;
            this.targetY = y;
            this._spawnParticulas(x, y, '#fde047', 10);
            this._somToque();
        },

        // ---- Audio ----
        _initAudio() {
            if (!this.ac) {
                try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
            }
            if (this.ac && this.ac.state === 'suspended') this.ac.resume();
            // Iniciar som ambiente se ainda nao iniciou
            if (this.ac && !this.ambientNode) {
                this._iniciarAmbiente();
            }
        },

        _iniciarAmbiente() {
            if (!this.ac || this.ambientNode) return;
            const ac = this.ac;

            // Criar ruido de vento do deserto (ruido rosa filtrado)
            const bufferSize = ac.sampleRate * 2;
            const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
            const data = buffer.getChannelData(0);

            // Ruido rosa suave
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99765 * b0 + white * 0.0990460;
                b1 = 0.96300 * b1 + white * 0.2965164;
                b2 = 0.57000 * b2 + white * 1.0526913;
                data[i] = (b0 + b1 + b2) * 0.06;
            }

            const source = ac.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            // Filtro passa-baixa para som de vento suave
            const filter = ac.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            filter.Q.value = 0.5;

            // Ganho do som ambiente
            const gain = ac.createGain();
            gain.gain.value = 0.25;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(ac.destination);
            source.start();

            this.ambientNode = source;
            this.ambientGain = gain;
        },

        _pararAmbiente() {
            if (this.ambientNode) {
                try { this.ambientNode.stop(); } catch (e) {}
                this.ambientNode = null;
            }
            this.ambientGain = null;
        },

        // ---- DOM helpers ----
        _atualizarScoreDOM() {
            const el = document.getElementById('escorpiao-score');
            if (el) el.textContent = this.score;
        },

        _animarScore() {
            const el = document.getElementById('escorpiao-score');
            if (!el) return;
            el.style.transform = 'translateX(-50%) scale(1.4)';
            this._timeouts.push(setTimeout(() => { el.style.transform = 'translateX(-50%) scale(1)'; }, 150));
        },

        _buildMissDOM(container) {
            container.innerHTML = '';
            for (let i = 0; i < CONF.MAX_MISSED; i++) {
                const dot = document.createElement('div');
                const missed = i < this.missedApples;
                dot.style.cssText = [
                    'width:12px', 'height:12px', 'border-radius:50%',
                    `background:${missed ? '#334155' : '#ef4444'}`,
                    `box-shadow:${missed ? 'none' : '0 0 6px #ef4444'}`,
                    'transition:all 0.3s',
                ].join(';');
                container.appendChild(dot);
            }
        },

        _atualizarMissDOM() {
            const el = document.getElementById('escorpiao-miss');
            if (el) this._buildMissDOM(el);
        },

        // ---- Particulas ----
        _spawnParticulas(x, y, cor, qtd) {
            for (let i = 0; i < qtd; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                this.particulas.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    r: 2.5 + Math.random() * 3.5,
                    cor, vida: 1,
                    decaimento: 0.028 + Math.random() * 0.022,
                });
            }
        },

        // ---- Desenho de comidas ----
        _desenharComidas(ctx) {
            for (const c of this.comidas) {
                let alpha = 1;
                if (c.vida < CONF.BLINK_THRESHOLD) {
                    const freq = 0.15 + 0.25 * (1 - c.vida / CONF.BLINK_THRESHOLD);
                    alpha = 0.4 + 0.6 * Math.abs(Math.sin(c.t * freq));
                }
                ctx.save();
                ctx.globalAlpha = alpha;
                this._desenharUmaComida(ctx, c);
                ctx.restore();
            }
        },

        _desenharUmaComida(ctx, food) {
            const { x, tipo, cor, t } = food;
            const bob = Math.sin(t * 0.09) * 4;
            const cy  = food.y + bob;
            ctx.save();
            ctx.shadowColor = cor;
            ctx.shadowBlur  = 20;
            if (tipo === 'maca') {
                ctx.beginPath(); ctx.arc(x, cy, 13, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444'; ctx.fill();
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(x + 2, cy - 12); ctx.lineTo(x + 2, cy - 18);
                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(x + 6, cy - 17, 5, 3, -0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#16a34a'; ctx.fill();
                ctx.beginPath(); ctx.arc(x - 4, cy - 5, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
            } else {
                ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(x, cy + 8); ctx.lineTo(x, cy + 18);
                ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
                const tops = [{ dx: 0, dy: -4, r: 9 }, { dx: -7, dy: 2, r: 7 }, { dx: 7, dy: 2, r: 7 }];
                ctx.shadowBlur = 12; ctx.shadowColor = '#22c55e';
                for (const tp of tops) {
                    ctx.beginPath(); ctx.arc(x + tp.dx, cy + tp.dy, tp.r, 0, Math.PI * 2);
                    ctx.fillStyle = '#22c55e'; ctx.fill();
                }
                ctx.shadowBlur = 0;
                for (const tp of tops) {
                    ctx.beginPath(); ctx.arc(x + tp.dx - 2, cy + tp.dy - 2, tp.r * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(134,239,172,0.4)'; ctx.fill();
                }
            }
            ctx.restore();
        },

        _desenharParticulas(ctx) {
            ctx.save();
            for (const p of this.particulas) {
                ctx.globalAlpha = p.vida;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.vida, 0, Math.PI * 2);
                ctx.fillStyle = p.cor; ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        },

        // ---- Sons ----
        _somComer(tipo) {
            this._initAudio();
            if (!this.ac) return;
            const ac = this.ac, osc = ac.createOscillator(), gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = 'sine';
            if (tipo === 'maca') {
                osc.frequency.setValueAtTime(300, ac.currentTime);
                osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.10);
                osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.35);
            } else {
                osc.frequency.setValueAtTime(600, ac.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.30);
            }
            gain.gain.setValueAtTime(0.30, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
            osc.start(); osc.stop(ac.currentTime + 0.5);
        },

        _somAparecer() {
            this._initAudio();
            if (!this.ac || this.ac.state !== 'running') return;
            const ac = this.ac, osc = ac.createOscillator(), gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
            osc.start(); osc.stop(ac.currentTime + 0.3);
        },

        _somToque() {
            if (!this.ac) return;
            const ac = this.ac, osc = ac.createOscillator(), gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, ac.currentTime);
            gain.gain.setValueAtTime(0.15, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            osc.start(); osc.stop(ac.currentTime + 0.2);
        },

        // ---- Helpers de desenho do escorpiao ----
        _rg(ctx, cx, cy, r, c0, c1, c2) {
            const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
            g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
            return g;
        },

        _desenharCorpo(ctx, segs, t) {
            const tailStart = Math.max(1, segs.length - CONF.TAIL_LEN);
            const bodyLen   = tailStart - CONF.BODY_START;
            for (let i = CONF.BODY_START; i < tailStart; i++) {
                const s    = segs[i];
                const prog = bodyLen > 1 ? (i - CONF.BODY_START) / (bodyLen - 1) : 0;
                const rx   = _lerp(12, 7.5, prog);
                const ry   = _lerp(9.5, 6,   prog);
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, rx * 1.15, ry, 0, 0, Math.PI * 2);
                ctx.fillStyle   = this._rg(ctx, s.x, s.y, rx, CONF.C.AMBER, CONF.C.MID, CONF.C.DARK);
                ctx.fill();
                ctx.strokeStyle = 'rgba(120,53,15,0.45)'; ctx.lineWidth = 1; ctx.stroke();
                const wiggle = Math.sin(t * 0.10 + i * 0.88) * 9;
                for (const side of [-1, 1]) {
                    const legTipX = s.x + side * (rx * 1.15 + 13);
                    const legTipY = s.y + wiggle * side * 0.45;
                    ctx.beginPath(); ctx.moveTo(s.x + side * rx * 0.85, s.y); ctx.lineTo(legTipX, legTipY);
                    ctx.strokeStyle = CONF.C.LEG; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();
                    ctx.beginPath(); ctx.arc(legTipX, legTipY, 2, 0, Math.PI * 2);
                    ctx.fillStyle = CONF.C.AMBER; ctx.fill();
                }
            }
        },

        _desenharCauda(ctx, segs) {
            const tailStart = Math.max(1, segs.length - CONF.TAIL_LEN);
            const total     = segs.length;
            const tailLen   = total - tailStart;
            ctx.save();
            for (let i = tailStart; i < total; i++) {
                const s       = segs[i];
                const prog    = tailLen > 1 ? (i - tailStart) / (tailLen - 1) : 0;
                const r       = _lerp(6, 2.5, prog);
                const isSting = (i === total - 1);
                if (isSting) { ctx.shadowColor = 'rgba(253,224,71,0.85)'; ctx.shadowBlur = 14; }
                ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fillStyle = this._rg(ctx, s.x, s.y, r, CONF.C.LIGHT, CONF.C.MID, CONF.C.DARK);
                ctx.fill();
                if (isSting && segs.length > 1) {
                    ctx.shadowBlur = 0;
                    const stingAngle = Math.atan2(s.y - segs[i-1].y, s.x - segs[i-1].x);
                    ctx.save();
                    ctx.translate(s.x, s.y); ctx.rotate(stingAngle);
                    ctx.beginPath(); ctx.moveTo(r + 13, 0); ctx.lineTo(-r, -4.5); ctx.lineTo(-r, 4.5); ctx.closePath();
                    ctx.fillStyle = CONF.C.LIGHT; ctx.shadowColor = 'rgba(253,224,71,0.9)'; ctx.shadowBlur = 12; ctx.fill();
                    ctx.restore();
                }
            }
            ctx.restore();
        },

        _desenharCabeca(ctx, head, angle, t) {
            const r = 14;
            ctx.save();
            ctx.translate(head.x, head.y); ctx.rotate(angle);
            ctx.shadowColor = 'rgba(251,191,36,0.32)'; ctx.shadowBlur = 24;
            ctx.beginPath(); ctx.ellipse(0, 0, r * 1.38, r, 0, 0, Math.PI * 2);
            ctx.fillStyle   = this._rg(ctx, 0, 0, r * 1.38, CONF.C.LIGHT, CONF.C.MID, CONF.C.DARK);
            ctx.fill();
            ctx.strokeStyle = 'rgba(120,53,15,0.48)'; ctx.lineWidth = 1; ctx.stroke(); ctx.shadowBlur = 0;
            for (const ey of [-r * 0.38, r * 0.38]) {
                ctx.beginPath(); ctx.arc(r * 0.36, ey, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#0f172a'; ctx.fill();
                ctx.beginPath(); ctx.arc(r * 0.36 + 1.1, ey - 1.1, 1.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.fill();
            }
            const clawWiggle = Math.sin(t * 0.07) * 5;
            for (const side of [-1, 1]) {
                const bx = r * 1.22, by = side * 5, ex = bx + 14, spread = side * (7 + clawWiggle * side);
                ctx.beginPath(); ctx.moveTo(r * 0.9, side * 4); ctx.lineTo(bx, by);
                ctx.strokeStyle = 'rgba(217,119,6,0.92)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, by + spread * 0.58);
                ctx.strokeStyle = CONF.C.AMBER; ctx.lineWidth = 2.5; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex - 3, by - spread * 0.38);
                ctx.strokeStyle = CONF.C.LIGHT; ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();
        },
    };

    window.EscorpiaoGame = EscorpiaoGame;

})();

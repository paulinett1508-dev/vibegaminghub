// =====================================================================
// escorpiao.js — Jogo Escorpiao Standalone v2.0
// =====================================================================
// Canvas fullscreen, escorpiao anda autonomamente em direcao a comida
// Maca (vermelha) -> cresce | Brocolis (verde) -> encolhe
// Segmentos dinamicos: 8-40, cauda sempre os ultimos 6
// Tap/clique: particulas + redireciona o escorpiao
// =====================================================================

(function () {
    'use strict';

    function _lerp(a, b, t) { return a + (b - a) * t; }

    const CONF = {
        BODY_START:      1,
        TAIL_LEN:        6,     // ultimos N segmentos sao sempre cauda
        HEAD_LERP:       0.10,
        SEG_DIST:        22,
        EAT_RADIUS:      32,
        WANDER_INTERVAL: 200,   // frames entre wandering autonomo (~3.3s)
        FOOD_MARGIN:     70,    // margem minima das bordas
        MIN_SEGS:        8,
        MAX_SEGS:        40,
        GROW_AMOUNT:     3,
        SHRINK_AMOUNT:   3,
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
        wanderTimer:  0,
        animFrame:    null,
        frameCount:   0,
        ctx:          null,
        canvas:       null,
        _onKey:       null,
        _onResize:    null,
        _foodTimeout: null,
        comida:       null,
        particulas:   [],
        ac:           null,

        abrir() {
            const cx = window.innerWidth  / 2;
            const cy = window.innerHeight / 2;

            // Inicializa segmentos empilhados verticalmente no centro
            this.segs = [];
            for (let i = 0; i < 16; i++) {
                this.segs.push({ x: cx, y: cy + i * CONF.SEG_DIST });
            }
            this.targetX     = cx;
            this.targetY     = cy;
            this.wanderTimer = 0;
            this.frameCount  = 0;
            this.comida      = null;
            this.particulas  = [];
            this._foodTimeout = null;

            // Overlay principal
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
                closeBtn.style.background   = '#1e293b';
                closeBtn.style.color        = '#94a3b8';
                closeBtn.style.borderColor  = '#334155';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background  = '#0f172a';
                closeBtn.style.color       = '#475569';
                closeBtn.style.borderColor = '#1e3a5f';
            });
            closeBtn.addEventListener('click', () =>
                window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar()
            );

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
            overlay.appendChild(label);
            document.body.appendChild(overlay);

            // Fade da instrucao depois de 3.5s
            setTimeout(() => { label.style.opacity = '0'; }, 3500);

            // Toque/clique (com guard para nao disparar no botao fechar)
            overlay.addEventListener('click', (e) => {
                if (closeBtn.contains(e.target)) return;
                EscorpiaoGame._toqueEm(e.clientX, e.clientY);
            });
            overlay.addEventListener('touchstart', (e) => {
                if (closeBtn.contains(e.target)) return;
                e.preventDefault();
                EscorpiaoGame._toqueEm(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            // ESC fecha
            this._onKey = (e) => {
                if (e.key === 'Escape')
                    (window.fecharJoguinhos ? window.fecharJoguinhos() : EscorpiaoGame.fechar());
            };
            document.addEventListener('keydown', this._onKey);

            // Redimensionamento
            this._onResize = () => {
                if (EscorpiaoGame.canvas) {
                    EscorpiaoGame.canvas.width  = window.innerWidth;
                    EscorpiaoGame.canvas.height = window.innerHeight;
                }
            };
            window.addEventListener('resize', this._onResize);

            // Primeira comida apos 1.2s
            this._foodTimeout = setTimeout(() => EscorpiaoGame._spawnComida(), 1200);

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

        fechar() {
            if (this._foodTimeout)  { clearTimeout(this._foodTimeout);         this._foodTimeout = null; }
            if (this.animFrame)     { cancelAnimationFrame(this.animFrame);     this.animFrame = null; }
            if (this._onKey)        { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
            if (this._onResize)     { window.removeEventListener('resize', this._onResize); this._onResize = null; }
            if (this.ac)            { this.ac.close(); this.ac = null; }
            const overlay = document.getElementById('escorpiao-overlay');
            if (overlay) overlay.remove();
            this.ctx       = null;
            this.canvas    = null;
            this.comida    = null;
            this.particulas = [];
        },

        // ---- Fisica ----
        _atualizar() {
            const segs = this.segs;

            // Cabeca acompanha o alvo com LERP
            segs[0].x += (this.targetX - segs[0].x) * CONF.HEAD_LERP;
            segs[0].y += (this.targetY - segs[0].y) * CONF.HEAD_LERP;

            // Cada segmento segue o anterior mantendo SEG_DIST
            for (let i = 1; i < segs.length; i++) {
                const dx   = segs[i].x - segs[i - 1].x;
                const dy   = segs[i].y - segs[i - 1].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > CONF.SEG_DIST) {
                    const f  = (dist - CONF.SEG_DIST) / dist;
                    segs[i].x -= dx * f;
                    segs[i].y -= dy * f;
                }
            }

            // Se tem comida, redireciona para ela quando perto do alvo atual
            if (this.comida) {
                const distToTarget = Math.hypot(
                    segs[0].x - this.targetX,
                    segs[0].y - this.targetY
                );
                // Se chegou perto do alvo atual mas o alvo nao e a comida, redireciona
                if (distToTarget < 30 &&
                    (this.targetX !== this.comida.x || this.targetY !== this.comida.y)) {
                    this.targetX = this.comida.x;
                    this.targetY = this.comida.y;
                }
                this.comida.t++;
                // Verifica se comeu
                const d = Math.hypot(segs[0].x - this.comida.x, segs[0].y - this.comida.y);
                if (d < CONF.EAT_RADIUS) this._comer();
            } else {
                // Wander autonomo quando sem comida
                if (++this.wanderTimer >= CONF.WANDER_INTERVAL) {
                    this._novoAlvo();
                    this.wanderTimer = 0;
                }
            }

            // Fisica das particulas
            this.particulas = this.particulas.filter(p => {
                p.x  += p.vx;
                p.y  += p.vy;
                p.vy += 0.15;
                p.vx *= 0.93;
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

            // Fundo
            ctx.fillStyle = CONF.C.BG;
            ctx.fillRect(0, 0, W, H);

            // Grade de pontos decorativa
            ctx.fillStyle = CONF.C.GRID;
            for (let x = 21; x < W; x += 42) {
                for (let y = 21; y < H; y += 42) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Particulas (por baixo de tudo)
            this._desenharParticulas(ctx);

            // Comida
            if (this.comida) this._desenharComida(ctx);

            // Angulo de direcao da cabeca
            const dx = segs[0].x - segs[1].x;
            const dy = segs[0].y - segs[1].y;
            const headAngle = Math.atan2(dy, dx);

            // Escorpiao: corpo -> cauda -> cabeca
            this._desenharCorpo(ctx, segs, t);
            this._desenharCauda(ctx, segs, t);
            this._desenharCabeca(ctx, segs[0], headAngle, t);
        },

        // ---- Novo alvo ----
        _novoAlvo(x, y) {
            const W = this.canvas ? this.canvas.width  : window.innerWidth;
            const H = this.canvas ? this.canvas.height : window.innerHeight;
            const m = CONF.FOOD_MARGIN;
            if (x !== undefined) {
                this.targetX = x;
                this.targetY = y;
            } else {
                this.targetX = m + Math.random() * (W - m * 2);
                this.targetY = m + Math.random() * (H - m * 2);
            }
        },

        // ---- Spawnar comida ----
        _spawnComida() {
            if (!this.canvas) return;
            const W    = this.canvas.width;
            const H    = this.canvas.height;
            const m    = CONF.FOOD_MARGIN;
            const tipo = Math.random() < 0.6 ? 'maca' : 'brocolis';
            const cor  = tipo === 'maca' ? '#ef4444' : '#22c55e';

            // Posicao longe da cabeca (min 120px)
            let x, y, tentativas = 0;
            do {
                x = m + Math.random() * (W - m * 2);
                y = m + Math.random() * (H - m * 2);
                tentativas++;
            } while (
                tentativas < 10 &&
                Math.hypot(x - this.segs[0].x, y - this.segs[0].y) < 120
            );

            this.comida = { x, y, tipo, cor, t: 0 };
            this.targetX = x;
            this.targetY = y;
            this._somAparecer();
        },

        // ---- Comer ----
        _comer() {
            const { x, y, tipo, cor } = this.comida;
            this._spawnParticulas(x, y, cor, 24);
            this._somComer(tipo);
            this.comida = null;

            if (tipo === 'maca') {
                // Adicionar segmentos antes da cauda
                const tIdx = this.segs.length - CONF.TAIL_LEN;
                const ref  = this.segs[tIdx - 1];
                for (let i = 0; i < CONF.GROW_AMOUNT; i++) {
                    if (this.segs.length < CONF.MAX_SEGS)
                        this.segs.splice(tIdx, 0, { x: ref.x, y: ref.y });
                }
            } else {
                // Remover segmentos do corpo
                const tIdx      = this.segs.length - CONF.TAIL_LEN;
                const removeFrom = Math.max(1, tIdx - CONF.SHRINK_AMOUNT);
                let count        = tIdx - removeFrom;
                const maxRemove  = this.segs.length - CONF.MIN_SEGS;
                count = Math.min(count, maxRemove);
                if (count > 0) this.segs.splice(removeFrom, count);
            }

            this._foodTimeout = setTimeout(() => EscorpiaoGame._spawnComida(), 900);
        },

        // ---- Toque ----
        _toqueEm(x, y) {
            this._initAudio();
            // Redireciona temporariamente; voltara para a comida quando chegar
            this._novoAlvo(x, y);
            this._spawnParticulas(x, y, '#fde047', 10);
            this._somToque();
        },

        // ---- Audio (lazy init) ----
        _initAudio() {
            if (!this.ac) {
                try {
                    this.ac = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {}
            }
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
                    cor,
                    vida: 1,
                    decaimento: 0.028 + Math.random() * 0.022,
                });
            }
        },

        // ---- Desenhar comida ----
        _desenharComida(ctx) {
            const { x, tipo, cor, t } = this.comida;
            const bob = Math.sin(t * 0.09) * 4;
            const cy  = this.comida.y + bob;

            ctx.save();
            ctx.shadowColor = cor;
            ctx.shadowBlur  = 20;

            if (tipo === 'maca') {
                // Corpo vermelho
                ctx.beginPath();
                ctx.arc(x, cy, 13, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
                // Caule
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(x + 2, cy - 12);
                ctx.lineTo(x + 2, cy - 18);
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth   = 2.5;
                ctx.lineCap     = 'round';
                ctx.stroke();
                // Folha
                ctx.beginPath();
                ctx.ellipse(x + 6, cy - 17, 5, 3, -0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#16a34a';
                ctx.fill();
                // Brilho
                ctx.beginPath();
                ctx.arc(x - 4, cy - 5, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fill();
            } else {
                // Brocolis: cabo
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(x, cy + 8);
                ctx.lineTo(x, cy + 18);
                ctx.strokeStyle = '#65a30d';
                ctx.lineWidth   = 3;
                ctx.lineCap     = 'round';
                ctx.stroke();
                // Topo (3 circulos)
                const tops = [
                    { dx:  0, dy: -4, r: 9 },
                    { dx: -7, dy:  2, r: 7 },
                    { dx:  7, dy:  2, r: 7 },
                ];
                ctx.shadowBlur  = 12;
                ctx.shadowColor = '#22c55e';
                for (const tp of tops) {
                    ctx.beginPath();
                    ctx.arc(x + tp.dx, cy + tp.dy, tp.r, 0, Math.PI * 2);
                    ctx.fillStyle = '#22c55e';
                    ctx.fill();
                }
                // Brilho nos topos
                ctx.shadowBlur = 0;
                for (const tp of tops) {
                    ctx.beginPath();
                    ctx.arc(x + tp.dx - 2, cy + tp.dy - 2, tp.r * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(134,239,172,0.4)';
                    ctx.fill();
                }
            }

            ctx.restore();
        },

        // ---- Desenhar particulas ----
        _desenharParticulas(ctx) {
            ctx.save();
            for (const p of this.particulas) {
                ctx.globalAlpha = p.vida;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.vida, 0, Math.PI * 2);
                ctx.fillStyle = p.cor;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        },

        // ---- Sons ----
        _somComer(tipo) {
            this._initAudio();
            if (!this.ac) return;
            const ac   = this.ac;
            const osc  = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = 'sine';
            if (tipo === 'maca') {
                // Tom subindo: sensacao de crescer
                osc.frequency.setValueAtTime(300, ac.currentTime);
                osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.10);
                osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.35);
            } else {
                // Tom descendo: sensacao de encolher
                osc.frequency.setValueAtTime(600, ac.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.30);
            }
            gain.gain.setValueAtTime(0.30, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
            osc.start();
            osc.stop(ac.currentTime + 0.5);
        },

        _somAparecer() {
            // Nao toca antes da primeira interacao (politica do browser)
            if (!this.ac) return;
            const ac   = this.ac;
            const osc  = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(700, ac.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
            osc.start();
            osc.stop(ac.currentTime + 0.3);
        },

        _somToque() {
            if (!this.ac) return;
            const ac   = this.ac;
            const osc  = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, ac.currentTime);
            gain.gain.setValueAtTime(0.15, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            osc.start();
            osc.stop(ac.currentTime + 0.2);
        },

        // ---- Gradiente radial helper ----
        _rg(ctx, cx, cy, r, c0, c1, c2) {
            const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
            g.addColorStop(0,    c0);
            g.addColorStop(0.55, c1);
            g.addColorStop(1,    c2);
            return g;
        },

        // ---- Corpo: segmentos dinamicos com patas ----
        _desenharCorpo(ctx, segs, t) {
            const tailStart = segs.length - CONF.TAIL_LEN;
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
                ctx.strokeStyle = 'rgba(120,53,15,0.45)';
                ctx.lineWidth   = 1;
                ctx.stroke();

                // Patas
                const wiggle = Math.sin(t * 0.10 + i * 0.88) * 9;
                for (const side of [-1, 1]) {
                    const legTipX = s.x + side * (rx * 1.15 + 13);
                    const legTipY = s.y + wiggle * side * 0.45;

                    ctx.beginPath();
                    ctx.moveTo(s.x + side * rx * 0.85, s.y);
                    ctx.lineTo(legTipX, legTipY);
                    ctx.strokeStyle = CONF.C.LEG;
                    ctx.lineWidth   = 1.8;
                    ctx.lineCap     = 'round';
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(legTipX, legTipY, 2, 0, Math.PI * 2);
                    ctx.fillStyle = CONF.C.AMBER;
                    ctx.fill();
                }
            }
        },

        // ---- Cauda: ultimos TAIL_LEN segmentos com ferrao ----
        _desenharCauda(ctx, segs) {
            const tailStart = segs.length - CONF.TAIL_LEN;
            const total     = segs.length;
            ctx.save();

            for (let i = tailStart; i < total; i++) {
                const s       = segs[i];
                const prog    = (i - tailStart) / (CONF.TAIL_LEN - 1);
                const r       = _lerp(6, 2.5, prog);
                const isSting = (i === total - 1);

                if (isSting) {
                    ctx.shadowColor = 'rgba(253,224,71,0.85)';
                    ctx.shadowBlur  = 14;
                }

                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fillStyle = this._rg(ctx, s.x, s.y, r, CONF.C.LIGHT, CONF.C.MID, CONF.C.DARK);
                ctx.fill();

                if (isSting) {
                    ctx.shadowBlur = 0;
                    const prev       = segs[i - 1];
                    const stingAngle = Math.atan2(s.y - prev.y, s.x - prev.x);

                    ctx.save();
                    ctx.translate(s.x, s.y);
                    ctx.rotate(stingAngle);
                    ctx.beginPath();
                    ctx.moveTo(r + 13, 0);
                    ctx.lineTo(-r, -4.5);
                    ctx.lineTo(-r,  4.5);
                    ctx.closePath();
                    ctx.fillStyle   = CONF.C.LIGHT;
                    ctx.shadowColor = 'rgba(253,224,71,0.9)';
                    ctx.shadowBlur  = 12;
                    ctx.fill();
                    ctx.restore();
                }
            }

            ctx.restore();
        },

        // ---- Cabeca com olhos e garras ----
        _desenharCabeca(ctx, head, angle, t) {
            const r = 14;
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(angle);

            ctx.shadowColor = 'rgba(251,191,36,0.32)';
            ctx.shadowBlur  = 24;

            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.38, r, 0, 0, Math.PI * 2);
            ctx.fillStyle   = this._rg(ctx, 0, 0, r * 1.38, CONF.C.LIGHT, CONF.C.MID, CONF.C.DARK);
            ctx.fill();
            ctx.strokeStyle = 'rgba(120,53,15,0.48)';
            ctx.lineWidth   = 1;
            ctx.stroke();
            ctx.shadowBlur  = 0;

            // Olhos
            for (const ey of [-r * 0.38, r * 0.38]) {
                ctx.beginPath();
                ctx.arc(r * 0.36, ey, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(r * 0.36 + 1.1, ey - 1.1, 1.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.62)';
                ctx.fill();
            }

            // Garras / queliceras
            const clawWiggle = Math.sin(t * 0.07) * 5;
            for (const side of [-1, 1]) {
                const bx     = r * 1.22;
                const by     = side * 5;
                const ex     = bx + 14;
                const spread = side * (7 + clawWiggle * side);

                ctx.beginPath();
                ctx.moveTo(r * 0.9, side * 4);
                ctx.lineTo(bx, by);
                ctx.strokeStyle = 'rgba(217,119,6,0.92)';
                ctx.lineWidth   = 3.5;
                ctx.lineCap     = 'round';
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(ex, by + spread * 0.58);
                ctx.strokeStyle = CONF.C.AMBER;
                ctx.lineWidth   = 2.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(ex - 3, by - spread * 0.38);
                ctx.strokeStyle = CONF.C.LIGHT;
                ctx.lineWidth   = 2;
                ctx.stroke();
            }

            ctx.restore();
        },
    };

    // Exposicao global
    window.EscorpiaoGame = EscorpiaoGame;

})();

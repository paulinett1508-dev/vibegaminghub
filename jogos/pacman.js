// =====================================================================
// pacman.js — Jogo Pac-Man Standalone v1.3
// =====================================================================
// Pac-Man simplificado para criancas
// Controles: toque/mouse para direcionar, ESC para sair
// =====================================================================

(function () {
    'use strict';

    // ---- Configuracao ----
    var CONF = {
        BG: '#000000',
        WALL: '#2121de',
        WALL_GLOW: '#4a4aff',
        PELLET: '#ffb897',
        POWER: '#ffff00',
        PACMAN: '#ffff00',
        GHOST_COLORS: ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'],
        GHOST_SCARED: '#2121ff',
        CELL: 20,
        SPEED: 2.5,
        GHOST_SPEED: 1.8,
    };

    // Mapa simples (0=vazio, 1=parede, 2=pellet, 3=power pellet)
    var MAPA_BASE = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
        [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
        [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    // ---- Sistema de Som ----
    function SomPacman() {
        this.audioCtx = null;
        this.ambientOsc = null;
        this.ambientGain = null;
    }

    SomPacman.prototype.init = function () {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.audioCtx = null;
        }
    };

    SomPacman.prototype.iniciarAmbiente = function () {
        if (!this.audioCtx || this.ambientOsc) return;
        var ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        // Som ambiente arcade: hum grave suave
        var osc1 = ctx.createOscillator();
        var osc2 = ctx.createOscillator();
        var gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 55; // Nota grave
        osc2.type = 'sine';
        osc2.frequency.value = 110; // Oitava acima

        gain.gain.value = 0.04; // Bem baixinho

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();

        this.ambientOsc = [osc1, osc2];
        this.ambientGain = gain;
    };

    SomPacman.prototype.pararAmbiente = function () {
        if (this.ambientOsc) {
            for (var i = 0; i < this.ambientOsc.length; i++) {
                try { this.ambientOsc[i].stop(); } catch (e) {}
            }
            this.ambientOsc = null;
        }
        this.ambientGain = null;
    };

    SomPacman.prototype._tocar = function (freq, dur, type, vol) {
        if (!this.audioCtx) return;
        var ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    };

    SomPacman.prototype.waka = function () {
        this._tocar(440, 0.08, 'square', 0.08);
        var self = this;
        setTimeout(function () { self._tocar(330, 0.08, 'square', 0.08); }, 80);
    };

    SomPacman.prototype.power = function () {
        this._tocar(523, 0.1, 'square', 0.12);
        var self = this;
        setTimeout(function () { self._tocar(659, 0.1, 'square', 0.12); }, 100);
        setTimeout(function () { self._tocar(784, 0.15, 'square', 0.12); }, 200);
    };

    SomPacman.prototype.eatGhost = function () {
        for (var i = 0; i < 5; i++) {
            var self = this;
            var freq = 200 + i * 100;
            (function (f, d) {
                setTimeout(function () { self._tocar(f, 0.08, 'sawtooth', 0.1); }, d);
            })(freq, i * 60);
        }
    };

    SomPacman.prototype.morte = function () {
        // Som descendente triste
        var self = this;
        var notas = [440, 392, 349, 330, 294, 262, 220, 196];
        for (var i = 0; i < notas.length; i++) {
            (function (freq, delay) {
                setTimeout(function () {
                    self._tocar(freq, 0.12, 'sine', 0.15);
                }, delay);
            })(notas[i], i * 100);
        }
    };

    SomPacman.prototype.fruta = function () {
        // Som alegre de pegar fruta
        this._tocar(523, 0.08, 'square', 0.1);
        var self = this;
        setTimeout(function () { self._tocar(659, 0.08, 'square', 0.1); }, 80);
        setTimeout(function () { self._tocar(784, 0.12, 'square', 0.12); }, 160);
    };

    SomPacman.prototype.faseCompleta = function () {
        // Fanfarra de fase completa
        var self = this;
        var notas = [523, 659, 784, 1047];
        for (var i = 0; i < notas.length; i++) {
            (function (freq, delay) {
                setTimeout(function () {
                    self._tocar(freq, 0.2, 'square', 0.12);
                }, delay);
            })(notas[i], i * 150);
        }
    };

    SomPacman.prototype.vitoria = function () {
        // Fanfarra de vitoria final
        var self = this;
        var melodia = [523, 523, 523, 659, 784, 659, 784, 1047];
        var tempos = [0, 150, 300, 450, 600, 900, 1050, 1200];
        for (var i = 0; i < melodia.length; i++) {
            (function (freq, delay) {
                setTimeout(function () {
                    self._tocar(freq, 0.25, 'square', 0.15);
                }, delay);
            })(melodia[i], tempos[i]);
        }
    };

    SomPacman.prototype.fechar = function () {
        this.pararAmbiente();
        if (this.audioCtx) {
            this.audioCtx.close().catch(function () {});
            this.audioCtx = null;
        }
    };

    // ---- Game Object ----
    var PacmanGame = {
        canvas: null,
        ctx: null,
        animFrame: null,
        som: null,
        mapa: null,
        pacman: null,
        ghosts: [],
        pelletCount: 0,
        score: 0,
        vidas: 3,
        maxVidas: 3,
        fase: 1,
        maxFases: 3,
        powerMode: false,
        powerTimer: null,
        lastWaka: 0,
        targetDir: { x: 0, y: 0 },
        scoreDiv: null,
        faseDiv: null,
        vidasDiv: null,
        vitoriaDiv: null,
        gameOverDiv: null,
        _onKey: null,
        _onResize: null,

        abrir: function () {
            var self = this;
            var W = window.innerWidth;
            var H = window.innerHeight;

            // Inicializar som
            self.som = new SomPacman();
            self.som.init();

            // Copiar mapa
            self.mapa = [];
            self.pelletCount = 0;
            for (var y = 0; y < MAPA_BASE.length; y++) {
                self.mapa[y] = [];
                for (var x = 0; x < MAPA_BASE[y].length; x++) {
                    self.mapa[y][x] = MAPA_BASE[y][x];
                    if (MAPA_BASE[y][x] === 2 || MAPA_BASE[y][x] === 3) {
                        self.pelletCount++;
                    }
                }
            }

            // Calcular offset para centralizar
            var mapaW = MAPA_BASE[0].length * CONF.CELL;
            var mapaH = MAPA_BASE.length * CONF.CELL;
            self.offsetX = (W - mapaW) / 2;
            self.offsetY = (H - mapaH) / 2;

            // Pac-Man inicial
            self.pacman = {
                x: 9 * CONF.CELL + CONF.CELL / 2,
                y: 15 * CONF.CELL + CONF.CELL / 2,
                dir: { x: 0, y: 0 },
                nextDir: { x: 0, y: 0 },
                mouthAngle: 0,
                mouthDir: 1,
            };

            // Fantasmas
            self.ghosts = [];
            var ghostPositions = [
                { x: 9, y: 9 },
                { x: 8, y: 9 },
                { x: 10, y: 9 },
                { x: 9, y: 8 },
            ];
            for (var i = 0; i < 4; i++) {
                // Direcao inicial: mover em direcao a saida (x=9) primeiro
                var gx = ghostPositions[i].x;
                var initialDir;
                if (gx < 9) {
                    initialDir = { x: 1, y: 0 }; // Direita em direcao a saida
                } else if (gx > 9) {
                    initialDir = { x: -1, y: 0 }; // Esquerda em direcao a saida
                } else {
                    initialDir = { x: 0, y: -1 }; // Ja na saida, sobe
                }
                self.ghosts.push({
                    x: ghostPositions[i].x * CONF.CELL + CONF.CELL / 2,
                    y: ghostPositions[i].y * CONF.CELL + CONF.CELL / 2,
                    dir: initialDir,
                    color: CONF.GHOST_COLORS[i],
                    scared: false,
                });
            }

            self.score = 0;
            self.vidas = self.maxVidas;
            self.fase = 1;
            self.powerMode = false;
            self.targetDir = { x: 0, y: 0 };

            // Overlay
            var overlay = document.createElement('div');
            overlay.id = 'pacman-overlay';
            overlay.style.cssText = [
                'position:fixed',
                'inset:0',
                'background:#000',
                'z-index:9999',
                'overflow:hidden',
            ].join(';');

            // Canvas
            var canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            canvas.style.cssText = 'display:block;';
            self.canvas = canvas;
            self.ctx = canvas.getContext('2d');

            // Score display
            var scoreDiv = document.createElement('div');
            scoreDiv.id = 'pacman-score';
            scoreDiv.style.cssText = [
                'position:absolute',
                'top:20px',
                'left:50%',
                'transform:translateX(-50%)',
                'font-family:JetBrains Mono,monospace',
                'font-size:1.5rem',
                'color:#fff',
                'text-shadow:0 0 10px #ffff00',
            ].join(';');
            scoreDiv.textContent = '0';
            self.scoreDiv = scoreDiv;

            // Fase display
            var faseDiv = document.createElement('div');
            faseDiv.id = 'pacman-fase';
            faseDiv.style.cssText = [
                'position:absolute',
                'top:50px',
                'left:50%',
                'transform:translateX(-50%)',
                'font-family:JetBrains Mono,monospace',
                'font-size:1rem',
                'color:#ffff00',
                'text-shadow:0 0 8px #ffff00',
            ].join(';');
            faseDiv.textContent = 'Fase 1/3';
            self.faseDiv = faseDiv;

            // Vidas display
            var vidasDiv = document.createElement('div');
            vidasDiv.id = 'pacman-vidas';
            vidasDiv.style.cssText = [
                'position:absolute',
                'top:20px',
                'left:20px',
                'font-family:JetBrains Mono,monospace',
                'font-size:1.2rem',
                'color:#ffff00',
                'text-shadow:0 0 8px #ffff00',
                'display:flex',
                'gap:6px',
            ].join(';');
            self.vidasDiv = vidasDiv;
            self._atualizarVidas();

            // Botao fechar
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = [
                'position:absolute',
                'top:20px',
                'right:20px',
                'background:#1a1a2e',
                'border:2px solid #2121de',
                'color:#4a4aff',
                'border-radius:50%',
                'width:44px',
                'height:44px',
                'cursor:pointer',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'z-index:10',
            ].join(';');
            closeBtn.innerHTML = '<span class="material-icons" style="font-size:20px;">close</span>';
            closeBtn.addEventListener('click', function () {
                window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
            });

            overlay.appendChild(canvas);
            overlay.appendChild(scoreDiv);
            overlay.appendChild(faseDiv);
            overlay.appendChild(vidasDiv);
            overlay.appendChild(closeBtn);
            document.body.appendChild(overlay);

            // Controles - direcao baseada em toque/mouse
            function updateDirection(clientX, clientY) {
                // Iniciar som ambiente na primeira interacao
                if (self.som && !self.som.ambientOsc) {
                    self.som.iniciarAmbiente();
                }

                var px = self.offsetX + self.pacman.x;
                var py = self.offsetY + self.pacman.y;
                var dx = clientX - px;
                var dy = clientY - py;

                // Determinar direcao dominante
                if (Math.abs(dx) > Math.abs(dy)) {
                    self.targetDir = { x: dx > 0 ? 1 : -1, y: 0 };
                } else {
                    self.targetDir = { x: 0, y: dy > 0 ? 1 : -1 };
                }
            }

            overlay.addEventListener('mousemove', function (e) {
                updateDirection(e.clientX, e.clientY);
            });

            overlay.addEventListener('touchstart', function (e) {
                updateDirection(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });

            overlay.addEventListener('touchmove', function (e) {
                e.preventDefault();
                updateDirection(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: false });

            // Teclado
            self._onKey = function (e) {
                if (e.key === 'Escape') {
                    window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
                    return;
                }
                if (e.key === 'ArrowLeft' || e.key === 'a') self.targetDir = { x: -1, y: 0 };
                if (e.key === 'ArrowRight' || e.key === 'd') self.targetDir = { x: 1, y: 0 };
                if (e.key === 'ArrowUp' || e.key === 'w') self.targetDir = { x: 0, y: -1 };
                if (e.key === 'ArrowDown' || e.key === 's') self.targetDir = { x: 0, y: 1 };
            };
            document.addEventListener('keydown', self._onKey);

            // Resize
            self._onResize = function () {
                if (self.canvas) {
                    self.canvas.width = window.innerWidth;
                    self.canvas.height = window.innerHeight;
                    var mapaW = MAPA_BASE[0].length * CONF.CELL;
                    var mapaH = MAPA_BASE.length * CONF.CELL;
                    self.offsetX = (window.innerWidth - mapaW) / 2;
                    self.offsetY = (window.innerHeight - mapaH) / 2;
                }
            };
            window.addEventListener('resize', self._onResize);

            // Game loop
            function loop() {
                if (!self.ctx) return;
                self._atualizar();
                self._renderizar();
                self.animFrame = requestAnimationFrame(loop);
            }
            loop();
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
            if (this.powerTimer) {
                clearTimeout(this.powerTimer);
                this.powerTimer = null;
            }
            if (this.som) {
                this.som.fechar();
                this.som = null;
            }
            var overlay = document.getElementById('pacman-overlay');
            if (overlay) overlay.remove();
            this.ctx = null;
            this.canvas = null;
        },

        _podeAndar: function (x, y, dir) {
            var nx = x + dir.x * CONF.SPEED;
            var ny = y + dir.y * CONF.SPEED;
            var cell = CONF.CELL;
            var margin = cell / 2 - 2;

            // Checar 4 cantos
            var corners = [
                { x: nx - margin, y: ny - margin },
                { x: nx + margin, y: ny - margin },
                { x: nx - margin, y: ny + margin },
                { x: nx + margin, y: ny + margin },
            ];

            for (var i = 0; i < corners.length; i++) {
                var gx = Math.floor(corners[i].x / cell);
                var gy = Math.floor(corners[i].y / cell);
                if (gy < 0 || gy >= this.mapa.length) return false;
                if (gx < 0 || gx >= this.mapa[0].length) {
                    // Tunel
                    continue;
                }
                if (this.mapa[gy][gx] === 1) return false;
            }
            return true;
        },

        _atualizar: function () {
            var self = this;
            var pac = this.pacman;
            var cell = CONF.CELL;

            // Tentar mudar direcao
            if (this.targetDir.x !== 0 || this.targetDir.y !== 0) {
                if (this._podeAndar(pac.x, pac.y, this.targetDir)) {
                    pac.nextDir = { x: this.targetDir.x, y: this.targetDir.y };
                }
            }

            // Tentar aplicar nextDir
            if (pac.nextDir.x !== 0 || pac.nextDir.y !== 0) {
                if (this._podeAndar(pac.x, pac.y, pac.nextDir)) {
                    pac.dir = { x: pac.nextDir.x, y: pac.nextDir.y };
                }
            }

            // Mover Pac-Man
            if (this._podeAndar(pac.x, pac.y, pac.dir)) {
                pac.x += pac.dir.x * CONF.SPEED;
                pac.y += pac.dir.y * CONF.SPEED;
            }

            // Tunel
            var mapaW = this.mapa[0].length * cell;
            if (pac.x < 0) pac.x = mapaW - 1;
            if (pac.x >= mapaW) pac.x = 0;

            // Coletar pellets
            var gx = Math.floor(pac.x / cell);
            var gy = Math.floor(pac.y / cell);
            if (gy >= 0 && gy < this.mapa.length && gx >= 0 && gx < this.mapa[0].length) {
                var tile = this.mapa[gy][gx];
                if (tile === 2) {
                    this.mapa[gy][gx] = 0;
                    this.score += 10;
                    this.pelletCount--;
                    var now = Date.now();
                    if (now - this.lastWaka > 150) {
                        this.som.waka();
                        this.lastWaka = now;
                    }
                } else if (tile === 3) {
                    this.mapa[gy][gx] = 0;
                    this.score += 50;
                    this.pelletCount--;
                    this.som.fruta();
                    this._ativarPower();
                }
            }

            // Animar boca
            pac.mouthAngle += 0.15 * pac.mouthDir;
            if (pac.mouthAngle > 0.4 || pac.mouthAngle < 0) {
                pac.mouthDir *= -1;
            }

            // Atualizar fantasmas
            for (var i = 0; i < this.ghosts.length; i++) {
                this._moverGhost(this.ghosts[i], i);
            }

            // Colisao com fantasmas
            for (var i = 0; i < this.ghosts.length; i++) {
                var g = this.ghosts[i];
                var dist = Math.sqrt((pac.x - g.x) * (pac.x - g.x) + (pac.y - g.y) * (pac.y - g.y));
                if (dist < cell * 0.8) {
                    if (this.powerMode && g.scared) {
                        // Comer fantasma
                        this.som.eatGhost();
                        this.score += 200;
                        // Respawn no centro
                        g.x = 9 * cell + cell / 2;
                        g.y = 9 * cell + cell / 2;
                        g.scared = false;
                    } else if (!g.scared) {
                        // Perdeu uma vida
                        this.vidas--;
                        this._atualizarVidas();
                        this.som.morte();

                        if (this.vidas <= 0) {
                            // Game over
                            this._mostrarGameOver();
                            return;
                        }

                        // Respawn Pac-Man
                        pac.x = 9 * cell + cell / 2;
                        pac.y = 15 * cell + cell / 2;
                        pac.dir = { x: 0, y: 0 };

                        // Resetar fantasmas tambem
                        var ghostPositions = [
                            { x: 9, y: 9 },
                            { x: 8, y: 9 },
                            { x: 10, y: 9 },
                            { x: 9, y: 8 },
                        ];
                        for (var j = 0; j < this.ghosts.length; j++) {
                            var gx = ghostPositions[j].x;
                            this.ghosts[j].x = gx * cell + cell / 2;
                            this.ghosts[j].y = ghostPositions[j].y * cell + cell / 2;
                            this.ghosts[j].scared = false;
                            // Direcao inicial em direcao a saida (x=9)
                            if (gx < 9) {
                                this.ghosts[j].dir = { x: 1, y: 0 };
                            } else if (gx > 9) {
                                this.ghosts[j].dir = { x: -1, y: 0 };
                            } else {
                                this.ghosts[j].dir = { x: 0, y: -1 };
                            }
                        }
                        this.powerMode = false;
                        if (this.powerTimer) {
                            clearTimeout(this.powerTimer);
                            this.powerTimer = null;
                        }
                    }
                }
            }

            // Atualizar score
            if (this.scoreDiv) {
                this.scoreDiv.textContent = this.score;
            }

            // Vitoria? Recarregar mapa
            if (this.pelletCount <= 0) {
                this._resetMapa();
            }
        },

        _ativarPower: function () {
            var self = this;
            this.powerMode = true;
            for (var i = 0; i < this.ghosts.length; i++) {
                this.ghosts[i].scared = true;
            }
            if (this.powerTimer) clearTimeout(this.powerTimer);
            this.powerTimer = setTimeout(function () {
                self.powerMode = false;
                for (var i = 0; i < self.ghosts.length; i++) {
                    self.ghosts[i].scared = false;
                }
            }, 7000);
        },

        _moverGhost: function (ghost, index) {
            var cell = CONF.CELL;
            // Velocidade aumenta com cada fase (1.0x, 1.3x, 1.6x)
            var faseMultiplier = 1 + (this.fase - 1) * 0.3;
            var speed = CONF.GHOST_SPEED * faseMultiplier * (ghost.scared ? 0.5 : 1);

            // Checar se pode continuar
            var canContinue = this._podeAndarGhost(ghost.x, ghost.y, ghost.dir);

            // A cada celula, chance de mudar direcao
            var gx = ghost.x / cell;
            var gy = ghost.y / cell;
            var centered = Math.abs(gx - Math.round(gx)) < 0.15 && Math.abs(gy - Math.round(gy)) < 0.15;

            if (!canContinue || (centered && Math.random() < 0.3)) {
                // Escolher nova direcao
                var dirs = [
                    { x: 1, y: 0 },
                    { x: -1, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: -1 },
                ];
                var valid = [];
                for (var i = 0; i < dirs.length; i++) {
                    if (this._podeAndarGhost(ghost.x, ghost.y, dirs[i])) {
                        // Evitar voltar
                        if (dirs[i].x !== -ghost.dir.x || dirs[i].y !== -ghost.dir.y) {
                            valid.push(dirs[i]);
                        }
                    }
                }
                if (valid.length > 0) {
                    // Fantasmas perseguem ou fogem do Pac-Man
                    var pac = this.pacman;
                    if (ghost.scared) {
                        // Fugir
                        valid.sort(function (a, b) {
                            var dxA = pac.x - (ghost.x + a.x * cell);
                            var dyA = pac.y - (ghost.y + a.y * cell);
                            var dxB = pac.x - (ghost.x + b.x * cell);
                            var dyB = pac.y - (ghost.y + b.y * cell);
                            return (dxB * dxB + dyB * dyB) - (dxA * dxA + dyA * dyA);
                        });
                    } else {
                        // Perseguir (com aleatoriedade)
                        if (Math.random() < 0.6) {
                            valid.sort(function (a, b) {
                                var dxA = pac.x - (ghost.x + a.x * cell);
                                var dyA = pac.y - (ghost.y + a.y * cell);
                                var dxB = pac.x - (ghost.x + b.x * cell);
                                var dyB = pac.y - (ghost.y + b.y * cell);
                                return (dxA * dxA + dyA * dyA) - (dxB * dxB + dyB * dyB);
                            });
                        }
                    }
                    ghost.dir = valid[0];
                } else {
                    // Fallback: se nenhuma direcao valida, permitir reverso
                    var reverseDir = { x: -ghost.dir.x, y: -ghost.dir.y };
                    if (this._podeAndarGhost(ghost.x, ghost.y, reverseDir)) {
                        ghost.dir = reverseDir;
                    }
                }
            }

            // Mover
            if (this._podeAndarGhost(ghost.x, ghost.y, ghost.dir)) {
                ghost.x += ghost.dir.x * speed;
                ghost.y += ghost.dir.y * speed;
            }

            // Tunel
            var mapaW = this.mapa[0].length * cell;
            if (ghost.x < 0) ghost.x = mapaW - 1;
            if (ghost.x >= mapaW) ghost.x = 0;
        },

        _podeAndarGhost: function (x, y, dir) {
            var speed = CONF.GHOST_SPEED;
            var nx = x + dir.x * speed;
            var ny = y + dir.y * speed;
            var cell = CONF.CELL;
            var margin = cell / 2 - 3;

            var corners = [
                { x: nx - margin, y: ny - margin },
                { x: nx + margin, y: ny - margin },
                { x: nx - margin, y: ny + margin },
                { x: nx + margin, y: ny + margin },
            ];

            for (var i = 0; i < corners.length; i++) {
                var gx = Math.floor(corners[i].x / cell);
                var gy = Math.floor(corners[i].y / cell);
                if (gy < 0 || gy >= this.mapa.length) return false;
                if (gx < 0 || gx >= this.mapa[0].length) continue;
                if (this.mapa[gy][gx] === 1) return false;
            }
            return true;
        },

        _resetMapa: function () {
            var self = this;

            // Proxima fase
            this.fase++;

            // Vitoria final?
            if (this.fase > this.maxFases) {
                this._mostrarVitoria();
                return;
            }

            // Som de fase completa
            this.som.faseCompleta();

            // Atualizar display de fase
            if (this.faseDiv) {
                this.faseDiv.textContent = 'Fase ' + this.fase + '/' + this.maxFases;
            }

            // Recarregar mapa
            this.pelletCount = 0;
            for (var y = 0; y < MAPA_BASE.length; y++) {
                for (var x = 0; x < MAPA_BASE[y].length; x++) {
                    this.mapa[y][x] = MAPA_BASE[y][x];
                    if (MAPA_BASE[y][x] === 2 || MAPA_BASE[y][x] === 3) {
                        this.pelletCount++;
                    }
                }
            }

            // Resetar posicoes
            var cell = CONF.CELL;
            this.pacman.x = 9 * cell + cell / 2;
            this.pacman.y = 15 * cell + cell / 2;
            this.pacman.dir = { x: 0, y: 0 };

            var ghostPositions = [
                { x: 9, y: 9 },
                { x: 8, y: 9 },
                { x: 10, y: 9 },
                { x: 9, y: 8 },
            ];
            for (var i = 0; i < this.ghosts.length; i++) {
                var gx = ghostPositions[i].x;
                this.ghosts[i].x = gx * cell + cell / 2;
                this.ghosts[i].y = ghostPositions[i].y * cell + cell / 2;
                this.ghosts[i].scared = false;
                // Direcao inicial em direcao a saida (x=9)
                if (gx < 9) {
                    this.ghosts[i].dir = { x: 1, y: 0 };
                } else if (gx > 9) {
                    this.ghosts[i].dir = { x: -1, y: 0 };
                } else {
                    this.ghosts[i].dir = { x: 0, y: -1 };
                }
            }
        },

        _mostrarVitoria: function () {
            var self = this;

            // Pausar jogo
            if (this.animFrame) {
                cancelAnimationFrame(this.animFrame);
                this.animFrame = null;
            }

            // Tocar som de vitoria
            this.som.vitoria();

            // Criar tela de vitoria
            var vitoriaDiv = document.createElement('div');
            vitoriaDiv.id = 'pacman-vitoria';
            vitoriaDiv.style.cssText = [
                'position:absolute',
                'inset:0',
                'background:rgba(0,0,0,0.9)',
                'display:flex',
                'flex-direction:column',
                'align-items:center',
                'justify-content:center',
                'gap:24px',
                'z-index:100',
            ].join(';');

            var titulo = document.createElement('div');
            titulo.style.cssText = [
                'font-family:Russo One,sans-serif',
                'font-size:2rem',
                'color:#ffff00',
                'text-align:center',
                'text-shadow:0 0 20px #ffff00',
                'animation:pulse 1s infinite',
            ].join(';');
            titulo.innerHTML = 'Parabens<br>Jose Afonso!';

            var subtitulo = document.createElement('div');
            subtitulo.style.cssText = [
                'font-family:Inter,sans-serif',
                'font-size:1.2rem',
                'color:#fff',
                'text-align:center',
            ].join(';');
            subtitulo.textContent = 'Voce conseguiu! Score: ' + this.score;

            var botoes = document.createElement('div');
            botoes.style.cssText = 'display:flex;gap:16px;margin-top:20px;';

            var btnJogar = document.createElement('button');
            btnJogar.style.cssText = [
                'background:linear-gradient(180deg,#22c55e,#16a34a)',
                'color:#fff',
                'border:none',
                'padding:16px 32px',
                'border-radius:12px',
                'font-family:Russo One,sans-serif',
                'font-size:1rem',
                'cursor:pointer',
                'box-shadow:0 4px 0 #166534',
            ].join(';');
            btnJogar.textContent = 'Jogar de Novo';
            btnJogar.addEventListener('click', function () {
                vitoriaDiv.remove();
                self._reiniciarJogo();
            });

            var btnOutro = document.createElement('button');
            btnOutro.style.cssText = [
                'background:linear-gradient(180deg,#3b82f6,#2563eb)',
                'color:#fff',
                'border:none',
                'padding:16px 32px',
                'border-radius:12px',
                'font-family:Russo One,sans-serif',
                'font-size:1rem',
                'cursor:pointer',
                'box-shadow:0 4px 0 #1d4ed8',
            ].join(';');
            btnOutro.textContent = 'Outro Jogo';
            btnOutro.addEventListener('click', function () {
                window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
            });

            botoes.appendChild(btnJogar);
            botoes.appendChild(btnOutro);
            vitoriaDiv.appendChild(titulo);
            vitoriaDiv.appendChild(subtitulo);
            vitoriaDiv.appendChild(botoes);

            var overlay = document.getElementById('pacman-overlay');
            if (overlay) overlay.appendChild(vitoriaDiv);
            this.vitoriaDiv = vitoriaDiv;
        },

        _atualizarVidas: function () {
            if (!this.vidasDiv) return;
            // Exibir Pac-Mans como icones de vida
            var html = '';
            for (var i = 0; i < this.vidas; i++) {
                html += '<span style="font-size:1.5rem;">&#9679;</span>'; // circulo amarelo
            }
            this.vidasDiv.innerHTML = html;
        },

        _mostrarGameOver: function () {
            var self = this;

            // Pausar jogo
            if (this.animFrame) {
                cancelAnimationFrame(this.animFrame);
                this.animFrame = null;
            }

            // Criar tela de game over
            var gameOverDiv = document.createElement('div');
            gameOverDiv.id = 'pacman-gameover';
            gameOverDiv.style.cssText = [
                'position:absolute',
                'inset:0',
                'background:rgba(0,0,0,0.9)',
                'display:flex',
                'flex-direction:column',
                'align-items:center',
                'justify-content:center',
                'gap:24px',
                'z-index:100',
            ].join(';');

            var titulo = document.createElement('div');
            titulo.style.cssText = [
                'font-family:Russo One,sans-serif',
                'font-size:2rem',
                'color:#ff4444',
                'text-align:center',
                'text-shadow:0 0 20px #ff4444',
            ].join(';');
            titulo.textContent = 'Fim de Jogo!';

            var subtitulo = document.createElement('div');
            subtitulo.style.cssText = [
                'font-family:Inter,sans-serif',
                'font-size:1.2rem',
                'color:#fff',
                'text-align:center',
            ].join(';');
            subtitulo.textContent = 'Pontos: ' + this.score + ' | Fase: ' + this.fase + '/' + this.maxFases;

            var botoes = document.createElement('div');
            botoes.style.cssText = 'display:flex;gap:16px;margin-top:20px;';

            var btnJogar = document.createElement('button');
            btnJogar.style.cssText = [
                'background:linear-gradient(180deg,#22c55e,#16a34a)',
                'color:#fff',
                'border:none',
                'padding:16px 32px',
                'border-radius:12px',
                'font-family:Russo One,sans-serif',
                'font-size:1rem',
                'cursor:pointer',
                'box-shadow:0 4px 0 #166534',
            ].join(';');
            btnJogar.textContent = 'Tentar de Novo';
            btnJogar.addEventListener('click', function () {
                gameOverDiv.remove();
                self._reiniciarJogo();
            });

            var btnOutro = document.createElement('button');
            btnOutro.style.cssText = [
                'background:linear-gradient(180deg,#3b82f6,#2563eb)',
                'color:#fff',
                'border:none',
                'padding:16px 32px',
                'border-radius:12px',
                'font-family:Russo One,sans-serif',
                'font-size:1rem',
                'cursor:pointer',
                'box-shadow:0 4px 0 #1d4ed8',
            ].join(';');
            btnOutro.textContent = 'Outro Jogo';
            btnOutro.addEventListener('click', function () {
                window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar();
            });

            botoes.appendChild(btnJogar);
            botoes.appendChild(btnOutro);
            gameOverDiv.appendChild(titulo);
            gameOverDiv.appendChild(subtitulo);
            gameOverDiv.appendChild(botoes);

            var overlay = document.getElementById('pacman-overlay');
            if (overlay) overlay.appendChild(gameOverDiv);
            this.gameOverDiv = gameOverDiv;
        },

        _reiniciarJogo: function () {
            var self = this;
            var cell = CONF.CELL;

            // Resetar estado
            this.score = 0;
            this.vidas = this.maxVidas;
            this.fase = 1;
            this.powerMode = false;
            this._atualizarVidas();

            // Resetar mapa
            this.pelletCount = 0;
            for (var y = 0; y < MAPA_BASE.length; y++) {
                for (var x = 0; x < MAPA_BASE[y].length; x++) {
                    this.mapa[y][x] = MAPA_BASE[y][x];
                    if (MAPA_BASE[y][x] === 2 || MAPA_BASE[y][x] === 3) {
                        this.pelletCount++;
                    }
                }
            }

            // Resetar Pac-Man
            this.pacman.x = 9 * cell + cell / 2;
            this.pacman.y = 15 * cell + cell / 2;
            this.pacman.dir = { x: 0, y: 0 };

            // Resetar fantasmas
            var ghostPositions = [
                { x: 9, y: 9 },
                { x: 8, y: 9 },
                { x: 10, y: 9 },
                { x: 9, y: 8 },
            ];
            for (var i = 0; i < this.ghosts.length; i++) {
                var gx = ghostPositions[i].x;
                this.ghosts[i].x = gx * cell + cell / 2;
                this.ghosts[i].y = ghostPositions[i].y * cell + cell / 2;
                this.ghosts[i].scared = false;
                // Direcao inicial em direcao a saida (x=9)
                if (gx < 9) {
                    this.ghosts[i].dir = { x: 1, y: 0 };
                } else if (gx > 9) {
                    this.ghosts[i].dir = { x: -1, y: 0 };
                } else {
                    this.ghosts[i].dir = { x: 0, y: -1 };
                }
            }

            // Atualizar displays
            if (this.scoreDiv) this.scoreDiv.textContent = '0';
            if (this.faseDiv) this.faseDiv.textContent = 'Fase 1/3';

            // Reiniciar loop
            var loop = function () {
                if (!self.ctx) return;
                self._atualizar();
                self._renderizar();
                self.animFrame = requestAnimationFrame(loop);
            };
            loop();
        },

        _renderizar: function () {
            var ctx = this.ctx;
            var W = this.canvas.width;
            var H = this.canvas.height;
            var cell = CONF.CELL;
            var ox = this.offsetX;
            var oy = this.offsetY;

            // Fundo
            ctx.fillStyle = CONF.BG;
            ctx.fillRect(0, 0, W, H);

            // Desenhar mapa
            for (var y = 0; y < this.mapa.length; y++) {
                for (var x = 0; x < this.mapa[y].length; x++) {
                    var tile = this.mapa[y][x];
                    var px = ox + x * cell;
                    var py = oy + y * cell;

                    if (tile === 1) {
                        // Parede
                        ctx.fillStyle = CONF.WALL;
                        ctx.shadowColor = CONF.WALL_GLOW;
                        ctx.shadowBlur = 4;
                        ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
                        ctx.shadowBlur = 0;
                    } else if (tile === 2) {
                        // Pellet
                        ctx.fillStyle = CONF.PELLET;
                        ctx.beginPath();
                        ctx.arc(px + cell / 2, py + cell / 2, 3, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (tile === 3) {
                        // Frutas (pisca suavemente)
                        var pulse = 0.8 + 0.2 * Math.sin(Date.now() / 150);
                        var fx = px + cell / 2;
                        var fy = py + cell / 2;
                        var frutaIdx = (x + y) % 4;
                        ctx.save();
                        ctx.translate(fx, fy);
                        ctx.scale(pulse, pulse);

                        if (frutaIdx === 0) {
                            // Cereja
                            ctx.fillStyle = '#ff0040';
                            ctx.beginPath();
                            ctx.arc(-3, 2, 5, 0, Math.PI * 2);
                            ctx.arc(3, 2, 5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = '#2a5f2a';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(-3, -2);
                            ctx.quadraticCurveTo(0, -8, 3, -2);
                            ctx.stroke();
                        } else if (frutaIdx === 1) {
                            // Morango
                            ctx.fillStyle = '#ff2255';
                            ctx.beginPath();
                            ctx.moveTo(0, -6);
                            ctx.bezierCurveTo(-7, -2, -6, 6, 0, 8);
                            ctx.bezierCurveTo(6, 6, 7, -2, 0, -6);
                            ctx.fill();
                            ctx.fillStyle = '#228822';
                            ctx.beginPath();
                            ctx.ellipse(0, -6, 4, 2, 0, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (frutaIdx === 2) {
                            // Laranja
                            ctx.fillStyle = '#ff8800';
                            ctx.beginPath();
                            ctx.arc(0, 1, 7, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = '#228822';
                            ctx.fillRect(-1, -7, 2, 3);
                        } else {
                            // Maca
                            ctx.fillStyle = '#ff3333';
                            ctx.beginPath();
                            ctx.arc(-2, 1, 5, 0, Math.PI * 2);
                            ctx.arc(2, 1, 5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = '#5b3c11';
                            ctx.fillRect(-1, -7, 2, 4);
                            ctx.fillStyle = '#228822';
                            ctx.beginPath();
                            ctx.ellipse(3, -5, 3, 2, 0.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }
            }

            // Desenhar fantasmas
            for (var i = 0; i < this.ghosts.length; i++) {
                var g = this.ghosts[i];
                var gx = ox + g.x;
                var gy = oy + g.y;
                var color = g.scared ? CONF.GHOST_SCARED : g.color;

                // Corpo
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(gx, gy - 2, cell / 2 - 2, Math.PI, 0);
                ctx.lineTo(gx + cell / 2 - 2, gy + cell / 2 - 4);
                // Ondulacoes
                for (var w = 0; w < 3; w++) {
                    var wx = gx + cell / 2 - 2 - (w + 1) * (cell - 4) / 3;
                    ctx.quadraticCurveTo(wx + (cell - 4) / 6, gy + cell / 2 - 8, wx, gy + cell / 2 - 4);
                }
                ctx.closePath();
                ctx.fill();

                // Olhos
                if (!g.scared) {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(gx - 4, gy - 4, 4, 0, Math.PI * 2);
                    ctx.arc(gx + 4, gy - 4, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#00f';
                    ctx.beginPath();
                    ctx.arc(gx - 4 + g.dir.x * 2, gy - 4 + g.dir.y * 2, 2, 0, Math.PI * 2);
                    ctx.arc(gx + 4 + g.dir.x * 2, gy - 4 + g.dir.y * 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Olhos assustados
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(gx - 4, gy - 3, 2, 0, Math.PI * 2);
                    ctx.arc(gx + 4, gy - 3, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Desenhar Pac-Man
            var pac = this.pacman;
            var px = ox + pac.x;
            var py = oy + pac.y;
            var angle = Math.atan2(pac.dir.y, pac.dir.x);
            if (pac.dir.x === 0 && pac.dir.y === 0) angle = 0;

            ctx.fillStyle = CONF.PACMAN;
            ctx.shadowColor = CONF.PACMAN;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, cell / 2 - 2,
                angle + pac.mouthAngle + 0.1,
                angle - pac.mouthAngle - 0.1 + Math.PI * 2);
            ctx.lineTo(px, py);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        },
    };

    // Exposicao global
    window.PacmanGame = PacmanGame;

})();

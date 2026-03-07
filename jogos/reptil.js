// =====================================================================
// reptil.js — Jogo Reptil Standalone v1.2
// =====================================================================
// Inspirado em Reptile Interactive Cursor (MIT License)
// Reescrito com: IIFE, IK esqueletica, visual rico, touch, cleanup
// Lagarto procedural com pernas que caminham via inverse kinematics
// =====================================================================

(function () {
    'use strict';

    // ---- Configuracao ----
    var CONF = {
        BG: '#050a14',
        GRID: '#0a1628',
        STROKE: '#00ff88',
        STROKE_DIM: 'rgba(0,255,136,0.35)',
        GLOW: 'rgba(0,255,136,0.5)',
        EYE: '#0f172a',
        EYE_GLOW: '#00ff88',
        HEAD_R: 4,
        LINE_W: 2.2,
    };

    // ---- Classes de IK ----

    // Segmento esqueletico com hierarquia pai-filho
    function Segment(parent, size, angle, range, stiffness) {
        this.parent = parent;
        if (parent.children) parent.children.push(this);
        this.children = [];
        this.size = size;
        this.relAngle = angle;
        this.defAngle = angle;
        this.absAngle = parent.absAngle + angle;
        this.range = range;
        this.stiffness = stiffness;
        this.x = 0;
        this.y = 0;
        this.updateRelative(false, true);
    }

    Segment.prototype.updateRelative = function (iter, flex) {
        // Normalizar angulo relativo
        this.relAngle = this.relAngle -
            2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / (2 * Math.PI) + 0.5);

        if (flex) {
            this.relAngle = Math.min(
                this.defAngle + this.range / 2,
                Math.max(
                    this.defAngle - this.range / 2,
                    (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
                )
            );
        }

        this.absAngle = this.parent.absAngle + this.relAngle;
        this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
        this.y = this.parent.y + Math.sin(this.absAngle) * this.size;

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].updateRelative(iter, flex);
            }
        }
    };

    Segment.prototype.draw = function (ctx, iter) {
        ctx.beginPath();
        ctx.moveTo(this.parent.x, this.parent.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(ctx, true);
            }
        }
    };

    Segment.prototype.follow = function (iter) {
        var x = this.parent.x;
        var y = this.parent.y;
        var dist = Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y));
        if (dist > 0) {
            this.x = x + this.size * (this.x - x) / dist;
            this.y = y + this.size * (this.y - y) / dist;
        }
        this.absAngle = Math.atan2(this.y - y, this.x - x);
        this.relAngle = this.absAngle - this.parent.absAngle;
        this.updateRelative(false, true);

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].follow(true);
            }
        }
    };

    // Sistema de membros (IK chain)
    function LimbSystem(end, length, speed, creature) {
        this.end = end;
        this.length = Math.max(1, length);
        this.creature = creature;
        this.speed = speed;
        creature.systems.push(this);
        this.nodes = [];
        var node = end;
        for (var i = 0; i < length; i++) {
            this.nodes.unshift(node);
            node = node.parent;
            if (!node.children) {
                this.length = i + 1;
                break;
            }
        }
        this.hip = this.nodes[0].parent;
    }

    LimbSystem.prototype.moveTo = function (x, y) {
        this.nodes[0].updateRelative(true, true);
        var dist = Math.sqrt((x - this.end.x) * (x - this.end.x) + (y - this.end.y) * (y - this.end.y));
        var len = Math.max(0, dist - this.speed);

        for (var i = this.nodes.length - 1; i >= 0; i--) {
            var node = this.nodes[i];
            var ang = Math.atan2(node.y - y, node.x - x);
            node.x = x + len * Math.cos(ang);
            node.y = y + len * Math.sin(ang);
            x = node.x;
            y = node.y;
            len = node.size;
        }

        for (var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
            node.relAngle = node.absAngle - node.parent.absAngle;
            for (var ii = 0; ii < node.children.length; ii++) {
                var child = node.children[ii];
                if (this.nodes.indexOf(child) === -1) {
                    child.updateRelative(true, false);
                }
            }
        }
    };

    // Sistema de pernas com auto-stepping
    function LegSystem(end, length, speed, creature) {
        LimbSystem.call(this, end, length, speed, creature);
        this.goalX = end.x;
        this.goalY = end.y;
        this.step = 0;
        this.forwardness = 0;

        this.reach = 0.9 * Math.sqrt(
            (this.end.x - this.hip.x) * (this.end.x - this.hip.x) +
            (this.end.y - this.hip.y) * (this.end.y - this.hip.y)
        );

        var relAngle = this.creature.absAngle -
            Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
        relAngle -= 2 * Math.PI * Math.floor(relAngle / (2 * Math.PI) + 0.5);
        this.swing = -relAngle + (2 * (relAngle < 0 ? 1 : 0) - 1) * Math.PI / 2;
        this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }

    LegSystem.prototype = Object.create(LimbSystem.prototype);
    LegSystem.prototype.constructor = LegSystem;

    LegSystem.prototype.update = function () {
        this.moveTo(this.goalX, this.goalY);

        if (this.step === 0) {
            var dist = Math.sqrt(
                (this.end.x - this.goalX) * (this.end.x - this.goalX) +
                (this.end.y - this.goalY) * (this.end.y - this.goalY)
            );
            if (dist > 1) {
                this.step = 1;
                this.goalX = this.hip.x +
                    this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
                this.goalY = this.hip.y +
                    this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) +
                    (2 * Math.random() - 1) * this.reach / 2;
            }
        } else if (this.step === 1) {
            var theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
            var d = Math.sqrt(
                (this.end.x - this.hip.x) * (this.end.x - this.hip.x) +
                (this.end.y - this.hip.y) * (this.end.y - this.hip.y)
            );
            var f2 = d * Math.cos(theta);
            var dF = this.forwardness - f2;
            this.forwardness = f2;
            if (dF * dF < 1) {
                this.step = 0;
                this.goalX = this.hip.x + (this.end.x - this.hip.x);
                this.goalY = this.hip.y + (this.end.y - this.hip.y);
            }
        }
    };

    // Criatura principal com fisica
    function Creature(x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh) {
        this.x = x;
        this.y = y;
        this.absAngle = angle;
        this.fSpeed = 0;
        this.fAccel = fAccel;
        this.fFric = fFric;
        this.fRes = fRes;
        this.fThresh = fThresh;
        this.rSpeed = 0;
        this.rAccel = rAccel;
        this.rFric = rFric;
        this.rRes = rRes;
        this.rThresh = rThresh;
        this.children = [];
        this.systems = [];
        this.speed = 0;
    }

    Creature.prototype.follow = function (x, y) {
        var dist = Math.sqrt((this.x - x) * (this.x - x) + (this.y - y) * (this.y - y));
        var angle = Math.atan2(y - this.y, x - this.x);

        // Aceleracao proporcional a pernas paradas
        var accel = this.fAccel;
        if (this.systems.length > 0) {
            var sum = 0;
            for (var i = 0; i < this.systems.length; i++) {
                sum += (this.systems[i].step === 0 ? 1 : 0);
            }
            accel *= sum / this.systems.length;
        }

        this.fSpeed += accel * (dist > this.fThresh ? 1 : 0);
        this.fSpeed *= 1 - this.fRes;
        this.speed = Math.max(0, this.fSpeed - this.fFric);

        // Rotacao
        var dif = this.absAngle - angle;
        dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 0.5);
        if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
            this.rSpeed -= this.rAccel * (dif > 0 ? 1 : -1);
        }
        this.rSpeed *= 1 - this.rRes;
        if (Math.abs(this.rSpeed) > this.rFric) {
            this.rSpeed -= this.rFric * (this.rSpeed > 0 ? 1 : -1);
        } else {
            this.rSpeed = 0;
        }

        // Atualizar posicao
        this.absAngle += this.rSpeed;
        this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 0.5);
        this.x += this.speed * Math.cos(this.absAngle);
        this.y += this.speed * Math.sin(this.absAngle);

        // Segmentos seguem (angulo invertido para cauda)
        this.absAngle += Math.PI;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].follow(true);
        }
        for (var i = 0; i < this.systems.length; i++) {
            this.systems[i].update();
        }
        this.absAngle -= Math.PI;
    };

    Creature.prototype.draw = function (ctx, iter) {
        // Cabeca: triangulo direcional
        var r = CONF.HEAD_R;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r,
            Math.PI / 4 + this.absAngle,
            7 * Math.PI / 4 + this.absAngle);
        ctx.moveTo(
            this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle),
            this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle));
        ctx.lineTo(
            this.x + r * Math.cos(this.absAngle) * Math.SQRT2,
            this.y + r * Math.sin(this.absAngle) * Math.SQRT2);
        ctx.lineTo(
            this.x + r * Math.cos(Math.PI / 4 + this.absAngle),
            this.y + r * Math.sin(Math.PI / 4 + this.absAngle));
        ctx.stroke();

        // Olhos
        for (var side = -1; side <= 1; side += 2) {
            var eyeAngle = this.absAngle + side * 0.6;
            var ex = this.x + r * 0.7 * Math.cos(eyeAngle);
            var ey = this.y + r * 0.7 * Math.sin(eyeAngle);
            ctx.beginPath();
            ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = CONF.EYE_GLOW;
            ctx.fill();
        }

        if (iter) {
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].draw(ctx, true);
            }
        }
    };

    // ---- Montar lagarto procedural ----

    function buildLizard(cx, cy, sizeScale, legCount, tailLen) {
        var s = sizeScale;
        var critter = new Creature(cx, cy, 0,
            s * 8, s * 1.5, 0.3, 12, 0.4, 0.06, 0.4, 0.2);

        var spinal = critter;

        // Pescoco (4 segmentos com costelas - mais rigido)
        for (var i = 0; i < 4; i++) {
            spinal = new Segment(spinal, s * 4, 0, Math.PI / 4, 2.5);
            for (var side = -1; side <= 1; side += 2) {
                var node = new Segment(spinal, s * 3, side, 0.1, 2);
                for (var k = 0; k < 3; k++) {
                    node = new Segment(node, s * 0.1, -side * 0.1, 0.1, 2);
                }
            }
        }

        // Torso + pernas
        for (var i = 0; i < legCount; i++) {
            if (i > 0) {
                // Vertebras entre pernas (menos e mais rigidas)
                for (var ii = 0; ii < 4; ii++) {
                    spinal = new Segment(spinal, s * 4, 0, Math.PI / 4, 2.5);
                    for (var side = -1; side <= 1; side += 2) {
                        var node = new Segment(spinal, s * 3, side * Math.PI / 2, 0.1, 1.5);
                        for (var k = 0; k < 3; k++) {
                            node = new Segment(node, s * 3, -side * 0.3, 0.1, 2);
                        }
                    }
                }
            }

            // Pernas (ombro/quadril + humero + antebraco + dedos)
            for (var side = -1; side <= 1; side += 2) {
                var hip = new Segment(spinal, s * 12, side * 0.785, 0, 8);
                var humerus = new Segment(hip, s * 16, -side * 0.785, Math.PI * 2, 1);
                var forearm = new Segment(humerus, s * 16, side * Math.PI / 2, Math.PI, 2);

                // Dedos
                for (var f = 0; f < 4; f++) {
                    new Segment(forearm, s * 4, (f / 3 - 0.5) * Math.PI / 2, 0.1, 4);
                }

                new LegSystem(forearm, 3, s * 12, critter);
            }
        }

        // Cauda (flexivel e elegante, movimento suave)
        for (var i = 0; i < tailLen; i++) {
            // Rigidez aumenta gradualmente na ponta para evitar chicotear
            var tailStiff = 1.3 + (i / tailLen) * 0.5;
            spinal = new Segment(spinal, s * 3.5, 0, Math.PI / 2.5, tailStiff);
            for (var side = -1; side <= 1; side += 2) {
                var node = new Segment(spinal, s * 3, side, 0.1, 2);
                for (var k = 0; k < 3; k++) {
                    node = new Segment(node, s * 3 * (tailLen - i) / tailLen, -side * 0.1, 0.1, 2);
                }
            }
        }

        return critter;
    }

    // ---- Sistema de Som ----

    function SomReptil() {
        this.audioCtx = null;
        this.lastSoundTime = 0;
        this.soundInterval = 80; // ms entre sons
    }

    SomReptil.prototype.init = function () {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.audioCtx = null;
        }
    };

    SomReptil.prototype.tocarRastejo = function (velocidade) {
        if (!this.audioCtx || velocidade < 0.5) return;

        var now = Date.now();
        if (now - this.lastSoundTime < this.soundInterval) return;
        this.lastSoundTime = now;

        var ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        // Som de arrasto/escamas - ruido filtrado
        var duration = 0.04 + Math.random() * 0.03;
        var bufferSize = Math.floor(ctx.sampleRate * duration);
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);

        // Ruido rosa (mais grave, como escamas arrastando)
        var b0 = 0, b1 = 0, b2 = 0;
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + white * 0.0990460;
            b1 = 0.96300 * b1 + white * 0.2965164;
            b2 = 0.57000 * b2 + white * 1.0526913;
            data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.08;
        }

        var source = ctx.createBufferSource();
        source.buffer = buffer;

        // Filtro passa-baixa para som mais suave
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800 + velocidade * 200;
        filter.Q.value = 1;

        // Volume baseado na velocidade
        var gain = ctx.createGain();
        var vol = Math.min(0.15, velocidade * 0.03);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        source.stop(ctx.currentTime + duration);
    };

    SomReptil.prototype.fechar = function () {
        if (this.audioCtx) {
            this.audioCtx.close().catch(function () {});
            this.audioCtx = null;
        }
    };

    // ---- Game Object ----

    var ReptilGame = {
        critter: null,
        animFrame: null,
        canvas: null,
        ctx: null,
        mouseX: 0,
        mouseY: 0,
        som: null,
        _onKey: null,
        _onResize: null,

        abrir: function () {
            var self = this;
            var W = window.innerWidth;
            var H = window.innerHeight;

            self.mouseX = W / 2;
            self.mouseY = H / 2;

            // Gerar lagarto aleatorio (tamanho moderado, cauda longa e bonita)
            var legCount = 2 + Math.floor(Math.random() * 2); // 2-3 pares
            var sizeScale = 4 / Math.sqrt(legCount);
            var tailLen = 10 + Math.floor(Math.random() * 6); // cauda longa e elegante
            self.critter = buildLizard(W / 2, H / 2, sizeScale, legCount, tailLen);

            // Inicializar som
            self.som = new SomReptil();
            self.som.init();

            // Overlay
            var overlay = document.createElement('div');
            overlay.id = 'reptil-overlay';
            overlay.style.cssText = [
                'position:fixed',
                'inset:0',
                'background:' + CONF.BG,
                'z-index:9999',
                'overflow:hidden',
                'cursor:none',
            ].join(';');

            // Canvas
            var canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            canvas.style.cssText = 'display:block;';
            self.canvas = canvas;
            self.ctx = canvas.getContext('2d');

            // Botao fechar
            var closeBtn = document.createElement('button');
            closeBtn.style.cssText = [
                'position:absolute',
                'top:20px',
                'right:20px',
                'background:#0f172a',
                'border:1px solid #1e3a5f',
                'color:#475569',
                'border-radius:50%',
                'width:44px',
                'height:44px',
                'cursor:pointer',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'z-index:10',
                'transition:all 0.2s',
            ].join(';');
            closeBtn.innerHTML = '<span class="material-icons" style="font-size:20px;">close</span>';
            closeBtn.addEventListener('mouseenter', function () {
                closeBtn.style.background = '#1e293b';
                closeBtn.style.color = '#94a3b8';
                closeBtn.style.borderColor = '#334155';
            });
            closeBtn.addEventListener('mouseleave', function () {
                closeBtn.style.background = '#0f172a';
                closeBtn.style.color = '#475569';
                closeBtn.style.borderColor = '#1e3a5f';
            });
            closeBtn.addEventListener('click', function () { window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar(); });

            // Label instrucao
            var label = document.createElement('div');
            label.style.cssText = [
                'position:absolute',
                'bottom:28px',
                'left:50%',
                'transform:translateX(-50%)',
                'font-family:Inter,-apple-system,sans-serif',
                'font-size:0.75rem',
                'color:#1e3a5f',
                'white-space:nowrap',
                'pointer-events:none',
                'transition:opacity 1.5s',
                'user-select:none',
            ].join(';');
            label.textContent = 'Mova para guiar o reptil  |  ESC para sair';

            overlay.appendChild(canvas);
            overlay.appendChild(closeBtn);
            overlay.appendChild(label);
            document.body.appendChild(overlay);

            // Fade instrucao
            setTimeout(function () { label.style.opacity = '0'; }, 3500);

            // Mouse tracking
            overlay.addEventListener('mousemove', function (e) {
                self.mouseX = e.clientX;
                self.mouseY = e.clientY;
            });

            // Touch tracking
            overlay.addEventListener('touchmove', function (e) {
                e.preventDefault();
                self.mouseX = e.touches[0].clientX;
                self.mouseY = e.touches[0].clientY;
            }, { passive: false });

            overlay.addEventListener('touchstart', function (e) {
                self.mouseX = e.touches[0].clientX;
                self.mouseY = e.touches[0].clientY;
            }, { passive: false });

            // ESC fecha
            self._onKey = function (e) {
                if (e.key === 'Escape') (window.fecharJoguinhos ? window.fecharJoguinhos() : self.fechar());
            };
            document.addEventListener('keydown', self._onKey);

            // Resize
            self._onResize = function () {
                if (self.canvas) {
                    self.canvas.width = window.innerWidth;
                    self.canvas.height = window.innerHeight;
                }
            };
            window.addEventListener('resize', self._onResize);

            // Game loop
            function loop() {
                if (!self.ctx) return;
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
            if (this.som) {
                this.som.fechar();
                this.som = null;
            }
            var overlay = document.getElementById('reptil-overlay');
            if (overlay) overlay.remove();
            this.ctx = null;
            this.canvas = null;
            this.critter = null;
        },

        _renderizar: function () {
            var ctx = this.ctx;
            var W = this.canvas.width;
            var H = this.canvas.height;

            // Fundo
            ctx.fillStyle = CONF.BG;
            ctx.fillRect(0, 0, W, H);

            // Grade decorativa
            ctx.fillStyle = CONF.GRID;
            for (var x = 21; x < W; x += 42) {
                for (var y = 21; y < H; y += 42) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Atualizar fisica
            this.critter.follow(this.mouseX, this.mouseY);

            // Som de rastejamento baseado na velocidade
            if (this.som && this.critter.speed > 0) {
                this.som.tocarRastejo(this.critter.speed);
            }

            // Desenhar criatura
            ctx.strokeStyle = CONF.STROKE;
            ctx.lineWidth = CONF.LINE_W;
            ctx.lineCap = 'round';

            // Glow sutil
            ctx.shadowColor = CONF.GLOW;
            ctx.shadowBlur = 6;

            this.critter.draw(ctx, true);

            ctx.shadowBlur = 0;
        },
    };

    // Exposicao global
    window.ReptilGame = ReptilGame;

})();

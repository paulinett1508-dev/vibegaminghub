// Jogo Aranha — Verlet physics spider on web
// Portado de realistic-spider-tcw.zip (VerletJS, MIT-compatible)
// Adaptado para dark theme, touch, IIFE pattern

(function () {
    'use strict';

    // =========================================================
    // VEC2
    // =========================================================

    function Vec2(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    Vec2.prototype.add = function (v) { return new Vec2(this.x + v.x, this.y + v.y); };
    Vec2.prototype.sub = function (v) { return new Vec2(this.x - v.x, this.y - v.y); };
    Vec2.prototype.scale = function (c) { return new Vec2(this.x * c, this.y * c); };
    Vec2.prototype.mutableSet = function (v) { this.x = v.x; this.y = v.y; return this; };
    Vec2.prototype.mutableAdd = function (v) { this.x += v.x; this.y += v.y; return this; };
    Vec2.prototype.mutableSub = function (v) { this.x -= v.x; this.y -= v.y; return this; };
    Vec2.prototype.mutableScale = function (c) { this.x *= c; this.y *= c; return this; };
    Vec2.prototype.length = function () { return Math.sqrt(this.x * this.x + this.y * this.y); };
    Vec2.prototype.length2 = function () { return this.x * this.x + this.y * this.y; };
    Vec2.prototype.dist2 = function (v) { var x = v.x - this.x, y = v.y - this.y; return x * x + y * y; };
    Vec2.prototype.normal = function () {
        var m = Math.sqrt(this.x * this.x + this.y * this.y);
        return new Vec2(this.x / m, this.y / m);
    };
    Vec2.prototype.dot = function (v) { return this.x * v.x + this.y * v.y; };
    Vec2.prototype.angle = function (v) {
        return Math.atan2(this.x * v.y - this.y * v.x, this.x * v.x + this.y * v.y);
    };
    Vec2.prototype.angle2 = function (vL, vR) { return vL.sub(this).angle(vR.sub(this)); };
    Vec2.prototype.rotate = function (o, theta) {
        var x = this.x - o.x, y = this.y - o.y;
        return new Vec2(x * Math.cos(theta) - y * Math.sin(theta) + o.x,
                        x * Math.sin(theta) + y * Math.cos(theta) + o.y);
    };

    // =========================================================
    // CONSTRAINTS
    // =========================================================

    function DistanceConstraint(a, b, stiffness, distance) {
        this.a = a;
        this.b = b;
        this.distance = (distance !== undefined) ? distance : a.pos.sub(b.pos).length();
        this.stiffness = stiffness;
    }
    DistanceConstraint.prototype.relax = function (stepCoef) {
        var normal = this.a.pos.sub(this.b.pos);
        var m = normal.length2();
        normal.mutableScale(((this.distance * this.distance - m) / m) * this.stiffness * stepCoef);
        this.a.pos.mutableAdd(normal);
        this.b.pos.mutableSub(normal);
    };

    function PinConstraint(a, pos) {
        this.a = a;
        this.pos = new Vec2().mutableSet(pos);
    }
    PinConstraint.prototype.relax = function () { this.a.pos.mutableSet(this.pos); };

    function AngleConstraint(a, b, c, stiffness) {
        this.a = a; this.b = b; this.c = c;
        this.angle = this.b.pos.angle2(this.a.pos, this.c.pos);
        this.stiffness = stiffness;
    }
    AngleConstraint.prototype.relax = function (stepCoef) {
        var angle = this.b.pos.angle2(this.a.pos, this.c.pos);
        var diff = angle - this.angle;
        if (diff <= -Math.PI) diff += 2 * Math.PI;
        else if (diff >= Math.PI) diff -= 2 * Math.PI;
        diff *= stepCoef * this.stiffness;
        this.a.pos = this.a.pos.rotate(this.b.pos, diff);
        this.c.pos = this.c.pos.rotate(this.b.pos, -diff);
        this.b.pos = this.b.pos.rotate(this.a.pos, diff);
        this.b.pos = this.b.pos.rotate(this.c.pos, -diff);
    };

    // =========================================================
    // VERLET CORE
    // =========================================================

    function Particle(pos) {
        this.pos = new Vec2().mutableSet(pos);
        this.lastPos = new Vec2().mutableSet(pos);
    }

    function Composite() {
        this.particles = [];
        this.constraints = [];
        this.drawParticles = null;
        this.drawConstraints = null;
    }
    Composite.prototype.pin = function (index, pos) {
        pos = pos || this.particles[index].pos;
        var pc = new PinConstraint(this.particles[index], pos);
        this.constraints.push(pc);
        return pc;
    };

    function VerletJS(width, height, canvas) {
        this.width = width;
        this.height = height;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mouse = new Vec2(0, 0);
        this.mouseDown = false;
        this.draggedEntity = null;
        this.selectionRadius = 26;
        this.composites = [];
        this.gravity = new Vec2(0, 0.2);
        this.friction = 0.99;
        this.groundFriction = 0.8;

        var _this = this;
        this.bounds = function (p) {
            if (p.pos.y > _this.height - 1) p.pos.y = _this.height - 1;
            if (p.pos.x < 0) p.pos.x = 0;
            if (p.pos.x > _this.width - 1) p.pos.x = _this.width - 1;
        };

        canvas.oncontextmenu = function (e) { e.preventDefault(); };
        canvas.onmousedown = function () {
            _this.mouseDown = true;
            var n = _this.nearestEntity();
            if (n) _this.draggedEntity = n;
        };
        canvas.onmouseup = function () { _this.mouseDown = false; _this.draggedEntity = null; };
        canvas.onmousemove = function (e) {
            var r = canvas.getBoundingClientRect();
            _this.mouse.x = e.clientX - r.left;
            _this.mouse.y = e.clientY - r.top;
        };
    }

    VerletJS.prototype.Composite = Composite;

    VerletJS.prototype.frame = function (step) {
        var i, j, c;
        for (c in this.composites) {
            var particles = this.composites[c].particles;
            for (i in particles) {
                var velocity = particles[i].pos.sub(particles[i].lastPos).scale(this.friction);
                if (particles[i].pos.y >= this.height - 1 && velocity.length2() > 1e-6) {
                    var m = velocity.length();
                    velocity.x /= m; velocity.y /= m;
                    velocity.mutableScale(m * this.groundFriction);
                }
                particles[i].lastPos.mutableSet(particles[i].pos);
                particles[i].pos.mutableAdd(this.gravity);
                particles[i].pos.mutableAdd(velocity);
            }
        }
        if (this.draggedEntity) this.draggedEntity.pos.mutableSet(this.mouse);
        var stepCoef = 1 / step;
        for (c in this.composites) {
            var constraints = this.composites[c].constraints;
            for (i = 0; i < step; ++i)
                for (j in constraints) constraints[j].relax(stepCoef);
        }
        for (c in this.composites) {
            var ps = this.composites[c].particles;
            for (i in ps) this.bounds(ps[i]);
        }
    };

    VerletJS.prototype.draw = function () {
        var i, c;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (c in this.composites) {
            if (this.composites[c].drawConstraints) {
                this.composites[c].drawConstraints(this.ctx, this.composites[c]);
            } else {
                var constraints = this.composites[c].constraints;
                for (i in constraints) constraints[i].draw && constraints[i].draw(this.ctx);
            }
            if (this.composites[c].drawParticles) {
                this.composites[c].drawParticles(this.ctx, this.composites[c]);
            }
        }
    };

    VerletJS.prototype.nearestEntity = function () {
        var c, i, d2Nearest = 0, entity = null, constraintsNearest = null;
        for (c in this.composites) {
            var particles = this.composites[c].particles;
            for (i in particles) {
                var d2 = particles[i].pos.dist2(this.mouse);
                if (d2 <= this.selectionRadius * this.selectionRadius && (entity === null || d2 < d2Nearest)) {
                    entity = particles[i];
                    constraintsNearest = this.composites[c].constraints;
                    d2Nearest = d2;
                }
            }
        }
        for (i in constraintsNearest) {
            if (constraintsNearest[i] instanceof PinConstraint && constraintsNearest[i].a === entity)
                entity = constraintsNearest[i];
        }
        return entity;
    };

    // =========================================================
    // SPIDER
    // =========================================================

    VerletJS.prototype.spider = function (origin) {
        var i;
        var leg1S = 0.99, leg2S = 0.99, leg3S = 0.99, leg4S = 0.99;
        var j1S = 1, j2S = 0.4, j3S = 0.9;
        var bodyS = 1, bodyJS = 1;

        var composite = new this.Composite();
        composite.legs = [];

        composite.thorax  = new Particle(origin);
        composite.head    = new Particle(origin.add(new Vec2(0, -5)));
        composite.abdomen = new Particle(origin.add(new Vec2(0, 10)));

        composite.particles.push(composite.thorax);
        composite.particles.push(composite.head);
        composite.particles.push(composite.abdomen);

        composite.constraints.push(new DistanceConstraint(composite.head,    composite.thorax,  bodyS));
        composite.constraints.push(new DistanceConstraint(composite.abdomen, composite.thorax,  bodyS));
        composite.constraints.push(new AngleConstraint(composite.abdomen, composite.thorax, composite.head, 0.4));

        for (i = 0; i < 4; ++i) {
            composite.particles.push(new Particle(composite.particles[0].pos.add(new Vec2( 3, (i - 1.5) * 3))));
            composite.particles.push(new Particle(composite.particles[0].pos.add(new Vec2(-3, (i - 1.5) * 3))));
            var len = composite.particles.length;

            composite.constraints.push(new DistanceConstraint(composite.particles[len - 2], composite.thorax, leg1S));
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 1], composite.thorax, leg1S));

            var lc = 1;
            if (i === 1 || i === 2) lc = 0.7;
            else if (i === 3) lc = 0.9;

            composite.particles.push(new Particle(composite.particles[len - 2].pos.add(new Vec2( 20, (i - 1.5) * 30).normal().mutableScale(20 * lc))));
            composite.particles.push(new Particle(composite.particles[len - 1].pos.add(new Vec2(-20, (i - 1.5) * 30).normal().mutableScale(20 * lc))));
            len = composite.particles.length;
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], leg2S));
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], leg2S));

            composite.particles.push(new Particle(composite.particles[len - 2].pos.add(new Vec2( 20, (i - 1.5) * 50).normal().mutableScale(20 * lc))));
            composite.particles.push(new Particle(composite.particles[len - 1].pos.add(new Vec2(-20, (i - 1.5) * 50).normal().mutableScale(20 * lc))));
            len = composite.particles.length;
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], leg3S));
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], leg3S));

            var rFoot = new Particle(composite.particles[len - 2].pos.add(new Vec2( 20, (i - 1.5) * 100).normal().mutableScale(12 * lc)));
            var lFoot = new Particle(composite.particles[len - 1].pos.add(new Vec2(-20, (i - 1.5) * 100).normal().mutableScale(12 * lc)));
            composite.particles.push(rFoot);
            composite.particles.push(lFoot);
            composite.legs.push(rFoot);
            composite.legs.push(lFoot);
            len = composite.particles.length;

            composite.constraints.push(new DistanceConstraint(composite.particles[len - 4], composite.particles[len - 2], leg4S));
            composite.constraints.push(new DistanceConstraint(composite.particles[len - 3], composite.particles[len - 1], leg4S));

            composite.constraints.push(new AngleConstraint(composite.particles[len - 6],     composite.particles[len - 4],     composite.particles[len - 2],     j3S));
            composite.constraints.push(new AngleConstraint(composite.particles[len - 6 + 1], composite.particles[len - 4 + 1], composite.particles[len - 2 + 1], j3S));
            composite.constraints.push(new AngleConstraint(composite.particles[len - 8],     composite.particles[len - 6],     composite.particles[len - 4],     j2S));
            composite.constraints.push(new AngleConstraint(composite.particles[len - 8 + 1], composite.particles[len - 6 + 1], composite.particles[len - 4 + 1], j2S));
            composite.constraints.push(new AngleConstraint(composite.particles[0], composite.particles[len - 8],     composite.particles[len - 6],     j1S));
            composite.constraints.push(new AngleConstraint(composite.particles[0], composite.particles[len - 8 + 1], composite.particles[len - 6 + 1], j1S));
            composite.constraints.push(new AngleConstraint(composite.particles[1], composite.particles[0], composite.particles[len - 8],     bodyJS));
            composite.constraints.push(new AngleConstraint(composite.particles[1], composite.particles[0], composite.particles[len - 8 + 1], bodyJS));
        }

        this.composites.push(composite);
        return composite;
    };

    // =========================================================
    // SPIDERWEB
    // =========================================================

    VerletJS.prototype.spiderweb = function (origin, radius, segments, depth) {
        var stiffness = 0.6, tensor = 0.3;
        var stride = (2 * Math.PI) / segments;
        var n = segments * depth;
        var radiusStride = radius / n;
        var i, c;
        var composite = new this.Composite();

        for (i = 0; i < n; ++i) {
            var theta = i * stride + Math.cos(i * 0.4) * 0.05 + Math.cos(i * 0.05) * 0.2;
            var sr = radius - radiusStride * i + Math.cos(i * 0.1) * 20;
            var offy = Math.cos(theta * 2.1) * (radius / depth) * 0.2;
            composite.particles.push(new Particle(new Vec2(
                origin.x + Math.cos(theta) * sr,
                origin.y + Math.sin(theta) * sr + offy
            )));
        }

        for (i = 0; i < segments; i += 4) composite.pin(i);

        for (i = 0; i < n - 1; ++i) {
            composite.constraints.push(new DistanceConstraint(composite.particles[i], composite.particles[i + 1], stiffness));
            var off = i + segments;
            composite.constraints.push(new DistanceConstraint(
                composite.particles[i],
                off < n - 1 ? composite.particles[off] : composite.particles[n - 1],
                stiffness
            ));
        }
        composite.constraints.push(new DistanceConstraint(composite.particles[0], composite.particles[segments - 1], stiffness));

        for (c in composite.constraints) composite.constraints[c].distance *= tensor;

        this.composites.push(composite);
        return composite;
    };

    // =========================================================
    // CRAWL
    // =========================================================

    function shuffle(o) {
        for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    }

    VerletJS.prototype.crawl = function (leg) {
        var stepRadius = 100, minStepRadius = 35;
        var spiderweb = this.composites[0];
        var spider    = this.composites[1];

        var theta = spider.particles[0].pos.angle2(
            spider.particles[0].pos.add(new Vec2(1, 0)),
            spider.particles[1].pos
        );
        var b1 = new Vec2(Math.cos(theta), Math.sin(theta));
        var b2 = new Vec2(Math.cos(theta + Math.PI / 2), Math.sin(theta + Math.PI / 2));
        var f1 = leg < 4 ? 1 : -1;
        var f2 = leg % 2 === 0 ? 1 : 0;

        var paths = [], i, j, k;
        for (i in spiderweb.particles) {
            var p = spiderweb.particles[i];
            if (p.pos.sub(spider.particles[0].pos).dot(b1) * f1 >= 0 &&
                p.pos.sub(spider.particles[0].pos).dot(b2) * f2 >= 0) {
                var d2 = p.pos.dist2(spider.particles[0].pos);
                if (d2 < minStepRadius * minStepRadius || d2 > stepRadius * stepRadius) continue;
                var taken = false;
                for (j in spider.constraints) {
                    for (k = 0; k < 8; ++k) {
                        if (spider.constraints[j] instanceof DistanceConstraint &&
                            spider.constraints[j].a === spider.legs[k] &&
                            spider.constraints[j].b === p) { taken = true; }
                    }
                }
                if (!taken) paths.push(p);
            }
        }

        for (i in spider.constraints) {
            if (spider.constraints[i] instanceof DistanceConstraint && spider.constraints[i].a === spider.legs[leg]) {
                spider.constraints.splice(i, 1);
                break;
            }
        }

        if (paths.length > 0) {
            shuffle(paths);
            spider.constraints.push(new DistanceConstraint(spider.legs[leg], paths[0], 1, 0));
        }
    };

    // =========================================================
    // COLORS — paleta neon para dark bg
    // =========================================================

    // Cada entrada: [head/thorax, leg1, leg2, leg3, abdomen]
    var PALETAS = [
        ['#ff5577', '#ff3355', '#cc2244', '#991133', '#550022'], // vermelho
        ['#ff8844', '#ff6622', '#cc4411', '#993300', '#441100'], // laranja
        ['#ffdd44', '#ffcc11', '#cc9900', '#997700', '#443300'], // amarelo
        ['#44ff88', '#22cc66', '#119944', '#007722', '#003311'], // verde
        ['#44aaff', '#2288dd', '#1166bb', '#004499', '#001133'], // azul
        ['#cc44ff', '#aa22dd', '#8811bb', '#660099', '#220033'], // roxo
        ['#44aaff', '#2288dd', '#1166bb', '#004499', '#001133'], // azul
        ['#44ff88', '#22cc66', '#119944', '#007722', '#003311'], // verde
        ['#ffdd44', '#ffcc11', '#cc9900', '#997700', '#443300'], // amarelo
        ['#ff8844', '#ff6622', '#cc4411', '#993300', '#441100'], // laranja
        ['#ff5577', '#ff3355', '#cc2244', '#991133', '#550022'], // vermelho
    ];

    function getSpiderColor(part, ti) {
        var t = ti % 1000;
        var ts = Math.floor(t / 100);
        var ta = (t % 100) / 100; // 0→1 para interpolação entre paletas
        if (ts >= PALETAS.length - 1) ts = PALETAS.length - 2;

        var colA = PALETAS[ts][part - 1]     || '#ffffff';
        var colB = PALETAS[ts + 1][part - 1] || '#ffffff';

        // interpola RGB
        var rA = parseInt(colA.slice(1, 3), 16);
        var gA = parseInt(colA.slice(3, 5), 16);
        var bA = parseInt(colA.slice(5, 7), 16);
        var rB = parseInt(colB.slice(1, 3), 16);
        var gB = parseInt(colB.slice(3, 5), 16);
        var bB = parseInt(colB.slice(5, 7), 16);

        var r = Math.round(rA + (rB - rA) * ta);
        var g = Math.round(gA + (gB - gA) * ta);
        var b = Math.round(bA + (bB - bA) * ta);

        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // =========================================================
    // AUDIO
    // =========================================================

    var SomAranha = (function () {
        var actx = null;
        var lastTick = 0;

        function ensureCtx() {
            if (!actx) {
                try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
            }
            if (actx && actx.state === 'suspended') actx.resume();
        }

        function tick() {
            ensureCtx();
            if (!actx) return;
            var now = Date.now();
            if (now - lastTick < 120) return;
            lastTick = now;

            try {
                var osc = actx.createOscillator();
                var gain = actx.createGain();
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(280 + Math.random() * 80, actx.currentTime);
                gain.gain.setValueAtTime(0.04, actx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
                osc.start(actx.currentTime);
                osc.stop(actx.currentTime + 0.08);
            } catch (e) { /* ignore */ }
        }

        function fechar() {
            if (actx) { try { actx.close(); } catch (e) {} actx = null; }
        }

        return { tick: tick, fechar: fechar };
    })();

    // =========================================================
    // ESTADO DO JOGO
    // =========================================================

    var overlay = null;
    var canvas  = null;
    var sim     = null;
    var rafId   = null;
    var ti      = 0;
    var legIdx  = 0;

    // handlers guardados para cleanup
    var _onKey    = null;
    var _onResize = null;
    var _onTouchStart = null;
    var _onTouchMove  = null;
    var _onTouchEnd   = null;

    // =========================================================
    // SETUP DA SIMULAÇÃO
    // =========================================================

    function criarSimulacao() {
        var w = canvas.width;
        var h = canvas.height;

        sim = new VerletJS(w, h, canvas);

        var webRadius = Math.min(w, h) * 0.44;
        var teia = sim.spiderweb(new Vec2(w / 2, h / 2), webRadius, 20, 7);

        sim.spider(new Vec2(w / 2, -300));

        // --- renderização da teia ---
        teia.drawParticles = function (ctx, composite) {
            var i;
            for (i in composite.particles) {
                var pt = composite.particles[i];
                ctx.beginPath();
                ctx.arc(pt.pos.x, pt.pos.y, 1.4, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(160, 210, 230, 0.65)';
                ctx.fill();
            }
        };

        teia.drawConstraints = function (ctx, composite) {
            var i;
            for (i in composite.constraints) {
                var c = composite.constraints[i];
                if (c instanceof DistanceConstraint) {
                    ctx.beginPath();
                    ctx.moveTo(c.a.pos.x, c.a.pos.y);
                    ctx.lineTo(c.b.pos.x, c.b.pos.y);
                    ctx.strokeStyle = 'rgba(180, 220, 255, 0.22)';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        };

        // --- renderização da aranha ---
        var spider = sim.composites[1];
        spider.drawConstraints = function (ctx, composite) {
            var i;
            var colHead  = getSpiderColor(1, ti);
            var colLeg1  = getSpiderColor(2, ti);
            var colLeg2  = getSpiderColor(3, ti);
            var colLeg3  = getSpiderColor(4, ti);
            var colAbdo  = getSpiderColor(5, ti);

            ctx.shadowBlur = 10;
            ctx.shadowColor = colHead;

            // abdome (círculo maior)
            ctx.beginPath();
            ctx.arc(composite.abdomen.pos.x, composite.abdomen.pos.y, 9, 0, 2 * Math.PI);
            ctx.fillStyle = colAbdo;
            ctx.fill();

            // tórax
            ctx.beginPath();
            ctx.arc(composite.thorax.pos.x, composite.thorax.pos.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = colHead;
            ctx.fill();

            // cabeça
            ctx.beginPath();
            ctx.arc(composite.head.pos.x, composite.head.pos.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = colHead;
            ctx.fill();

            ctx.shadowBlur = 0;

            // pernas (por segmento)
            for (i = 3; i < composite.constraints.length; ++i) {
                var cn = composite.constraints[i];
                if (!(cn instanceof DistanceConstraint)) continue;
                ctx.beginPath();
                ctx.moveTo(cn.a.pos.x, cn.a.pos.y);
                ctx.lineTo(cn.b.pos.x, cn.b.pos.y);

                // segmento 1 (mais grosso, perto do corpo)
                if ((i >= 2 && i <= 4) ||
                    (i >= 2 * 9 + 1 && i <= 2 * 9 + 2) ||
                    (i >= 2 * 17 + 1 && i <= 2 * 17 + 2) ||
                    (i >= 2 * 25 + 1 && i <= 2 * 25 + 2)) {
                    ctx.strokeStyle = colLeg1;
                    ctx.lineWidth = 3;
                } else if ((i >= 4 && i <= 6) ||
                           (i >= 2 * 9 + 3 && i <= 2 * 9 + 4) ||
                           (i >= 2 * 17 + 3 && i <= 2 * 17 + 4) ||
                           (i >= 2 * 25 + 3 && i <= 2 * 25 + 4)) {
                    ctx.strokeStyle = colLeg2;
                    ctx.lineWidth = 2;
                } else if ((i >= 6 && i <= 8) ||
                           (i >= 2 * 9 + 5 && i <= 2 * 9 + 6) ||
                           (i >= 2 * 17 + 5 && i <= 2 * 17 + 6) ||
                           (i >= 2 * 25 + 5 && i <= 2 * 25 + 6)) {
                    ctx.strokeStyle = colLeg3;
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = 'rgba(180,220,255,0.4)';
                    ctx.lineWidth = 0.8;
                }
                ctx.stroke();
            }
        };

        spider.drawParticles = function () {};
    }

    // =========================================================
    // LOOP
    // =========================================================

    function loop() {
        ti++;
        if (ti > 9999) ti = 0;

        if (Math.floor(Math.random() * 4) === 0) {
            sim.crawl((legIdx++ * 3) % 8);
            SomAranha.tick();
        }

        sim.frame(16);
        sim.draw();
        rafId = requestAnimationFrame(loop);
    }

    // =========================================================
    // ABRIR / FECHAR
    // =========================================================

    function abrir() {
        if (overlay) return;

        // overlay fullscreen
        overlay = document.createElement('div');
        overlay.id = 'aranha-overlay';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:1000',
            'background:#0f172a',
            'display:flex', 'align-items:center', 'justify-content:center'
        ].join(';');

        // canvas
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;touch-action:none;';
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        overlay.appendChild(canvas);

        // botão fechar
        var btnFechar = document.createElement('button');
        btnFechar.textContent = '✕';
        btnFechar.setAttribute('aria-label', 'Fechar');
        btnFechar.style.cssText = [
            'position:absolute', 'top:16px', 'right:16px',
            'width:48px', 'height:48px',
            'background:rgba(255,255,255,0.15)',
            'border:none', 'border-radius:50%',
            'color:#fff', 'font-size:20px',
            'cursor:pointer', 'z-index:10',
            'display:flex', 'align-items:center', 'justify-content:center'
        ].join(';');
        btnFechar.onclick = fechar;
        overlay.appendChild(btnFechar);

        document.body.appendChild(overlay);

        // criar simulação
        ti = 0; legIdx = 0;
        criarSimulacao();

        // listeners
        _onKey = function (e) { if (e.key === 'Escape') fechar(); };
        document.addEventListener('keydown', _onKey);

        _onResize = function () {
            if (!overlay || !canvas || !sim) return;
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            // recriar com novas dimensões
            sim = null;
            criarSimulacao();
        };
        window.addEventListener('resize', _onResize);

        // touch → mouse simulation
        _onTouchStart = function (e) {
            e.preventDefault();
            var t = e.touches[0];
            var r = canvas.getBoundingClientRect();
            sim.mouse.x = t.clientX - r.left;
            sim.mouse.y = t.clientY - r.top;
            sim.mouseDown = true;
            var n = sim.nearestEntity();
            if (n) sim.draggedEntity = n;
        };
        _onTouchMove = function (e) {
            e.preventDefault();
            if (!sim) return;
            var t = e.touches[0];
            var r = canvas.getBoundingClientRect();
            sim.mouse.x = t.clientX - r.left;
            sim.mouse.y = t.clientY - r.top;
        };
        _onTouchEnd = function (e) {
            e.preventDefault();
            if (!sim) return;
            sim.mouseDown = false;
            sim.draggedEntity = null;
        };
        canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
        canvas.addEventListener('touchmove',  _onTouchMove,  { passive: false });
        canvas.addEventListener('touchend',   _onTouchEnd,   { passive: false });

        rafId = requestAnimationFrame(loop);
    }

    function fechar() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        SomAranha.fechar();

        if (_onKey)    { document.removeEventListener('keydown', _onKey); _onKey = null; }
        if (_onResize) { window.removeEventListener('resize', _onResize); _onResize = null; }

        if (canvas) {
            if (_onTouchStart) canvas.removeEventListener('touchstart', _onTouchStart);
            if (_onTouchMove)  canvas.removeEventListener('touchmove',  _onTouchMove);
            if (_onTouchEnd)   canvas.removeEventListener('touchend',   _onTouchEnd);
            _onTouchStart = _onTouchMove = _onTouchEnd = null;
        }

        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        canvas  = null;
        sim     = null;
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    window.AranhaGame = { abrir: abrir, fechar: fechar };

})();

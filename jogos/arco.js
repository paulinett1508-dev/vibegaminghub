// Jogo Arco e Flecha — portado de bow-game.zip (arrow-game.html)
// Lógica original: CodePen demo. Adaptado para IIFE, dark overlay, touch, Web Audio API.

(function () {
    'use strict';

    // =========================================================
    // AUDIO
    // =========================================================

    var SomArco = (function () {
        var actx = null;
        var lastTensao = 0;

        function ensureCtx() {
            if (!actx) {
                try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
            }
            if (actx && actx.state === 'suspended') actx.resume();
        }

        // Som contínuo ao esticar o arco — throttled a cada 80ms
        function tensao(distancia) {
            ensureCtx();
            if (!actx) return;
            var now = Date.now();
            if (now - lastTensao < 80) return;
            lastTensao = now;
            var osc = actx.createOscillator();
            var gain = actx.createGain();
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100 + distancia * 8, actx.currentTime);
            gain.gain.setValueAtTime(0.03, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.06);
            osc.start(actx.currentTime);
            osc.stop(actx.currentTime + 0.06);
        }

        // Whoosh ao soltar a flecha
        function disparo() {
            ensureCtx();
            if (!actx) return;
            var bufferSize = Math.floor(actx.sampleRate * 0.15);
            var buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            var source = actx.createBufferSource();
            source.buffer = buffer;
            var filter = actx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2000, actx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.15);
            var gainNode = actx.createGain();
            gainNode.gain.setValueAtTime(0.3, actx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(actx.destination);
            source.start(actx.currentTime);
            source.stop(actx.currentTime + 0.15);
        }

        // Ding metálico ao acertar o alvo
        function acerto() {
            ensureCtx();
            if (!actx) return;
            [880, 1760].forEach(function (freq) {
                var osc = actx.createOscillator();
                var gainNode = actx.createGain();
                osc.connect(gainNode);
                gainNode.connect(actx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, actx.currentTime);
                gainNode.gain.setValueAtTime(0.15, actx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
                osc.start(actx.currentTime);
                osc.stop(actx.currentTime + 0.4);
            });
        }

        // Fanfarra de 3 notas ao fazer bullseye
        function bullseye() {
            ensureCtx();
            if (!actx) return;
            [523, 659, 784].forEach(function (freq, i) {
                var osc = actx.createOscillator();
                var gainNode = actx.createGain();
                osc.connect(gainNode);
                gainNode.connect(actx.destination);
                osc.type = 'sine';
                var t = actx.currentTime + i * 0.12;
                osc.frequency.setValueAtTime(freq, t);
                gainNode.gain.setValueAtTime(0, t);
                gainNode.gain.linearRampToValueAtTime(0.2, t + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                osc.start(t);
                osc.stop(t + 0.25);
            });
        }

        // Thud grave ao errar
        function erro() {
            ensureCtx();
            if (!actx) return;
            var osc = actx.createOscillator();
            var gainNode = actx.createGain();
            osc.connect(gainNode);
            gainNode.connect(actx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, actx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
            osc.start(actx.currentTime);
            osc.stop(actx.currentTime + 0.2);
        }

        function fechar() {
            if (actx) { try { actx.close(); } catch (e) {} actx = null; }
        }

        return { tensao: tensao, disparo: disparo, acerto: acerto, bullseye: bullseye, erro: erro, fechar: fechar };
    })();

    // =========================================================
    // ESTADO
    // =========================================================

    var overlay      = null;
    var _onKey       = null;
    var _onMouseDown = null;
    var _onMouseMove = null;
    var _onMouseUp   = null;
    var _onTouchStart = null;
    var _onTouchMove  = null;
    var _onTouchEnd   = null;

    // =========================================================
    // SVG DO JOGO (markup original intocado)
    // =========================================================

    var SVG_HTML = [
        '<svg id="arco-game" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
        '     viewBox="0 0 1000 400" overflow="visible"',
        '     style="width:100%;height:100%;position:absolute;top:0;left:0;pointer-events:none;">',
        '  <linearGradient id="arco-ArcGradient">',
        '    <stop offset="0" stop-color="#fff" stop-opacity=".2"/>',
        '    <stop offset="50%" stop-color="#fff" stop-opacity="0"/>',
        '  </linearGradient>',
        '  <path id="arco-arc" fill="none" stroke="url(#arco-ArcGradient)" stroke-width="4"',
        '        d="M100,250c250-400,550-400,800,0" pointer-events="none"/>',
        '  <defs>',
        '    <g id="arco-arrow">',
        '      <line x2="60" fill="none" stroke="#888" stroke-width="2"/>',
        '      <polygon fill="#888" points="64 0 58 2 56 0 58 -2"/>',
        '      <polygon fill="#88ce02" points="2 -3 -4 -3 -1 0 -4 3 2 3 5 0"/>',
        '    </g>',
        '  </defs>',
        '  <g id="arco-target">',
        '    <path fill="#FFF" d="M924.2,274.2c-21.5,21.5-45.9,19.9-52,3.2c-4.4-12.1,2.4-29.2,14.2-41c11.8-11.8,29-18.6,41-14.2 C944.1,228.3,945.7,252.8,924.2,274.2z"/>',
        '    <path fill="#F4531C" d="M915.8,265.8c-14.1,14.1-30.8,14.6-36,4.1c-4.1-8.3,0.5-21.3,9.7-30.5s22.2-13.8,30.5-9.7 C930.4,235,929.9,251.7,915.8,265.8z"/>',
        '    <path fill="#FFF" d="M908.9,258.9c-8,8-17.9,9.2-21.6,3.5c-3.2-4.9-0.5-13.4,5.6-19.5c6.1-6.1,14.6-8.8,19.5-5.6 C918.1,241,916.9,250.9,908.9,258.9z"/>',
        '    <path fill="#F4531C" d="M903.2,253.2c-2.9,2.9-6.7,3.6-8.3,1.7c-1.5-1.8-0.6-5.4,2-8c2.6-2.6,6.2-3.6,8-2 C906.8,246.5,906.1,250.2,903.2,253.2z"/>',
        '  </g>',
        '  <g id="arco-bow" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke" pointer-events="none">',
        '    <polyline fill="none" stroke="#ddd" stroke-linecap="round" points="88,200 88,250 88,300"/>',
        '    <path fill="none" stroke="#88ce02" stroke-width="3" stroke-linecap="round"',
        '          d="M88,300 c0-10.1,12-25.1,12-50s-12-39.9-12-50"/>',
        '  </g>',
        '  <g class="arrow-angle"><use x="100" y="250" xlink:href="#arco-arrow"/></g>',
        '  <clipPath id="arco-mask">',
        '    <polygon opacity=".5"',
        '             points="0,0 1500,0 1500,200 970,290 950,240 925,220 875,280 890,295 920,310 0,350"',
        '             pointer-events="none"/>',
        '  </clipPath>',
        '  <g class="arrows" clip-path="url(#arco-mask)" pointer-events="none"></g>',
        '  <g class="missyou" fill="#aaa" opacity="0" transform="translate(-50, 50)">',
        '    <path d="M358 194L363 118 386 120 400 153 416 121 440 119 446 203 419 212 416 163 401 180 380 160 381 204"/>',
        '    <path d="M450 120L458 200 475 192 474 121"/>',
        '    <path d="M537 118L487 118 485 160 515 162 509 177 482 171 482 193 529 199 538 148 501 146 508 133 537 137"/>',
        '    <path d="M540 202L543 178 570 186 569 168 544 167 546 122 590 116 586 142 561 140 560 152 586 153 586 205"/>',
        '    <path d="M630 120 L650 160 L670 120 L690 120 L660 170 L660 200 L640 200 L640 170 L610 120 Z"/>',
        '    <path d="M700 160 A20 20 0 1 1 699.9 160"/>',
        '    <path d="M730 140 L730 180 A20 20 0 0 0 770 180 L770 140 L750 140 L750 180 A5 5 0 0 1 750 180 L750 140 Z"/>',
        '    <path d="M790 150 L790 180 L810 180 L810 100 Z M790 200 L810 200 L810 220 L790 220 Z"/>',
        '  </g>',
        '  <g class="loveyou" fill="#F4531C" opacity="0" transform="translate(300, 100)">',
        '    <path d="M0 0 L0 80 L30 80 L30 70 L10 70 L10 0 Z"/>',
        '    <path d="M50 40 A20 20 0 1 1 49.9 40"/>',
        '    <path d="M80 0 L100 80 L120 0 L110 0 L100 60 L90 0 Z"/>',
        '    <path d="M140 0 L140 80 L170 80 L170 70 L150 70 L150 50 L170 50 L170 40 L150 40 L150 10 L170 10 L170 0 Z"/>',
        '    <path d="M190 0 L205 30 L220 0 L230 0 L210 40 L210 80 L200 80 L200 40 L180 0 Z"/>',
        '    <path d="M250 40 A20 20 0 1 1 249.9 40"/>',
        '    <path d="M280 0 L280 50 A20 20 0 0 0 320 50 L320 0 L310 0 L310 50 A10 10 0 0 1 290 50 L290 0 Z"/>',
        '  </g>',
        '  <g class="hit" fill="#ffcc00" opacity="0" transform="translate(180, -80) rotate(12)">',
        '    <path d="M383 114L385 195 407 191 406 160 422 155 418 191 436 189 444 112 423 119 422 141 407 146 400 113"/>',
        '    <path d="M449 185L453 113 477 112 464 186"/>',
        '    <path d="M486 113L484 130 506 130 481 188 506 187 520 131 540 135 545 119"/>',
        '    <path d="M526,195l5-20l22,5l-9,16L526,195z M558,164l32-44l-35-9l-19,51L558,164z"/>',
        '  </g>',
        '</svg>'
    ].join('\n');

    // =========================================================
    // INIT DO JOGO (código original portado, lógica intacta)
    // =========================================================

    function initJogo() {
        var svg = overlay.querySelector('svg');
        var cursor = svg.createSVGPoint();
        var arrows = overlay.querySelector('.arrows');
        var randomAngle = 0;

        var target      = { x: 900, y: 249.5 };
        var lineSegment = { x1: 875, y1: 280, x2: 925, y2: 220 };
        var pivot       = { x: 100, y: 250 };

        // Registrar mousedown ANTES de qualquer aim() para garantir interatividade
        // mesmo que getScreenCTM() falhe na primeira chamada (layout ainda pendente)
        _onMouseDown = draw;
        window.addEventListener('mousedown', _onMouseDown);

        // Aguardar 1 frame para o browser layoutar o SVG antes de chamar getScreenCTM()
        requestAnimationFrame(function () {
            aim({ clientX: 320, clientY: 300 });
        });

        function draw(e) {
            randomAngle = Math.random() * Math.PI * 0.03 - 0.015;
            TweenMax.to('.arrow-angle use', 0.3, { opacity: 1 });
            _onMouseMove = aim;
            _onMouseUp   = loose;
            window.addEventListener('mousemove', _onMouseMove);
            window.addEventListener('mouseup',   _onMouseUp);
            aim(e);
        }

        function aim(e) {
            var point = getMouseSVG(e);
            // Mantém cursor à esquerda do pivô (não empurrar o arco)
            point.x = Math.min(point.x, pivot.x - 7);
            // Sem restrição vertical: permite mirar para cima ou para baixo
            var dx = point.x - pivot.x;
            var dy = point.y - pivot.y;
            var angle    = Math.atan2(dy, dx) + randomAngle;
            var bowAngle = angle - Math.PI;
            var distance = Math.min(Math.sqrt(dx * dx + dy * dy), 50);

            if (distance > 5) SomArco.tensao(distance);

            var scale = Math.min(Math.max(distance / 30, 1), 2);
            TweenMax.to('#arco-bow', 0.1, {
                scaleX: scale,
                rotation: bowAngle + 'rad',
                transformOrigin: 'right center'
            });
            TweenMax.to('.arrow-angle', 0.1, {
                rotation: bowAngle + 'rad',
                svgOrigin: '100 250'
            });
            TweenMax.to('.arrow-angle use', 0.1, { x: -distance });
            TweenMax.to('#arco-bow polyline', 0.1, {
                attr: { points: '88,200 ' + Math.min(pivot.x - (1 / scale) * distance, 88) + ',250 88,300' }
            });
            var radius   = distance * 9;
            var offset   = { x: Math.cos(bowAngle) * radius, y: Math.sin(bowAngle) * radius };
            var arcWidth = offset.x * 3;
            TweenMax.to('#arco-arc', 0.1, {
                attr: {
                    d: 'M100,250c' + offset.x + ',' + offset.y + ',' +
                       (arcWidth - offset.x) + ',' + (offset.y + 50) + ',' + arcWidth + ',50'
                },
                autoAlpha: distance / 60
            });
        }

        function loose() {
            window.removeEventListener('mousemove', _onMouseMove);
            window.removeEventListener('mouseup',   _onMouseUp);
            _onMouseMove = null;
            _onMouseUp   = null;
            SomArco.disparo();
            TweenMax.to('#arco-bow', 0.4, {
                scaleX: 1,
                transformOrigin: 'right center',
                ease: Elastic.easeOut
            });
            TweenMax.to('#arco-bow polyline', 0.4, {
                attr: { points: '88,200 88,250 88,300' },
                ease: Elastic.easeOut
            });
            var newArrow = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            newArrow.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#arco-arrow');
            arrows.appendChild(newArrow);
            var path = MorphSVGPlugin.pathDataToBezier('#arco-arc');
            TweenMax.to([newArrow], 0.5, {
                force3D: true,
                bezier: { type: 'cubic', values: path, autoRotate: ['x', 'y', 'rotation'] },
                onUpdate: hitTest,
                onUpdateParams: ['{self}'],
                onComplete: onMiss,
                ease: Linear.easeNone
            });
            TweenMax.to('#arco-arc', 0.3, { opacity: 0 });
            TweenMax.set('.arrow-angle use', { opacity: 0 });
        }

        function hitTest(tween) {
            var arrow     = tween.target[0];
            var transform = arrow._gsTransform;
            var radians   = (transform.rotation * Math.PI) / 180;
            var arrowSegment = {
                x1: transform.x,
                y1: transform.y,
                x2: Math.cos(radians) * 60 + transform.x,
                y2: Math.sin(radians) * 60 + transform.y
            };
            var intersection = getIntersection(arrowSegment, lineSegment);
            if (intersection && intersection.segment1 && intersection.segment2) {
                tween.kill();
                var dx   = intersection.x - target.x;
                var dy   = intersection.y - target.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 7) {
                    SomArco.bullseye();
                    showMessage('.loveyou');
                } else {
                    SomArco.acerto();
                    showMessage('.hit');
                }
            }
        }

        function onMiss() {
            SomArco.erro();
            showMessage('.missyou');
        }

        function showMessage(selector) {
            TweenMax.killTweensOf(selector);
            TweenMax.killChildTweensOf(selector);
            TweenMax.set(selector, { autoAlpha: 1 });
            TweenMax.staggerFromTo(
                selector + ' path', 0.5,
                { rotation: -5, scale: 0, transformOrigin: 'center' },
                { scale: 1, ease: Back.easeOut },
                0.05
            );
            TweenMax.staggerTo(
                selector + ' path', 0.3,
                { delay: 2, rotation: 20, scale: 0, ease: Back.easeIn },
                0.03
            );
        }

        function getMouseSVG(e) {
            cursor.x = e.clientX;
            cursor.y = e.clientY;
            var ctm = svg.getScreenCTM();
            if (!ctm) return cursor;
            return cursor.matrixTransform(ctm.inverse());
        }

        function getIntersection(seg1, seg2) {
            var dx1 = seg1.x2 - seg1.x1, dy1 = seg1.y2 - seg1.y1;
            var dx2 = seg2.x2 - seg2.x1, dy2 = seg2.y2 - seg2.y1;
            var cx  = seg1.x1 - seg2.x1,  cy  = seg1.y1 - seg2.y1;
            var denom = dy2 * dx1 - dx2 * dy1;
            if (denom === 0) return null;
            var ua = (dx2 * cy - dy2 * cx) / denom;
            var ub = (dx1 * cy - dy1 * cx) / denom;
            return {
                x: seg1.x1 + ua * dx1,
                y: seg1.y1 + ua * dy1,
                segment1: ua >= 0 && ua <= 1,
                segment2: ub >= 0 && ub <= 1
            };
        }
    }

    // =========================================================
    // ABRIR / FECHAR
    // =========================================================

    function abrir() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'arco-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#222;overflow:hidden;';
        overlay.innerHTML = SVG_HTML;

        var btnFechar = document.createElement('button');
        btnFechar.innerHTML = '<span class="material-icons" style="font-size:20px;line-height:1;">close</span>';
        btnFechar.setAttribute('aria-label', 'Fechar');
        btnFechar.style.cssText = [
            'position:absolute', 'top:16px', 'right:16px',
            'width:64px', 'height:64px',
            'background:rgba(255,255,255,0.15)',
            'border:none', 'border-radius:50%',
            'color:#fff', 'font-size:20px',
            'cursor:pointer', 'z-index:10',
            'display:flex', 'align-items:center', 'justify-content:center'
        ].join(';');
        // Impede que o click no botão dispare os listeners de jogo (draw/loose)
        btnFechar.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        btnFechar.addEventListener('mouseup',   function (e) { e.stopPropagation(); });
        btnFechar.onclick = function () {
            window.fecharJoguinhos ? window.fecharJoguinhos() : fechar();
        };
        overlay.appendChild(btnFechar);

        document.body.appendChild(overlay);

        // Touch → simula eventos de mouse para o jogo original
        // Ignora toques no botão fechar para que o click nativo funcione
        _onTouchStart = function (e) {
            if (btnFechar.contains(e.target)) return;
            e.preventDefault();
            var t = e.touches[0];
            window.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
        };
        _onTouchMove = function (e) {
            if (btnFechar.contains(e.target)) return;
            e.preventDefault();
            var t = e.touches[0];
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
        };
        _onTouchEnd = function (e) {
            if (btnFechar.contains(e.target)) return;
            e.preventDefault();
            window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        };
        overlay.addEventListener('touchstart', _onTouchStart, { passive: false });
        overlay.addEventListener('touchmove',  _onTouchMove,  { passive: false });
        overlay.addEventListener('touchend',   _onTouchEnd,   { passive: false });

        _onKey = function (e) {
            if (e.key === 'Escape') {
                window.fecharJoguinhos ? window.fecharJoguinhos() : fechar();
            }
        };
        document.addEventListener('keydown', _onKey);

        initJogo();
    }

    function fechar() {
        TweenMax.killTweensOf('#arco-bow');
        TweenMax.killTweensOf('#arco-arc');
        TweenMax.killTweensOf('.arrow-angle');
        TweenMax.killTweensOf('.arrow-angle use');
        TweenMax.killTweensOf('#arco-bow polyline');
        TweenMax.killTweensOf('.hit');
        TweenMax.killTweensOf('.loveyou');
        TweenMax.killTweensOf('.missyou');
        if (_onKey)       { document.removeEventListener('keydown',  _onKey);       _onKey = null; }
        if (_onMouseDown) { window.removeEventListener('mousedown', _onMouseDown); _onMouseDown = null; }
        if (_onMouseMove) { window.removeEventListener('mousemove', _onMouseMove); _onMouseMove = null; }
        if (_onMouseUp)   { window.removeEventListener('mouseup',   _onMouseUp);   _onMouseUp = null; }

        if (overlay) {
            if (_onTouchStart) overlay.removeEventListener('touchstart', _onTouchStart);
            if (_onTouchMove)  overlay.removeEventListener('touchmove',  _onTouchMove);
            if (_onTouchEnd)   overlay.removeEventListener('touchend',   _onTouchEnd);
            _onTouchStart = _onTouchMove = _onTouchEnd = null;
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            overlay = null;
        }

        SomArco.fechar();
    }

    // =========================================================
    // API PÚBLICA
    // =========================================================

    window.ArcoGame = { abrir: abrir, fechar: fechar };

})();

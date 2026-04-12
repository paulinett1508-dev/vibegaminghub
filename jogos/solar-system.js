// =====================================================================
// solar-system.js — Solar System Planet Picker v1.0
// =====================================================================
// Experiencia interativa de selecao de planetas com animacoes CSS
// keyframe, navegacao SVG em arco e imagens reais.
// Baseado em: Solar System Planet Picker KeyFrame Animations
// =====================================================================

(function () {
    'use strict';

    var _root = null;
    var _styleTag = null;
    var _currentPlanetIndex = 0;
    var _currentPlanet = null;
    var _planetKeys = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
    var _animFrames = [];
    var _onKeyDown = null;
    var _onWheel = null;
    var _onTouchStart = null;
    var _onTouchMove = null;
    var _onTouchEnd = null;
    var _scrollCooldown = false;
    var _touchStartX = 0;

    var PLANETS = {
        mercury: { title:'Mercury', description:'Tiny and close to the sun.',                                           tilt:3.13,  gravity:0.9, hours:10, img:'assets/sprites/solar-system/1_mercury.jpg' },
        venus:   { title:'Venus',   description:'A planet of razors and tennis players.',                              tilt:4.13,  gravity:0.2, hours:20, img:'assets/sprites/solar-system/2_venus.jpg'   },
        earth:   { title:'Earth',   description:'Voted best planet in the Solar System by all organisms.',             tilt:5.13,  gravity:7.3, hours:30, img:'assets/sprites/solar-system/3_earth.jpg'   },
        mars:    { title:'Mars',    description:"Future Site of Elon Musk's AirBnB.",                                  tilt:6.13,  gravity:1.1, hours:40, img:'assets/sprites/solar-system/4_mars.jpg'    },
        jupiter: { title:'Jupiter', description:'Twice as massive as the other planets combined.',                     tilt:11.13, gravity:1.8, hours:50, img:'assets/sprites/solar-system/5_jupiter.jpg' },
        saturn:  { title:'Saturn',  description:'This planet sponsored by Zales.',                                    tilt:9.13,  gravity:7.3, hours:60, img:'assets/sprites/solar-system/6_saturn.jpg'  },
        uranus:  { title:'Uranus',  description:"Hey, stop laughing. It's not funny.",                                tilt:11.13, gravity:1.8, hours:50, img:'assets/sprites/solar-system/7_uranus.jpg'  },
        neptune: { title:'Neptune', description:"A planet for pirates; just narrowly made the cut.",                  tilt:31.03, gravity:8.9, hours:10, img:'assets/sprites/solar-system/8_neptune.jpg' }
    };

    // ---- Helpers de animacao ----

    function _animate(duration, fn) {
        var start = performance.now();
        function tick(now) {
            var progress = Math.min((now - start) / duration, 1);
            fn(progress);
            if (progress < 1) {
                _animFrames.push(requestAnimationFrame(tick));
            }
        }
        _animFrames.push(requestAnimationFrame(tick));
    }

    function _easing(p) { return (1 - Math.cos(p * Math.PI)) / 2; }

    function _animateFromTo(from, to, fn) {
        var delta = to - from;
        _animate(1000, function (p) { fn(from + _easing(p) * delta); });
    }

    // ---- Criacao de DOM ----

    function _el(tag, props) {
        var e = document.createElement(tag);
        if (props) {
            Object.keys(props).forEach(function (k) {
                if (k === 'class') e.className = props[k];
                else if (k === 'text') e.textContent = props[k];
                else e.setAttribute(k, props[k]);
            });
        }
        return e;
    }

    function _svgEl(tag, attrs) {
        var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    function _buildPlanetEl(key, isFirst) {
        var p = PLANETS[key];
        var wrap = _el('div', { class:'ss-planet', 'data-planet':key });
        if (isFirst) wrap.dataset.active = '';

        // Title
        var titleDiv = _el('div', { class:'ss-planet-title' });
        var h1 = _el('h1', { text: p.title });
        var desc = _el('p', { class:'ss-planet-description', text: p.description });
        titleDiv.appendChild(h1);
        titleDiv.appendChild(desc);

        // Details
        var detailsDiv = _el('div', { class:'ss-planet-details' });
        var dTilt = _el('div', { class:'ss-detail', 'data-detail':'tilt', 'data-postfix':'\u00b0' });
        dTilt.textContent = p.tilt.toFixed(2);
        var dGrav = _el('div', { class:'ss-detail', 'data-detail':'gravity', 'data-postfix':'\ud835\uddf1' });
        dGrav.textContent = p.gravity.toFixed(1);
        var dHours = _el('div', { class:'ss-detail', 'data-detail':'hours' });
        dHours.textContent = String(p.hours);
        detailsDiv.appendChild(dTilt);
        detailsDiv.appendChild(dGrav);
        detailsDiv.appendChild(dHours);

        // Figure
        var fig = _el('figure', { class:'ss-planet-figure' });
        var img = _el('img', { alt: p.title, loading:'lazy' });
        img.src = p.img;
        fig.appendChild(img);

        wrap.appendChild(titleDiv);
        wrap.appendChild(detailsDiv);
        wrap.appendChild(fig);
        return wrap;
    }

    function _buildNav() {
        var nav = _el('nav', { class:'ss-planet-nav' });
        var svg = _svgEl('svg', { viewBox:'0 20 400 400', xmlns:'http://www.w3.org/2000/svg' });
        var path = _svgEl('path', { id:'ss-navPath', d:'M10,200 C30,-28 370,-28 390,200', fill:'none' });
        svg.appendChild(path);
        var textEl = _svgEl('text', {});
        var textPath = _svgEl('textPath', { href:'#ss-navPath', startOffset:'0', 'font-size':'10' });
        _planetKeys.forEach(function (k) {
            var tspan = _svgEl('tspan', {});
            tspan.textContent = PLANETS[k].title;
            textPath.appendChild(tspan);
        });
        textEl.appendChild(textPath);
        svg.appendChild(textEl);
        nav.appendChild(svg);
        return nav;
    }

    function _buildCloseBtn() {
        var btn = _el('button', { class:'ss-close-btn', 'aria-label':'Fechar' });
        var icon = _el('span', { class:'material-icons', text:'close' });
        btn.appendChild(icon);
        return btn;
    }

    // ---- CSS Scoped ----

    function _buildCSS() {
        return [
            '@import url("https://fonts.googleapis.com/css?family=DM+Sans:400,700&display=swap");',
            '#solar-system-root{--ss-duration:.8s;--ss-ease:cubic-bezier(.7,0,.3,1);}',
            '#solar-system-root{position:fixed;inset:0;z-index:9999;background:#000;color:#fff;font-family:"DM Sans",sans-serif;overflow:hidden;}',
            '#solar-app{height:100%;width:100%;display:grid;grid-template-columns:1fr;grid-template-rows:1fr 1fr;overflow:hidden;}',
            '.ss-close-btn{position:absolute;top:16px;right:16px;z-index:10001;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);transition:background .2s;}',
            '.ss-close-btn:hover{background:rgba(255,255,255,.3);}',
            '.ss-planet{grid-column:1;grid-row:1/-1;overflow:hidden;height:100%;width:100%;display:grid;grid-template-columns:10% 40% 40% 10%;grid-template-rows:10% 1fr 1fr;grid-template-areas:"header header header header" "x title details y" "x planet photos photos";visibility:hidden;transition:visibility .01s linear var(--ss-duration);}',
            '.ss-planet[data-active]{visibility:visible;opacity:1;transition-delay:0s;}',
            '.ss-planet>.ss-planet-title{display:block;grid-area:title;}',
            '.ss-planet>.ss-planet-figure{position:absolute;bottom:-8%;left:50%;transform:translateX(-50%);width:min(82vh,82vw);height:min(82vh,82vw);z-index:1;margin:0;padding:0;}',
            '.ss-planet>.ss-planet-figure img{width:100%;height:100%;border-radius:50%;object-fit:cover;max-width:none;}',
            '.ss-planet>.ss-planet-figure::after{content:"";position:fixed;bottom:0;top:0;width:100%;left:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 45%);z-index:2;}',
            '.ss-planet>.ss-planet-title{position:relative;z-index:5;}',
            '.ss-planet>.ss-planet-details{position:relative;z-index:5;}',
            '.ss-planet>.ss-planet-details{grid-area:details;display:flex;flex-direction:row;justify-content:space-between;}',
            '.ss-detail{font-size:5vmin;width:3em;font-weight:400;display:flex;margin-left:.4em;flex-shrink:0;align-self:start;}',
            '.ss-detail:after{content:attr(data-postfix);}',
            '.ss-detail:before{display:block;position:absolute;top:100%;margin-top:1rem;font-size:.75rem;text-transform:uppercase;opacity:.6;letter-spacing:1px;}',
            '.ss-detail[data-detail=hours]:before{content:"Hours";}',
            '.ss-detail[data-detail=gravity]:before{content:"Gravity";}',
            '.ss-detail[data-detail=tilt]:before{content:"Tilt";}',
            '.ss-planet-title h1{margin:0;}',
            '.ss-planet .ss-planet-title .word{overflow:hidden;}',
            '.ss-planet .ss-planet-title .char{transform:translateY(100%);display:inline-block;transition:transform var(--ss-duration) var(--ss-ease);transition-delay:calc(var(--char-index)*.1s);}',
            '.ss-planet[data-active] .ss-planet-title .char{transform:translateY(0%);transition-delay:calc((var(--ss-duration)/2)+(var(--char-index)*.1s));}',
            '.ss-planet .ss-planet-description{visibility:hidden;opacity:0;transform:translateY(1em);transition:transform var(--ss-duration) var(--ss-ease),opacity var(--ss-duration) linear,visibility .01s linear var(--ss-duration);}',
            '.ss-planet[data-active] .ss-planet-description{opacity:1;transform:translateY(0);visibility:visible;transition-delay:var(--ss-duration),var(--ss-duration),0s;}',
            '.ss-planet .ss-planet-details{visibility:hidden;}',
            '.ss-planet[data-active] .ss-planet-details{opacity:1;transform:translateY(0);visibility:visible;transition-delay:0s;}',
            '.ss-planet .ss-planet-figure{opacity:0;transition:opacity var(--ss-duration) var(--ss-ease);}',
            '.ss-planet[data-active] .ss-planet-figure{opacity:1;}',
            /* Arc nav */
            '.ss-planet-nav{grid-column:1;grid-row:2;pointer-events:none;z-index:10;display:flex;position:absolute;left:0;right:0;bottom:0;}',
            '.ss-planet-nav svg{display:block;width:auto;height:auto;min-width:100%;max-width:none;min-height:100vh;margin-bottom:-50%;transform-origin:center center;--ss-length:7;--ss-range:160deg;transform:rotate(calc((var(--ss-active,0)/var(--ss-length))*(-1*var(--ss-range))+(var(--ss-range)/2)));transition:transform var(--ss-duration) var(--ss-ease);}',
            '@media(max-width:600px){.ss-planet-nav svg{margin-bottom:-55%;}}',
            '.ss-planet-nav tspan{cursor:pointer;fill:#FFF;pointer-events:auto;opacity:0;transition:opacity var(--ss-duration) linear,font-size var(--ss-duration) var(--ss-ease),font-weight var(--ss-duration) linear;}',
            '.ss-planet-nav tspan[x]{opacity:.6;}',
            '.ss-planet-nav tspan:hover,.ss-planet-nav tspan:focus{opacity:1;}',
            '.ss-planet-nav tspan.ss-nav-active{opacity:1!important;font-size:14px;font-weight:700;}',
            /* Rotacao: prograde (anti-horário) e retrógrado (horário) */
            '@keyframes ss-spin-ccw{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}',
            '@keyframes ss-spin-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
            '.ss-planet[data-active] .ss-planet-figure img{animation:ss-spin-ccw 20s linear infinite;}',
            '.ss-planet[data-planet="venus"][data-active] .ss-planet-figure img{animation:ss-spin-cw 30s linear infinite;}',
            '.ss-planet[data-planet="uranus"][data-active] .ss-planet-figure img{animation:ss-spin-cw 40s linear infinite;}'
        ].join('\n');
    }

    // ---- Logica de selecao ----

    function _getDetails(planet) {
        return { planet:planet, tilt:PLANETS[planet].tilt, gravity:PLANETS[planet].gravity, hours:PLANETS[planet].hours };
    }

    function _selectPlanet(planetKey) {
        if (!_root) return;
        var prev = _currentPlanet;
        var elActive = _root.querySelector('[data-active]');
        if (elActive) delete elActive.dataset.active;

        var elPlanet = _root.querySelector('[data-planet="' + planetKey + '"]');
        if (!elPlanet) return;
        elPlanet.dataset.active = '';
        _currentPlanet = _getDetails(planetKey);

        var elHours = elPlanet.querySelector('[data-detail="hours"]');
        _animateFromTo(prev.hours, _currentPlanet.hours, function (v) { if (elHours) elHours.textContent = String(Math.round(v)); });

        var elTilt = elPlanet.querySelector('[data-detail="tilt"]');
        _animateFromTo(prev.tilt, _currentPlanet.tilt, function (v) { if (elTilt) elTilt.textContent = v.toFixed(2); });

        var elGrav = elPlanet.querySelector('[data-detail="gravity"]');
        _animateFromTo(prev.gravity, _currentPlanet.gravity, function (v) { if (elGrav) elGrav.textContent = v.toFixed(1); });
    }

    function _selectByIndex(i) {
        _currentPlanetIndex = i;
        var svg = _root && _root.querySelector('.ss-planet-nav svg');
        if (svg) svg.style.setProperty('--ss-active', i);
        // Destacar tspan ativo
        var tspans = _root ? _root.querySelectorAll('tspan') : [];
        tspans.forEach(function (t, idx) {
            t.classList.toggle('ss-nav-active', idx === i);
        });
        _selectPlanet(_planetKeys[i]);
    }

    function _advance(dir) {
        _selectByIndex((_currentPlanetIndex + dir + _planetKeys.length) % _planetKeys.length);
    }

    // ---- Inicializacao ----

    function _init() {
        if (!_root) return;
        _currentPlanetIndex = 0;
        _currentPlanet = _getDetails('mercury');

        if (window.Splitting) {
            window.Splitting({ target:'#solar-system-root .ss-planet-title h1', by:'chars' });
        }

        // Setup do arco SVG
        var elNavPath = _root.querySelector('#ss-navPath');
        var elTspans = Array.from(_root.querySelectorAll('tspan'));
        var length = elTspans.length - 1;
        var svg = _root.querySelector('.ss-planet-nav svg');
        if (svg) {
            svg.style.setProperty('--ss-length', length);
            svg.style.setProperty('--ss-active', 0);
        }
        if (elNavPath && elTspans.length > 0) {
            var navPathLength = elNavPath.getTotalLength();
            var lastLen = elTspans[length].getComputedTextLength ? elTspans[length].getComputedTextLength() : 0;
            navPathLength -= lastLen;
            elTspans.forEach(function (tspan, i) {
                tspan.setAttribute('x', (i / length) * navPathLength);
                tspan.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (_scrollCooldown) return;
                    _scrollCooldown = true;
                    setTimeout(function () { _scrollCooldown = false; }, 850);
                    _selectByIndex(i);
                });
            });
        }
        // Marcar o primeiro como ativo
        if (elTspans[0]) elTspans[0].classList.add('ss-nav-active');

        var closeBtn = _root.querySelector('.ss-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                if (window.fecharJoguinhos) window.fecharJoguinhos();
                else window.SolarSystemGame.fechar();
            });
        }

        _onKeyDown = function (e) {
            if (e.key === 'Escape') {
                if (window.fecharJoguinhos) window.fecharJoguinhos();
                else window.SolarSystemGame.fechar();
            }
            if (e.key === 'ArrowRight') _advance(1);
            if (e.key === 'ArrowLeft')  _advance(-1);
        };
        window.addEventListener('keydown', _onKeyDown);

        // Scroll para navegar entre planetas
        _onWheel = function (e) {
            e.preventDefault();
            if (_scrollCooldown) return;
            _scrollCooldown = true;
            setTimeout(function () { _scrollCooldown = false; }, 850);
            _advance(e.deltaY > 0 ? 1 : -1);
        };
        _root.addEventListener('wheel', _onWheel, { passive: false });

        // Drag touch com feedback visual
        _onTouchStart = function (e) {
            _touchStartX = e.touches[0].clientX;
            var active = _root.querySelector('.ss-planet[data-active]');
            if (active) active.style.transition = 'none';
        };
        _onTouchMove = function (e) {
            var dx = e.touches[0].clientX - _touchStartX;
            var active = _root.querySelector('.ss-planet[data-active]');
            if (!active) return;
            var tx = dx * 0.45;
            var fade = 1 - Math.min(Math.abs(dx) / 380, 0.45);
            active.style.transform = 'translateX(' + tx + 'px)';
            active.style.opacity = String(fade);
        };
        _onTouchEnd = function (e) {
            var dx = e.changedTouches[0].clientX - _touchStartX;
            var active = _root ? _root.querySelector('.ss-planet[data-active]') : null;
            if (active) {
                if (Math.abs(dx) >= 60 && !_scrollCooldown) {
                    // Avanca: reset instantaneo antes da troca
                    active.style.transition = 'none';
                    active.style.transform = '';
                    active.style.opacity = '';
                } else {
                    // Snap back com animacao
                    active.style.transition = 'transform .35s cubic-bezier(.25,.46,.45,.94), opacity .35s ease';
                    active.style.transform = '';
                    active.style.opacity = '';
                }
            }
            if (_scrollCooldown || Math.abs(dx) < 60) return;
            _scrollCooldown = true;
            setTimeout(function () { _scrollCooldown = false; }, 850);
            _advance(dx < 0 ? 1 : -1);
        };
        _root.addEventListener('touchstart', _onTouchStart, { passive: true });
        _root.addEventListener('touchmove', _onTouchMove, { passive: true });
        _root.addEventListener('touchend', _onTouchEnd, { passive: true });
    }

    function _loadSplitting(cb) {
        if (window.Splitting) { cb(); return; }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/splitting@1.0.6/dist/splitting.css';
        document.head.appendChild(link);

        var script = document.createElement('script');
        script.src = 'https://unpkg.com/splitting@1.0.6/dist/splitting.min.js';
        script.onload = cb;
        document.head.appendChild(script);
    }

    // ---- API Publica ----

    var SolarSystemGame = {
        abrir: function () {
            if (_root) return;

            _styleTag = document.createElement('style');
            _styleTag.id = 'solar-system-styles';
            _styleTag.textContent = _buildCSS();
            document.head.appendChild(_styleTag);

            _root = document.createElement('div');
            _root.id = 'solar-system-root';

            var appDiv = document.createElement('div');
            appDiv.id = 'solar-app';
            appDiv.dataset.currentPlanet = 'mercury';

            appDiv.appendChild(_buildCloseBtn());
            appDiv.appendChild(_buildNav());
            _planetKeys.forEach(function (k, i) {
                appDiv.appendChild(_buildPlanetEl(k, i === 0));
            });

            _root.appendChild(appDiv);
            document.body.appendChild(_root);

            _loadSplitting(function () { _init(); });
        },

        fechar: function () {
            _animFrames.forEach(function (id) { cancelAnimationFrame(id); });
            _animFrames = [];
            if (_onKeyDown)     { window.removeEventListener('keydown', _onKeyDown); _onKeyDown = null; }
            if (_onWheel)       { if (_root) _root.removeEventListener('wheel', _onWheel); _onWheel = null; }
            if (_onTouchStart)  { if (_root) _root.removeEventListener('touchstart', _onTouchStart); _onTouchStart = null; }
            if (_onTouchMove)   { if (_root) _root.removeEventListener('touchmove', _onTouchMove);  _onTouchMove = null; }
            if (_onTouchEnd)    { if (_root) _root.removeEventListener('touchend', _onTouchEnd);   _onTouchEnd = null; }
            if (_root) { _root.remove(); _root = null; }
            if (_styleTag) { _styleTag.remove(); _styleTag = null; }
            _currentPlanetIndex = 0;
            _currentPlanet = null;
            _scrollCooldown = false;
        }
    };

    window.SolarSystemGame = SolarSystemGame;

}());

// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Visual: Game Boy Classic (corpo cinza, moldura preta, botões vinho)
// Controles: D-pad + B/A + Start no parent overlay
// Input relay: KeyboardEvent → iframe.contentWindow (srcdoc = same-origin)
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay  = null;
    var _iframe   = null;
    var _onKey    = null;
    var _onResize = null;
    var _ac       = null; // AbortController para cleanup de listeners

    // ── Relay de teclado ──────────────────────────────────────────────
    var _CODE = {z:'KeyZ',x:'KeyX',Enter:'Enter',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'};
    var _KC   = {z:90,x:88,Enter:13,ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39};

    function _press(key) {
        if (!_iframe) return function(){};
        var win = _iframe.contentWindow;
        var doc = _iframe.contentDocument;
        if (!win) return function(){};

        function _fire(type) {
            var opts = {key:key, code:_CODE[key]||key, keyCode:_KC[key]||0, which:_KC[key]||0, bubbles:true, cancelable:true};
            // Despacha para window, document e canvas para cobrir todos os listeners do EJS
            win.dispatchEvent(new KeyboardEvent(type, opts));
            if (doc) {
                doc.dispatchEvent(new KeyboardEvent(type, opts));
                var cv = doc.querySelector('canvas');
                if (cv) cv.dispatchEvent(new KeyboardEvent(type, opts));
            }
        }

        _fire('keydown');
        return function() { _fire('keyup'); };
    }

    function _addBtn(el, key, signal) {
        var release = null;
        el.addEventListener('touchstart', function(e) {
            e.preventDefault();
            release = _press(key);
        }, {passive:false, signal:signal});
        el.addEventListener('touchend', function(e) {
            e.preventDefault();
            if (release) { release(); release = null; }
        }, {passive:false, signal:signal});
        el.addEventListener('touchcancel', function() {
            if (release) { release(); release = null; }
        }, {signal:signal});
        el.addEventListener('mousedown', function() { release = _press(key); }, {signal:signal});
        el.addEventListener('mouseup',   function() {
            if (release) { release(); release = null; }
        }, {signal:signal});
    }

    // ── Ajuste de altura do iframe ─────────────────────────────────────
    function _updateIframeHeight() {
        if (!_iframe) return;
        var parent = _iframe.parentElement;
        if (!parent) return;
        var w = parent.clientWidth;
        _iframe.style.height = Math.round(w * (224 / 320)) + 'px';
    }

    // ── Criação do overlay ────────────────────────────────────────────
    function _criarOverlay(romUrl) {
        var absRom = new URL(romUrl, window.location.href).href;
        _ac = new AbortController();
        var sig = _ac.signal;

        // ── Corpo do console ──
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0', zIndex: '9000',
            background: 'linear-gradient(180deg,#D0D0C8 0%,#B8B8B0 60%,#A8A8A0 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
        });

        // ── Seção da tela ──
        var screenSection = document.createElement('div');
        Object.assign(screenSection.style, {
            width: '100%', flexShrink: '0',
        });

        // Moldura plástica da tela — edge-to-edge para máxima área de jogo
        var bezel = document.createElement('div');
        Object.assign(bezel.style, {
            background: '#1a1a1a',
            padding: '5px 5px 4px',
            boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.9)',
        });

        // Inner screen (verde escuro como LCD Game Boy desligado)
        var screenInner = document.createElement('div');
        Object.assign(screenInner.style, {
            background: '#0a0f08',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)',
        });

        // iframe — canvas do emulador
        _iframe = document.createElement('iframe');
        Object.assign(_iframe.style, {
            display: 'block', width: '100%',
            border: 'none', verticalAlign: 'bottom',
        });
        _iframe.setAttribute('allowfullscreen', '');
        _iframe.setAttribute('allow', 'autoplay; gamepad *');

        screenInner.appendChild(_iframe);
        bezel.appendChild(screenInner);
        screenSection.appendChild(bezel);

        // Barra inferior do bezel: logo + LED
        var logoBar = document.createElement('div');
        Object.assign(logoBar.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 10px 5px',
            background: '#1a1a1a',
        });

        var logo = document.createElement('span');
        logo.textContent = 'GAME BOY';
        Object.assign(logo.style, {
            fontFamily: '"Russo One",sans-serif',
            fontSize: '13px', letterSpacing: '2px',
            color: '#1a1aaa',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        });

        var ledWrap = document.createElement('div');
        Object.assign(ledWrap.style, {
            display: 'flex', alignItems: 'center', gap: '4px',
        });
        var ledLabel = document.createElement('span');
        ledLabel.textContent = 'BATTERY';
        Object.assign(ledLabel.style, {
            fontFamily: '"Russo One",sans-serif',
            fontSize: '7px', color: '#555', letterSpacing: '1px',
        });
        var led = document.createElement('div');
        Object.assign(led.style, {
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00ff44',
            boxShadow: '0 0 6px #00ff44, 0 0 12px rgba(0,255,68,0.5)',
        });
        ledWrap.appendChild(ledLabel);
        ledWrap.appendChild(led);
        logoBar.appendChild(logo);
        logoBar.appendChild(ledWrap);
        screenSection.appendChild(logoBar);

        _overlay.appendChild(screenSection);

        // ── Divisória ──
        var divider = document.createElement('div');
        Object.assign(divider.style, {
            width: '100%', height: '3px',
            background: 'linear-gradient(90deg,#9a9a92,#888880,#9a9a92)',
            flexShrink: '0',
            marginTop: '8px',
        });
        _overlay.appendChild(divider);

        // ── Área de controles ──
        var controls = document.createElement('div');
        Object.assign(controls.style, {
            flex: '1', width: '100%',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            position: 'relative',
            background: 'linear-gradient(180deg,#B0B0A8 0%,#A8A8A0 100%)',
        });

        // ── D-pad ──
        var dpadWrap = document.createElement('div');
        Object.assign(dpadWrap.style, {
            width: '108px', height: '108px',
            position: 'relative', flexShrink: '0',
        });

        // D-pad visual: barra horizontal
        var dpadH = document.createElement('div');
        Object.assign(dpadH.style, {
            position: 'absolute', top: '33.33%', left: '0',
            width: '100%', height: '33.34%',
            background: 'linear-gradient(180deg,#3a3a3a,#282828)',
            borderRadius: '6px',
            boxShadow: '0 4px 0 #1a1a1a, 0 5px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        });

        var dpadV = document.createElement('div');
        Object.assign(dpadV.style, {
            position: 'absolute', left: '33.33%', top: '0',
            width: '33.34%', height: '100%',
            background: 'linear-gradient(90deg,#3a3a3a,#282828,#3a3a3a)',
            borderRadius: '6px',
            boxShadow: '4px 0 0 #1a1a1a, 5px 0 8px rgba(0,0,0,0.5), inset 1px 0 0 rgba(255,255,255,0.08)',
        });

        var dpadCenter = document.createElement('div');
        Object.assign(dpadCenter.style, {
            position: 'absolute', top: '33.33%', left: '33.33%',
            width: '33.34%', height: '33.34%',
            background: '#404040',
            zIndex: '1',
        });

        dpadWrap.appendChild(dpadH);
        dpadWrap.appendChild(dpadV);
        dpadWrap.appendChild(dpadCenter);

        // Zonas de toque do D-pad (invisíveis, sobre o visual)
        var dirs = [
            {key:'ArrowUp',    t:'0',     l:'33.33%', w:'33.34%', h:'40%'},
            {key:'ArrowDown',  t:'60%',   l:'33.33%', w:'33.34%', h:'40%'},
            {key:'ArrowLeft',  t:'33.33%',l:'0',      w:'40%',    h:'33.34%'},
            {key:'ArrowRight', t:'33.33%',l:'60%',    w:'40%',    h:'33.34%'},
        ];
        dirs.forEach(function(d) {
            var zone = document.createElement('div');
            Object.assign(zone.style, {
                position: 'absolute', top: d.t, left: d.l, width: d.w, height: d.h,
                zIndex: '2', cursor: 'pointer',
            });
            _addBtn(zone, d.key, sig);
            dpadWrap.appendChild(zone);
        });

        controls.appendChild(dpadWrap);

        // ── Centro: START ──
        var centerCol = document.createElement('div');
        Object.assign(centerCol.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '12px', flexShrink: '0',
        });

        var btnStart = document.createElement('button');
        btnStart.textContent = 'START';
        Object.assign(btnStart.style, {
            width: '76px', height: '28px',
            background: 'linear-gradient(180deg,#909088,#787870)',
            border: '2px solid #686860',
            borderRadius: '14px',
            color: '#2a2a28',
            fontFamily: '"Russo One",sans-serif',
            fontSize: '10px', letterSpacing: '1.5px',
            cursor: 'pointer',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35), 0 2px 0 #585850',
            WebkitTapHighlightColor: 'transparent',
        });
        _addBtn(btnStart, 'Enter', sig);

        centerCol.appendChild(btnStart);
        controls.appendChild(centerCol);

        // ── A e B ──
        var actionWrap = document.createElement('div');
        Object.assign(actionWrap.style, {
            position: 'relative', width: '100px', height: '108px', flexShrink: '0',
        });

        function _makeBtn(label, size, top, right, shadowSize) {
            var btn = document.createElement('button');
            btn.textContent = label;
            Object.assign(btn.style, {
                position: 'absolute', top: top, right: right,
                width: size + 'px', height: size + 'px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg,#9B2040,#7B1030)',
                border: '2px solid #5A0820',
                color: '#f0d0d8',
                fontFamily: '"Russo One",sans-serif',
                fontSize: Math.round(size * 0.33) + 'px',
                cursor: 'pointer',
                boxShadow: '0 ' + shadowSize + 'px 0 #4A0018,' +
                    '0 ' + (shadowSize + 3) + 'px 12px rgba(0,0,0,0.5),' +
                    'inset 0 2px 0 rgba(255,255,255,0.18),' +
                    'inset 0 -2px 4px rgba(0,0,0,0.3)',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            });
            // Active press effect via JS (CSS active não funciona bem em touch)
            function _down() {
                btn.style.transform = 'translateY(' + shadowSize + 'px)';
                btn.style.boxShadow = '0 1px 0 #4A0018,0 2px 6px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.12),inset 0 -1px 3px rgba(0,0,0,0.3)';
            }
            function _up() {
                btn.style.transform = '';
                btn.style.boxShadow = '0 ' + shadowSize + 'px 0 #4A0018,' +
                    '0 ' + (shadowSize + 3) + 'px 12px rgba(0,0,0,0.5),' +
                    'inset 0 2px 0 rgba(255,255,255,0.18),' +
                    'inset 0 -2px 4px rgba(0,0,0,0.3)';
            }
            btn.addEventListener('touchstart', _down, {passive:true, signal:sig});
            btn.addEventListener('touchend',   _up,   {passive:true, signal:sig});
            btn.addEventListener('mousedown',  _down, {signal:sig});
            btn.addEventListener('mouseup',    _up,   {signal:sig});
            return btn;
        }

        // B (pulo — principal, maior, canto direito superior)
        var btnB = _makeBtn('B', 72, '0', '0', 5);
        // A (secundário, menor, abaixo-esq do B)
        var btnA = _makeBtn('A', 58, '44px', '60px', 4);

        _addBtn(btnB, 'z', sig);
        _addBtn(btnA, 'x', sig);

        actionWrap.appendChild(btnB);
        actionWrap.appendChild(btnA);
        controls.appendChild(actionWrap);

        _overlay.appendChild(controls);

        // ── Botão Sair ──
        var exitRow = document.createElement('div');
        Object.assign(exitRow.style, {
            width: '100%', padding: '0 16px 12px',
            display: 'flex', alignItems: 'center',
            background: 'linear-gradient(180deg,#A8A8A0,#989890)',
            flexShrink: '0',
        });

        var exitBtn = document.createElement('button');
        exitBtn.innerHTML = '<span class="material-icons" style="font-size:16px;vertical-align:middle;pointer-events:none;">arrow_back</span>' +
            '<span style="margin-left:4px;pointer-events:none;">Sair</span>';
        Object.assign(exitBtn.style, {
            display: 'inline-flex', alignItems: 'center',
            padding: '6px 14px',
            background: 'linear-gradient(180deg,#909088,#787870)',
            border: '2px solid #686860',
            borderRadius: '14px',
            color: '#2a2a28',
            fontFamily: 'Inter,sans-serif',
            fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 0 #585850',
            WebkitTapHighlightColor: 'transparent',
            minHeight: '40px', minWidth: '72px',
        });
        exitBtn.addEventListener('click', function() { history.back(); }, {signal:sig});
        exitRow.appendChild(exitBtn);
        _overlay.appendChild(exitRow);

        // ── srcdoc do iframe ──
        var ejsButtons = JSON.stringify({
            playPause:false, restart:false, mute:false, settings:false,
            fullscreen:false, saveState:false, loadState:false,
            screenRecord:false, gamepad:false, cheat:false,
            volume:false, netplay:false,
            saveSavFiles:false, loadSavFiles:false, quickSave:false,
            quickLoad:false, screenshot:false, cacheManager:false,
            exitEmulation:false,
        });

        _iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100%;overflow:hidden}',
            '#ejs-game{width:100%;height:100%}',
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            // Esconder gamepad EJS — usamos controles customizados no parent
            '.ejs_virtualGamepad_parent{display:none!important}',
            // Canvas preenche tudo sem scroll
            'canvas{display:block!important;width:100%!important;height:auto!important;max-width:100%!important}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "genesis_plus_gx";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#8B1A3A";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            // Keybindings explícitos (RetroArch defaults para Mega Drive)
            'window.EJS_defaultOptions = {',
            '  "p1_up":"ArrowUp","p1_down":"ArrowDown",',
            '  "p1_left":"ArrowLeft","p1_right":"ArrowRight",',
            '  "p1_b":"z","p1_y":"x","p1_start":"Enter",',
            '};',
            'window.EJS_onGameStart = function(){',
            '  var c = document.querySelector("canvas");',
            '  if(c){c.setAttribute("tabindex","0");c.focus();}',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        document.body.appendChild(_overlay);

        // ── Resize handler ──
        _onResize = function() { _updateIframeHeight(); };
        window.addEventListener('resize', _onResize);
        // Ajuste inicial (após render)
        setTimeout(_updateIframeHeight, 50);

        // ESC para sair
        _onKey = function(e) {
            if (e.key === 'Escape' && e.target === document.body) history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    window.MegadriveGame = {
        abrir: function(romUrl) {
            if (_overlay) return;
            _criarOverlay(romUrl || ROM_DEFAULT);
        },
        fechar: function() {
            if (_ac)      { _ac.abort(); _ac = null; }
            if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_onResize){ window.removeEventListener('resize', _onResize); _onResize = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
            _iframe = null;
        },
    };

})();

// =====================================================================
// donkeykong.js — Donkey Kong (Atari 7800) via EmulatorJS
// =====================================================================
// Core: prosystem (RetroArch/WASM) carregado via CDN EmulatorJS.
// ROM:  assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78
//
// Layout responsivo:
//   portrait  → iframe no topo + painel de controles na base
//   landscape → iframe fullscreen + paineis laterais sobrepostos
//
// Input via EJS_emulator.gameManager.simulateInput (RetroPad).
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';
    var ROM     = 'assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78';

    var _overlay           = null;
    var _onKey             = null;
    var _iframe            = null;
    var _resizeHandler     = null;
    var _landscapeControls = null;
    var _portraitControls  = null;
    var _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };

    // ---- Input ----

    function _sim(btnId, val) {
        if (!_iframe) return;
        var iw = _iframe.contentWindow;
        if (iw && iw.EJS_emulator && iw.EJS_emulator.gameManager) {
            iw.EJS_emulator.gameManager.simulateInput(0, btnId, val);
        }
    }

    function _press(id) {
        if (!(id in _pressCount)) { _sim(id, 1); return; }
        _pressCount[id] += 1;
        if (_pressCount[id] === 1) _sim(id, 1);
    }
    function _release(id) {
        if (!(id in _pressCount)) { _sim(id, 0); return; }
        if (_pressCount[id] <= 0) return;
        _pressCount[id] -= 1;
        if (_pressCount[id] === 0) _sim(id, 0);
    }

    // ---- Botoes ----

    // Botao pequeno em pilula (PAUSE / SELECT)
    function _makeSmallBtn(text, btnId) {
        var btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            width: '64px', height: '22px',
            borderRadius: '11px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(50,40,20,0.85)',
            color: '#fcd34d',
            fontSize: '9px',
            fontFamily: "'Russo One', sans-serif",
            letterSpacing: '1px',
            cursor: 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
        });
        btn.addEventListener('pointerdown',   function (e) { e.preventDefault(); _sim(btnId, 1); btn.style.background = 'rgba(120,90,30,0.9)'; });
        btn.addEventListener('pointerup',     function (e) { e.preventDefault(); _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.85)'; });
        btn.addEventListener('pointerleave',  function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.85)'; });
        btn.addEventListener('pointercancel', function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.85)'; });
        return btn;
    }

    // D-pad em grade 3x3
    function _makeDpad() {
        var wrap = document.createElement('div');
        Object.assign(wrap.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 40px)',
            gridTemplateRows: 'repeat(3, 40px)',
            gap: '2px',
            flexShrink: '0',
        });
        var dirs = [
            { row: 1, col: 2, text: '\u25b2', id: 4 },  // Up
            { row: 2, col: 1, text: '\u25c4', id: 6 },  // Left
            { row: 2, col: 3, text: '\u25ba', id: 7 },  // Right
            { row: 3, col: 2, text: '\u25bc', id: 5 },  // Down
        ];
        dirs.forEach(function (d) {
            var btn = document.createElement('button');
            btn.textContent = d.text;
            Object.assign(btn.style, {
                gridRow: String(d.row),
                gridColumn: String(d.col),
                background: 'rgba(80,60,30,0.9)',
                border: '1px solid rgba(255,200,100,0.25)',
                borderRadius: '4px',
                color: '#fcd34d',
                fontSize: '16px',
                cursor: 'pointer',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            });
            var id = d.id;
            var pressed = false;
            var down = function (e) {
                if (e) e.preventDefault();
                if (pressed) return;
                pressed = true;
                _press(id);
                btn.style.background = 'rgba(150,110,40,0.95)';
            };
            var up = function (e) {
                if (e) e.preventDefault();
                if (!pressed) return;
                pressed = false;
                _release(id);
                btn.style.background = 'rgba(80,60,30,0.9)';
            };
            btn.addEventListener('pointerdown',   down);
            btn.addEventListener('pointerup',     up);
            btn.addEventListener('pointerleave',  up);
            btn.addEventListener('pointercancel', up);
            wrap.appendChild(btn);
        });
        var center = document.createElement('div');
        Object.assign(center.style, {
            gridRow: '2', gridColumn: '2',
            background: 'rgba(40,30,10,0.9)', borderRadius: '4px',
        });
        wrap.appendChild(center);
        return wrap;
    }

    // Botao FIRE grande (laranja DK)
    function _makeFireBtn() {
        var btn = document.createElement('button');
        btn.textContent = 'FIRE';
        Object.assign(btn.style, {
            width: '96px', height: '96px',
            borderRadius: '50%',
            border: '3px solid rgba(255,230,150,0.3)',
            background: 'linear-gradient(145deg,#f59e0b,#b45309)',
            color: '#fff',
            fontSize: '16px',
            fontFamily: "'Russo One', sans-serif",
            fontWeight: 'bold',
            cursor: 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
            boxShadow: '0 4px 14px rgba(245,158,11,0.45), inset 0 -4px 6px rgba(0,0,0,0.3)',
            letterSpacing: '1px',
        });
        var pressed = false;
        var down = function (e) {
            if (e) e.preventDefault();
            if (pressed) return;
            pressed = true;
            _sim(8, 1);
            btn.style.opacity = '0.75';
            btn.style.transform = 'scale(0.93)';
        };
        var up = function (e) {
            if (e) e.preventDefault();
            if (!pressed) return;
            pressed = false;
            _sim(8, 0);
            btn.style.opacity = '';
            btn.style.transform = '';
        };
        btn.addEventListener('pointerdown',   down);
        btn.addEventListener('pointerup',     up);
        btn.addEventListener('pointerleave',  up);
        btn.addEventListener('pointercancel', up);
        return btn;
    }

    // ---- Layout responsivo ----

    // Paineis laterais para landscape (sobrepostos sobre iframe fullscreen)
    function _buildLandscapeControls() {
        var lc = document.createElement('div');
        Object.assign(lc.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: '0',
            display: 'none',            // _applyLayout ativa
            gridTemplateColumns: '130px 1fr 140px',
            alignItems: 'center',
            pointerEvents: 'none',      // centro passa toque pro iframe
            zIndex: '10',
        });

        var leftPanel = document.createElement('div');
        Object.assign(leftPanel.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px', height: '100%', padding: '10px 8px',
            background: 'rgba(17,17,17,0.92)',
            pointerEvents: 'all', overflow: 'hidden',
        });
        leftPanel.appendChild(_makeDpad());
        leftPanel.appendChild(_makeSmallBtn('SELECT', 2));

        var centerSpacer = document.createElement('div'); // transparente, pass-through

        var rightPanel = document.createElement('div');
        Object.assign(rightPanel.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '14px', height: '100%', padding: '10px 8px',
            background: 'rgba(17,17,17,0.92)',
            pointerEvents: 'all', overflow: 'hidden',
        });
        rightPanel.appendChild(_makeFireBtn());
        rightPanel.appendChild(_makeSmallBtn('PAUSE', 3));

        lc.appendChild(leftPanel);
        lc.appendChild(centerSpacer);
        lc.appendChild(rightPanel);
        return lc;
    }

    // Painel inferior para portrait (controles numa faixa na base da tela)
    function _buildPortraitControls() {
        var pc = document.createElement('div');
        Object.assign(pc.style, {
            position: 'absolute',
            left: '0', right: '0', bottom: '0',
            height: '200px',
            background: 'rgba(15,23,42,0.97)',
            display: 'none',            // _applyLayout ativa
            flexDirection: 'column',
            padding: '8px 16px',
            gap: '8px',
            overflow: 'hidden',
            zIndex: '10',
        });

        // Linha 1: SELECT + PAUSE centralizados
        var row1 = document.createElement('div');
        Object.assign(row1.style, {
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            gap: '24px', flexShrink: '0',
        });
        row1.appendChild(_makeSmallBtn('SELECT', 2));
        row1.appendChild(_makeSmallBtn('PAUSE', 3));

        // Linha 2: D-pad esquerda + FIRE direita
        var row2 = document.createElement('div');
        Object.assign(row2.style, {
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-around',
            flex: '1',
        });
        row2.appendChild(_makeDpad());
        row2.appendChild(_makeFireBtn());

        pc.appendChild(row1);
        pc.appendChild(row2);
        return pc;
    }

    // Ajusta iframe e visibilidade dos paineis conforme orientacao
    function _applyLayout() {
        if (!_iframe || !_landscapeControls || !_portraitControls) return;
        var portrait = window.innerHeight > window.innerWidth;

        if (portrait) {
            Object.assign(_iframe.style, {
                position: 'absolute',
                top: '0', left: '0', right: '0', bottom: 'auto',
                width: '100%', height: 'calc(100% - 200px)',
            });
        } else {
            Object.assign(_iframe.style, {
                position: 'absolute',
                top: '0', left: '0', right: '0', bottom: '0',
                width: '100%', height: '100%',
            });
        }

        _landscapeControls.style.display = portrait ? 'none' : 'grid';
        _portraitControls.style.display  = portrait ? 'flex' : 'none';
    }

    // ---- Launch ----

    function _criarOverlay() {
        var absRom = new URL(
            ROM.split('/').map(encodeURIComponent).join('/'),
            window.location.href
        ).href;

        _overlay = document.createElement('div');
        _overlay.id = 'donkeykong-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed',
            top: '0', left: '0', right: '0', bottom: '0',
            background: '#111', zIndex: '9000',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
        });

        // Iframe fullscreen — posicao ajustada dinamicamente por _applyLayout
        _iframe = document.createElement('iframe');
        Object.assign(_iframe.style, { border: 'none', display: 'block' });
        _iframe.setAttribute('allowfullscreen', '');
        _iframe.setAttribute('allow', 'autoplay; gamepad *');

        var ejsButtons = JSON.stringify({
            playPause: false, restart: false, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        _iframe.srcdoc = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}',
            '#ejs-game{width:100%;height:100vh}',
            '.ejs_menu_bar,.ejs-menu,.ejs_virtualGamepad_parent{display:none!important}',
            'canvas{display:block!important;margin:0 auto!important}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player="#ejs-game";',
            'window.EJS_core="prosystem";',
            'window.EJS_gameUrl=' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata=' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color="#f59e0b";',
            'window.EJS_startOnLoaded=true;',
            'window.EJS_VirtualGamepadSettings=[];',
            'window.EJS_Buttons=' + ejsButtons + ';',
            'window.EJS_onGameStart=function(){var c=document.querySelector("canvas");if(c){c.setAttribute("tabindex","0");c.focus();}};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        // Botao fechar — z-index acima dos paineis de controle
        var exitBtn = document.createElement('button');
        var exitIcon = document.createElement('span');
        exitIcon.className = 'material-icons';
        exitIcon.textContent = 'close';
        exitIcon.style.fontSize = '16px';
        exitIcon.style.pointerEvents = 'none';
        exitBtn.appendChild(exitIcon);
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: '8px', right: '8px', zIndex: '30',
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#f1f5f9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
        });
        exitBtn.addEventListener('click', function () {
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
        });

        // Paineis de controle portrait e landscape
        _landscapeControls = _buildLandscapeControls();
        _portraitControls  = _buildPortraitControls();

        _overlay.appendChild(_iframe);
        _overlay.appendChild(exitBtn);
        _overlay.appendChild(_landscapeControls);
        _overlay.appendChild(_portraitControls);
        document.body.appendChild(_overlay);

        // Layout inicial + listener para mudancas de orientacao/tamanho
        _applyLayout();
        _resizeHandler = function () { _applyLayout(); };
        window.addEventListener('resize', _resizeHandler);
        window.addEventListener('orientationchange', _resizeHandler);

        _onKey = function (e) {
            if (e.key === 'Escape') {
                window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
            }
        };
        document.addEventListener('keydown', _onKey);
    }

    // ---- API publica ----

    window.DonkeyKongGame = {
        abrir: function () {
            if (_overlay) return;
            _criarOverlay();
        },
        fechar: function () {
            if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_resizeHandler) {
                window.removeEventListener('resize', _resizeHandler);
                window.removeEventListener('orientationchange', _resizeHandler);
                _resizeHandler = null;
            }
            if (_overlay) { _overlay.remove(); _overlay = null; }
            _landscapeControls = null;
            _portraitControls  = null;
            _iframe = null;
            _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };
        },
    };
})();

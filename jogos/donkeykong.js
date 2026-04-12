// =====================================================================
// donkeykong.js — Donkey Kong (Atari 7800) via EmulatorJS
// =====================================================================
// Core: prosystem (RetroArch/WASM) carregado via CDN EmulatorJS.
// ROM:  assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78
//
// Layout PSP landscape (mesma logica de snes.js):
//   [ D-pad ] [ tela ] [ FIRE + PAUSE ]
//
// Orientation lock em landscape; fallback mostra hint "gire o celular".
// Input via EJS_emulator.gameManager.simulateInput (RetroPad).
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';
    var ROM     = 'assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78';

    var _overlay = null;
    var _onKey   = null;
    var _iframe  = null;
    var _resizeHandler = null;
    var _rotateHint    = null;
    var _orientationLocked = false;
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

    // ---- Orientation ----

    function _tryLockLandscape() {
        if (_orientationLocked) return;
        var lockLandscape = function () {
            try {
                if (screen.orientation && typeof screen.orientation.lock === 'function') {
                    var p = screen.orientation.lock('landscape');
                    if (p && typeof p.then === 'function') {
                        p.then(function () { _orientationLocked = true; _updateRotateHint(); })
                         .catch(function () { /* fallback vira hint */ });
                    }
                }
            } catch (e) { /* ignora */ }
        };
        var el = _overlay || document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen ||
                  el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) {
            try {
                var fp = req.call(el);
                if (fp && typeof fp.then === 'function') {
                    fp.then(lockLandscape).catch(lockLandscape);
                } else {
                    lockLandscape();
                }
            } catch (e) { lockLandscape(); }
        } else {
            lockLandscape();
        }
    }

    function _exitFullscreen() {
        try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                var ex = document.exitFullscreen || document.webkitExitFullscreen ||
                         document.mozCancelFullScreen || document.msExitFullscreen;
                if (ex) ex.call(document);
            }
        } catch (e) { /* ignora */ }
    }

    function _unlockOrientation() {
        try {
            if (screen.orientation && typeof screen.orientation.unlock === 'function') {
                screen.orientation.unlock();
            }
        } catch (e) { /* ignora */ }
        _orientationLocked = false;
        _exitFullscreen();
    }

    function _updateRotateHint() {
        if (!_overlay || !_rotateHint) return;
        _rotateHint.style.display = (window.innerHeight > window.innerWidth) ? 'flex' : 'none';
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

    // ---- Launch ----

    function _criarOverlay() {
        var absRom = new URL(
            ROM.split('/').map(encodeURIComponent).join('/'),
            window.location.href
        ).href;

        _overlay = document.createElement('div');
        _overlay.id = 'donkeykong-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#111', zIndex: '9000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
        });

        // Grade PSP: [painel esquerdo] [tela central] [painel direito]
        var psp = document.createElement('div');
        Object.assign(psp.style, {
            display: 'grid',
            gridTemplateColumns: '130px 1fr 140px',
            width: '100%', height: '100%',
            alignItems: 'center',
        });

        // --- Painel esquerdo: D-pad ---
        var leftPanel = document.createElement('div');
        Object.assign(leftPanel.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px',
            height: '100%',
            padding: '10px 8px',
            overflow: 'hidden',
        });
        leftPanel.appendChild(_makeDpad());
        leftPanel.appendChild(_makeSmallBtn('SELECT', 2));

        // --- Painel central: iframe + fechar ---
        var centerPanel = document.createElement('div');
        Object.assign(centerPanel.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%',
            position: 'relative',
        });

        _iframe = document.createElement('iframe');
        Object.assign(_iframe.style, {
            width: '100%', height: '100%',
            border: 'none', display: 'block',
        });
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

        centerPanel.appendChild(_iframe);

        // Botao fechar
        var exitBtn = document.createElement('button');
        var exitIcon = document.createElement('span');
        exitIcon.className = 'material-icons';
        exitIcon.textContent = 'close';
        exitIcon.style.fontSize = '16px';
        exitIcon.style.pointerEvents = 'none';
        exitBtn.appendChild(exitIcon);
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: '8px', right: '8px',
            zIndex: '10',
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#f1f5f9',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
        });
        exitBtn.addEventListener('click', function () {
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
        });
        centerPanel.appendChild(exitBtn);

        // --- Painel direito: FIRE + PAUSE ---
        var rightPanel = document.createElement('div');
        Object.assign(rightPanel.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '14px',
            height: '100%',
            padding: '10px 8px',
            overflow: 'hidden',
        });
        rightPanel.appendChild(_makeFireBtn());
        rightPanel.appendChild(_makeSmallBtn('PAUSE', 3));

        psp.appendChild(leftPanel);
        psp.appendChild(centerPanel);
        psp.appendChild(rightPanel);
        _overlay.appendChild(psp);

        // Hint de rotacao
        _rotateHint = document.createElement('div');
        Object.assign(_rotateHint.style, {
            position: 'absolute', inset: '0',
            background: 'rgba(15,23,42,0.95)',
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px',
            color: '#f1f5f9',
            fontFamily: "'Russo One', sans-serif",
            zIndex: '20',
            pointerEvents: 'none',
        });
        var hintIcon = document.createElement('span');
        hintIcon.className = 'material-icons';
        hintIcon.textContent = 'screen_rotation';
        Object.assign(hintIcon.style, { fontSize: '64px', color: '#fcd34d' });
        var hintText = document.createElement('div');
        hintText.textContent = 'Gire o celular';
        Object.assign(hintText.style, { fontSize: '1.1rem', letterSpacing: '1px' });
        _rotateHint.appendChild(hintIcon);
        _rotateHint.appendChild(hintText);
        _overlay.appendChild(_rotateHint);

        document.body.appendChild(_overlay);

        _tryLockLandscape();
        _updateRotateHint();
        _resizeHandler = function () { _updateRotateHint(); };
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
            _unlockOrientation();
            if (_overlay) { _overlay.remove(); _overlay = null; }
            _rotateHint = null;
            _iframe = null;
            _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };
        },
    };
})();

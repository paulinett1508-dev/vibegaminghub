// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
//
// EmulatorJS usa `const` no escopo do script — carregar o mesmo script duas
// vezes na mesma pagina causa SyntaxError ("already declared").
// Solucao: cada abertura cria um <iframe srcdoc> com escopo JS isolado.
// Fechar o overlay remove o iframe e destroi o escopo completamente.
//
// Gamepad custom no parent overlay: D-pad + botoes A/B + Start.
// Injeta KeyboardEvents no contentWindow do iframe (mesmo origin via srcdoc).
// Teclas: ArrowKeys=D-pad, Z=B(pular), X=A(spin), Enter=Start
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay = null;
    var _onKey   = null;

    // Injeta evento de teclado no iframe (srcdoc = mesmo origin)
    // Emscripten registra listeners no canvas E no window — disparamos nos dois
    function _sendKey(key, code, keyCode, type) {
        if (!_overlay) return;
        var iframe = _overlay.querySelector('iframe');
        if (!iframe || !iframe.contentWindow) return;
        try {
            var win = iframe.contentWindow;
            var doc = win.document;
            var opts = { key: key, code: code, keyCode: keyCode, which: keyCode, bubbles: true, cancelable: true };
            var kev = new win.KeyboardEvent(type, opts);
            // 1. Canvas (onde Emscripten registra os handlers de input)
            var canvas = doc.querySelector('canvas');
            if (canvas) canvas.dispatchEvent(kev);
            // 2. Document e window (fallback)
            doc.dispatchEvent(new win.KeyboardEvent(type, opts));
            win.dispatchEvent(new win.KeyboardEvent(type, opts));
        } catch (e) {}
    }

    // Cria botao de acao circular (A, B)
    function _mkActionBtn(label, gradient, glow, key, code, keyCode) {
        var el = document.createElement('div');
        el.setAttribute('aria-label', label);
        el.textContent = label;
        Object.assign(el.style, {
            width: '80px', height: '80px',
            borderRadius: '50%',
            background: gradient,
            boxShadow: '0 0 22px ' + glow + ', inset 0 -3px 6px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 'bold',
            fontFamily: '"Russo One", "Inter", sans-serif',
            color: '#fff',
            cursor: 'pointer',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none', WebkitUserSelect: 'none',
            transition: 'transform 0.07s, box-shadow 0.07s',
            textShadow: '0 2px 6px rgba(0,0,0,0.6)',
            border: '2px solid rgba(255,255,255,0.22)',
        });
        var _down = false;
        function onDown(e) {
            e.preventDefault();
            if (_down) return; _down = true;
            el.style.transform = 'scale(0.87)';
            el.style.boxShadow = '0 0 8px ' + glow + ', inset 0 -1px 3px rgba(0,0,0,0.35)';
            _sendKey(key, code, keyCode, 'keydown');
        }
        function onUp(e) {
            e.preventDefault();
            if (!_down) return; _down = false;
            el.style.transform = 'scale(1)';
            el.style.boxShadow = '0 0 22px ' + glow + ', inset 0 -3px 6px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.6)';
            _sendKey(key, code, keyCode, 'keyup');
        }
        el.addEventListener('touchstart', onDown, { passive: false });
        el.addEventListener('touchend',   onUp,   { passive: false });
        el.addEventListener('touchcancel',onUp,   { passive: false });
        el.addEventListener('mousedown',  onDown);
        el.addEventListener('mouseup',    onUp);
        el.addEventListener('mouseleave', function (e) { if (_down) onUp(e); });
        return el;
    }

    // Cria botao direcional para o D-pad
    function _mkDirBtn(label, topPx, leftPx, key, code, keyCode) {
        var el = document.createElement('div');
        el.setAttribute('aria-label', label);
        el.textContent = label;
        Object.assign(el.style, {
            position: 'absolute',
            width: '52px', height: '52px',
            top: topPx + 'px', left: leftPx + 'px',
            background: 'rgba(70,70,70,0.55)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: '#ccc',
            cursor: 'pointer',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none', WebkitUserSelect: 'none',
        });
        var _down = false;
        function onDown(e) {
            e.preventDefault();
            if (_down) return; _down = true;
            el.style.background = 'rgba(130,130,130,0.75)';
            _sendKey(key, code, keyCode, 'keydown');
        }
        function onUp(e) {
            e.preventDefault();
            if (!_down) return; _down = false;
            el.style.background = 'rgba(70,70,70,0.55)';
            _sendKey(key, code, keyCode, 'keyup');
        }
        el.addEventListener('touchstart', onDown, { passive: false });
        el.addEventListener('touchend',   onUp,   { passive: false });
        el.addEventListener('touchcancel',onUp,   { passive: false });
        el.addEventListener('mousedown',  onDown);
        el.addEventListener('mouseup',    onUp);
        el.addEventListener('mouseleave', function (e) { if (_down) onUp(e); });
        return el;
    }

    function _criarOverlay(romUrl) {
        var absRom = new URL(romUrl, window.location.href).href;

        // --- Overlay raiz ---
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            WebkitTapHighlightColor: 'transparent',
        });

        // --- iframe: ocupa os 57vh superiores (area do jogo) ---
        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute',
            top: '0', left: '0', width: '100%', height: '57vh',
            border: 'none', display: 'block',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        // zoom e diskDrive nao sao botoes validos nesta versao do EJS
        var ejsButtons = JSON.stringify({
            playPause: false, restart: false, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%}',
            // Esconde APENAS o gamepad/UI overlay do EJS — NAO o container do jogo
            '.ejs-vgamepad{display:none!important}',
            '.ejs-vgamepad-active{display:none!important}',
            '.ejs-arrow{display:none!important}',
            '.ejs-button{display:none!important}',
            '.ejs_virtualGamepad{display:none!important}',
            '.ejs_menu_bar{display:none!important}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "genesis_plus_gx";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#0ea5e9";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            'window.EJS_VirtualGamepad = false;',
            // Foca o canvas apos o jogo iniciar (Emscripten precisa de focus no canvas)
            'window.EJS_onGameStart = function(){',
            '  var c = document.querySelector("canvas");',
            '  if(c){c.setAttribute("tabindex","0");c.focus();}',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao Sair (topo-esquerdo, sobre o jogo) ---
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:20px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:6px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: '12px', left: '12px',
            zIndex: '9200',
            display: 'flex', alignItems: 'center',
            padding: '8px 14px',
            background: 'rgba(15,23,42,0.80)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff', borderRadius: '24px',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '64px', minHeight: '40px',
            fontSize: '0.8rem', fontFamily: 'Inter,sans-serif',
            whiteSpace: 'nowrap',
        });
        exitBtn.addEventListener('click', function () { history.back(); });
        _overlay.appendChild(exitBtn);

        // --- Gamepad custom (area inferior 43vh) ---
        var gpArea = document.createElement('div');
        Object.assign(gpArea.style, {
            position: 'absolute',
            top: '57vh', left: '0', right: '0', bottom: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 16px',
            userSelect: 'none', WebkitUserSelect: 'none',
        });

        // --- D-pad (esquerdo) ---
        // Container 156x156: botoes 52x52 posicionados em cruz
        // Centro em (52, 52) de cada direcao
        var dpad = document.createElement('div');
        Object.assign(dpad.style, {
            position: 'relative',
            width: '156px', height: '156px',
            flexShrink: '0',
        });
        // Fundo da cruz
        var dpadBg = document.createElement('div');
        Object.assign(dpadBg.style, {
            position: 'absolute', inset: '0',
            background: 'rgba(30,30,30,0.55)',
            borderRadius: '12px',
            clipPath: 'polygon(33% 0%,67% 0%,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0% 67%,0% 33%,33% 33%)',
        });
        dpad.appendChild(dpadBg);
        [
            { label: '▲', t: 0,   l: 52, key: 'ArrowUp',    code: 'ArrowUp',    kc: 38 },
            { label: '▼', t: 104, l: 52, key: 'ArrowDown',  code: 'ArrowDown',  kc: 40 },
            { label: '◀', t: 52,  l: 0,  key: 'ArrowLeft',  code: 'ArrowLeft',  kc: 37 },
            { label: '▶', t: 52,  l: 104,key: 'ArrowRight', code: 'ArrowRight', kc: 39 },
        ].forEach(function (d) {
            dpad.appendChild(_mkDirBtn(d.label, d.t, d.l, d.key, d.code, d.kc));
        });
        gpArea.appendChild(dpad);

        // --- Botao Start (centro) ---
        var startBtn = document.createElement('div');
        startBtn.textContent = 'START';
        Object.assign(startBtn.style, {
            alignSelf: 'flex-end',
            marginBottom: '20px',
            padding: '11px 22px',
            background: 'rgba(50,50,50,0.75)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            borderRadius: '22px',
            color: '#bbb',
            fontSize: '13px',
            fontFamily: '"Russo One", sans-serif',
            letterSpacing: '1.5px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            transition: 'background 0.07s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        });
        var _stDown = false;
        startBtn.addEventListener('touchstart', function (e) {
            e.preventDefault();
            if (_stDown) return; _stDown = true;
            startBtn.style.background = 'rgba(110,110,110,0.9)';
            _sendKey('Enter', 'Enter', 13, 'keydown');
        }, { passive: false });
        function _stUp(e) {
            e.preventDefault();
            if (!_stDown) return; _stDown = false;
            startBtn.style.background = 'rgba(50,50,50,0.75)';
            _sendKey('Enter', 'Enter', 13, 'keyup');
        }
        startBtn.addEventListener('touchend',   _stUp, { passive: false });
        startBtn.addEventListener('touchcancel',_stUp, { passive: false });
        startBtn.addEventListener('mousedown', function () {
            startBtn.style.background = 'rgba(110,110,110,0.9)';
            _sendKey('Enter', 'Enter', 13, 'keydown');
        });
        startBtn.addEventListener('mouseup', function () {
            startBtn.style.background = 'rgba(50,50,50,0.75)';
            _sendKey('Enter', 'Enter', 13, 'keyup');
        });
        gpArea.appendChild(startBtn);

        // --- Botoes de acao A e B (direita) ---
        // Genesis: B = pular (Z key = RetroArch btn 0), A = spin/secundario (X key = RetroArch btn 8)
        var actions = document.createElement('div');
        Object.assign(actions.style, {
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '14px',
            flexShrink: '0',
        });
        // B — azul, principal (pular no Sonic)
        actions.appendChild(_mkActionBtn(
            'B',
            'linear-gradient(145deg, #3b82f6, #1d4ed8)',
            'rgba(59,130,246,0.65)',
            'z', 'KeyZ', 90
        ));
        // A — vermelho, secundario (spin dash)
        actions.appendChild(_mkActionBtn(
            'A',
            'linear-gradient(145deg, #ef4444, #b91c1c)',
            'rgba(239,68,68,0.65)',
            'x', 'KeyX', 88
        ));
        gpArea.appendChild(actions);

        _overlay.appendChild(gpArea);
        document.body.appendChild(_overlay);

        // ESC: mesmo fluxo do botao sair
        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    window.MegadriveGame = {
        abrir: function (romUrl) {
            if (_overlay) return;
            _criarOverlay(romUrl || ROM_DEFAULT);
        },

        fechar: function () {
            if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
        },
    };

})();

// =====================================================================
// donkeykong.js — Donkey Kong (Atari 7800) via EmulatorJS
// =====================================================================
// Core: prosystem (RetroArch/WASM) carregado via CDN EmulatorJS.
// ROM: assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78
// Gamepad: D-pad + Fire (joystick Atari padrao)
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';
    var ROM     = 'assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78';

    var _overlay = null;
    var _onKey   = null;

    function _criarOverlay() {
        var absRom = new URL(
            ROM.split('/').map(encodeURIComponent).join('/'),
            window.location.href
        ).href;

        _overlay = document.createElement('div');
        _overlay.id = 'donkeykong-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            WebkitTapHighlightColor: 'transparent',
        });

        var ejsButtons = JSON.stringify({
            playPause: false, restart: true, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        var ejsGamepad = JSON.stringify([
            { type: 'dpad',   location: 'left',  inputValues: [4, 5, 6, 7] },
            { type: 'button', text: 'Fire', id: 'fire', location: 'right', input_value: 8 }
        ]);

        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute', inset: '0',
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%;background:#000}',
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',
            '.ejs_virtualGamepad_parent{top:55vh!important;bottom:56px!important;' +
            'height:auto!important;overflow:visible!important;background:#000!important;}',
            '.ejs_virtualGamepad_right,.ejs_virtualGamepad_left,.ejs_virtualGamepad_bottom{overflow:visible!important;}',
            '.ejs_virtualGamepad_button{border-radius:50%!important;' +
            'width:80px!important;height:80px!important;' +
            'border:2px solid rgba(255,255,255,.22)!important;' +
            'color:#fff!important;font-size:18px!important;font-weight:bold!important;' +
            'font-family:"Russo One",sans-serif!important;' +
            'display:flex!important;align-items:center!important;justify-content:center!important;' +
            'background:linear-gradient(145deg,#f59e0b,#d97706)!important;' +
            'box-shadow:0 0 26px rgba(245,158,11,.6),inset 0 -3px 6px rgba(0,0,0,.35)!important;}',
            '.ejs_dpad_bar{background:rgba(90,90,100,.75)!important;border-radius:6px!important;}',
            '.ejs_virtualGamepad_button_down{opacity:.65!important;transform:scale(.9)!important;}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "prosystem";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#f59e0b";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            'window.EJS_VirtualGamepadSettings = ' + ejsGamepad + ';',
            'window.EJS_onGameStart = function () {',
            '  var c = document.querySelector("canvas");',
            '  if (c) { c.setAttribute("tabindex","0"); c.focus(); }',
            '  setTimeout(function () {',
            '    var canvas = document.querySelector("canvas");',
            '    var gp     = document.querySelector(".ejs_virtualGamepad_parent");',
            '    if (canvas && gp) {',
            '      var rect = canvas.getBoundingClientRect();',
            '      var pct  = Math.ceil(((rect.bottom + 2) / window.innerHeight) * 100);',
            '      pct = Math.max(25, Math.min(60, pct));',
            '      gp.style.setProperty("top", pct + "vh", "important");',
            '    }',
            '  }, 700);',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // Botao Sair
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:5px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position: 'fixed',
            top: '16px', left: '12px',
            zIndex: '9200',
            display: 'flex', alignItems: 'center',
            padding: '6px 14px',
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(255,255,255,0.28)',
            color: '#f1f5f9', borderRadius: '20px',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '56px', minHeight: '44px',
            fontSize: '0.75rem', fontFamily: 'Inter,sans-serif',
            whiteSpace: 'nowrap',
        });
        exitBtn.addEventListener('click', function () {
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
        });
        _overlay.appendChild(exitBtn);

        document.body.appendChild(_overlay);

        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) {
                window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
            }
        };
        document.addEventListener('keydown', _onKey);
    }

    window.DonkeyKongGame = {
        abrir: function () {
            if (_overlay) return;
            _criarOverlay();
        },
        fechar: function () {
            if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
        }
    };
})();

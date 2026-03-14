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
// Botao sair: canto inferior esquerdo, chama history.back() para passar
// pelo dialogo "Sair?" do hub (popstate handler em joguinhos-modal.js).
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay = null;
    var _onKey   = null;

    function _criarOverlay(romUrl) {
        // URL absoluta necessaria pois srcdoc nao herda base do parent
        var absRom = new URL(romUrl, window.location.href).href;

        // --- Overlay raiz ---
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            WebkitTapHighlightColor: 'transparent',
        });

        // --- iframe: isola o escopo JS do EmulatorJS ---
        // Cada abertura = escopo limpo; fechar o overlay destroi tudo.
        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            width: '100%', height: '100%',
            border: 'none', display: 'block',
        });
        iframe.setAttribute('allowfullscreen', '');
        // Gamepad API requer permissao explicita em iframes
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        var ejsButtons = JSON.stringify({
            playPause:    false,
            restart:      true,
            mute:         true,
            settings:     false,
            fullscreen:   false,
            saveState:    false,
            loadState:    false,
            screenRecord: false,
            gamepad:      false,
            cheat:        false,
            volume:       false,
            zoom:         false,
            diskDrive:    false,
            netplay:      false,
            saveSavFiles: false,
            loadSavFiles: false,
            quickSave:    false,
            quickLoad:    false,
            screenshot:   false,
            cacheManager: false,
        });

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100vw;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "genesis_plus_gx";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#0ea5e9";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_language      = "pt-BR";',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao sair: canto inferior esquerdo, acima do controle virtual ---
        // history.back() dispara popstate → dialogo "Sair?" do hub
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="font-family:Inter,sans-serif;font-size:0.7rem;pointer-events:none;margin-left:4px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position:    'absolute',
            bottom:      '12px',
            left:        '12px',
            zIndex:      '9200',
            display:     'flex',
            alignItems:  'center',
            padding:     '8px 14px',
            background:  'rgba(0,0,0,0.60)',
            border:      '1px solid rgba(255,255,255,0.20)',
            color:       'rgba(255,255,255,0.75)',
            borderRadius:'20px',
            cursor:      'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth:    '64px',
            minHeight:   '36px',
        });
        exitBtn.addEventListener('click', function () {
            history.back();
        });
        _overlay.appendChild(exitBtn);

        document.body.appendChild(_overlay);

        // ESC: mesmo fluxo do botao sair
        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) {
                history.back();
            }
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
            // iframe removido com o overlay — escopo JS do EJS destruido automaticamente
        },
    };

})();

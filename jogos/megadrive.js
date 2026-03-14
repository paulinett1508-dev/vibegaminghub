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
// Botao Sair: centralizado no gap preto entre canvas e gamepad virtual.
// Chama history.back() → dialogo "Sair?" do hub (popstate em joguinhos-modal.js).
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

        // Todos os botoes false: a barra de menu sera ocultada via CSS de qualquer forma.
        // exitEmulation false evita que EJS adicione seu proprio botao de saida.
        var ejsButtons = JSON.stringify({
            playPause:      false,
            restart:        false,
            mute:           false,
            settings:       false,
            fullscreen:     false,
            saveState:      false,
            loadState:      false,
            screenRecord:   false,
            gamepad:        false,
            cheat:          false,
            volume:         false,
            zoom:           false,
            diskDrive:      false,
            netplay:        false,
            saveSavFiles:   false,
            loadSavFiles:   false,
            quickSave:      false,
            quickLoad:      false,
            screenshot:     false,
            cacheManager:   false,
            exitEmulation:  false,
        });

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100vw;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%}',
            // Esconde toda a barra de menu do EJS
            '.ejs_menu_bar,.ejs_menu,.ejs_toolbar{display:none!important}',
            // Força o container EJS a ocupar toda a altura disponivel
            '.ejs_container{width:100%!important;height:100vh!important;display:flex!important;flex-direction:column!important}',
            // Area do jogo ocupa espaco restante, canvas alinhado ao topo
            '.ejs_game_player_wrapper,.ejs_game_player{flex:1!important;display:flex!important;align-items:flex-start!important;justify-content:center!important}',
            // Canvas nao ultrapassa a largura da tela
            '.ejs_canvas{max-width:100%!important;max-height:55vh!important}',
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
            // Gamepad Genesis completo: D-pad + A + B + C + Start
            // input_value: A=0, C=1, Select=2, Start=3, D-pad=4-7, B=8
            'window.EJS_VirtualGamepadSettings = [',
            '  {type:"dpad",location:"left",inputValues:[4,5,6,7]},',
            '  {type:"button",text:"B",id:"b",location:"right",bold:true,input_value:8},',
            '  {type:"button",text:"C",id:"c",location:"right",bold:true,input_value:1},',
            '  {type:"button",text:"A",id:"a",location:"right",bold:true,input_value:0},',
            '  {type:"button",text:"Start",id:"start",location:"center",bold:true,input_value:3}',
            '];',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao Sair ---
        // Posicionado no gap preto (logo abaixo do canvas do jogo, centralizado).
        // Mega Drive 320:224 → altura do canvas = 100vw * 224/320 = 70vw.
        // Botao fica a top: calc(70vw + 20px), fora da area do gamepad virtual.
        // history.back() → popstate → dialogo "Sair?" do hub.
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:20px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:6px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position:    'absolute',
            top:         '12px',
            left:        '12px',
            transform:   'none',
            zIndex:      '9200',
            display:     'flex',
            alignItems:  'center',
            padding:     '8px 14px',
            background:  'rgba(15,23,42,0.80)',
            border:      '1px solid rgba(255,255,255,0.35)',
            color:       '#fff',
            borderRadius:'24px',
            cursor:      'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth:    '64px',
            minHeight:   '40px',
            fontSize:    '0.8rem',
            fontFamily:  'Inter,sans-serif',
            whiteSpace:  'nowrap',
        });
        exitBtn.addEventListener('click', function () {
            history.back(); // dispara popstate → dialogo "Sair?" do hub
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

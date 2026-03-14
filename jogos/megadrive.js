// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
//
// Arquitetura: iframe srcdoc fullscreen — EJS gerencia canvas + gamepad.
// Gamepad EJS posicionado na metade inferior via EJS_VirtualGamepadSettings.
// Botoes B/A estilizados via MutationObserver (azul/vermelho com glow).
// Botao Sair no parent overlay (z-index acima do iframe).
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay = null;
    var _onKey   = null;

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

        // --- iframe: tela cheia — EJS controla canvas e gamepad ---
        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute', inset: '0',
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        // Apenas botoes validos nesta versao do EJS (zoom e diskDrive sao invalidos)
        var ejsButtons = JSON.stringify({
            playPause: false, restart: false, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        // Gamepad Genesis: D-pad + B (pular) + A (spin) + Start
        // input_value: A=0, C=1, Start=3, D-pad=4-7, B=8  (genesis_plus_gx)
        // top/left: posicao relativa ao container do EJS (tela cheia = 100vh/100vw)
        // Botoes posicionados abaixo dos 57% para nao sobrepor o jogo
        var ejsGamepad = JSON.stringify([
            {type: 'dpad',   top: '62%', left: '3%',  inputValues: [4, 5, 6, 7]},
            {type: 'button', text: 'B', id: 'b', top: '62%', left: '77%', input_value: 8},
            {type: 'button', text: 'A', id: 'a', top: '78%', left: '77%', input_value: 0},
            {type: 'button', text: 'Start', id: 'start', top: '91%', left: '43%', input_value: 3}
        ]);

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%}',
            // Esconde apenas o menu/toolbar do EJS
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            // Constragi o canvas ao topo da tela (deixa espaco para o gamepad)
            'canvas{max-height:57vh!important;max-width:100%!important;display:block!important;margin:0 auto!important}',
            // Estilo base dos botoes de acao EJS (serao refinados via JS)
            '.ejs-button{',
            '  border-radius:50%!important;',
            '  width:76px!important;height:76px!important;',
            '  border:2px solid rgba(255,255,255,.22)!important;',
            '  color:#fff!important;',
            '  font-size:26px!important;font-weight:bold!important;',
            '  font-family:"Russo One",sans-serif!important;',
            '  text-shadow:0 2px 6px rgba(0,0,0,.6)!important;',
            '  display:flex!important;align-items:center!important;justify-content:center!important;',
            '}',
            // D-pad: estilo das setas
            '.ejs-arrow .b_up,.ejs-arrow .b_down,.ejs-arrow .b_left,.ejs-arrow .b_right{',
            '  background:rgba(60,60,60,.6)!important;',
            '  border:1.5px solid rgba(255,255,255,.15)!important;',
            '  border-radius:10px!important;',
            '}',
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
            'window.EJS_VirtualGamepadSettings = ' + ejsGamepad + ';',
            // MutationObserver: aplica cores/estilo nos botoes EJS apos render
            '(function(){',
            '  var _done=new Set();',
            '  function _style(){',
            '    document.querySelectorAll(".ejs-button").forEach(function(b){',
            '      if(_done.has(b))return;',
            '      _done.add(b);',
            '      var id=(b.getAttribute("data-id")||b.id||"").toLowerCase();',
            '      var txt=b.textContent.trim().toUpperCase();',
            '      if(id==="b"||txt==="B"){',
            '        b.style.background="linear-gradient(145deg,#3b82f6,#1d4ed8)";',
            '        b.style.boxShadow="0 0 22px rgba(59,130,246,.65),inset 0 -3px 6px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.6)";',
            '      }else if(id==="a"||txt==="A"){',
            '        b.style.background="linear-gradient(145deg,#ef4444,#b91c1c)";',
            '        b.style.boxShadow="0 0 22px rgba(239,68,68,.65),inset 0 -3px 6px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.6)";',
            '      }else if(id==="start"||/start/i.test(txt)){',
            '        b.style.setProperty("border-radius","22px","important");',
            '        b.style.setProperty("width","auto","important");',
            '        b.style.setProperty("padding","11px 22px","important");',
            '        b.style.background="rgba(50,50,50,.8)";',
            '        b.style.letterSpacing="1.5px";',
            '        b.style.fontSize="13px";',
            '      }',
            '    });',
            '  }',
            '  new MutationObserver(_style).observe(document.documentElement,{childList:true,subtree:true});',
            '})();',
            // Foca canvas ao iniciar (Emscripten precisa de focus)
            'window.EJS_onGameStart=function(){',
            '  var c=document.querySelector("canvas");',
            '  if(c){c.setAttribute("tabindex","0");c.focus();}',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao Sair (parent overlay, acima do iframe) ---
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

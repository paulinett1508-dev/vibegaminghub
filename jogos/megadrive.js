// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
//
// Arquitetura: iframe srcdoc fullscreen — EJS gerencia canvas + gamepad.
// Gamepad: D-pad + B (grande/azul) + A (menor/vermelho) + Start.
// Posicao do gamepad calculada via JS apos render do canvas (elimina gap).
// Escalavel para outras ROMs (A e B sempre presentes, hierarquia visual).
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
            background: '#0f172a', zIndex: '9000',
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

        var ejsButtons = JSON.stringify({
            playPause: false, restart: false, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        // Gamepad Genesis: D-pad + B (principal/pular) + A (secundario/spin) + Start
        // input_value: A=0, C=1, Start=3, D-pad=4-7, B=8  (genesis_plus_gx)
        //
        // B e A usam coordenadas EXPLICITAS (top/left relativo ao .ejs_virtualGamepad_parent)
        // Nao usar location:'right' para ambos — EJS os sobrepoeria no mesmo slot 130x130px
        // Start usa location:'center' (funciona bem por ser unico no centro)
        var ejsGamepad = JSON.stringify([
            {type: 'dpad',   location: 'left', inputValues: [4, 5, 6, 7]},
            {type: 'button', text: 'B', id: 'b', top: '12%', left: '67%', input_value: 8},
            {type: 'button', text: 'A', id: 'a', top: '50%', left: '76%', input_value: 0},
            {type: 'button', text: 'Start', id: 'start', location: 'center', input_value: 3}
        ]);

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#0f172a;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%;background:#0f172a}',
            // Esconde toolbar/menu do EJS
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            // Canvas: largura maxima, sem forcar altura (aspect ratio natural do jogo)
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',

            // ─── CONTAINER DO GAMEPAD ─────────────────────────────────────────
            // top inicial: sobrescrito por JS apos medir canvas real
            // height:auto + overflow:visible: evita cortar Start no rodape
            '.ejs_virtualGamepad_parent{',
            '  top:57vh!important;',
            '  bottom:0!important;',
            '  height:auto!important;',
            '  overflow:visible!important;',
            '  background:#0f172a!important;',
            '}',

            // ─── BOTOES DE ACAO ───────────────────────────────────────────────
            // Classe correta: ejs_virtualGamepad_button (underscore)
            // Tamanho BASE — refinado por JS (B grande, A menor)
            '.ejs_virtualGamepad_button{',
            '  border-radius:50%!important;',
            '  width:76px!important;height:76px!important;',
            '  border:2px solid rgba(255,255,255,.22)!important;',
            '  color:#fff!important;',
            '  font-size:26px!important;font-weight:bold!important;',
            '  font-family:"Russo One",sans-serif!important;',
            '  text-shadow:0 2px 6px rgba(0,0,0,.6)!important;',
            '  display:flex!important;align-items:center!important;justify-content:center!important;',
            '}',
            // D-pad: barras mais contrastadas
            '.ejs_dpad_bar{',
            '  background:rgba(90,90,100,.75)!important;',
            '  border-radius:6px!important;',
            '}',
            // Feedback visual ao pressionar
            '.ejs_virtualGamepad_button_down{',
            '  opacity:.65!important;',
            '  transform:scale(.92)!important;',
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

            // MutationObserver: aplica cores e tamanhos nos botoes EJS apos render
            // EJS nao usa data-id — identificar por textContent
            '(function(){',
            '  var _done=new Set();',
            '  function _style(){',
            '    document.querySelectorAll(".ejs_virtualGamepad_button").forEach(function(b){',
            '      if(_done.has(b))return;',
            '      _done.add(b);',
            '      var txt=b.textContent.trim().toUpperCase();',
            '      if(txt==="B"){',
            // B: principal — grande, azul brilhante
            '        b.style.setProperty("width","76px","important");',
            '        b.style.setProperty("height","76px","important");',
            '        b.style.setProperty("font-size","26px","important");',
            '        b.style.background="linear-gradient(145deg,#3b82f6,#1d4ed8)";',
            '        b.style.boxShadow="0 0 26px rgba(59,130,246,.75),inset 0 -3px 6px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.55)";',
            '      }else if(txt==="A"){',
            // A: secundario — menor, vermelho com glow mais discreto
            '        b.style.setProperty("width","52px","important");',
            '        b.style.setProperty("height","52px","important");',
            '        b.style.setProperty("font-size","20px","important");',
            '        b.style.background="linear-gradient(145deg,#ef4444,#b91c1c)";',
            '        b.style.boxShadow="0 0 16px rgba(239,68,68,.55),inset 0 -2px 4px rgba(0,0,0,.3),0 3px 8px rgba(0,0,0,.5)";',
            '      }else if(/start/i.test(txt)){',
            // Start: pilula cinza
            '        b.style.setProperty("border-radius","22px","important");',
            '        b.style.setProperty("width","auto","important");',
            '        b.style.setProperty("height","auto","important");',
            '        b.style.setProperty("padding","10px 20px","important");',
            '        b.style.setProperty("font-size","13px","important");',
            '        b.style.background="rgba(50,50,60,.85)";',
            '        b.style.letterSpacing="1.5px";',
            '        b.style.boxShadow="0 2px 8px rgba(0,0,0,.5)";',
            '      }else{',
            // Botoes extras (C, X, Y) se aparecerem: estilo neutro discreto
            '        b.style.background="rgba(40,40,50,.7)";',
            '        b.style.setProperty("border","1px solid rgba(255,255,255,.12)","important");',
            '      }',
            '    });',
            '  }',
            '  new MutationObserver(_style).observe(document.documentElement,{childList:true,subtree:true});',
            '})();',

            // Ao iniciar: foca canvas + reposiciona gamepad colado ao canvas
            // Elimina o gap preto causado pela diferenca entre max-height:57vh e canvas real
            'window.EJS_onGameStart=function(){',
            '  var c=document.querySelector("canvas");',
            '  if(c){c.setAttribute("tabindex","0");c.focus();}',
            '  setTimeout(function(){',
            '    var canvas=document.querySelector("canvas");',
            '    var gp=document.querySelector(".ejs_virtualGamepad_parent");',
            '    if(canvas&&gp){',
            '      var rect=canvas.getBoundingClientRect();',
            // Gamepad comeca logo abaixo do canvas (+ 2px margem)
            '      var pct=Math.ceil(((rect.bottom+2)/window.innerHeight)*100);',
            // Limitar entre 35vh e 60vh para nao ir longe demais
            '      pct=Math.max(35,Math.min(60,pct));',
            '      gp.style.setProperty("top",pct+"vh","important");',
            '    }',
            '  },700);',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao Sair: canto esquerdo, abaixo do jogo (nao centered, nao sobre o jogo) ---
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:5px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: 'calc(57vh + 8px)', left: '12px',
            zIndex: '9200',
            display: 'flex', alignItems: 'center',
            padding: '6px 12px',
            background: 'rgba(15,23,42,0.80)',
            border: '1px solid rgba(255,255,255,0.30)',
            color: '#fff', borderRadius: '20px',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '56px', minHeight: '44px',
            fontSize: '0.75rem', fontFamily: 'Inter,sans-serif',
            whiteSpace: 'nowrap',
        });
        exitBtn.addEventListener('click', function () { history.back(); });
        _overlay.appendChild(exitBtn);

        document.body.appendChild(_overlay);

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

// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
//
// Arquitetura: iframe srcdoc fullscreen — EJS gerencia canvas + gamepad.
//
// Gamepad: D-pad + B (76px/azul/principal) + A (52px/vermelho/sec) + Start
// - B e A usam location:'right' (EJS exige location para aceitar o config)
// - MutationObserver move B e A para .ejs_virtualGamepad_parent via DOM
//   e os posiciona absolutamente — separados sem sobreposicao
// - EJS mantem os event listeners nos elementos apos mover no DOM
//
// Sair: posicao calculada pelo aspect ratio genesis (320:224) no parent
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    // Aspect ratio genesis: canvas height = screenWidth / (320/224)
    // Calcula onde o canvas termina na tela (em vh) para alinhar controles
    function _genesisCanvasVh() {
        var canvasH = window.innerWidth / (320 / 224);
        var pct = Math.round((canvasH / window.innerHeight) * 100);
        return Math.max(25, Math.min(42, pct)); // clamp: 25-42vh
    }

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

        // IMPORTANTE: location OBRIGATORIO — sem location o EJS rejeita o button
        // e faz fallback para o gamepad padrao genesis ("1" e "2")
        // B e A usam location:'right' (mesmo slot 130x130px) e serao separados
        // pelo MutationObserver via DOM manipulation depois do render
        var ejsGamepad = JSON.stringify([
            {type: 'dpad',   location: 'left',   inputValues: [4, 5, 6, 7]},
            {type: 'button', text: 'B', id: 'b', location: 'right', input_value: 8},
            {type: 'button', text: 'A', id: 'a', location: 'right', input_value: 0},
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
            // Canvas: largura maxima, sem forcar altura (aspect ratio natural)
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',

            // ─── CONTAINER DO GAMEPAD ─────────────────────────────────────────
            // top inicial: sobrescrito por JS apos medir canvas real
            // overflow visible: botoes movidos no DOM pelo MutationObserver ficam visiveis
            '.ejs_virtualGamepad_parent{',
            '  top:40vh!important;',       // valor inicial conservador
            '  bottom:0!important;',
            '  height:auto!important;',
            '  overflow:visible!important;',
            '  background:#0f172a!important;',
            '}',
            // Overflow visible tambem no sub-container right (para botoes movidos)
            '.ejs_virtualGamepad_right,.ejs_virtualGamepad_left,.ejs_virtualGamepad_bottom{',
            '  overflow:visible!important;',
            '}',

            // ─── BOTOES DE ACAO ───────────────────────────────────────────────
            // Tamanho base — sobrescrito por JS (B=76px, A=52px)
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
            // D-pad barras
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

            // MutationObserver: aplica estilo + move B e A para o parent container
            // Isso evita sobreposicao dos dois botoes no slot 130x130 do 'right' zone
            // EJS mantem os event listeners apos os elementos serem movidos no DOM
            '(function(){',
            '  var _done=new Set();',
            '  function _style(){',
            '    var gp=document.querySelector(".ejs_virtualGamepad_parent");',
            '    document.querySelectorAll(".ejs_virtualGamepad_button").forEach(function(b){',
            '      if(_done.has(b))return;',
            '      var txt=b.textContent.trim().toUpperCase();',
            '      if(txt==="B"){',
            '        _done.add(b);',
            // B: principal — grande, azul brilhante
            '        b.style.setProperty("width","76px","important");',
            '        b.style.setProperty("height","76px","important");',
            '        b.style.setProperty("font-size","26px","important");',
            '        b.style.background="linear-gradient(145deg,#3b82f6,#1d4ed8)";',
            '        b.style.boxShadow="0 0 26px rgba(59,130,246,.75),inset 0 -3px 6px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.55)";',
            // Mover para .ejs_virtualGamepad_parent e posicionar absolutamente
            // Isso separa B de A (que ficam sobrepostos no sub-container 'right')
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="22px";',
            '          b.style.top="12%";',
            '          b.style.left="auto";',
            '        }',
            '      }else if(txt==="A"){',
            '        _done.add(b);',
            // A: secundario — menor, vermelho discreto
            '        b.style.setProperty("width","52px","important");',
            '        b.style.setProperty("height","52px","important");',
            '        b.style.setProperty("font-size","20px","important");',
            '        b.style.background="linear-gradient(145deg,#ef4444,#b91c1c)";',
            '        b.style.boxShadow="0 0 16px rgba(239,68,68,.55),inset 0 -2px 4px rgba(0,0,0,.3),0 3px 8px rgba(0,0,0,.5)";',
            // Mover para parent, posicionar abaixo-direito do B
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="8px";',
            '          b.style.top="52%";',
            '          b.style.left="auto";',
            '        }',
            '      }else if(/start/i.test(txt)){',
            '        _done.add(b);',
            // Start: pilula cinza escura
            '        b.style.setProperty("border-radius","22px","important");',
            '        b.style.setProperty("width","auto","important");',
            '        b.style.setProperty("height","auto","important");',
            '        b.style.setProperty("padding","10px 20px","important");',
            '        b.style.setProperty("font-size","13px","important");',
            '        b.style.background="rgba(50,50,60,.85)";',
            '        b.style.letterSpacing="1.5px";',
            '        b.style.boxShadow="0 2px 8px rgba(0,0,0,.5)";',
            '      }else{',
            // Outros botoes extras (C, X, Y) — discreto
            '        if(!_done.has(b)){',
            '          _done.add(b);',
            '          b.style.background="rgba(40,40,50,.7)";',
            '          b.style.setProperty("border","1px solid rgba(255,255,255,.12)","important");',
            '        }',
            '      }',
            '    });',
            '  }',
            '  new MutationObserver(_style).observe(document.documentElement,{childList:true,subtree:true});',
            '})();',

            // Ao iniciar: foca canvas + reposiciona gamepad colado ao canvas
            'window.EJS_onGameStart=function(){',
            '  var c=document.querySelector("canvas");',
            '  if(c){c.setAttribute("tabindex","0");c.focus();}',
            '  setTimeout(function(){',
            '    var canvas=document.querySelector("canvas");',
            '    var gp=document.querySelector(".ejs_virtualGamepad_parent");',
            '    if(canvas&&gp){',
            '      var rect=canvas.getBoundingClientRect();',
            '      var pct=Math.ceil(((rect.bottom+2)/window.innerHeight)*100);',
            '      pct=Math.max(25,Math.min(42,pct));',
            '      gp.style.setProperty("top",pct+"vh","important");',
            '    }',
            '  },700);',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);

        // --- Botao Sair ---
        // Posicao calculada pelo aspect ratio genesis 320:224 (canvas width-limited em portrait)
        // Evita o gap de 25vh que ocorria com o valor fixo de 57vh
        var cvh = _genesisCanvasVh();

        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:5px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: 'calc(' + cvh + 'vh + 8px)', left: '12px',
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

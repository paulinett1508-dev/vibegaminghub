// =====================================================================
// snes.js — Emulador SNES via EmulatorJS (CDN)
// =====================================================================
// Core: snes9x (RetroArch/WASM) carregado via CDN EmulatorJS.
// ROMs: listadas em /roms/snes/index.json
//
// Fluxo: abrir() → picker de ROMs → selecionar → iframe com EmulatorJS
//
// Gamepad: D-pad + B/A/Y/X (diamante) + Start + Select
// MutationObserver posiciona botoes em layout diamante absoluto
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN  = 'https://cdn.emulatorjs.org/stable/data/';
    var ROM_BASE = 'roms/snes/';

    var _overlay = null;
    var _onKey   = null;

    // ---- ROM Picker ----

    function _criarPicker() {
        _overlay = document.createElement('div');
        _overlay.id = 'snes-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#0f172a', zIndex: '9000',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            WebkitTapHighlightColor: 'transparent',
        });

        // Header
        var header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', maxWidth: '600px',
            padding: '24px 16px 8px',
            display: 'flex', alignItems: 'center', gap: '12px',
        });

        var backBtn = document.createElement('button');
        backBtn.setAttribute('aria-label', 'Voltar');
        backBtn.innerHTML = '<span class="material-icons" style="font-size:24px;pointer-events:none;">arrow_back</span>';
        Object.assign(backBtn.style, {
            background: 'none', border: 'none', color: '#f1f5f9',
            cursor: 'pointer', padding: '8px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '44px', minHeight: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        });
        backBtn.addEventListener('click', function () { history.back(); });

        var title = document.createElement('h2');
        title.textContent = 'Super Nintendo';
        Object.assign(title.style, {
            fontFamily: "'Russo One', sans-serif",
            fontSize: '1.4rem', color: '#f1f5f9', margin: '0',
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        _overlay.appendChild(header);

        // Grid container
        var grid = document.createElement('div');
        grid.id = 'snes-grid';
        Object.assign(grid.style, {
            width: '100%', maxWidth: '600px',
            padding: '8px 16px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
        });
        _overlay.appendChild(grid);

        // Loading indicator
        var loading = document.createElement('div');
        loading.textContent = 'Carregando...';
        Object.assign(loading.style, {
            color: '#94a3b8', fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem', padding: '32px', textAlign: 'center',
        });
        grid.appendChild(loading);

        document.body.appendChild(_overlay);

        // Fetch ROM list
        fetch(ROM_BASE + 'index.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                grid.innerHTML = '';
                if (!data.jogos || data.jogos.length === 0) {
                    var empty = document.createElement('div');
                    empty.textContent = 'Nenhuma ROM encontrada';
                    Object.assign(empty.style, {
                        color: '#64748b', fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem', padding: '32px', textAlign: 'center',
                        gridColumn: '1 / -1',
                    });
                    grid.appendChild(empty);
                    return;
                }

                data.jogos.forEach(function (jogo) {
                    var card = document.createElement('button');
                    Object.assign(card.style, {
                        background: 'linear-gradient(145deg, #312e81, #4c1d95)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '16px',
                        padding: '20px 12px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '10px',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        minHeight: '100px',
                    });

                    var icon = document.createElement('span');
                    icon.className = 'material-icons';
                    icon.textContent = jogo.icone || 'sports_esports';
                    Object.assign(icon.style, {
                        fontSize: '36px', color: '#c4b5fd', pointerEvents: 'none',
                    });

                    var nome = document.createElement('span');
                    nome.textContent = jogo.nome;
                    Object.assign(nome.style, {
                        fontFamily: "'Russo One', sans-serif",
                        fontSize: '0.8rem', color: '#e2e8f0',
                        textAlign: 'center', lineHeight: '1.2',
                        pointerEvents: 'none',
                    });

                    card.appendChild(icon);
                    card.appendChild(nome);

                    card.addEventListener('pointerdown', function () {
                        card.style.transform = 'scale(0.95)';
                    });
                    card.addEventListener('pointerup', function () {
                        card.style.transform = '';
                    });
                    card.addEventListener('pointerleave', function () {
                        card.style.transform = '';
                    });

                    card.addEventListener('click', function () {
                        var romUrl = ROM_BASE + jogo.arquivo;
                        _destroyPicker();
                        _launchEmulator(romUrl);
                    });

                    grid.appendChild(card);
                });
            })
            .catch(function () {
                grid.innerHTML = '';
                var err = document.createElement('div');
                err.textContent = 'Erro ao carregar ROMs';
                Object.assign(err.style, {
                    color: '#ef4444', fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem', padding: '32px', textAlign: 'center',
                    gridColumn: '1 / -1',
                });
                grid.appendChild(err);
            });

        // ESC to go back
        _onKey = function (e) {
            if (e.key === 'Escape') history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    function _destroyPicker() {
        if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
        if (_overlay) { _overlay.remove(); _overlay = null; }
    }

    // ---- Emulador ----

    function _launchEmulator(romUrl) {
        var absRom = new URL(romUrl, window.location.href).href;

        _overlay = document.createElement('div');
        _overlay.id = 'snes-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#0f172a', zIndex: '9000',
            WebkitTapHighlightColor: 'transparent',
        });

        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute', inset: '0',
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        var ejsButtons = JSON.stringify({
            playPause: false, restart: true, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        // SNES gamepad: D-pad + B/A/Y/X (diamante) + Start + Select
        // input_value mapping (RetroArch snes9x):
        //   B=0, Y=1, Select=2, Start=3, Up=4, Down=5, Left=6, Right=7, A=8, X=9
        var ejsGamepad = JSON.stringify([
            {type: 'dpad',   location: 'left',   inputValues: [4, 5, 6, 7]},
            {type: 'button', text: 'B', id: 'b', location: 'right', input_value: 0},
            {type: 'button', text: 'A', id: 'a', location: 'right', input_value: 8},
            {type: 'button', text: 'Y', id: 'y', location: 'right', input_value: 1},
            {type: 'button', text: 'X', id: 'x', location: 'right', input_value: 9},
            {type: 'button', text: 'Start',  id: 'start',  location: 'center', input_value: 3},
            {type: 'button', text: 'Select', id: 'select', location: 'center', input_value: 2}
        ]);

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#0f172a;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%;background:#0f172a}',
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',

            // Gamepad container
            '.ejs_virtualGamepad_parent{',
            '  top:40vh!important;',
            '  bottom:56px!important;',
            '  height:auto!important;',
            '  overflow:visible!important;',
            '  background:#0f172a!important;',
            '}',
            '.ejs_virtualGamepad_right,.ejs_virtualGamepad_left,.ejs_virtualGamepad_bottom{',
            '  overflow:visible!important;',
            '}',

            // Botoes base
            '.ejs_virtualGamepad_button{',
            '  border-radius:50%!important;',
            '  width:68px!important;height:68px!important;',
            '  border:2px solid rgba(255,255,255,.22)!important;',
            '  color:#fff!important;',
            '  font-size:20px!important;font-weight:bold!important;',
            '  font-family:"Russo One",sans-serif!important;',
            '  text-shadow:0 2px 6px rgba(0,0,0,.6)!important;',
            '  display:flex!important;align-items:center!important;justify-content:center!important;',
            '}',
            '.ejs_dpad_bar{',
            '  background:rgba(90,90,100,.75)!important;',
            '  border-radius:6px!important;',
            '}',
            '.ejs_virtualGamepad_button_down{',
            '  opacity:.65!important;',
            '  transform:scale(.92)!important;',
            '}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "snes9x";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#7c3aed";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            'window.EJS_VirtualGamepadSettings = ' + ejsGamepad + ';',

            // MutationObserver: posiciona botoes em diamante
            '(function(){',
            '  var _done=new Set();',
            '  function _style(){',
            '    var gp=document.querySelector(".ejs_virtualGamepad_parent");',
            '    document.querySelectorAll(".ejs_virtualGamepad_button").forEach(function(b){',
            '      if(_done.has(b))return;',
            '      var txt=b.textContent.trim().toUpperCase();',

            // B: principal — grande, azul, centro-inferior do diamante
            '      if(txt==="B"){',
            '        _done.add(b);',
            '        b.style.setProperty("width","72px","important");',
            '        b.style.setProperty("height","72px","important");',
            '        b.style.setProperty("font-size","24px","important");',
            '        b.style.background="linear-gradient(145deg,#3b82f6,#1d4ed8)";',
            '        b.style.boxShadow="0 0 22px rgba(59,130,246,.65),inset 0 -3px 6px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.5)";',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="36px";',
            '          b.style.top="55%";',
            '          b.style.left="auto";',
            '        }',

            // A: vermelho, direita do diamante
            '      }else if(txt==="A"){',
            '        _done.add(b);',
            '        b.style.setProperty("width","64px","important");',
            '        b.style.setProperty("height","64px","important");',
            '        b.style.setProperty("font-size","22px","important");',
            '        b.style.background="linear-gradient(145deg,#ef4444,#b91c1c)";',
            '        b.style.boxShadow="0 0 18px rgba(239,68,68,.55),inset 0 -2px 4px rgba(0,0,0,.3),0 3px 8px rgba(0,0,0,.45)";',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="2px";',
            '          b.style.top="33%";',
            '          b.style.left="auto";',
            '        }',

            // Y: verde, esquerda do diamante
            '      }else if(txt==="Y"){',
            '        _done.add(b);',
            '        b.style.setProperty("width","64px","important");',
            '        b.style.setProperty("height","64px","important");',
            '        b.style.setProperty("font-size","22px","important");',
            '        b.style.background="linear-gradient(145deg,#10b981,#047857)";',
            '        b.style.boxShadow="0 0 18px rgba(16,185,129,.55),inset 0 -2px 4px rgba(0,0,0,.3),0 3px 8px rgba(0,0,0,.45)";',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="70px";',
            '          b.style.top="33%";',
            '          b.style.left="auto";',
            '        }',

            // X: amarelo, topo do diamante
            '      }else if(txt==="X"){',
            '        _done.add(b);',
            '        b.style.setProperty("width","58px","important");',
            '        b.style.setProperty("height","58px","important");',
            '        b.style.setProperty("font-size","20px","important");',
            '        b.style.background="linear-gradient(145deg,#eab308,#a16207)";',
            '        b.style.boxShadow="0 0 16px rgba(234,179,8,.5),inset 0 -2px 4px rgba(0,0,0,.3),0 3px 8px rgba(0,0,0,.45)";',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.right="39px";',
            '          b.style.top="8%";',
            '          b.style.left="auto";',
            '        }',

            // Start: pilula central
            '      }else if(/start/i.test(txt)){',
            '        _done.add(b);',
            '        b.style.setProperty("border-radius","22px","important");',
            '        b.style.setProperty("width","90px","important");',
            '        b.style.setProperty("height","auto","important");',
            '        b.style.setProperty("padding","8px 0","important");',
            '        b.style.setProperty("font-size","12px","important");',
            '        b.style.background="rgba(50,50,60,.85)";',
            '        b.style.letterSpacing="1.5px";',
            '        b.style.boxShadow="0 2px 8px rgba(0,0,0,.5)";',
            '        b.style.setProperty("text-align","center","important");',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.bottom="8px";',
            '          b.style.right="0";',
            '          b.style.left="auto";',
            '          b.style.margin="0";',
            '          b.style.top="auto";',
            '        }',

            // Select: pilula central (esquerda do Start)
            '      }else if(/select/i.test(txt)){',
            '        _done.add(b);',
            '        b.style.setProperty("border-radius","22px","important");',
            '        b.style.setProperty("width","90px","important");',
            '        b.style.setProperty("height","auto","important");',
            '        b.style.setProperty("padding","8px 0","important");',
            '        b.style.setProperty("font-size","12px","important");',
            '        b.style.background="rgba(50,50,60,.85)";',
            '        b.style.letterSpacing="1.5px";',
            '        b.style.boxShadow="0 2px 8px rgba(0,0,0,.5)";',
            '        b.style.setProperty("text-align","center","important");',
            '        if(gp&&b.parentElement!==gp){',
            '          gp.appendChild(b);',
            '          b.style.position="absolute";',
            '          b.style.bottom="8px";',
            '          b.style.left="0";',
            '          b.style.right="auto";',
            '          b.style.margin="0";',
            '          b.style.top="auto";',
            '        }',

            '      }else{',
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
            '      pct=Math.max(25,Math.min(50,pct));',
            '      gp.style.setProperty("top",pct+"vh","important");',
            '    }',
            '  },700);',
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
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.SNESGame.fechar();
        });
        _overlay.appendChild(exitBtn);

        document.body.appendChild(_overlay);

        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) {
                window.fecharJoguinhos ? window.fecharJoguinhos() : window.SNESGame.fechar();
            }
        };
        document.addEventListener('keydown', _onKey);
    }

    // ---- API publica ----

    window.SNESGame = {
        abrir: function () {
            if (_overlay) return;
            _criarPicker();
        },

        fechar: function () {
            if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
        },
    };

})();

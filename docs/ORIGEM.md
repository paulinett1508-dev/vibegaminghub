# Origem dos Joguinhos

Codigo extraido do repositorio **SuperCartolaManagerv5** em 2026-03-07.

## Mapeamento de Arquivos

### Jogo de Penaltis

| Origem (SuperCartolaManagerv5) | Destino (joguinhos-jose) |
|-------------------------------|--------------------------|
| `public/participante/js/manutencao-screen.js` (linhas 688-1382) | `jogos/penaltis.js` |
| `public/participante/index.html` (linha 975-979) — Botao na tela de manutencao | Integrado no modal |
| `public/participante/index.html` (linha 991-992) — Container `manutencaoPenaltyContainer` | Container criado dinamicamente |

**Contexto original:** O jogo de penaltis era exibido na tela de manutencao do sistema (quando o app ficava offline) como entretenimento para os usuarios. Tambem era acessivel via chip "Joguinhos" na home para usuarios Premium.

### Jogo do Escorpiao

| Origem (SuperCartolaManagerv5) | Destino (joguinhos-jose) |
|-------------------------------|--------------------------|
| `public/participante/js/participante-joguinhos.js` (linhas 249-643) | `jogos/escorpiao.js` |

**Contexto original:** Canvas interativo onde um escorpiao de 16 segmentos segue o mouse. Acessivel apenas para usuarios Premium via chip "Joguinhos" na home.

### Modal de Selecao

| Origem (SuperCartolaManagerv5) | Destino (joguinhos-jose) |
|-------------------------------|--------------------------|
| `public/participante/js/participante-joguinhos.js` (linhas 26-135) | `jogos/joguinhos-modal.js` |

**Contexto original:** Modal overlay que permitia escolher entre Penaltis e Escorpiao. Aberto ao clicar no chip "Joguinhos" na home do participante.

### Pontos de Integracao (nao extraidos)

Estes trechos eram a "cola" que integrava os joguinhos ao SuperCartolaManager. Nao foram extraidos, mas estao documentados aqui para referencia:

| Arquivo | Linha(s) | Funcao |
|---------|----------|--------|
| `public/participante/fronts/home.html` | 21-26 | Botao `btn-joguinhos` com lazy-loading do script |
| `public/participante/js/modules/participante-home.js` | 1187-1191 | Controle de visibilidade do botao (premium only, via `/api/cartola-pro/verificar-premium`) |
| `public/participante/index.html` | 1150 | Script tag `<script src="js/participante-joguinhos.js" defer>` |
| `routes/cartola-pro-routes.js` | — | Endpoint `GET /api/cartola-pro/verificar-premium` |
| `utils/premium-participante.js` | — | Funcao `verificarParticipantePremium()` |

### Jogo Reptil

- **Arquivo:** `jogos/reptil.js`
- **Origem:** Codigo original, inspirado em [Reptile Interactive Cursor](https://github.com/Lokesh-reddy18/Reptile-Cursor) (MIT License)
- **Descricao:** Lagarto procedural com Inverse Kinematics esqueletica. Nenhum codigo foi copiado diretamente — a arquitetura (Segment → LimbSystem → LegSystem → Creature) foi reimplementada do zero com base no conceito.

### Jogo Pac-Man

- **Arquivo:** `jogos/pacman.js`
- **Origem:** Codigo original, sem dependencia externa
- **Descricao:** Reimplementacao simplificada do Pac-Man classico para criancas. Mapa, IA dos fantasmas e mecanicas sao implementacoes proprias.

### Jogo Tamandua Runner

- **Arquivo:** `jogos/tamandua.js`
- **Origem:** Codigo original; reutiliza a arquitetura IK de `reptil.js` (mesma codebase)
- **Descricao:** Runner automatico com tamandua procedural. A estrutura Segment/LimbSystem/LegSystem foi portada de reptil.js para este jogo.

### Sonic Runner (Canvas custom)

- **Arquivo:** `jogos/sonic.js`
- **Origem:** Codigo original, sem dependencia externa
- **Descricao:** Runner 2D custom com fisica inspirada no Retro Engine do Sonic 1-3. Sprites usam GIFs externos (ver assets abaixo). Nao e um emulador — e um jogo canvas escrito do zero.
- **Assets:** GIFs do Sonic (`run.gif`, `jump.gif`, `hurt.gif`, `eggman.gif`, `po.gif`) e background `fundo.png` salvos em `assets/sprites/sonic/`
- **Nota:** Este arquivo e carregado mas o card do hub aponta para o emulador Megadrive (ver abaixo)

### Emulador Mega Drive (Sonic)

- **Arquivo:** `jogos/megadrive.js`
- **Origem:** Codigo original (wrapper); emulador via CDN externo
- **Dependencia:** [EmulatorJS](https://emulatorjs.org/) — CDN `https://cdn.emulatorjs.org/stable/data/loader.js`
  - Core: `genesis_plus_gx` (RetroArch/WASM, licenca GPL v2)
  - EmulatorJS em si: licenca GPL v3
- **ROM:** `roms/megadrive/sonic.md` — **nao incluido no repositorio**. O usuario deve fornecer o proprio arquivo ROM. Sonic the Hedgehog (Mega Drive) e propriedade da SEGA.
- **Escalabilidade:** `window.MegadriveGame.abrir(romUrl)` aceita qualquer ROM de Mega Drive. Para adicionar novos jogos, basta adicionar o ROM em `roms/megadrive/` e criar um card no JOGOS array com o caminho correto.

### Emulador Atari 2600

- **Arquivo:** `jogos/atari.js`
- **Origem:** Codigo original (wrapper); emulador via CDN externo
- **Dependencia:** [EmulatorJS](https://emulatorjs.org/) — CDN `https://cdn.emulatorjs.org/stable/data/loader.js`
  - Core: `stella` (RetroArch/WASM, licenca GPL v2) — emula Atari 2600
  - EmulatorJS em si: licenca GPL v3
- **ROMs:** `assets/roms/atari/*.bin` — **fornecidas pelo usuario**. ROMs comerciais sao propriedade dos detentores originais (Atari, Inc. / Atari SA). Nao incluas ROMs comerciais no repositorio sem autorizacao.
- **Jogos configurados** (coloque os .bin em `assets/roms/atari/`):
  - `pong.bin` — Pong
  - `breakout.bin` — Breakout
  - `spaceinvaders.bin` — Space Invaders
  - `pacman.bin` — Pac-Man
  - `pitfall.bin` — Pitfall!
  - `kaboom.bin` — Kaboom!
- **Escalabilidade:** Para adicionar novos jogos, adicione o .bin em `assets/roms/atari/` e insira uma entrada no array `ROMS_ATARI` em `jogos/atari.js`.
- **Arquitetura:** Seletor de jogos proprio → iframe srcdoc com EmulatorJS (mesmo padrao do `megadrive.js`)
- **Controles:** D-pad + botao Fire (joystick Atari 2600 padrao)

## Modificacoes na Extracao

1. **Penaltis desacoplado do ManutencaoScreen** — No original, o jogo reutilizava o container e metodos de `ManutencaoScreen`. Na versao standalone, o jogo recebe um container DOM qualquer via `PenaltisGame.abrir(containerEl)`.

2. **CSS variables substituidas por cores fixas** — O original usava `var(--app-pos-gol-light)`, `var(--app-success-light)`, etc. Na versao standalone, foram substituidas por cores hex equivalentes (`#fb923c`, `#4ade80`, etc.).

3. **Emojis substituidos por Material Icons** — Seguindo a regra do CLAUDE.md original, emojis foram substituidos por Material Icons onde possivel.

4. **Escorpiao ja era standalone** — O jogo do escorpiao ja criava seu proprio overlay fullscreen, entao foi extraido quase sem modificacoes.

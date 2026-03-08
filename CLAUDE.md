# JOGUINHOS DO JOSE — PROJECT RULES

## Publico-Alvo

Criancas pequenas (~2-5 anos), muitas ainda nao sabem ler.

- Texto pode existir, mas **curto e simples** (1-3 palavras por elemento)
- **Nunca verboso** — frases longas ou instrucoes complexas
- Priorizar comunicacao visual: icones, cores, formas, animacoes

## Tech Stack

- **Runtime:** Browser (Vanilla JS, sem frameworks/bundlers)
- **Rendering:** Canvas 2D API
- **Styling:** CSS custom properties (design tokens em `index.html`) + Google Fonts
- **Icons:** Material Icons (via CDN)
- **Audio:** Web Audio API (preferencia para sons programaticos; arquivos de audio permitidos em `assets/sons/`)
- **Assets:** Sprites, spritesheets, tilemaps e outros arquivos de imagem/audio sao **permitidos** em `assets/`
- **Deploy:** Vercel (site estatico, sem build step)
- **Quality Framework:** agnostic-core (submodule `.agnostic-core/`)

### Uso de Assets Externos
- Sprites e imagens: salvar em `assets/sprites/<nome-do-jogo>/`
- Audio: salvar em `assets/sons/`
- Fontes/libs leves via CDN sao permitidas (ex: spritesheets publicas, Howler.js)
- Preferir assets com licenca permissiva (MIT, CC0, dominio publico)
- Documentar origem e licenca em `docs/ORIGEM.md`

## Deploy (Vercel)

- Site 100% estatico — sem servidor, sem build step
- `index.html` na raiz do projeto
- Framework preset: "Other" no Vercel
- Output directory: `.` (raiz)
- Config em `vercel.json` (headers de cache para assets)
- Cada push no GitHub = deploy automatico

---

## Arquitetura

### Estrutura de Arquivos
```
index.html              # Pagina principal (splash + hub + jogo)
vercel.json             # Config Vercel (cache headers)
jogos/
  penaltis.js           # Jogo de Penaltis (standalone)
  escorpiao.js          # Jogo Escorpiao (standalone)
  reptil.js             # Jogo Reptil (standalone, IK procedural)
  pacman.js             # Jogo Pac-Man (standalone)
  tamandua.js           # Jogo Tamandua Runner (standalone, IK procedural)
  sonic.js              # Jogo Sonic Runner (standalone)
  joguinhos-modal.js    # Sistema de navegacao (splash → hub → jogo)
assets/
  sons/                 # Arquivos de audio (.ogg, .mp3, .wav)
  sprites/              # Spritesheets e imagens por jogo
    sonic/              # ex: sonic-sprites.png, tiles-ghz.png
    pacman/             # ex: ghosts.png
docs/
  ORIGEM.md             # Referencia do codigo original e licencas dos assets
.agnostic-core/         # Submodule: framework de qualidade
```

### Padrao de Cada Jogo
Cada jogo e um IIFE que expoe um objeto global:
- `window.PenaltisGame` — com metodos `abrir(container)` e `fechar()`
- `window.EscorpiaoGame` — com metodos `abrir()` e `fechar()`
- `window.ReptilGame` — com metodos `abrir()` e `fechar()`
- `window.PacmanGame` — com metodos `abrir()` e `fechar()`
- `window.TamanduaGame` — com metodos `abrir()` e `fechar()`

### Sistema de Telas (joguinhos-modal.js)
```
Splash (tela-splash)
  │  Titulo "Joguinhos do Jose" + garotinho animado + fundo com personagens
  │  Botao grande "Jogar"
  ▼
Hub (tela-hub)
  │  Grid 2 colunas com cards dos jogos
  │  Foco vertical (mobile-first)
  ▼
Jogo (tela-jogo)
  │  Container fullscreen para o jogo
  │  Botao voltar → hub
```

### Registrar Novo Jogo no Hub
Para adicionar um jogo ao hub, adicionar entrada no array `JOGOS` em `joguinhos-modal.js`:
```javascript
{
    id: 'nome-do-jogo',
    nome: 'Nome',
    icon: 'material_icon_name',
    cor: 'linear-gradient(135deg, #cor1, #cor2)',
    abrir: function() { window.NomeDoJogoGame.abrir(); },
    fechar: function() { window.NomeDoJogoGame.fechar(); }
}
```

---

## Coding Standards

### Regras Gerais
- **Sem bundlers/transpilers** — Nao usar Webpack, Vite, Babel, etc. O codigo roda direto no browser
- **Sem frameworks de UI** — Sem React, Vue, Angular, jQuery
- **Libs leves via CDN sao permitidas** — ex: Howler.js para audio, LDtk loader, etc.
- **IIFE pattern** — Cada jogo encapsulado em IIFE
- **Exposicao global** — APIs expostas via `window.NomeDoJogo`

### UI/UX
- **Dark mode** — Fundo escuro (#0f172a, #1e293b)
- **Fontes:** Russo One (titulos/stats), JetBrains Mono (numeros), Inter (corpo)
- **Icons:** Material Icons (NUNCA emojis no codigo)
- **Responsivo:** Suporte a mouse + touch
- **Acessibilidade:** Suporte a teclado (atalhos)

### Design para Criancas
- **Alvos de toque grandes** — Minimo 64x64px, ideal 80px+
- **Espacamento generoso** — Minimo 20px entre elementos clicaveis
- **Interacao simples** — Tap/clique basico. Evitar drag, pinch, swipe, gestos complexos
- **Sem feedback negativo** — NUNCA "voce perdeu", "errou", insultos. Toda interacao = resposta positiva
- **Sessoes curtas** — 2-3 minutos por rodada no maximo
- **Texto curto** — Ok ter texto, mas 1-3 palavras. Nunca frases longas
- **Feedback imediato** — Todo toque deve produzir som + animacao visual
- **Cores vibrantes** — Alto contraste, cores alegres

### Audio
- **Web Audio API** para sons sintetizados simples (cliques, efeitos curtos)
- **Arquivos de audio permitidos** em `assets/sons/` — usar quando qualidade importa (musica, efeitos ricos)
- **Howler.js via CDN** permitido para gerenciamento de audio mais robusto
- Todo jogo deve ter feedback sonoro em interacoes (clique, acerto, erro, fim)
- **Cleanup obrigatorio** — fechar/suspender `AudioContext` e parar sons ao fechar jogo
- Padrao: criar helper de som dentro de cada IIFE, nao como global

### Canvas
- **requestAnimationFrame** para game loops
- **Cleanup obrigatorio** — cancelAnimationFrame + removeEventListener ao fechar
- **Responsive** — Listener de resize para ajustar canvas

### Novo Jogo — Checklist
Ao adicionar um novo jogo:
1. Criar `jogos/nome-do-jogo.js` seguindo o padrao IIFE
2. Expor `window.NomeDoJogoGame` com `abrir()` e `fechar()`
3. Adicionar entrada no array `JOGOS` em `joguinhos-modal.js`
4. Incluir `<script src="jogos/...">` na `index.html` (raiz)
5. Atualizar `README.md` com descricao do jogo
6. Documentar origem em `docs/ORIGEM.md` se aplicavel
7. Auditar com SPARC antes de merge (ver Auditoria abaixo)

---

## agnostic-core — Framework de Qualidade

Submodule em `.agnostic-core/` com 41 skills, 14 agents e 4 workflows.
Consultar **antes de implementar** mudancas significativas.

### Skills Obrigatorias (consultar sempre)

**Frontend & UX:**
- `.agnostic-core/skills/frontend/html-css-audit.md` — Semantica HTML, CSS quality
- `.agnostic-core/skills/frontend/css-governance.md` — Design tokens, anti-duplicacao, anti-Frankenstein
- `.agnostic-core/skills/frontend/accessibility.md` — WCAG 2.1 AA: contraste, teclado, ARIA, reduced-motion
- `.agnostic-core/skills/frontend/ux-guidelines.md` — 17 categorias: touch targets, feedback, tipografia, animacao
- `.agnostic-core/skills/ux-ui/principios-de-interface.md` — Hierarquia visual, espacamento, modais

**Auditoria & Qualidade:**
- `.agnostic-core/skills/audit/code-review.md` — Corretude, seguranca, qualidade, performance
- `.agnostic-core/skills/audit/validation-checklist.md` — Quick check + Full check pre-deploy
- `.agnostic-core/skills/audit/refactoring.md` — 7 fases de decomposicao segura

**Performance:**
- `.agnostic-core/skills/performance/performance-audit.md` — Frontend: lazy load, debounce, cache headers

### Skills Recomendadas (consultar quando aplicavel)

**Seguranca:**
- `.agnostic-core/skills/security/owasp-checklist.md` — XSS, injection, headers, CSP (relevante para innerHTML)
- `.agnostic-core/skills/security/politica-de-seguranca.md` — Politica geral

**Git & Workflow:**
- `.agnostic-core/skills/git/commit-conventions.md` — Conventional Commits: `feat(jogo): descricao`
- `.agnostic-core/skills/workflow/project-workflow.md` — 6 fases: Initialize → Discuss → Plan → Execute → Verify → Complete
- `.agnostic-core/skills/workflow/goal-backward-planning.md` — Planejamento reverso a partir do objetivo

**Deploy:**
- `.agnostic-core/skills/devops/pre-deploy-checklist.md` — Checklist pre-deploy
- `.agnostic-core/skills/performance/caching-strategies.md` — Cache L1-L3

### Agents Disponiveis

**Para auditorias de codigo:**
```
Atue como o agent em .agnostic-core/agents/reviewers/code-inspector.md
Audite os arquivos em jogos/ usando a metodologia SPARC.
```

**Para revisao de frontend:**
```
Atue como o agent em .agnostic-core/agents/reviewers/frontend-reviewer.md
Revise os arquivos HTML, CSS e JS do projeto.
```

**Todos os agents:**
- `.agnostic-core/agents/reviewers/code-inspector.md` — Auditoria SPARC (Security, Performance, Architecture, Reliability, Code Quality)
- `.agnostic-core/agents/reviewers/frontend-reviewer.md` — Revisao de HTML/CSS/JS, acessibilidade, UX
- `.agnostic-core/agents/reviewers/security-reviewer.md` — Revisao de seguranca
- `.agnostic-core/agents/reviewers/performance-reviewer.md` — Revisao de performance
- `.agnostic-core/agents/reviewers/codebase-mapper.md` — Mapeamento de codebase (STACK/ARCH/CONVENTIONS/CONCERNS)
- `.agnostic-core/agents/generators/project-planner.md` — Planejamento estruturado (ROADMAP + PLAN)

### Workflows

- `.agnostic-core/commands/workflows/create.md` — Criar feature do zero
- `.agnostic-core/commands/workflows/debug.md` — Debug sistematico
- `.agnostic-core/commands/workflows/brainstorm.md` — Explorar opcoes antes de implementar
- `.agnostic-core/commands/workflows/deploy.md` — Processo de deploy seguro

### Atualizacao do Submodule
```bash
git submodule update --remote .agnostic-core
git add .agnostic-core
git commit -m "chore(deps): atualizar agnostic-core"
```

---

## Protocolo de Planejamento

**ANTES de implementar qualquer mudanca significativa:**
1. Consultar skills relevantes do agnostic-core
2. Criar planejamento com TodoWrite
3. Apresentar ao usuario
4. Aguardar aprovacao
5. Executar
6. Auditar com SPARC se for novo jogo ou mudanca estrutural

---

## Protocolo de Auditoria (SPARC)

Ao criar ou modificar jogos, aplicar as 5 dimensoes:
- **S (Security):** innerHTML com dados dinamicos? Event listeners limpos? Sem globals desnecessarios?
- **P (Performance):** requestAnimationFrame (nao setInterval)? Canvas resize eficiente? Sem redraws desnecessarios?
- **A (Architecture):** IIFE encapsulado? Cleanup no fechar()? Separacao clara de update/render?
- **R (Reliability):** Touch + mouse? Resize handler? ESC para sair? Sem memory leaks?
- **C (Code Quality):** Nomes claros? Sem duplicacao? Constantes configuradas no topo?

---

## Conventional Commits

Formato: `type(scope): descricao em imperativo`

Tipos: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `test`
Escopos: `penaltis` | `escorpiao` | `reptil` | `pacman` | `tamandua` | `sonic` | `hub` | `splash` | `deps` | `infra`

Exemplos:
```
feat(reptil): adicionar jogo reptil com IK procedural
fix(penaltis): corrigir ratings negativos no game over
chore(deps): atualizar agnostic-core
docs(readme): adicionar descricao do jogo reptil
refactor(escorpiao): cachear grade em offscreen canvas
```

---

## Jogos Existentes

### Penaltis (`penaltis.js`)
- Canvas 360x240, arcade 8-bit
- 2 modos: striker (cobrar) e keeper (defender)
- 4 dificuldades com IA progressiva
- Controles: mouse/touch + teclado (Q/W/E + A/S/D)
- 5 cobrancas por partida

### Escorpiao (`escorpiao.js`)
- Canvas fullscreen
- 16 segmentos: cabeca + 8 corpo + 6 cauda
- Fisica: LERP na cabeca, chain following nos segmentos
- Efeitos: patas animadas, ferrao glow, olhos, garras
- Controles: mouse/touch, ESC para sair

### Reptil (`reptil.js`)
- Canvas fullscreen, lagarto procedural
- Inverse Kinematics esqueletica (Segment → LimbSystem → LegSystem → Creature)
- Pernas com auto-stepping procedural (2-5 pares, aleatorio)
- Cauda variavel proporcional ao corpo
- Fisica: aceleracao/friccao/resistencia (forward + rotational)
- Visual: wireframe neon verde com glow
- Controles: mouse/touch, ESC para sair
- Inspirado em Reptile Interactive Cursor (MIT License)

### Pac-Man (`pacman.js`)
- Canvas fullscreen, Pac-Man simplificado para criancas
- Mapa grid 19x21 com paredes, pellets e power pellets
- 4 fantasmas com IA basica (chase/scatter/scared)
- 3 fases progressivas, 3 vidas
- Power pellets ativam modo scared nos fantasmas
- Controles: mouse/touch para direcionar, ESC para sair

### Tamandua (`tamandua.js`)
- Canvas fullscreen, runner automatico com tamandua procedural
- IK esqueletica reutilizada do reptil.js (Segment, LimbSystem, LegSystem)
- 2 pares de pernas com auto-stepping procedural
- Focinho longo (5 segmentos), corpo robusto, cauda peluda (8 segmentos)
- Formigas como coletaveis, obstaculos para pular (troncos, pedras, formigueiros)
- Sem game over — tropecar reduz velocidade mas continua
- Celebracao a cada 10 formigas coletadas (confetti + som)
- Parallax: montanhas + arvores + chao com grama
- Controles: toque em qualquer lugar para pular, Espaco/Seta, ESC para sair

### Tecnologias Reutilizaveis Entre Jogos

| Tecnologia | Origem | Reusar em |
|---|---|---|
| IK esqueletica (Segment/LimbSystem) | reptil.js | Qualquer criatura articulada |
| LegSystem auto-step | reptil.js | Bichos que andam |
| Chain following (LERP) | escorpiao.js | Cobras, minhocas, caudas |
| Creature physics (accel/friction) | reptil.js | Qualquer entidade movel |
| Gradientes radiais + glow | escorpiao.js | Visual rico em qualquer jogo |
| Grid decorativa de fundo | escorpiao.js, reptil.js | Padrao visual de fundo |

---

## Ideias para Novos Jogos
- Snake (tema futebol)
- Memory (escudos de times)
- Dino runner (estilo Chrome offline)
- Aranha (IK do reptil + teia)
- Centopeia (chain following + legs)

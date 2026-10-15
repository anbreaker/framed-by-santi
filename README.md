# 📸 Framed by Santi

<p align="center">
  <b>Angular 22 · Signals · Native CSS · Vite · Cloudinary</b><br/>
  <i>Landing page and private work dashboard for an amateur street photographer</i>
</p>

---

<p align="center">
  <img src="https://img.shields.io/badge/Angular-22-red?logo=angular" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-8-purple?logo=vite" />
  <img src="https://img.shields.io/badge/CSS-Native%20nesting-pink?logo=css3" />
  <img src="https://img.shields.io/badge/Signals-First-green" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20ES%20%7C%20PT-orange" />
</p>

<p align="center">
  <a href="https://github.com/Gentleman-Programming/gentle-ai">
    <img width="220" src="https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/docs/assets/brand/built-with-gentle-ai.png" alt="Built with Gentle-AI" />
  </a>
</p>

---

Landing page and private work dashboard for [@framedbysanti](https://www.instagram.com/framedbysanti), the portfolio of an amateur photographer who shoots on a Fujifilm X100VI in New York. Built with Angular 22: standalone components, Signals, zoneless change detection, native CSS, Vite and Transloco-based i18n. Trilingual: English (US, default), Spanish and Portuguese (PT).

## 🇬🇧 English

### 🧭 Overview

> Status: public landing prototype (home, gallery of photo sets, post viewer with zoom, about) running on local photos or Cloudinary. Firebase (auth + Firestore), the private dashboard and the final design come next.

- **Posts are sets**: one post holds several photos, like an Instagram carousel. The gallery shows one tile per post; the viewer walks through the set (arrows, keyboard, swipe, thumbnails).
- **Latest set on the home page**: every photo of the newest set in a strip with arrows, next to the buttons to open the set or the gallery.
- **Zoom and pan** in the viewer: pinch, drag and double tap on touch; click, buttons, Ctrl or Cmd + wheel and keyboard on desktop.
- **Motion with care**: View Transitions between pages and from gallery tile to viewer, scroll reveals, all off under `prefers-reduced-motion`.
- **Locale-aware**: dates, plurals and percentages follow the site language (`en-US`, `es-ES`, `pt-PT`).
- **No public sign-in link**: the future dashboard is reached only by a direct route.

### 🤖 How this project is built

It is developed with AI coding agents using Organic-Driven Development with [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) and [Engram](https://github.com/Gentleman-Programming/engram) as persistent memory. Small changes stay light, substantial work gets a tracked task list (`odd/`, not versioned), and a human reviews and merges every pull request.

### 🧱 Current stack

- Angular 22 (standalone, `OnPush`, signals, zoneless)
- TypeScript 6.0 in strict mode
- Native CSS (nesting, BEM, mobile-first), no preprocessor
- Vite 8 + `@analogjs/vite-plugin-angular` as the only build tool
- Transloco 8
- Cloudinary for image delivery
- Vitest 4 + JSDOM
- ESLint 10 + `angular-eslint` + project-specific custom rules
- Prettier 3 + plugins for CSS order, attribute order and JSON keys
- Vercel hosting

### 🏗️ Architecture

#### 🖥️ Frontend

- Bootstrapped with `bootstrapApplication()` and a centralized `ApplicationConfig`.
- Router-based lazy loading per page.
- Translation files loaded from `/assets/i18n/*.json`.

#### ⚡ State and reactivity

- Signals are the default mechanism for state; `computed()` for derived state.
- RxJS is not the default solution; it is used only when interoperability justifies it.

#### 🖼️ Photos

Every image goes through `photoUrl()` / `photoSrcset()` in `features/photo-posts/utils/photo-url.ts`. With a Cloudinary cloud name configured it builds delivery URLs (`c_limit,f_auto,q_auto` and a fixed set of widths: 480, 800, 1200, 1600, 2400) with `srcset` and `sizes`. Without it, it falls back to the local files in `public/local-photos/`, which is also what the tests use.

Photos are never committed: `public/local-photos/` (WebP) and `santiImages/` (raw exports) are git-ignored.

### 📁 Relevant structure

```sh
src/
├── app/
│   ├── core/        # const, services, store, utils (app-wide singletons)
│   ├── features/    # photo-posts, gallery, post-viewer, landing, about, site-shell, scroll-reveal
│   ├── pages/       # routed screens
│   └── shared/      # reusable components, directives, pipes
├── environments/
└── styles/
public/
├── assets/
│   ├── i18n/
│   └── images/
└── local-photos/    # git-ignored
```

Path aliases: `@core`, `@features`, `@pages`, `@shared`, `@environments`, `@assets`, `@styles`.

### 🧠 Project best practices

- Code, comments and commits are written in English.
- Every component is standalone, uses `ChangeDetectionStrategy.OnPush`, `templateUrl` and `styleUrl`; no barrels.
- `inject()` instead of constructor injection, `input()` / `output()` signals, `@if` / `@for` control flow.
- Translation keys are camelCase and namespaced per section; every language file must keep the same keys.
- `any` is avoided; ESLint treats it as an error outside tests.
- Imports, JSON keys and attributes are sorted to keep diffs predictable.
- Custom ESLint rules (in `.eslint/rules/`) enforce consistency.

### 📜 Scripts

```bash
# Install dependencies
npm install

# Local development
npm start        # http://localhost:4200

# Tests
npm test
npm run test:watch
npm run test:ui

# Quality
npm run lint
npm run lint:fix
npm run format

# Build and preview
npm run build    # production build into dist/
npm run preview
```

### ⚙️ Environment requirements

- Node.js `>= 22.19.0`
- npm `>= 10.9.3`

### ⚙️ Environment variables

The app only needs **public** values. Create a git-ignored `.env.local` in the project root:

```bash
NG_APP_CLOUDINARY_CLOUD_NAME=<your cloud name>
NG_APP_CLOUDINARY_ID_PREFIX=framed-by-santi/test/
```

Restart `npm start` after changing it. On Vercel add the same two variables to Production and Preview. API keys and secrets never go in this file nor in the app: they belong only to the signing function (Vercel environment variables) and to your own terminal when you run the local tools.

### 🧪 Testing and quality

- Vitest runs in a `jsdom` environment.
- ESLint validates TypeScript, Angular HTML templates and JSON files.
- A parity test keeps the three translation files on the same keys.

### 🌍 i18n

- Translations live in `public/assets/i18n` (`en`, `es`, `pt`) and are served as `/assets/i18n/*.json`.
- Dates, numbers and plurals use `Intl` with the locale mapped from the active language.

### 🚀 Deployment

The site is hosted on Vercel. `main` is the production branch; pushes to `develop` and to pull requests create Preview deployments. `vercel.json` sets `vite build`, the `dist` output and the SPA rewrite.

### 🧾 Commit convention

Conventional Commits, max 50 characters:

```sh
<type>(<scope>): <description>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

```sh
feat(gallery): add tag filter
fix(viewer): keep zoom after resize
docs(readme): make the readme trilingual
```

### 🌿 Branching

The repository follows Gitflow:

```sh
main       <- production
develop    <- integration (default branch, pull requests go here)
feature/*  <- new features
release/*  <- release preparation
hotfix/*   <- urgent fixes
```

---

## 🇪🇸 Español

### 🧭 Resumen

> Estado: prototipo de la landing pública (home, galería de paquetes de fotos, visor con zoom, sobre mí) funcionando con fotos locales o con Cloudinary. Firebase (auth + Firestore), el panel privado y el diseño final vienen después.

- **Los posts son paquetes**: un post tiene varias fotos, como un carrusel de Instagram. La galería muestra una celda por post y el visor recorre el paquete (flechas, teclado, deslizamiento y miniaturas).
- **Último paquete en la home**: todas las fotos del paquete más reciente en una tira con flechas, junto a los botones para abrir el paquete o la galería.
- **Zoom y movimiento** en el visor: pellizco, arrastre y doble toque en táctil; clic, botones, Ctrl o Cmd + rueda y teclado en escritorio.
- **Movimiento con cuidado**: View Transitions entre páginas y de la celda al visor, aparición al hacer scroll, todo desactivado con `prefers-reduced-motion`.
- **Formatos por idioma**: fechas, plurales y porcentajes siguen el idioma del sitio (`en-US`, `es-ES`, `pt-PT`).
- **Sin enlace público de acceso**: el futuro panel solo se alcanza por una ruta directa.

### 🤖 Cómo se construye este proyecto

Se desarrolla con agentes de IA usando Organic-Driven Development con [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) y [Engram](https://github.com/Gentleman-Programming/engram) como memoria persistente. Los cambios pequeños se mantienen ligeros, el trabajo sustancial lleva una lista de tareas (`odd/`, sin versionar) y una persona revisa y fusiona cada pull request.

### 🧱 Stack actual

- Angular 22 (standalone, `OnPush`, signals, zoneless)
- TypeScript 6.0 en modo estricto
- CSS nativo (nesting, BEM, mobile-first), sin preprocesador
- Vite 8 + `@analogjs/vite-plugin-angular` como única herramienta de build
- Transloco 8
- Cloudinary para la entrega de imágenes
- Vitest 4 + JSDOM
- ESLint 10 + `angular-eslint` + reglas custom del proyecto
- Prettier 3 + plugins para ordenar CSS, atributos y claves JSON
- Hosting en Vercel

### 🏗️ Arquitectura

#### 🖥️ Frontend

- Bootstrap con `bootstrapApplication()` y un `ApplicationConfig` centralizado.
- Lazy loading por página mediante el router.
- Traducciones cargadas desde `/assets/i18n/*.json`.

#### ⚡ Estado y reactividad

- Signals es el mecanismo por defecto para el estado; `computed()` para el estado derivado.
- RxJS no es la solución por defecto; solo se usa cuando la interoperabilidad realmente lo justifica.

#### 🖼️ Fotos

Toda imagen pasa por `photoUrl()` / `photoSrcset()` en `features/photo-posts/utils/photo-url.ts`. Con un cloud name de Cloudinary configurado arma URLs de entrega (`c_limit,f_auto,q_auto` y un conjunto fijo de anchos: 480, 800, 1200, 1600, 2400) con `srcset` y `sizes`. Sin él, vuelve a los archivos locales de `public/local-photos/`, que es también lo que usan los tests.

Las fotos nunca se commitean: `public/local-photos/` (WebP) y `santiImages/` (originales exportados) están ignoradas por git.

### 📁 Estructura relevante

```sh
src/
├── app/
│   ├── core/        # const, services, store, utils (singletons de la app)
│   ├── features/    # photo-posts, gallery, post-viewer, landing, about, site-shell, scroll-reveal
│   ├── pages/       # pantallas con ruta
│   └── shared/      # componentes, directivas y pipes reutilizables
├── environments/
└── styles/
public/
├── assets/
│   ├── i18n/
│   └── images/
└── local-photos/    # ignorada por git
```

Alias de rutas: `@core`, `@features`, `@pages`, `@shared`, `@environments`, `@assets`, `@styles`.

### 🧠 Buenas prácticas del proyecto

- Código, comentarios y commits en inglés.
- Cada componente es standalone, usa `ChangeDetectionStrategy.OnPush`, `templateUrl` y `styleUrl`; sin barrels.
- `inject()` en lugar de inyección por constructor, signals `input()` / `output()`, control flow `@if` / `@for`.
- Las claves de traducción van en camelCase por sección; todos los idiomas deben tener las mismas claves.
- Evitamos `any`; ESLint lo trata como error fuera de tests.
- Se ordenan imports, claves JSON y atributos para mantener diffs predecibles.
- Reglas custom de ESLint (en `.eslint/rules/`) fuerzan la consistencia.

### 📜 Scripts

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm start        # http://localhost:4200

# Tests
npm test
npm run test:watch
npm run test:ui

# Calidad
npm run lint
npm run lint:fix
npm run format

# Build y preview
npm run build    # build de producción en dist/
npm run preview
```

### ⚙️ Requisitos de entorno

- Node.js `>= 22.19.0`
- npm `>= 10.9.3`

### ⚙️ Variables de entorno

La app solo necesita valores **públicos**. Crea un `.env.local` ignorado por git en la raíz:

```bash
NG_APP_CLOUDINARY_CLOUD_NAME=<tu cloud name>
NG_APP_CLOUDINARY_ID_PREFIX=framed-by-santi/test/
```

Reinicia `npm start` después de cambiarlo. En Vercel añade las mismas dos variables en Production y Preview. Las claves y secretos nunca van en este archivo ni en la app: pertenecen solo a la función que firma las subidas (variables de entorno de Vercel) y a tu propia terminal cuando ejecutas las herramientas locales.

### 🧪 Testing y calidad

- Vitest corre en entorno `jsdom`.
- ESLint valida TypeScript, templates HTML de Angular y archivos JSON.
- Un test de paridad mantiene los tres archivos de traducción con las mismas claves.

### 🌍 i18n

- Las traducciones viven en `public/assets/i18n` (`en`, `es`, `pt`) y se sirven como `/assets/i18n/*.json`.
- Fechas, números y plurales usan `Intl` con el locale asociado al idioma activo.

### 🚀 Despliegue

El sitio está alojado en Vercel. `main` es la rama de producción; los pushes a `develop` y a los pull requests crean despliegues de vista previa. `vercel.json` define `vite build`, la salida `dist` y la reescritura de la SPA.

### 🧾 Convención de commits

Conventional Commits, máximo 50 caracteres:

```sh
<type>(<scope>): <description>
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

```sh
feat(gallery): add tag filter
fix(viewer): keep zoom after resize
docs(readme): make the readme trilingual
```

### 🌿 Branching

El repositorio sigue Gitflow:

```sh
main       <- producción
develop    <- integración (rama por defecto, los pull requests van aquí)
feature/*  <- nuevas features
release/*  <- preparación de releases
hotfix/*   <- fixes urgentes
```

---

## 🇵🇹 Português

### 🧭 Resumo

> Estado: protótipo da página pública (início, galeria de conjuntos de fotos, visualizador com zoom, sobre) a funcionar com fotos locais ou com o Cloudinary. O Firebase (autenticação + Firestore), o painel privado e o design final vêm a seguir.

- **Os _posts_ são conjuntos**: um _post_ tem várias fotos, como um carrossel do Instagram. A galeria mostra um cartão por _post_ e o visualizador percorre o conjunto (setas, teclado, deslize e miniaturas).
- **Último conjunto na página inicial**: todas as fotos do conjunto mais recente numa faixa com setas, junto dos botões para abrir o conjunto ou a galeria.
- **Zoom e movimento** no visualizador: pinça, arrastar e toque duplo em ecrã tátil; clique, botões, Ctrl ou Cmd + roda e teclado no computador.
- **Movimento com cuidado**: _View Transitions_ entre páginas e do cartão para o visualizador, aparecimento ao fazer _scroll_, tudo desativado com `prefers-reduced-motion`.
- **Formatos por idioma**: datas, plurais e percentagens seguem o idioma do site (`en-US`, `es-ES`, `pt-PT`).
- **Sem ligação pública de acesso**: o futuro painel só é alcançado por uma rota direta.

### 🤖 Como este projeto é construído

É desenvolvido com agentes de IA através de _Organic-Driven Development_ com o [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) e o [Engram](https://github.com/Gentleman-Programming/engram) como memória persistente. As alterações pequenas mantêm-se leves, o trabalho substancial tem uma lista de tarefas (`odd/`, não versionada) e uma pessoa revê e faz _merge_ de cada _pull request_.

### 🧱 _Stack_ atual

- Angular 22 (_standalone_, `OnPush`, _signals_, _zoneless_)
- TypeScript 6.0 em modo rigoroso
- CSS nativo (_nesting_, BEM, _mobile-first_), sem pré-processador
- Vite 8 + `@analogjs/vite-plugin-angular` como única ferramenta de _build_
- Transloco 8
- Cloudinary para a entrega de imagens
- Vitest 4 + JSDOM
- ESLint 10 + `angular-eslint` + regras personalizadas do projeto
- Prettier 3 + _plugins_ para ordenar CSS, atributos e chaves JSON
- _Hosting_ na Vercel

### 🏗️ Arquitetura

#### 🖥️ _Frontend_

- _Bootstrap_ com `bootstrapApplication()` e um `ApplicationConfig` centralizado.
- _Lazy loading_ por página com o _router_.
- Traduções carregadas a partir de `/assets/i18n/*.json`.

#### ⚡ Estado e reatividade

- _Signals_ são o mecanismo padrão para o estado; `computed()` para o estado derivado.
- RxJS não é a solução padrão; só é usado quando a interoperabilidade realmente compensa.

#### 🖼️ Fotos

Toda a imagem passa por `photoUrl()` / `photoSrcset()` em `features/photo-posts/utils/photo-url.ts`. Com um _cloud name_ do Cloudinary configurado, gera URLs de entrega (`c_limit,f_auto,q_auto` e um conjunto fixo de larguras: 480, 800, 1200, 1600, 2400) com `srcset` e `sizes`. Sem ele, recorre aos ficheiros locais de `public/local-photos/`, que é também o que os testes usam.

As fotos nunca são enviadas para o repositório: `public/local-photos/` (WebP) e `santiImages/` (originais exportados) estão ignoradas pelo git.

### 📁 Estrutura relevante

```sh
src/
├── app/
│   ├── core/        # const, services, store, utils (singletons da aplicação)
│   ├── features/    # photo-posts, gallery, post-viewer, landing, about, site-shell, scroll-reveal
│   ├── pages/       # ecrãs com rota
│   └── shared/      # componentes, diretivas e pipes reutilizáveis
├── environments/
└── styles/
public/
├── assets/
│   ├── i18n/
│   └── images/
└── local-photos/    # ignorada pelo git
```

Aliases de caminhos: `@core`, `@features`, `@pages`, `@shared`, `@environments`, `@assets`, `@styles`.

### 🧠 Boas práticas do projeto

- Código, comentários e _commits_ em inglês.
- Cada componente é _standalone_, usa `ChangeDetectionStrategy.OnPush`, `templateUrl` e `styleUrl`; sem _barrels_.
- `inject()` em vez de injeção por construtor, _signals_ `input()` / `output()`, _control flow_ `@if` / `@for`.
- As chaves de tradução usam camelCase por secção; todos os idiomas devem ter as mesmas chaves.
- Evitamos `any`; o ESLint trata isso como erro fora dos testes.
- Ordenamos _imports_, chaves JSON e atributos para manter os _diffs_ previsíveis.
- Regras personalizadas do ESLint (em `.eslint/rules/`) impõem consistência.

### 📜 _Scripts_

```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm start        # http://localhost:4200

# Testes
npm test
npm run test:watch
npm run test:ui

# Qualidade
npm run lint
npm run lint:fix
npm run format

# Build e preview
npm run build    # build de produção em dist/
npm run preview
```

### ⚙️ Requisitos de ambiente

- Node.js `>= 22.19.0`
- npm `>= 10.9.3`

### ⚙️ Variáveis de ambiente

A aplicação só precisa de valores **públicos**. Crie um `.env.local` ignorado pelo git na raiz:

```bash
NG_APP_CLOUDINARY_CLOUD_NAME=<o seu cloud name>
NG_APP_CLOUDINARY_ID_PREFIX=framed-by-santi/test/
```

Reinicie `npm start` depois de o alterar. Na Vercel, adicione as mesmas duas variáveis em Production e Preview. As chaves e segredos nunca vão neste ficheiro nem na aplicação: pertencem apenas à função que assina os envios (variáveis de ambiente da Vercel) e ao seu próprio terminal quando executa as ferramentas locais.

### 🧪 Testes e qualidade

- O Vitest corre em ambiente `jsdom`.
- O ESLint valida TypeScript, _templates_ HTML do Angular e ficheiros JSON.
- Um teste de paridade mantém os três ficheiros de tradução com as mesmas chaves.

### 🌍 i18n

- As traduções residem em `public/assets/i18n` (`en`, `es`, `pt`) e são servidas como `/assets/i18n/*.json`.
- Datas, números e plurais usam `Intl` com o _locale_ associado ao idioma ativo.

### 🚀 _Deploy_

O site está alojado na Vercel. `main` é o ramo de produção; os _pushes_ para `develop` e para _pull requests_ criam _deploys_ de pré-visualização. O `vercel.json` define `vite build`, a saída `dist` e a reescrita da SPA.

### 🧾 Convenção de _commits_

_Conventional Commits_, máximo de 50 carateres:

```sh
<type>(<scope>): <description>
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

```sh
feat(gallery): add tag filter
fix(viewer): keep zoom after resize
docs(readme): make the readme trilingual
```

### 🌿 _Branching_

O repositório segue Gitflow:

```sh
main       <- produção
develop    <- integração (ramo por defeito, os pull requests vão para aqui)
feature/*  <- novas funcionalidades
release/*  <- preparação de _releases_
hotfix/*   <- correções urgentes
```

---

<p align="center">
  Built with ⚡ Angular + ❤️ anbreaker
</p>

# Framed by Santi

Landing page and private work dashboard for [@framedbysanti](https://www.instagram.com/framedbysanti), an amateur photographer's portfolio shot on a Fujifilm X100VI in New York. Trilingual: English (US, default), Spanish and Portuguese (PT).

> Status: public landing prototype (home, gallery of photo sets, post viewer with zoom, about) running on local photos. Firebase (auth + Firestore), Cloudinary (image hosting), the private dashboard and the final design come next.

## What is in it

- **Posts are sets**: one post holds several photos, like an Instagram carousel. The gallery shows one tile per post, the viewer walks through the set (arrows, keyboard, swipe, thumbnails).
- **Zoom and pan** in the viewer: pinch, drag and double tap on touch; click, buttons, Ctrl or Cmd + wheel and keyboard on desktop.
- **Motion with care**: View Transitions between pages and from gallery tile to viewer, scroll reveals, all off under `prefers-reduced-motion`.
- **Locale-aware**: dates, plurals and percentages follow the site language (`en-US`, `es-ES`, `pt-PT`).
- **No public sign-in link**: the future dashboard is reached only by a direct route.

## Photos while developing

Photos are never committed. Local WebP files live in `public/local-photos/` (served as `/local-photos/...`) and the raw exports in `santiImages/`; both are git-ignored. Every image goes through `photoUrl()` in `features/photo-posts/utils/photo-url.ts`, the single place to switch to Cloudinary (`f_auto,q_auto`).

## Photos from Cloudinary

Every image goes through `photoUrl()` / `photoSrcset()` in `features/photo-posts/utils/photo-url.ts`.
With a cloud name configured it builds Cloudinary delivery URLs (`c_limit,f_auto,q_auto` and a fixed
set of widths: 480, 800, 1200, 1600, 2400) with `srcset` and `sizes`; without it, it falls back to the
local files in `public/local-photos/`, which is also what the tests use.

The app only needs **public** values. Create a git-ignored `.env.local` in the project root:

```bash
NG_APP_CLOUDINARY_CLOUD_NAME=<your cloud name>
NG_APP_CLOUDINARY_ID_PREFIX=framed-by-santi/test/
```

Restart `npm start` after changing it. On Vercel add the same two variables to Production and Preview.
API keys and secrets never go in this file nor in the app: they belong only to the signing function
(Vercel environment variables) and to your own terminal when you run the local tools.

## Stack

- Angular 22 — standalone components, OnPush, signals, zoneless
- Vite as the only build tool (`@analogjs/vite-plugin-angular`)
- Transloco for i18n (`en`, `es`, `pt`) — files in `public/assets/i18n/`
- Native CSS (nesting, BEM, mobile-first) — no preprocessor
- Vitest + jsdom, ESLint 10 + angular-eslint (with custom rules), Prettier

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200
npm test           # unit tests
npm run lint       # ESLint
npm run build      # production build into dist/
```

Requires Node >= 22.19 and npm >= 10.9.

## Structure

```
src/app/
  core/       const, services, store, utils (app-wide singletons)
  features/   photo-posts, gallery, post-viewer, landing, about, site-shell, scroll-reveal
              (one folder per business capability; admin and auth come later)
  pages/      routed screens
  shared/     reusable components, directives, pipes
```

Path aliases: `@core`, `@features`, `@pages`, `@shared`, `@environments`, `@assets`, `@styles`.

## Conventions

- Code, comments and commits in English; conventional commits (`feat(scope): description`, max 50 chars).
- `inject()` instead of constructor injection, `input()`/`output()` signals, `@if`/`@for` control flow.
- Components always use `templateUrl` and `styleUrl`; no barrels.
- Translation keys are camelCase and namespaced per section; every language file must keep the same keys.

---

# Framed by Santi (Español)

Landing page y panel de trabajo privado para [@framedbysanti](https://www.instagram.com/framedbysanti), el portfolio de un fotógrafo aficionado que dispara con una Fujifilm X100VI en Nueva York. Trilingüe: inglés (EE. UU., por defecto), español y portugués (PT).

> Estado: prototipo de la landing pública (home, galería de paquetes de fotos, visor con zoom, sobre mí) funcionando con fotos locales. Firebase (auth + Firestore), Cloudinary (alojamiento de imágenes), el panel privado y el diseño final vienen después.

## Qué incluye

- **Los posts son paquetes**: un post tiene varias fotos, como un carrusel de Instagram. La galería muestra una celda por post y el visor recorre el paquete (flechas, teclado, deslizamiento y miniaturas).
- **Zoom y movimiento** en el visor: pellizco, arrastre y doble toque en táctil; clic, botones, Ctrl o Cmd + rueda y teclado en escritorio.
- **Movimiento con cuidado**: View Transitions entre páginas y de la celda al visor, aparición al hacer scroll, todo desactivado con `prefers-reduced-motion`.
- **Formatos por idioma**: fechas, plurales y porcentajes siguen el idioma del sitio (`en-US`, `es-ES`, `pt-PT`).
- **Sin enlace público de login**: el futuro panel solo se alcanza por una ruta directa.

## Fotos durante el desarrollo

Las fotos nunca se commitean. Los WebP locales están en `public/local-photos/` (se sirven como `/local-photos/...`) y los originales exportados en `santiImages/`; ambas carpetas están ignoradas por git. Toda imagen pasa por `photoUrl()` en `features/photo-posts/utils/photo-url.ts`, el único sitio que hay que cambiar para usar Cloudinary (`f_auto,q_auto`).

## Fotos desde Cloudinary

Toda imagen pasa por `photoUrl()` / `photoSrcset()` en `features/photo-posts/utils/photo-url.ts`.
Con un cloud name configurado arma URLs de entrega de Cloudinary (`c_limit,f_auto,q_auto` y un
conjunto fijo de anchos: 480, 800, 1200, 1600, 2400) con `srcset` y `sizes`; sin él, vuelve a los
archivos locales de `public/local-photos/`, que es también lo que usan los tests.

La app solo necesita valores **públicos**. Creá un `.env.local` ignorado por git en la raíz:

```bash
NG_APP_CLOUDINARY_CLOUD_NAME=<tu cloud name>
NG_APP_CLOUDINARY_ID_PREFIX=framed-by-santi/test/
```

Reiniciá `npm start` después de cambiarlo. En Vercel agregá las mismas dos variables en Production y
Preview. Las claves y secretos nunca van en este archivo ni en la app: pertenecen solo a la función
que firma las subidas (variables de entorno de Vercel) y a tu propia terminal cuando corrés las
herramientas locales.

## Cómo arrancar

```bash
npm install
npm start          # servidor de desarrollo en http://localhost:4200
npm test           # tests unitarios
npm run lint       # ESLint
npm run build      # build de producción en dist/
```

Requiere Node >= 22.19 y npm >= 10.9.

## Convenciones

- Código, comentarios y commits en inglés; commits convencionales (`feat(scope): descripción`, máximo 50 caracteres).
- `inject()` en lugar de inyección por constructor, signals `input()`/`output()`, control flow `@if`/`@for`.
- Los componentes usan siempre `templateUrl` y `styleUrl`; sin barrels.
- Las claves de traducción van en camelCase por sección; todos los idiomas deben tener las mismas claves.

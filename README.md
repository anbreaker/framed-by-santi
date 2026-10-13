# Framed by Santi

Landing page and private work dashboard for [@framedbysanti](https://www.instagram.com/framedbysanti), an amateur photographer's portfolio shot on a Fujifilm X100VI in New York. Trilingual: English (US, default), Spanish and Portuguese (PT).

> Status: scaffold only. Firebase (auth + Firestore), Cloudinary (image hosting), the dashboard and the final design come next.

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
  features/   gallery, admin, auth (one folder per business capability)
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

> Estado: solo el scaffold. Firebase (auth + Firestore), Cloudinary (alojamiento de imágenes), el panel y el diseño final vienen después.

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

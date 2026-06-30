// Single source of truth for the About page copy (`/about`).
//
// The wording is taken faithfully from the two project narratives:
//   - crash_course/video-presentation-script.md  (the visible 5-part spine)
//   - crash_course/presentation.md                (the richer process detail folded in)
//
// Ukrainian-first (NFR-I18N-01). Kept as structured data so app/about/page.tsx is a
// thin presentational layer and the copy never drifts between places.

export interface PipelineStep {
  label: string;
  /** Short note shown under the node, optional. */
  note?: string;
}

export interface EntityRow {
  name: string;
  where: string;
  meaning: string;
}

export interface FeatureCard {
  glyph: string;
  title: string;
  description: string;
}

export interface GateGroup {
  glyph: string;
  title: string;
  summary: string;
  items: readonly string[];
}

export interface ReviewerRow {
  reviewer: string;
  checks: string;
}

export interface CommandRow {
  gate: string;
  command: string;
  proves: string;
}

export interface ArtifactRow {
  path: string;
  role: string;
}

export interface TermRow {
  term: string;
  meaning: string;
}

export interface ProcessStep {
  /** Sequence marker, e.g. "3.1". */
  index: string;
  title: string;
  body: string;
}

export const ABOUT = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    eyebrow: "Про проєкт",
    title: "Finup",
    lede:
      "Фінансовий трекер, де користувач вносить фінансові дані зручним способом — " +
      "текстом, фото чека або банківською випискою — а система приводить це до єдиного " +
      "результату: редагованих фінансових операцій у ledger.",
    tagline:
      "Це сторінка не лише про продукт, а й про спосіб його побудови: керований " +
      "agentic workflow зі специфікаціями, доказами і перевірками.",
  },

  // ── 1. Що таке Finup ─────────────────────────────────────────────────────
  product: {
    index: "01",
    title: "Що таке Finup",
    summary:
      "Система зберігає input, очищує дані, парсить через AI та створює редаговані " +
      "ledger_items — атомарні фінансові операції. Dashboard показує фінансову картину операцій.",
    pipelineHeading: "Ключовий pipeline",
    pipeline: [
      { label: "input_event", note: "акт внесення" },
      { label: "normalization", note: "preprocessing" },
      { label: "parser run", note: "AI-parsing" },
      { label: "ledger_items", note: "операції" },
      { label: "dashboard", note: "огляд" },
    ] satisfies PipelineStep[],
    entitiesHeading: "Основні сутності",
    entities: [
      {
        name: "input_event",
        where: "DB / domain",
        meaning: "Один акт внесення: текст, фото чека або файл банківської виписки.",
      },
      {
        name: "parser_run",
        where: "DB / parsing",
        meaning: "Одна спроба AI-парсингу input event.",
      },
      {
        name: "ledger_item",
        where: "DB / ledger",
        meaning: "Атомарна фінансова операція.",
      },
      {
        name: "pending",
        where: "item status",
        meaning: "Операція створена, але ще не перевірена користувачем.",
      },
      {
        name: "approved",
        where: "item status",
        meaning: "Користувач підтвердив операцію.",
      },
      {
        name: "deleted",
        where: "item status",
        meaning: "Операція soft-deleted, не впливає на баланс.",
      },
    ] satisfies EntityRow[],
    invariantHeading: "Головний продуктовий інваріант",
    invariant:
      "Оригінальний input зберігається, а фінансові рядки залишаються редагованими й трасованими.",
    invariantWhy:
      "Це важливо, бо AI не є безумовним джерелом істини. AI допомагає структурувати " +
      "дані, але користувач може перевірити, змінити, підтвердити або видалити результат.",
  },

  // ── 2. Функції продукту ──────────────────────────────────────────────────
  features: {
    index: "02",
    title: "Функції продукту",
    summary:
      "Три канали внесення сходяться в один pipeline: " +
      "input event → normalization → parser run (AI-parsing) → ledger items.",
    cards: [
      {
        glyph: "↥",
        title: "Imports",
        description:
          "Три канали внесення: текст, фото чека і банківська виписка.",
      },
      {
        glyph: "≣",
        title: "Ledger — Журнал",
        description: "Сюди потрапляє результат парсингу.",
      },
      {
        glyph: "◎",
        title: "Dashboard — Огляд",
        description: "Баланс, доходи, витрати, категорії та місячний тренд.",
      },
    ] satisfies FeatureCard[],
  },

  // ── 3. Як будувався проєкт ───────────────────────────────────────────────
  build: {
    index: "03",
    title: "Як будувався проєкт",
    summary:
      "Це основна частина історії: ланцюг доказів процесу з фокусом на ключових " +
      "етапах.",
    notVibeHeading: "Не vibe coding",
    notVibe: {
      badLabel: "Не так",
      bad: "великий prompt → багато згенерованого коду → ручна надія, що все працює",
      goodLabel: "А так",
      good:
        "контекст → вимоги → OpenSpec → slice → tests/evidence → implementation → " +
        "checks → review → PR follow-up",
    },
    formulaHeading: "Центральна формула",
    formula:
      "OpenSpec був центральним contract layer, а навколо нього був зібраний " +
      "Project-Factory-style workflow: slicing, traceability, RED/GREEN evidence, " +
      "deterministic gates, evals, maker ≠ checker, CodeRabbit, fallow і handoff log.",
    chainHeading: "Цикл кожної фічі",
    chain: [
      { label: "requirements" },
      { label: "OpenSpec" },
      { label: "slice" },
      { label: "реалізація агентом" },
      { label: "RED / GREEN evidence" },
      { label: "deterministic checks" },
      { label: "maker ≠ checker review" },
      { label: "CodeRabbit / fallow" },
      { label: "PR follow-up" },
    ] satisfies PipelineStep[],
    steps: [
      {
        index: "3.1",
        title: "Контекст і правила для агентів",
        body:
          "Статичний контекст: product brief, requirements з ID вимог і правила для " +
          "агентів (AGENTS.md). Це задає межі, терміни, контракти і source of truth. " +
          "Динамічний контекст: docs/current-state.md — handoff log, який фіксує, що " +
          "було зроблено, що працює, що відкладено та що робити далі, щоб не втрачати " +
          "стан між сесіями й агентами.",
      },
      {
        index: "3.2",
        title: "OpenSpec як contract layer",
        body:
          "Для кожного slice створювався OpenSpec change: proposal, spec delta і tasks. " +
          "Тобто перед кодом була специфікація: що саме змінюється, які requirements " +
          "покриваються і які сценарії мають бути реалізовані. Агент реалізовував " +
          "конкретний slice проти погодженої специфікації.",
      },
      {
        index: "3.3",
        title: "Slicing",
        body:
          "Проєкт розбитий на capabilities і slices: foundation, manual input, parsing, " +
          "ledger items, bank imports, receipt photo imports, dashboard, settings. Для " +
          "кожного slice були scope delivered, scope not delivered, deferred work і process " +
          "evidence — бо агентам легко перебільшити «done».",
      },
      {
        index: "3.4",
        title: "RED/GREEN evidence і deterministic checks",
        body:
          "Реалізація йшла tests-first там, де це доречно: спочатку тест або перевірка " +
          "падає (RED), після реалізації — проходить (GREEN). Далі slice проходив набір " +
          "команд з exit codes, розділених на три рівні (нижче).",
      },
      {
        index: "3.5",
        title: "Evals для якості, яку не завжди ловлять тести",
        body:
          "Крім звичайних тестів, evals перевіряли аспекти, які складніше виразити " +
          "простим assert — наприклад якість українських error states або зрозумілість " +
          "UX-повідомлень. Tests перевіряють детерміновану поведінку, evals — якісні критерії.",
      },
      {
        index: "3.6",
        title: "Maker ≠ checker",
        body:
          "Після реалізації були reviewer-проходи окремими агентами. Зауваження " +
          "фіксились із тестами для захисту від повторення (regression coverage) або " +
          "свідомо документувались (trade-off accepted with rationale)."
      },
      {
        index: "3.7",
        title: "Зовнішні інструменти: CodeRabbit і fallow",
        body:
          "CodeRabbit давав PR-review як ментор і часто ловив практичні проблеми. Fallow " +
          "дивився на структуру коду: unused files, complexity, duplication, blast radius. " +
          "Рішення, що поправляти, а що лишати, приймались мною.",
      },
    ] satisfies ProcessStep[],
  },

  // ── 3.4 detail: три рівні перевірок ──────────────────────────────────────
  gates: {
    heading: "Перевірки: три рівні",
    intro:
      "У проєкті були три рівні команд із різною відповідальністю.",
    groups: [
      {
        glyph: "✓",
        title: "Product / code gates",
        summary: "Перевіряють сам продукт і код.",
        items: [
          "TypeScript (tsc --noEmit)",
          "Lint",
          "Unit / integration tests (Vitest)",
          "Next production build",
          "OpenSpec validation",
          "Trace checks",
          "Trajectory checks",
          "Coverage ratchet",
          "Eval checks",
        ],
      },
      {
        glyph: "◆",
        title: "Process-evidence checks",
        summary: "Перевіряють чесність і повноту процесу та його артефактів.",
        items: [
          "RED/GREEN evidence check",
          "Claim hygiene check",
          "Handoff freshness check",
        ],
      },
      {
        glyph: "▤",
        title: "Reporting commands",
        summary: "Підсумовують стан і допомагають підготувати handoff / PR.",
        items: ["gate:status", "slice:report"],
      },
    ] satisfies GateGroup[],
  },

  commands: {
    heading: "Команди, якими проходили gates",
    intro: "Кожна перевірка запускалась як відтворювана команда з exit code.",
    rows: [
      { gate: "TypeScript", command: "npx tsc --noEmit", proves: "типові контракти не зламані" },
      { gate: "Lint", command: "npm run lint", proves: "базова якість коду і lint rules" },
      { gate: "Tests", command: "npm run test:run", proves: "unit / integration поведінка проходить" },
      { gate: "Build", command: "npm run build", proves: "Next.js production build збирається" },
      { gate: "OpenSpec", command: "npx openspec validate --all --strict", proves: "spec layer валідний" },
      { gate: "Trace", command: "npm run check:trace", proves: "FR → spec → slice → tests chain не розірваний" },
      { gate: "Trajectory", command: "npm run check:trajectory", proves: "archived slices мають process artifacts" },
      { gate: "Coverage", command: "npm run test:coverage && npm run check:coverage", proves: "coverage не просів нижче baseline" },
      { gate: "Eval", command: "npm run check:eval", proves: "eval score не просів нижче baseline" },
    ] satisfies CommandRow[],
  },

  artifacts: {
    heading: "Де лежать докази процесу",
    intro: "Ці файли роблять процес видимим: можна відкрити repo і перевірити, що саме було зроблено.",
    rows: [
      { path: "AGENTS.md", role: "правила і рамки для агентів" },
      { path: "docs/requirements.md", role: "source of truth з traceable requirement IDs" },
      { path: "openspec/changes/<slice>/", role: "proposal, tasks, spec delta для конкретного slice" },
      { path: "evidence/red-run.json", role: "доказ, що перевірка спочатку падала" },
      { path: "evidence/green-run.json", role: "доказ, що після реалізації перевірка проходить" },
      { path: "reviews/*.md", role: "raw maker ≠ checker review evidence" },
      { path: "review-findings.json", role: "структурований підсумок reviewer findings" },
      { path: "quality/*-baseline.json", role: "coverage / eval ratchet baselines" },
      { path: "trace/*.json", role: "machine-readable traceability / trajectory outputs" },
      { path: "docs/current-state.md", role: "handoff log між сесіями" },
    ] satisfies ArtifactRow[],
  },

  terms: {
    heading: "Коротко про терміни",
    rows: [
      { term: "regression coverage", meaning: "тест або перевірка для захисту від повторення знайденої проблеми" },
      { term: "accepted with rationale", meaning: "зауваження прийняли до уваги, відклали виправлення і записали причину" },
      { term: "trade-off", meaning: "свідомий компроміс між якістю, scope, часом або складністю" },
      { term: "ratchet", meaning: "baseline, який утримує метрику від тихого погіршення" },
    ] satisfies TermRow[],
  },

  // ── Maker ≠ checker roles ────────────────────────────────────────────────
  reviewers: {
    heading: "Хто перевіряв (maker ≠ checker)",
    intro: "Той, хто робить slice, не має бути єдиним, хто його приймає.",
    rows: [
      { reviewer: "code reviewer", checks: "якість коду, структура, edge cases" },
      { reviewer: "security reviewer", checks: "privacy / security ризики" },
      {
        reviewer: "spec compliance auditor",
        checks: "відповідність OpenSpec і requirements",
      },
      {
        reviewer: "eval judge",
        checks: "якість eval output / UX copy / error clarity",
      },
    ] satisfies ReviewerRow[],
  },

  // ── 4. Моя роль ──────────────────────────────────────────────────────────
  role: {
    index: "04",
    title: "Моя роль у процесі",
    body:
      "Я задавав product direction, формував requirements, нарізав scope на slices, " +
      "приймав trade-offs, перевіряв evidence і вирішував, коли slice можна вважати " +
      "прийнятим. Агент допомагав писати код, тести, специфікації та review artifacts. " +
      "Але межі, критерії прийняття і рішення про deferred scope залишались за мною.",
  },

  // ── 5. Що далі ───────────────────────────────────────────────────────────
  next: {
    index: "05",
    title: "Що далі?",
    items: [
      "Робота з контекстом. Впровадити графи залежностей.",
      "Придумати, які задачі з цього workflow можна делегувати дешевшим моделям, і як.",
      "Підлаштувати Project Factory для доробок і зміни функціональності (brownfield).",
      "Доробити проєкт і оптимізувати під локальні моделі.",
    ],
  },

  cta: {
    text: "Подивитись продукт",
    primaryLabel: "Відкрити огляд",
    primaryHref: "/dashboard",
    secondaryLabel: "Внести дані",
    secondaryHref: "/imports",
  },
} as const;

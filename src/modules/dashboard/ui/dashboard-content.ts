// Dashboard copy — Ukrainian-first (NFR-I18N-01), calm and finance-oriented
// (BC-BRAND-01). Single source of truth for the `/dashboard` screen strings,
// shared with the eval case so the judge grades the live product copy.

export const DASHBOARD = {
  title: "Огляд фінансів",
  subtitle: "Весь час · Europe/Kyiv",

  balanceLabel: "Загальний баланс",
  balanceHint: "Враховано «очікує» + «підтверджено». Видалені — поза балансом.",

  incomeLabel: "Доходи",
  expenseLabel: "Витрати",

  breakdownHeading: "Витрати за категоріями",
  breakdownSubtitle: "за текстом категорії",
  breakdownEmpty: "Ще немає витрат для розподілу за категоріями.",

  trendHeading: "Тренд за місяцями",
  trendIncomeLabel: "Доходи",
  trendExpenseLabel: "Витрати",
  trendInsufficientTitle: "Замало даних для тренду",
  trendInsufficientDescription:
    "Тренд з’явиться, коли операції охоплять щонайменше два різні місяці.",

  emptyTitle: "Ще немає операцій",
  emptyDescription:
    "Додайте першу операцію через імпорт — і тут з’являться баланс, доходи, витрати та тренди.",
  emptyCta: "Перейти до імпорту",

  errorTitle: "Не вдалося завантажити огляд",
  errorDescription:
    "Дані балансу зараз недоступні. Перевірте з’єднання та спробуйте ще раз.",
  retryLabel: "Спробувати ще раз",

  readOnlyNote:
    "Лише перегляд. Групування витрат — за текстом категорії (вкл. «Без категорії»). Огляд нічого не змінює.",
} as const;

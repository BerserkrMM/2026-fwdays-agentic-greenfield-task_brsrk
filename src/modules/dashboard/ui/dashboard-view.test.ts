import { describe, expect, it } from "vitest";
import {
  isEmptyOverview,
  monthLabel,
  toExpenseBreakdown,
  toTrendView,
} from "./dashboard-view";

describe("toExpenseBreakdown (FR-DASH-03)", () => {
  // @trace FR-DASH-03, FR-CAT-04
  it("keeps only spend categories incl. «Без категорії», with share-of-spend %, sorted by magnitude", () => {
    const slices = toExpenseBreakdown([
      { category: "Зарплата", totalMinor: 100000 }, // income — excluded
      { category: "Їжа", totalMinor: -6000 },
      { category: "Без категорії", totalMinor: -2000 },
      { category: "Транспорт", totalMinor: -2000 },
    ]);

    expect(slices).toEqual([
      { category: "Їжа", spendMinor: 6000, percent: 60 },
      { category: "Без категорії", spendMinor: 2000, percent: 20 },
      { category: "Транспорт", spendMinor: 2000, percent: 20 },
    ]);
  });

  it("returns an empty breakdown when there is no spend", () => {
    expect(toExpenseBreakdown([{ category: "Зарплата", totalMinor: 100000 }])).toEqual([]);
    expect(toExpenseBreakdown([])).toEqual([]);
  });
});

describe("toTrendView (FR-DASH-04)", () => {
  // @trace FR-DASH-04
  it("is insufficient with fewer than two distinct months", () => {
    expect(toTrendView([]).hasSufficientTrend).toBe(false);
    expect(
      toTrendView([{ month: "2025-06", incomeMinor: 1000, expenseMinor: -500, netMinor: 500 }])
        .hasSufficientTrend,
    ).toBe(false);
  });

  // @trace FR-DASH-04
  it("is sufficient with two or more months and normalizes bar heights to the peak", () => {
    const view = toTrendView([
      { month: "2025-05", incomeMinor: 50000, expenseMinor: -10000, netMinor: 40000 },
      { month: "2025-06", incomeMinor: 25000, expenseMinor: -20000, netMinor: 5000 },
    ]);
    expect(view.hasSufficientTrend).toBe(true);
    expect(view.bars).toHaveLength(2);
    // peak magnitude is 50000 (May income)
    expect(view.bars[0]).toMatchObject({
      month: "2025-05",
      label: "Тра",
      incomeHeightPct: 100,
      expenseHeightPct: 20,
    });
    expect(view.bars[1]).toMatchObject({
      month: "2025-06",
      label: "Чер",
      incomeHeightPct: 50,
      expenseHeightPct: 40,
    });
  });
});

describe("monthLabel", () => {
  it("maps a YYYY-MM key to a Ukrainian short month", () => {
    expect(monthLabel("2025-01")).toBe("Січ");
    expect(monthLabel("2025-12")).toBe("Гру");
  });

  it("falls back to the raw key for an out-of-range month", () => {
    expect(monthLabel("2025-13")).toBe("2025-13");
  });
});

describe("toTrendView edge cases", () => {
  it("renders zero-height bars when every month has no income or expense", () => {
    const view = toTrendView([
      { month: "2025-05", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
      { month: "2025-06", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
    ]);
    expect(view.hasSufficientTrend).toBe(true);
    expect(view.bars.every((b) => b.incomeHeightPct === 0 && b.expenseHeightPct === 0)).toBe(true);
  });
});

describe("isEmptyOverview (FR-DASH-01)", () => {
  // @trace FR-DASH-01, FR-SHELL-03
  it("is empty only when there are no categories and no trend months", () => {
    expect(isEmptyOverview(0, 0)).toBe(true);
    expect(isEmptyOverview(1, 0)).toBe(false);
    expect(isEmptyOverview(0, 1)).toBe(false);
  });
});

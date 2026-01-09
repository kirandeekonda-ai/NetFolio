/**
 * Financial Calculation Utilities
 */

interface CashFlow {
    amount: number; // Negative for outflows (buys), Positive for inflows (sells/current value)
    date: Date;
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) using Newton-Raphson method
 * @param cashFlows Array of cash flows with date and amount
 * @param guess Initial guess for the rate (default 0.1)
 * @returns XIRR as a decimal (e.g., 0.15 for 15%), or null if calculation fails
 */
export function calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number | null {
    if (cashFlows.length < 2) return null;

    // Check if we have at least one positive and one negative cash flow
    const hasPositive = cashFlows.some(cf => cf.amount > 0);
    const hasNegative = cashFlows.some(cf => cf.amount < 0);
    if (!hasPositive || !hasNegative) return null;

    const MAX_ITERATIONS = 50;
    const TOLERANCE = 1e-7;

    let x0 = guess;
    const startDate = cashFlows.reduce((min, cf) => cf.date < min ? cf.date : min, cashFlows[0].date);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        let fValue = 0;
        let fDerivative = 0;

        for (const cf of cashFlows) {
            const days = (cf.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const years = days / 365.0;

            // Avoid division by zero
            if (x0 <= -1) x0 = -0.99999999;

            const base = 1 + x0;
            const discountFactor = Math.pow(base, -years);

            fValue += cf.amount * discountFactor;
            fDerivative += -years * cf.amount * Math.pow(base, -years - 1);
        }

        if (Math.abs(fValue) < TOLERANCE) {
            return x0;
        }

        if (Math.abs(fDerivative) < TOLERANCE) {
            return null; // Newton method failed to converge
        }

        const x1 = x0 - fValue / fDerivative;

        if (Math.abs(x1 - x0) < TOLERANCE) {
            return x1;
        }

        x0 = x1;
    }

    return null; // Failed to converge
}

/**
 * Calculates CAGR (Compound Annual Growth Rate)
 * @param startValue Initial investment value
 * @param endValue Final investment value
 * @param startDate Date of initial investment
 * @param endDate Date of final valuation (usually today)
 * @returns CAGR as a decimal, or null if invalid inputs
 */
export function calculateCAGR(
    startValue: number,
    endValue: number,
    startDate: Date,
    endDate: Date = new Date()
): number | null {
    if (startValue <= 0 || endValue < 0) return null;

    const diffTime = endDate.getTime() - startDate.getTime();
    const years = diffTime / (1000 * 60 * 60 * 24 * 365.25); // Use 365.25 for leap year average

    if (years <= 0) return null;

    // For very short periods, CAGR can be misleadingly huge
    // Only calculate for periods >= 3 months (0.25 years)
    if (years < 0.25) return null;

    // Standard formula: (End / Start)^(1/n) - 1

    return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Formats a decimal rate as a percentage string
 * @param rate Decimal rate (e.g. 0.1534)
 * @param decimals Number of decimal places
 */
export function formatPercentage(rate: number | null | undefined, decimals: number = 2): string {
    if (rate === null || rate === undefined || isNaN(rate) || !isFinite(rate)) return '-';
    return `${(rate * 100).toFixed(decimals)}%`;
}

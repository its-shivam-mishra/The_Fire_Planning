# FIRE Planning Calculator Documentation

This document outlines the detailed logic, metrics, and formulas used to power the FIRE (Financial Independence, Retire Early) Planning Calculator.

## 1. Input Metrics
The calculator takes the following inputs from the user:
- **Current Age ($A_{current}$)**: User's current age.
- **Retirement Age ($A_{retire}$)**: Age at which the user plans to retire (at the *end* of this age).
- **Life Expectancy ($A_{death}$)**: Age until which the corpus needs to last.
- **Current Monthly Expenses ($E_{month}$)**: User's current lifestyle expenses per month.
- **Inflation Rate ($i$)**: Expected annual inflation rate for expenses (both pre and post-retirement).
- **Expected Return till Retirement ($R_{pre}$)**: The expected annual return on investments during the accumulation phase (equity-heavy).
- **Expected Return in Retirement ($R_{post\_gross}$)**: The expected gross annual return during the withdrawal phase (debt-heavy).
- **Capital Gains Tax Rate ($T$)**: Estimated tax rate on returns during retirement.
- **Existing Corpus ($C_{existing}$)**: Current retirement savings.
- **Annual Step-Up SIP ($g$)**: The percentage by which the user plans to increase their SIP contribution every year.

## 2. Derived Metrics & Timing Definitions
- **Years to Retirement ($N_{pre}$)**: $A_{retire} - A_{current}$
- **Years in Retirement ($N_{post}$)**: $A_{death} - A_{retire}$
- **Current Annual Expenses ($E_{annual}$)**: $E_{month} \times 12$
- **Post-Tax Return in Retirement ($R_{post}$)**: $R_{post\_gross} \times (1 - T)$
- **Expense at Start of Retirement ($E_{retire}$)**: $E_{annual} \times (1 + i)^{N_{pre}}$

*Timing Convention*: Retirement begins exactly at the end of the $A_{retire}$ year. The first withdrawal happens at the *start* of the retirement phase, meaning the very first withdrawal is not discounted by the retirement return.

## 3. Mathematical Formulas

### A. Corpus Required at Retirement (NPV)
The required corpus is calculated as the Present Value (PV) of a growing annuity due. We assume the user withdraws their annual expense at the *start* of each year, and the remaining balance earns the $R_{post}$ return. Expenses continue to inflate by $i$ every year during retirement.

The exact loop used to ensure absolute mathematical accuracy:
```javascript
let CorpusRequired = 0;
for (let year = 0; year < N_post; year++) {
    let withdrawal = E_retire * (1 + i)^year;
    let discountFactor = (1 + R_post)^year; // Discounted at start of year
    CorpusRequired += (withdrawal / discountFactor);
}
```

### B. Future Value of Existing Corpus
The existing corpus grows at the pre-retirement return rate until the retirement age.
$$FV_{existing} = C_{existing} \times (1 + R_{pre})^{N_{pre}}$$

### C. Corpus Shortfall
The target amount that needs to be generated via SIPs.
$$Shortfall = \max(0, CorpusRequired - FV_{existing})$$

### D. Required Monthly SIP (with Step-Up)
The calculator determines the required Monthly SIP for **Year 1**, assuming the SIP steps up by $g$ annually, but contributions are made *monthly* at the *start* of each month.

1. **Monthly Return ($r$)**: $R_{pre} / 12$
2. **Total Months ($M$)**: $N_{pre} \times 12$
3. **Effective Annual Rate ($R_{annual}$)**: $(1 + r)^{12} - 1$
4. **12-Month Annuity Factor ($A_{factor}$)**: The future value of 12 monthly deposits of ₹1 at the end of a year.
   $$A_{factor} = \left[ \frac{(1+r)^{12} - 1}{r} \right] \times (1+r)$$
5. **Growth Ratio ($\text{ratio}$)**: $\frac{1 + g}{1 + R_{annual}}$
6. **Summation Factor ($S_{factor}$)**: The sum of the geometric series for annual step-ups.
   $$S_{factor} = \frac{1 - \text{ratio}^{N_{pre}}}{1 - \text{ratio}}$$
7. **Monthly SIP (PMT)**:
   $$PMT = \frac{Shortfall}{A_{factor} \times (1 + R_{annual})^{N_{pre} - 1} \times S_{factor}}$$

*(If $g = 0$, the formula simplifies to the standard Future Value of an Annuity Due).*

## 4. Year-by-Year Schedule (Amortization)
The calculator generates a detailed schedule simulating every single year to prove the math works perfectly.

**Accumulation Phase (Year $t$):**
- **Start Balance**: End balance from previous year.
- **Annual Investment**: $PMT \times 12 \times (1+g)^t$
- **Returns Earned**: End Balance - Start Balance - Annual Investment
- **End Balance**: (Start Balance $\times$ $(1+R_{pre})$) + (Future Value of 12 monthly deposits made during the year).

**Withdrawal Phase (Year $t$):**
- **Start Balance**: End balance from previous year.
- **Withdrawal**: $E_{retire} \times (1+i)^t$ (Taken at the start of the year).
- **Balance After Withdrawal**: Start Balance - Withdrawal.
- **Returns Earned**: Balance After Withdrawal $\times$ $R_{post}$.
- **End Balance**: Balance After Withdrawal + Returns Earned.

By the time the age reaches Life Expectancy, the End Balance perfectly zeroes out (assuming exact fractional withdrawals).
 
  
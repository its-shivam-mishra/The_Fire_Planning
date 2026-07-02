document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('fireForm');
    const displayPostTaxReturn = document.getElementById('displayPostTaxReturn');
    const displayAnnualExpenses = document.getElementById('displayAnnualExpenses');
    const resultsSection = document.getElementById('resultsSection');
    const resCorpus = document.getElementById('resCorpus');
    const resSip = document.getElementById('resSip');

    // Input fields
    const inputs = {
        currentAge: document.getElementById('currentAge'),
        retirementAge: document.getElementById('retirementAge'),
        lifeExpectancy: document.getElementById('lifeExpectancy'),
        monthlyExpenses: document.getElementById('monthlyExpenses'),
        inflationRate: document.getElementById('inflationRate'),
        expectedReturnPre: document.getElementById('expectedReturnPre'),
        expectedReturnPost: document.getElementById('expectedReturnPost'),
        taxRate: document.getElementById('taxRate'),
        existingCorpus: document.getElementById('existingCorpus'),
        stepUpSip: document.getElementById('stepUpSip')
    };

    // Formatter for currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    // Update dynamic displays (Post-tax return & Annual expenses)
    const updateDisplays = () => {
        const monthlyExp = parseFloat(inputs.monthlyExpenses.value) || 0;
        const retPost = parseFloat(inputs.expectedReturnPost.value) || 0;
        const tax = parseFloat(inputs.taxRate.value) || 0;

        const annualExp = monthlyExp * 12;
        const postTaxRet = retPost * (1 - (tax / 100));

        displayAnnualExpenses.textContent = formatCurrency(annualExp);
        displayPostTaxReturn.textContent = postTaxRet.toFixed(2) + '%';
    };

    // Add event listeners to all inputs to update displays on change
    Object.values(inputs).forEach(input => {
        if (input) input.addEventListener('input', updateDisplays);
    });

    // Initial update
    updateDisplays();

    // Calculate Form Logic
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get values
        const currentAge = parseFloat(inputs.currentAge.value);
        const retirementAge = parseFloat(inputs.retirementAge.value);
        const lifeExpectancy = parseFloat(inputs.lifeExpectancy.value);
        const monthlyExpenses = parseFloat(inputs.monthlyExpenses.value);
        const inflationRate = parseFloat(inputs.inflationRate.value) / 100;
        const expectedReturnPre = parseFloat(inputs.expectedReturnPre.value) / 100;
        const expectedReturnPost = parseFloat(inputs.expectedReturnPost.value) / 100;
        const taxRate = parseFloat(inputs.taxRate.value) / 100;
        const existingCorpus = parseFloat(inputs.existingCorpus.value);
        const stepUpRate = parseFloat(inputs.stepUpSip.value) / 100;

        // Validation
        if (retirementAge <= currentAge || lifeExpectancy <= retirementAge) {
            alert('Please ensure Current Age < Retirement Age < Life Expectancy');
            return;
        }

        // Calculations
        // 1. Post-tax return in retirement
        const postTaxReturn = expectedReturnPost * (1 - taxRate);

        // 2. Annual expense at start of retirement
        const yearsToRetirement = retirementAge - currentAge;
        const currentAnnualExpense = monthlyExpenses * 12;
        const expenseAtRetirement = currentAnnualExpense * Math.pow((1 + inflationRate), yearsToRetirement);

        // 3. Corpus required at retirement (NPV with withdraw first convention)
        const yearsInRetirement = lifeExpectancy - retirementAge;
        
        let corpusReq = 0;
        for (let i = 0; i < yearsInRetirement; i++) {
            const withdrawal = expenseAtRetirement * Math.pow((1 + inflationRate), i);
            corpusReq += withdrawal / Math.pow((1 + postTaxReturn), i);
        }

        // 4. Future Value of existing corpus at retirement
        const fvExistingCorpus = existingCorpus * Math.pow((1 + expectedReturnPre), yearsToRetirement);

        // 5. Shortfall corpus to be accumulated via SIP
        const corpusShortfall = Math.max(0, corpusReq - fvExistingCorpus);

        // 6. Required Monthly SIP (First Year)
        const monthsToRetirement = yearsToRetirement * 12;
        const monthlyReturn = expectedReturnPre / 12;

        let monthlySip = 0;
        if (corpusShortfall > 0) {
            if (monthlyReturn === 0) {
                if (stepUpRate === 0) {
                    monthlySip = corpusShortfall / monthsToRetirement;
                } else {
                    monthlySip = corpusShortfall / (12 * (Math.pow(1+stepUpRate, yearsToRetirement) - 1) / stepUpRate);
                }
            } else {
                const R_annual = Math.pow(1 + monthlyReturn, 12) - 1;
                const ratio = (1 + stepUpRate) / (1 + R_annual);
                
                let sumFactor = 0;
                if (Math.abs(ratio - 1) < 0.0001) {
                    sumFactor = yearsToRetirement;
                } else {
                    sumFactor = (1 - Math.pow(ratio, yearsToRetirement)) / (1 - ratio);
                }
                
                const AFactor = (Math.pow(1 + monthlyReturn, 12) - 1) / monthlyReturn * (1 + monthlyReturn);
                monthlySip = corpusShortfall / (AFactor * Math.pow(1 + R_annual, yearsToRetirement - 1) * sumFactor);
            }
        }

        // Display results
        resCorpus.textContent = formatCurrency(corpusReq);
        resSip.textContent = formatCurrency(monthlySip);

        // Generate Schedule Data
        const scheduleData = [];
        let currentBalance = existingCorpus;
        let currentMonthlySip = monthlySip;

        // Accumulation Phase
        for (let i = 0; i < yearsToRetirement; i++) {
            const age = currentAge + i;
            const startBalance = currentBalance;
            
            let yearlyInvestmentFv = 0;
            if (monthlyReturn === 0) {
                yearlyInvestmentFv = currentMonthlySip * 12;
            } else {
                const AFactor = (Math.pow(1 + monthlyReturn, 12) - 1) / monthlyReturn * (1 + monthlyReturn);
                yearlyInvestmentFv = currentMonthlySip * AFactor;
            }
            const actualYearlyInvestment = currentMonthlySip * 12;
            
            const startBalanceFv = startBalance * (1 + expectedReturnPre); // match existing corpus calculation
            
            const endBalance = startBalanceFv + yearlyInvestmentFv;
            const returnsEarned = endBalance - startBalance - actualYearlyInvestment;
            
            scheduleData.push({
                age: age,
                startBalance: startBalance,
                annualInvestment: actualYearlyInvestment,
                annualWithdrawal: 0,
                returnsEarned: returnsEarned,
                endBalance: endBalance
            });
            
            currentBalance = endBalance;
            currentMonthlySip = currentMonthlySip * (1 + stepUpRate);
        }

        // Withdrawal Phase
        for (let i = 0; i < yearsInRetirement; i++) {
            const age = retirementAge + i;
            const startBalance = currentBalance;
            const withdrawal = expenseAtRetirement * Math.pow((1 + inflationRate), i);
            
            let balanceAfterWithdrawal = startBalance - withdrawal;
            if (balanceAfterWithdrawal < 0) balanceAfterWithdrawal = 0;
            
            const returnsEarned = balanceAfterWithdrawal * postTaxReturn;
            const endBalance = balanceAfterWithdrawal + returnsEarned;
            
            scheduleData.push({
                age: age,
                startBalance: startBalance,
                annualInvestment: 0,
                annualWithdrawal: withdrawal,
                returnsEarned: returnsEarned,
                endBalance: endBalance
            });
            
            currentBalance = endBalance;
        }

        // Render Table
        const tbody = document.querySelector('#scheduleTable tbody');
        tbody.innerHTML = '';
        scheduleData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.age}</td>
                <td>${formatCurrency(row.startBalance)}</td>
                <td style="color: var(--success-text)">${row.annualInvestment > 0 ? '+' + formatCurrency(row.annualInvestment) : '-'}</td>
                <td style="color: var(--warning-text)">${row.annualWithdrawal > 0 ? '-' + formatCurrency(row.annualWithdrawal) : '-'}</td>
                <td style="color: var(--accent-color)">${formatCurrency(row.returnsEarned)}</td>
                <td style="font-weight: 600;">${formatCurrency(row.endBalance)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Render Chart
        const ctx = document.getElementById('corpusChart').getContext('2d');
        if (window.fireChart) {
            window.fireChart.destroy();
        }
        
        window.fireChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: scheduleData.map(d => d.age),
                datasets: [{
                    label: 'Corpus Balance (₹)',
                    data: scheduleData.map(d => Math.max(0, d.endBalance)),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if(value >= 10000000) return '₹' + (value/10000000).toFixed(1) + ' Cr';
                                if(value >= 100000) return '₹' + (value/100000).toFixed(1) + ' L';
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
        
        // Show results section with animation
        resultsSection.classList.remove('hidden');
        resultsSection.style.animation = 'none';
        resultsSection.offsetHeight; // trigger reflow
        resultsSection.style.animation = null;
        
        // Scroll to results smoothly
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    });
});

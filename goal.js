document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('goalForm');
    const resultsSection = document.getElementById('resultsSection');
    
    const inputs = {
        currentCost: document.getElementById('currentCost'),
        timeHorizon: document.getElementById('timeHorizon'),
        inflationRate: document.getElementById('inflationRate'),
        expectedReturn: document.getElementById('expectedReturn'),
        existingSavings: document.getElementById('existingSavings'),
        stepUpSip: document.getElementById('stepUpSip')
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const cost = parseFloat(inputs.currentCost.value);
        const years = parseFloat(inputs.timeHorizon.value);
        const inflation = parseFloat(inputs.inflationRate.value) / 100;
        const annualRate = parseFloat(inputs.expectedReturn.value) / 100;
        const existing = parseFloat(inputs.existingSavings.value);
        const stepUpRate = parseFloat(inputs.stepUpSip.value) / 100;

        if (cost <= 0 || years <= 0 || inflation < 0 || annualRate < 0 || existing < 0 || stepUpRate < 0) {
            alert('Please enter valid positive values.');
            return;
        }

        // 1. Future Cost of Goal
        const futureCost = cost * Math.pow(1 + inflation, years);

        // 2. Future Value of Existing Savings
        const fvExisting = existing * Math.pow(1 + annualRate, years);

        // 3. Shortfall
        const shortfall = Math.max(0, futureCost - fvExisting);

        // 4. Required SIP (Start of month investment)
        const months = years * 12;
        const monthlyReturn = annualRate / 12;
        let monthlySip = 0;

        if (shortfall > 0) {
            if (monthlyReturn === 0) {
                if (stepUpRate === 0) {
                    monthlySip = shortfall / months;
                } else {
                    monthlySip = shortfall / (12 * (Math.pow(1+stepUpRate, years) - 1) / stepUpRate);
                }
            } else {
                const R_annual = Math.pow(1 + monthlyReturn, 12) - 1;
                const ratio = (1 + stepUpRate) / (1 + R_annual);
                
                let sumFactor = 0;
                if (Math.abs(ratio - 1) < 0.0001) {
                    sumFactor = years;
                } else {
                    sumFactor = (1 - Math.pow(ratio, years)) / (1 - ratio);
                }
                
                const AFactor = (Math.pow(1 + monthlyReturn, 12) - 1) / monthlyReturn * (1 + monthlyReturn);
                monthlySip = shortfall / (AFactor * Math.pow(1 + R_annual, years - 1) * sumFactor);
            }
        }

        document.getElementById('resFutureCost').textContent = formatCurrency(futureCost);
        document.getElementById('resShortfall').textContent = formatCurrency(shortfall);
        document.getElementById('resSip').textContent = formatCurrency(monthlySip);

        // Chart Data Generation
        const labels = [];
        const existingGrowthData = [];
        const sipGrowthData = [];
        const targetData = []; // Line chart for future cost

        let currentExisting = existing;
        let currentMonthlySip = monthlySip;
        let accumulatedSip = 0;

        for (let y = 1; y <= years; y++) {
            labels.push('Year ' + y);
            
            // Existing growth this year
            currentExisting = currentExisting * (1 + annualRate);
            existingGrowthData.push(currentExisting);
            
            // SIP growth this year
            let yearlyInvestmentFv = 0;
            if (monthlyReturn === 0) {
                yearlyInvestmentFv = currentMonthlySip * 12;
            } else {
                const AFactor = (Math.pow(1 + monthlyReturn, 12) - 1) / monthlyReturn * (1 + monthlyReturn);
                yearlyInvestmentFv = currentMonthlySip * AFactor;
            }
            
            accumulatedSip = (accumulatedSip * (1 + annualRate)) + yearlyInvestmentFv;
            sipGrowthData.push(accumulatedSip);
            
            // Step up SIP for next year
            currentMonthlySip = currentMonthlySip * (1 + stepUpRate);
            
            // Goal Target line
            targetData.push(futureCost);
        }

        const ctx = document.getElementById('goalChart').getContext('2d');
        if (window.goalChartInstance) {
            window.goalChartInstance.destroy();
        }

        window.goalChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Target Goal Value',
                        data: targetData,
                        borderColor: '#f43f5e',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        type: 'bar',
                        label: 'Existing Savings Growth',
                        data: existingGrowthData,
                        backgroundColor: '#0ea5e9',
                        stack: 'Stack 0'
                    },
                    {
                        type: 'bar',
                        label: 'SIP Accumulation',
                        data: sipGrowthData,
                        backgroundColor: '#14b8a6',
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true,
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

        resultsSection.classList.remove('hidden');
        resultsSection.style.animation = 'none';
        resultsSection.offsetHeight;
        resultsSection.style.animation = null;
        
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    });
});

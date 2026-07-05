document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('swpForm');
    const resultsSection = document.getElementById('resultsSection');
    
    const inputs = {
        totalInvestment: document.getElementById('totalInvestment'),
        withdrawalAmount: document.getElementById('withdrawalAmount'),
        stepUpType: document.getElementById('stepUpType'),
        stepUpValue: document.getElementById('stepUpValue'),
        taxRate: document.getElementById('taxRate'),
        expectedReturn: document.getElementById('expectedReturn'),
        timePeriod: document.getElementById('timePeriod')
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

        const P = parseFloat(inputs.totalInvestment.value);
        const initialW = parseFloat(inputs.withdrawalAmount.value);
        const stepUpType = inputs.stepUpType.value;
        const stepUpValue = parseFloat(inputs.stepUpValue.value);
        const taxRate = parseFloat(inputs.taxRate.value) / 100;
        const annualRate = parseFloat(inputs.expectedReturn.value);
        const years = parseFloat(inputs.timePeriod.value);

        if (P <= 0 || initialW <= 0 || stepUpValue < 0 || taxRate < 0 || annualRate < 0 || years <= 0) {
            alert('Please enter valid positive values.');
            return;
        }

        const r = annualRate / 12 / 100;
        const n = years * 12;

        let balance = P;
        let totalWithdrawn = 0; // Amount user gets in hand
        const balanceData = [P];
        const labels = ['Start'];
        
        let currentW = initialW;
        let moneyRanOut = false;

        // Simulation by year and month
        for (let year = 1; year <= years; year++) {
            
            for (let m = 1; m <= 12; m++) {
                const deduction = currentW * (1 + taxRate);
                
                balance -= deduction;
                totalWithdrawn += currentW;
                
                if (balance < 0) {
                    // Reverse the last operation
                    balance += deduction;
                    totalWithdrawn -= currentW;
                    
                    // Give whatever is left
                    const possibleW = balance / (1 + taxRate);
                    totalWithdrawn += possibleW;
                    balance = 0;
                    moneyRanOut = true;
                    break;
                }
                
                // Earn return on remainder
                balance = balance + (balance * r);
            }
            
            labels.push('Year ' + year);
            balanceData.push(balance);
            
            if (moneyRanOut) break;

            // Apply Step up at end of year for next year
            if (stepUpType === 'percentage') {
                currentW = currentW * (1 + stepUpValue / 100);
            } else {
                currentW = currentW + stepUpValue;
            }
        }
        
        // If money ran out before years ended, fill rest of the array with 0
        while (balanceData.length < years + 1) {
            labels.push('Year ' + (balanceData.length - 1));
            balanceData.push(0);
        }

        document.getElementById('resFinalBalance').textContent = formatCurrency(balance);
        document.getElementById('resTotalWithdrawn').textContent = formatCurrency(totalWithdrawn);

        // Chart
        const ctx = document.getElementById('swpChart').getContext('2d');
        if (window.swpChartInstance) {
            window.swpChartInstance.destroy();
        }

        window.swpChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Remaining Balance (₹)',
                    data: balanceData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
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

        resultsSection.classList.remove('hidden');
        resultsSection.style.animation = 'none';
        resultsSection.offsetHeight;
        resultsSection.style.animation = null;
        
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    });
});

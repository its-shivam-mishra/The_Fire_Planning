document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sipForm');
    const resultsSection = document.getElementById('resultsSection');
    
    const inputs = {
        lumpsumAmount: document.getElementById('lumpsumAmount'),
        regularInvestment: document.getElementById('regularInvestment'),
        depositFrequency: document.getElementById('depositFrequency'),
        stepUpType: document.getElementById('stepUpType'),
        stepUpValue: document.getElementById('stepUpValue'),
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

        const L = parseFloat(inputs.lumpsumAmount.value);
        const D = parseFloat(inputs.regularInvestment.value);
        const f = parseInt(inputs.depositFrequency.value);
        const stepUpType = inputs.stepUpType.value;
        const stepUpValue = parseFloat(inputs.stepUpValue.value);
        const annualRate = parseFloat(inputs.expectedReturn.value);
        const years = parseFloat(inputs.timePeriod.value);

        if (L < 0 || D < 0 || stepUpValue < 0 || annualRate < 0 || years <= 0) {
            alert('Please enter valid positive values.');
            return;
        }

        const r = annualRate / 100 / f; // Return rate per period

        // Chart Data Generation and Simulation
        const labels = [];
        const investedData = [];
        const returnsData = [];

        let currentD = D;
        let totalValue = L;
        let totalInvested = L;

        for (let y = 1; y <= years; y++) {
            labels.push('Year ' + y);
            
            let yearFvBalance = 0;
            let yearFvDeposits = 0;

            if (r === 0) {
                yearFvBalance = totalValue;
                yearFvDeposits = currentD * f;
            } else {
                yearFvBalance = totalValue * Math.pow(1 + r, f);
                yearFvDeposits = currentD * ((Math.pow(1 + r, f) - 1) / r) * (1 + r);
            }
            
            totalValue = yearFvBalance + yearFvDeposits;
            totalInvested += (currentD * f);
            
            investedData.push(totalInvested);
            returnsData.push(totalValue - totalInvested);
            
            // Apply Top-up for next year
            if (stepUpType === 'percentage') {
                currentD = currentD * (1 + stepUpValue / 100);
            } else {
                currentD = currentD + stepUpValue;
            }
        }

        const estimatedReturns = totalValue - totalInvested;

        document.getElementById('resTotalValue').textContent = formatCurrency(totalValue);
        document.getElementById('resInvestedAmount').textContent = formatCurrency(totalInvested);
        document.getElementById('resEstimatedReturns').textContent = formatCurrency(estimatedReturns);

        const ctx = document.getElementById('sipChart').getContext('2d');
        if (window.sipChartInstance) {
            window.sipChartInstance.destroy();
        }

        window.sipChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Invested Amount',
                        data: investedData,
                        backgroundColor: '#94a3b8',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Estimated Returns',
                        data: returnsData,
                        backgroundColor: '#10b981',
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

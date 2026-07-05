document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('emiForm');
    const resultsSection = document.getElementById('resultsSection');
    
    const inputs = {
        loanAmount: document.getElementById('loanAmount'),
        interestRate: document.getElementById('interestRate'),
        loanTenure: document.getElementById('loanTenure')
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

        const P = parseFloat(inputs.loanAmount.value);
        const annualRate = parseFloat(inputs.interestRate.value);
        const years = parseFloat(inputs.loanTenure.value);

        if (P <= 0 || annualRate <= 0 || years <= 0) {
            alert('Please enter valid positive values.');
            return;
        }

        const r = annualRate / 12 / 100;
        const n = years * 12;

        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - P;

        document.getElementById('resEmi').textContent = formatCurrency(emi);
        document.getElementById('resTotalInterest').textContent = formatCurrency(totalInterest);
        document.getElementById('resTotalPayment').textContent = formatCurrency(totalPayment);

        // Chart
        const ctx = document.getElementById('emiChart').getContext('2d');
        if (window.emiChartInstance) {
            window.emiChartInstance.destroy();
        }

        window.emiChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal Amount', 'Total Interest'],
                datasets: [{
                    data: [P, totalInterest],
                    backgroundColor: ['#3b82f6', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + formatCurrency(context.raw);
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

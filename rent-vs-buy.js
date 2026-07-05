document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('rvbForm');
    const resultsSection = document.getElementById('resultsSection');
    
    const inputs = {
        propertyPrice: document.getElementById('propertyPrice'),
        downPaymentPercent: document.getElementById('downPaymentPercent'),
        buyingCostsPercent: document.getElementById('buyingCostsPercent'),
        homeLoanRate: document.getElementById('homeLoanRate'),
        loanTenure: document.getElementById('loanTenure'),
        propertyAppreciation: document.getElementById('propertyAppreciation'),
        maintenancePercent: document.getElementById('maintenancePercent'),
        monthlyRent: document.getElementById('monthlyRent'),
        rentInflation: document.getElementById('rentInflation'),
        securityDepositMonths: document.getElementById('securityDepositMonths'),
        investmentReturn: document.getElementById('investmentReturn'),
        timeHorizon: document.getElementById('timeHorizon')
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

        // Get values
        const propertyPrice = parseFloat(inputs.propertyPrice.value);
        const dpPercent = parseFloat(inputs.downPaymentPercent.value) / 100;
        const buyCostsPercent = parseFloat(inputs.buyingCostsPercent.value) / 100;
        const hlRate = parseFloat(inputs.homeLoanRate.value) / 100;
        const hlYears = parseFloat(inputs.loanTenure.value);
        const propAppreciation = parseFloat(inputs.propertyAppreciation.value) / 100;
        const maintPercent = parseFloat(inputs.maintenancePercent.value) / 100;
        
        const initialRent = parseFloat(inputs.monthlyRent.value);
        const rentInflation = parseFloat(inputs.rentInflation.value) / 100;
        const secDepMonths = parseFloat(inputs.securityDepositMonths.value);
        
        const invReturn = parseFloat(inputs.investmentReturn.value) / 100;
        const horizonYears = parseFloat(inputs.timeHorizon.value);

        if (propertyPrice <= 0 || horizonYears <= 0) {
            alert('Please enter valid positive values.');
            return;
        }

        // --- Upfront Costs & Initial Investments ---
        const downPayment = propertyPrice * dpPercent;
        const buyingCosts = propertyPrice * buyCostsPercent;
        const totalBuyerUpfront = downPayment + buyingCosts;

        const securityDeposit = initialRent * secDepMonths;
        const totalRenterUpfront = securityDeposit;

        let buyerInvestments = 0;
        let renterInvestments = 0;

        if (totalBuyerUpfront > totalRenterUpfront) {
            renterInvestments = totalBuyerUpfront - totalRenterUpfront;
        } else {
            buyerInvestments = totalRenterUpfront - totalBuyerUpfront;
        }

        // --- Loan Setup ---
        const loanAmount = propertyPrice - downPayment;
        const r_loan = hlRate / 12;
        const n_loan = hlYears * 12;
        let emi = 0;
        if (loanAmount > 0 && r_loan > 0) {
            emi = (loanAmount * r_loan * Math.pow(1 + r_loan, n_loan)) / (Math.pow(1 + r_loan, n_loan) - 1);
        } else if (loanAmount > 0) {
            emi = loanAmount / n_loan;
        }

        const r_inv = invReturn / 12; // Monthly investment return
        const totalMonths = horizonYears * 12;

        let currentPropertyValue = propertyPrice;
        let currentRent = initialRent;
        
        const labels = ['Start'];
        const buyerNwData = [buyerInvestments + downPayment]; // Initial NW is downpayment equity + any surplus
        const renterNwData = [renterInvestments + securityDeposit];
        
        let remainingLoan = loanAmount;

        // --- Month by Month Simulation ---
        for (let month = 1; month <= totalMonths; month++) {
            
            // 1. Calculate Monthly Expenses
            const monthlyMaintenance = (currentPropertyValue * maintPercent) / 12;
            const buyerCost = (month <= n_loan ? emi : 0) + monthlyMaintenance;
            const renterCost = currentRent;

            // 2. Invest the Difference
            if (buyerCost > renterCost) {
                const diff = buyerCost - renterCost;
                renterInvestments = (renterInvestments * (1 + r_inv)) + diff;
                buyerInvestments = buyerInvestments * (1 + r_inv); // just grows
            } else {
                const diff = renterCost - buyerCost;
                buyerInvestments = (buyerInvestments * (1 + r_inv)) + diff;
                renterInvestments = renterInvestments * (1 + r_inv); // just grows
            }

            // 3. Update Loan Balance
            if (month <= n_loan) {
                if (r_loan > 0) {
                    remainingLoan = loanAmount * (Math.pow(1 + r_loan, n_loan) - Math.pow(1 + r_loan, month)) / (Math.pow(1 + r_loan, n_loan) - 1);
                } else {
                    remainingLoan = loanAmount - (emi * month);
                }
            } else {
                remainingLoan = 0;
            }

            // 4. Annual Adjustments (End of Year)
            if (month % 12 === 0) {
                currentPropertyValue = currentPropertyValue * (1 + propAppreciation);
                currentRent = currentRent * (1 + rentInflation);
                
                // Track Yearly Data
                labels.push('Year ' + (month / 12));
                const currentBuyerNw = currentPropertyValue - remainingLoan + buyerInvestments;
                const currentRenterNw = renterInvestments + securityDeposit; // Sec dep is returned flat
                
                buyerNwData.push(currentBuyerNw);
                renterNwData.push(currentRenterNw);
            }
        }

        // --- Final Results ---
        const finalBuyerNw = buyerNwData[buyerNwData.length - 1];
        const finalRenterNw = renterNwData[renterNwData.length - 1];

        document.getElementById('resBuyerNetWorth').textContent = formatCurrency(finalBuyerNw);
        document.getElementById('resRenterNetWorth').textContent = formatCurrency(finalRenterNw);

        const verdictPanel = document.getElementById('verdictPanel');
        if (finalBuyerNw > finalRenterNw) {
            const diff = finalBuyerNw - finalRenterNw;
            verdictPanel.innerHTML = `Buying is better by <span style="color: #0ea5e9;">${formatCurrency(diff)}</span> after ${horizonYears} years.`;
            verdictPanel.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
            verdictPanel.style.color = '#0284c7';
            verdictPanel.style.border = '1px solid rgba(14, 165, 233, 0.2)';
        } else {
            const diff = finalRenterNw - finalBuyerNw;
            verdictPanel.innerHTML = `Renting is better by <span style="color: #10b981;">${formatCurrency(diff)}</span> after ${horizonYears} years.`;
            verdictPanel.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            verdictPanel.style.color = '#059669';
            verdictPanel.style.border = '1px solid rgba(16, 185, 129, 0.2)';
        }

        // --- Chart ---
        const ctx = document.getElementById('rvbChart').getContext('2d');
        if (window.rvbChartInstance) {
            window.rvbChartInstance.destroy();
        }

        window.rvbChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Buyer Net Worth',
                        data: buyerNwData,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Renter Net Worth',
                        data: renterNwData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
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

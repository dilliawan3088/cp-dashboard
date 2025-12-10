/**
 * Chart.js visualizations for poultry processing KPIs
 * Modern vibrant design with dark theme
 */

// Register Chart.js plugins if available
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// Initialize dashboardApp if not exists
if (!window.dashboardApp) {
    window.dashboardApp = {
        chartInstances: {}
    };
} else if (!window.dashboardApp.chartInstances) {
    window.dashboardApp.chartInstances = {};
}

const chartColors = {
    // Modern Vibrant Colors for Dark Theme
    primary: '#00d4ff',
    secondary: '#8b5cf6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    purple: '#a855f7',
    orange: '#f97316',
    teal: '#06b6d4',
    pink: '#ec4899',
    cyan: '#00d4ff',
    
    // Light variants for backgrounds with glow
    primaryLight: 'rgba(0, 212, 255, 0.2)',
    secondaryLight: 'rgba(139, 92, 246, 0.2)',
    successLight: 'rgba(16, 185, 129, 0.2)',
    dangerLight: 'rgba(239, 68, 68, 0.2)',
    warningLight: 'rgba(245, 158, 11, 0.2)',
    
    // Vibrant Chart Palette
    chart1: '#00d4ff',
    chart2: '#8b5cf6',
    chart3: '#ec4899',
    chart4: '#10b981',
    chart5: '#f59e0b',
    chart6: '#3b82f6',
    chart7: '#06b6d4',
    chart8: '#a855f7',
    chart9: '#f97316',
    chart10: '#14b8a6'
};

const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1500,
        easing: 'easeOutQuart'
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                padding: 16,
                font: {
                    size: 12,
                    weight: '600',
                    family: "'Poppins', 'Inter', sans-serif"
                },
                color: '#1a1a1a',
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: {
            enabled: true,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            padding: 12,
            titleFont: {
                size: 13,
                weight: '600',
                family: "'Poppins', 'Inter', sans-serif"
            },
            bodyFont: {
                size: 12,
                family: "'Poppins', 'Inter', sans-serif"
            },
            borderColor: 'rgba(0, 212, 255, 0.3)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            titleColor: '#1a1a1a',
            bodyColor: '#1a1a1a',
            boxPadding: 6,
            backdropFilter: 'blur(10px)',
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                    }
                    return label;
                }
            }
        },
        title: {
            display: false
        }
    },
    scales: {
        x: {
            grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
            },
            ticks: {
                font: {
                    size: 11,
                    weight: '400',
                    family: "'Poppins', 'Inter', sans-serif"
                },
                color: '#4a5568'
            },
            border: {
                color: 'rgba(0, 0, 0, 0.1)'
            }
        },
        y: {
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
            },
            ticks: {
                font: {
                    size: 11,
                    weight: '400',
                    family: "'Poppins', 'Inter', sans-serif"
                },
                color: '#4a5568',
                callback: function(value) {
                    return new Intl.NumberFormat('en-US').format(value);
                }
            },
            border: {
                color: 'rgba(0, 0, 0, 0.1)'
            }
        }
    }
};

function createVisualizations(trucks, farms, summary, overallSummary = null, deliveredVsReceived = null) {
    console.log('=== Creating Visualizations ===');
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    console.log('Data:', { 
        trucks: trucks?.length || 0, 
        farms: farms?.length || 0, 
        summary: !!summary,
        overallSummary: !!overallSummary
    });
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded! Please check if the script is included.');
        return;
    }
    
    // Destroy existing charts
    if (window.dashboardApp && window.dashboardApp.chartInstances) {
        Object.values(window.dashboardApp.chartInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        window.dashboardApp.chartInstances = {};
    }
    
    // Check if canvas elements exist
    const canvasIds = ['overallChart', 'farmLossChart', 'truckLossChart', 'varianceTrendsChart', 'deathByTruckChart', 'missingByFarmChart'];
    const missingCanvases = canvasIds.filter(id => !document.getElementById(id));
    if (missingCanvases.length > 0) {
        console.warn('Missing canvas elements:', missingCanvases);
    }
    
    // Wait a bit for DOM to be ready
    setTimeout(() => {
        try {
            console.log('Starting chart creation...');
            
            // Create all charts with error handling
            // Note: Overall chart will be created separately with farm data (deliveredVsReceived)
            // Skip it here to avoid creating it without data
            if (!summary) {
                console.warn('No summary data provided');
            }
            
            if (farms && farms.length > 0) {
                console.log('Creating farm charts...');
                createFarmLossChart(farms, deliveredVsReceived);
                createMissingByFarmChart(farms);
            } else {
                console.warn('No farm data provided');
            }
            
            if (trucks && trucks.length > 0) {
                console.log('Creating truck charts...');
                createTruckLossChart(trucks);
                createVariationTrendsChart(trucks);
                createDeathByTruckChart(trucks);
            } else {
                console.warn('No truck data provided');
            }
            
            console.log('=== Charts creation completed ===');
        } catch (error) {
            console.error('Error creating charts:', error);
            console.error('Error stack:', error.stack);
        }
    }, 300);
}

function createOverallChart(summary, overallSummary = null, deliveredVsReceived = null, farms = null) {
    console.log('=== createOverallChart START ===');
    console.log('Summary object:', summary);
    console.log('Overall Summary:', overallSummary);
    console.log('Delivered vs Received:', deliveredVsReceived);
    console.log('Farms data:', farms);
    
    const canvas = document.getElementById('overallChart');
    if (!canvas) {
        console.error('❌ overallChart canvas not found in DOM');
        const allCanvases = Array.from(document.querySelectorAll('canvas'));
        console.log('Available canvas elements:', allCanvases.map(c => ({ id: c.id, visible: c.offsetWidth > 0 })));
        return;
    }
    
    console.log('✅ Canvas found:', {
        id: canvas.id,
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        parent: canvas.parentElement?.className
    });
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    console.log('✅ Chart.js loaded, version:', Chart.version);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Could not get 2d context from canvas');
        return;
    }
    
    // Ensure window.dashboardApp exists
    if (!window.dashboardApp) {
        window.dashboardApp = { chartInstances: {} };
    }
    if (!window.dashboardApp.chartInstances) {
        window.dashboardApp.chartInstances = {};
    }
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.overallChart) {
        console.log('Destroying existing overall chart');
        try {
            window.dashboardApp.chartInstances.overallChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing chart:', e);
        }
    }
    
    // Get farm data to create trend over farms
    let farmData = [];
    if (deliveredVsReceived && deliveredVsReceived.data && deliveredVsReceived.data.length > 0) {
        farmData = deliveredVsReceived.data;
        console.log('✅ Using deliveredVsReceived.data:', farmData);
    } else if (deliveredVsReceived && Array.isArray(deliveredVsReceived)) {
        farmData = deliveredVsReceived;
        console.log('✅ Using deliveredVsReceived as array:', farmData);
    }
    
    // Fallback: Try to use farms performance data if deliveredVsReceived is not available
    if (!farmData || farmData.length === 0) {
        console.warn('⚠️ No farm data from deliveredVsReceived, trying farms fallback...');
        if (farms && Array.isArray(farms) && farms.length > 0) {
            console.log('Using farms performance data as fallback');
            farmData = farms.map(farm => ({
                farm: farm.farm || 'Unknown',
                total_do_quantity: farm.total_birds_arrived || 0,
                total_received: (farm.total_bird_counter || 0) + (farm.total_doa || 0)
            }));
            console.log('✅ Mapped farms data:', farmData);
        }
    }
    
    if (!farmData || farmData.length === 0) {
        console.error('❌ Cannot create chart: No farm data available from any source');
        console.error('deliveredVsReceived:', deliveredVsReceived);
        console.error('farms:', farms);
        return;
    }
    
    console.log('📊 Farm data for chart:', farmData);
    
    // Extract data: Total Birds Counted (Counter + DOA) vs Total Delivered (D/O Quantity)
    const labels = farmData.map(item => item.farm || 'Unknown');
    const totalBirdsCounted = farmData.map(item => {
        // Total Birds Counted = Counter + DOA (from deliveredVsReceived API: total_received)
        if (item.total_received !== undefined) {
            return item.total_received;
        }
        // Fallback: try other field names
        if (item.total_birds_counted !== undefined) {
            return item.total_birds_counted;
        }
        // Fallback: calculate from available data
        const counter = item.bird_counter || 0;
        const doa = item.total_doa || item.doa || 0;
        return counter + doa;
    });
    const totalDelivered = farmData.map(item => {
        // Total Delivered = D/O Quantity (from deliveredVsReceived API: total_do_quantity)
        if (item.total_do_quantity !== undefined) {
            return item.total_do_quantity;
        }
        // Fallback: try other field names
        if (item.total_delivered !== undefined) {
            return item.total_delivered;
        }
        return item.total_birds_arrived || item.do_quantity || 0;
    });
    
    console.log('Chart data - Farms:', labels);
    console.log('Chart data - Total Birds Counted:', totalBirdsCounted);
    console.log('Chart data - Total Delivered:', totalDelivered);
    
    // Calculate optimal scale with clean numbers (500, 1000, 1500, etc.)
    const maxValue = Math.max( ...totalBirdsCounted, ...totalDelivered, 100 );
    let cleanMax, cleanStepSize;

    if ( maxValue <= 500 ) {
        cleanStepSize = 100;
        cleanMax = Math.ceil( maxValue / 100 ) * 100;
    } else if ( maxValue <= 2000 ) {
        cleanStepSize = 500;
        cleanMax = Math.ceil( maxValue / 500 ) * 500;
    } else if ( maxValue <= 5000 ) {
        cleanStepSize = 1000;
        cleanMax = Math.ceil( maxValue / 1000 ) * 1000;
    } else {
        cleanStepSize = 2000;
        cleanMax = Math.ceil( maxValue / 2000 ) * 2000;
    }

    // Add 10% padding
    cleanMax = Math.ceil( cleanMax * 1.1 );
    
    // Create gradient for area fill
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); // Light blue at top
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)'); // Very light blue at bottom
    
    try {
        console.log('Attempting to create Chart.js instance...');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Birds Counted',
                        data: totalBirdsCounted,
                        borderColor: '#3b82f6', // Blue
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: '+1', // Fill area between this line and the next dataset
                        tension: 0.4, // Smooth curve
                        spanGaps: false,
                        pointStyle: 'circle'
                    },
                    {
                        label: 'Total Delivered',
                        data: totalDelivered,
                        borderColor: '#10b981', // Green
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        borderDash: [8, 4], // Dashed line
                        pointRadius: 7,
                        pointHoverRadius: 11,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: false,
                        pointStyle: 'diamond'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart',
                    delay: (context) => {
                        let delay = 0;
                        if (context.type === 'data' && context.mode === 'default') {
                            delay = context.dataIndex * 100; // Stagger animation
                        }
                        return delay;
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        align: 'center',
                        labels: {
                            padding: 20,
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 14,
                        titleFont: {
                            size: 14,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 13,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        borderWidth: 2,
                        cornerRadius: 10,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const datasetLabel = context.dataset.label || '';
                                const formattedValue = new Intl.NumberFormat('en-US').format(value);
                                return `${datasetLabel}: ${formattedValue}`;
                            },
                            afterBody: function(context) {
                                if (context.length === 2) {
                                    const counted = context[0].parsed.y || 0;
                                    const delivered = context[1].parsed.y || 0;
                                    const difference = counted - delivered;
                                    const sign = difference >= 0 ? '+' : '';
                                    return [
                                        '',
                                        `Total Difference: ${ sign }${ new Intl.NumberFormat( 'en-US' ).format( difference ) }`
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 12,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'Farms',
                            font: {
                                size: 14,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 12, bottom: 0 }
                        }
                    },
                    y: {
                        min: 0,
                        max: cleanMax,
                        suggestedMax: cleanMax,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            drawOnChartArea: true
                        },
                        ticks: {
                            stepSize: cleanStepSize,
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 12,
                            callback: function(value) {
                                // Always show formatted values on Y-axis
                                // Format as clean numbers (no decimals for whole numbers)
                                if ( value % 1 === 0 ) {
                                    return new Intl.NumberFormat( 'en-US' ).format( value );
                                } else {
                                    return new Intl.NumberFormat( 'en-US', {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0
                                    } ).format( value );
                                }
                            }
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'No of Birds',
                            font: {
                                size: 14,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 0, bottom: 0, left: 0, right: 0 }
                        }
                    }
                }
            }
        });
        
        if (!window.dashboardApp) {
            window.dashboardApp = { chartInstances: {} };
        }
        if (!window.dashboardApp.chartInstances) {
            window.dashboardApp.chartInstances = {};
        }
        window.dashboardApp.chartInstances.overallChart = chart;
        console.log('✅ Overall chart created successfully!');
        console.log('Chart instance stored:', !!window.dashboardApp.chartInstances.overallChart);
        console.log('Chart canvas dimensions:', chart.canvas.width, 'x', chart.canvas.height);
        console.log('Chart is visible:', chart.canvas.offsetWidth > 0 && chart.canvas.offsetHeight > 0);
        
        // Force chart update and render with animation
        chart.update('active');
        console.log('Chart updated and rendered');
        
        console.log('=== createOverallChart END ===');
    } catch (error) {
        console.error('❌ Error creating overall chart:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show error message on canvas parent
        const wrapper = canvas.parentElement;
        if (wrapper) {
            wrapper.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle"></i><br>
                Chart Error: ${error.message}
            </div>`;
        }
    }
}

function createFarmLossChart(farms, deliveredVsReceived = null) {
    console.log('=== createFarmLossChart START ===');
    const canvas = document.getElementById('farmLossChart');
    if (!canvas) {
        console.warn('farmLossChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.farmLossChart) {
        try {
            window.dashboardApp.chartInstances.farmLossChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing farm chart:', e);
        }
    }
    
    // Get farm data with delivered vs received information
    let farmData = [];
    if (deliveredVsReceived && deliveredVsReceived.data && Array.isArray(deliveredVsReceived.data)) {
        farmData = deliveredVsReceived.data;
    } else if (deliveredVsReceived && Array.isArray(deliveredVsReceived)) {
        farmData = deliveredVsReceived;
    }
    
    if (!farmData || farmData.length === 0) {
        console.warn('⚠️ No delivered vs received data available, using farms data as fallback');
        if (farms && farms.length > 0) {
            // Fallback: calculate from farms data
            farmData = farms.map(farm => ({
                farm: farm.farm || 'Unknown',
                total_do_quantity: farm.total_birds_arrived || 0,
                total_received: (farm.total_birds_arrived || 0) + (farm.total_variance || 0),
                difference: farm.total_variance || 0
            }));
        } else {
            console.error('❌ Cannot create chart: No farm data available');
            return;
        }
    }
    
    // Extract data for 3 bars: D/O Quantity, Missing Birds, Extra Birds
    const labels = farmData.map(item => item.farm || 'Unknown');
    const doQuantities = farmData.map(item => item.total_do_quantity || 0);
    const missingBirds = farmData.map(item => {
        const diff = item.difference || 0;
        return diff < 0 ? Math.abs(diff) : 0; // Only show if negative (missing)
    });
    const extraBirds = farmData.map(item => {
        const diff = item.difference || 0;
        return diff > 0 ? diff : 0; // Only show if positive (extra)
    });
    
    console.log('Farm Performance Chart - Labels:', labels);
    console.log('D/O Quantities:', doQuantities);
    console.log('Missing Birds:', missingBirds);
    console.log('Extra Birds:', extraBirds);
    
    // Calculate max value for scaling using adaptive stepped scaling
    const allValues = [...doQuantities, ...missingBirds, ...extraBirds];
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const scaleConfig = calculateOptimalScale(maxValue);
    const chartMax = scaleConfig.max;
    
    try {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'D/O Quantity',
                        data: doQuantities,
                        backgroundColor: chartColors.chart1, // Cyan/Teal
                        borderColor: chartColors.chart1,
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y', // Use left Y-axis
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 100; // Staggered animation
                            }
                        },
                        hoverBackgroundColor: chartColors.chart1 + 'DD',
                        hoverBorderColor: chartColors.chart1,
                        hoverBorderWidth: 3
                    },
                    {
                        label: 'Missing Birds',
                        data: missingBirds,
                        backgroundColor: chartColors.danger, // Red
                        borderColor: chartColors.danger,
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y1', // Use right Y-axis
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 100 + 50; // Slight offset
                            }
                        },
                        hoverBackgroundColor: chartColors.danger + 'DD',
                        hoverBorderColor: chartColors.danger,
                        hoverBorderWidth: 3
                    },
                    {
                        label: 'Extra Birds',
                        data: extraBirds,
                        backgroundColor: chartColors.success, // Green
                        borderColor: chartColors.success,
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y1', // Use right Y-axis
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 100 + 100; // More offset
                            }
                        },
                        hoverBackgroundColor: chartColors.success + 'DD',
                        hoverBorderColor: chartColors.success,
                        hoverBorderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart',
                    delay: function(context) {
                        // Stagger animation: each bar appears with a slight delay
                        let delay = 0;
                        if (context.type === 'data' && context.mode === 'default') {
                            delay = context.dataIndex * 80; // 80ms delay between each bar
                        }
                        return delay;
                    },
                    onProgress: function(animation) {
                        // Smooth progress animation
                        const progress = animation.currentStep / animation.numSteps;
                        if (progress === 1) {
                            // Animation complete
                            console.log('Farm Performance chart animation complete');
                        }
                    },
                    onComplete: function(animation) {
                        // Animation finished callback
                        console.log('Farm Performance chart fully animated');
                    }
                },
                transitions: {
                    show: {
                        animations: {
                            x: {
                                from: 0,
                                duration: 1000,
                                easing: 'easeOutQuart'
                            },
                            y: {
                                from: 0,
                                duration: 1000,
                                easing: 'easeOutQuart'
                            },
                            colors: {
                                from: 'transparent',
                                duration: 800,
                                easing: 'easeOutQuart'
                            }
                        }
                    },
                    hide: {
                        animations: {
                            x: {
                                to: 0,
                                duration: 500,
                                easing: 'easeInQuart'
                            },
                            y: {
                                to: 0,
                                duration: 500,
                                easing: 'easeInQuart'
                            },
                            colors: {
                                to: 'transparent',
                                duration: 400,
                                easing: 'easeInQuart'
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onHover: function(event, activeElements) {
                    // Smooth hover transitions
                    if (activeElements.length > 0) {
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        event.native.target.style.cursor = 'default';
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 16,
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        },
                        animation: {
                            animate: true,
                            duration: 1000
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(0, 212, 255, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 6,
                        animation: {
                            duration: 300,
                            easing: 'easeOutQuart'
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} birds`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        // X-axis: Farm names
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'Farms',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y: {
                        // Left Y-axis: D/O Quantity (main scale)
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        max: chartMax,
                        suggestedMax: chartMax,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            drawOnChartArea: true
                        },
                        ticks: {
                            stepSize: scaleConfig.stepSize,
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#0ea5e9', // Cyan color for D/O Quantity axis
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'D/O Quantity',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#0ea5e9',
                            padding: { top: 0, bottom: 0, left: 0, right: 0 }
                        }
                    },
                    y1: {
                        // Right Y-axis: Missing Birds and Extra Birds (smaller scale)
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        // Calculate max for missing/extra birds (add 20% padding)
                        max: (() => {
                            const allSmallValues = [...missingBirds, ...extraBirds];
                            const maxSmall = allSmallValues.length > 0 ? Math.max(...allSmallValues) : 100;
                            return Math.max(maxSmall * 1.2, 100);
                        })(),
                        grid: {
                            display: false, // Don't show grid lines for right axis
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 10,
                                weight: '500',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#6b7280', // Gray color for smaller values
                            padding: 5,
                            stepSize: (() => {
                                const allSmallValues = [...missingBirds, ...extraBirds];
                                const maxSmall = allSmallValues.length > 0 ? Math.max(...allSmallValues) : 100;
                                if (maxSmall <= 50) return 10;
                                if (maxSmall <= 200) return 50;
                                if (maxSmall <= 500) return 100;
                                return 200;
                            })(),
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        border: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Missing / Extra Birds',
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#6b7280',
                            padding: { top: 0, bottom: 0, left: 10, right: 0 }
                        }
                    }
                }
            }
        });
        
        window.dashboardApp.chartInstances.farmLossChart = chart;
        console.log('✅ Farm Performance chart created successfully with 3 bars!');

        // Add scroll-triggered grow animation
        setTimeout( () => {
            const chartContainer = canvas.closest( '.chart-container' );
            console.log( '🔍 Setting up Farm Performance animation observer' );

            if ( chartContainer ) {
                const observer = new IntersectionObserver( ( entries ) => {
                    entries.forEach( entry => {
                        if ( entry.isIntersecting ) {
                            console.log( '🎬 Triggering Farm Performance grow animation!' );

                            // Store all original values for all datasets
                            const originalDatasets = chart.data.datasets.map( dataset => ( {
                                label: dataset.label,
                                data: [ ...dataset.data ]
                            } ) );

                            // Set all bars to zero
                            chart.data.datasets.forEach( dataset => {
                                dataset.data = dataset.data.map( () => 0 );
                            } );
                            chart.update( 'none' );

                            // Animate to actual values
                            setTimeout( () => {
                                chart.data.datasets.forEach( ( dataset, i ) => {
                                    dataset.data = originalDatasets[ i ].data;
                                } );
                                chart.update( {
                                    duration: 3000,
                                    easing: 'easeOutQuart'
                                } );
                                console.log( '✅ Farm Performance animation started!' );
                            }, 100 );

                            observer.unobserve( entry.target );
                        }
                    } );
                }, {
                    threshold: 0.9 // Trigger when 90% of chart is visible
                } );

                observer.observe( chartContainer );
                console.log( '✅ Observer attached to Farm Performance chart' );
            }
        }, 500 );

        console.log('=== createFarmLossChart END ===');
    } catch (error) {
        console.error('❌ Error creating farm performance chart:', error);
    }
}

function createTruckLossChart(trucks) {
    console.log('=== createTruckLossChart START ===');
    const canvas = document.getElementById('truckLossChart');
    if (!canvas) {
        console.warn('truckLossChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (!trucks || trucks.length === 0) {
        console.warn('No truck data available for chart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.truckLossChart) {
        try {
            window.dashboardApp.chartInstances.truckLossChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing truck chart:', e);
        }
    }
    
    // Extract data for 3 bars: D/O Quantity, Missing Birds, Extra Birds
    console.log('📊 Processing truck data:', trucks);
    const labels = trucks.map(t => t.truck_no || 'Unknown');
    const doQuantities = trucks.map(t => t.total_birds_arrived || 0);
    const missingBirds = trucks.map(t => {
        const variance = t.total_variance || 0;
        return variance < 0 ? Math.abs(variance) : 0; // Only show if negative (missing)
    });
    const extraBirds = trucks.map(t => {
        const variance = t.total_variance || 0;
        return variance > 0 ? variance : 0; // Only show if positive (extra)
    });
    
    console.log('Truck Performance Chart - Labels:', labels);
    console.log('D/O Quantities:', doQuantities);
    console.log('Missing Birds:', missingBirds);
    console.log('Extra Birds:', extraBirds);
    
    // Validate data
    if (labels.length === 0) {
        console.error('❌ No labels found in truck data');
        return;
    }
    
    if (doQuantities.every(v => v === 0) && missingBirds.every(v => v === 0) && extraBirds.every(v => v === 0)) {
        console.warn('⚠️ All values are zero - chart will be empty but should still render');
    }
    
    // Check if all values are zero
    const allValues = [...doQuantities, ...missingBirds, ...extraBirds];
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;
    const hasData = maxValue > 0;
    
    if (!hasData) {
        console.warn('⚠️ All truck values are zero, chart will show empty');
    }
    
    const scaleConfig = calculateOptimalScale(maxValue);
    const chartMax = scaleConfig.max;
    
    console.log('Chart max value:', chartMax, 'Scale config:', scaleConfig);
    
    try {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'D/O Quantity',
                        data: doQuantities,
                        backgroundColor: '#3b82f6', // Blue
                        borderColor: '#2563eb',
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y1', // Use right Y-axis for larger values
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 80; // Staggered animation
                            }
                        },
                        hoverBackgroundColor: '#3b82f6DD',
                        hoverBorderColor: '#2563eb',
                        hoverBorderWidth: 3,
                        datalabels: typeof ChartDataLabels !== 'undefined' ? {
                            anchor: 'end',
                            align: 'top',
                            offset: 4,
                            font: {
                                size: 9,
                                weight: '500',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: 4,
                            padding: { top: 2, bottom: 2, left: 4, right: 4 },
                            formatter: function(value, context) {
                                // Handle both value parameter and context.parsed.y
                                const val = (value !== undefined && value !== null) ? value : (context?.parsed?.y || 0);
                                if (val <= 0) return '';
                                if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                                return new Intl.NumberFormat('en-US').format(val);
                            }
                        } : {}
                    },
                    {
                        label: 'Missing Birds',
                        data: missingBirds,
                        backgroundColor: '#ef4444', // Red
                        borderColor: '#dc2626',
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y', // Use left Y-axis for smaller values
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 80 + 40; // Slight offset
                            }
                        },
                        hoverBackgroundColor: '#ef4444DD',
                        hoverBorderColor: '#dc2626',
                        hoverBorderWidth: 3,
                        datalabels: typeof ChartDataLabels !== 'undefined' ? {
                            anchor: 'end',
                            align: 'top',
                            offset: 2,
                            font: {
                                size: 8,
                                weight: '500',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ffffff',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            borderRadius: 3,
                            padding: { top: 1, bottom: 1, left: 3, right: 3 },
                            formatter: function(value, context) {
                                // Handle both value parameter and context.parsed.y
                                const val = (value !== undefined && value !== null) ? value : (context?.parsed?.y || 0);
                                if (val <= 0) return '';
                                return new Intl.NumberFormat('en-US').format(val);
                            }
                        } : {}
                    },
                    {
                        label: 'Extra Birds',
                        data: extraBirds,
                        backgroundColor: '#10b981', // Green
                        borderColor: '#059669',
                        borderWidth: 2,
                        borderRadius: 6,
                        yAxisID: 'y', // Use left Y-axis for smaller values
                        animation: {
                            delay: function(context) {
                                return context.dataIndex * 80 + 80; // More offset
                            }
                        },
                        hoverBackgroundColor: '#10b981DD',
                        hoverBorderColor: '#059669',
                        hoverBorderWidth: 3,
                        datalabels: typeof ChartDataLabels !== 'undefined' ? {
                            anchor: 'end',
                            align: 'top',
                            offset: 2,
                            font: {
                                size: 8,
                                weight: '500',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ffffff',
                            backgroundColor: 'rgba(16, 185, 129, 0.9)',
                            borderRadius: 3,
                            padding: { top: 1, bottom: 1, left: 3, right: 3 },
                            formatter: function(value, context) {
                                // Handle both value parameter and context.parsed.y
                                const val = (value !== undefined && value !== null) ? value : (context?.parsed?.y || 0);
                                if (val <= 0) return '';
                                return new Intl.NumberFormat('en-US').format(val);
                            }
                        } : {}
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart',
                    delay: function(context) {
                        // Stagger animation: each bar appears with a slight delay
                        let delay = 0;
                        if (context.type === 'data' && context.mode === 'default') {
                            delay = context.dataIndex * 60; // 60ms delay between each bar
                        }
                        return delay;
                    },
                    onProgress: function(animation) {
                        // Smooth progress animation
                        const progress = animation.currentStep / animation.numSteps;
                        if (progress === 1) {
                            // Animation complete
                            console.log('Truck Performance chart animation complete');
                        }
                    },
                    onComplete: function(animation) {
                        // Animation finished callback
                        console.log('Truck Performance chart fully animated');
                    }
                },
                transitions: {
                    show: {
                        animations: {
                            x: {
                                from: 0,
                                duration: 1000,
                                easing: 'easeOutQuart'
                            },
                            y: {
                                from: 0,
                                duration: 1000,
                                easing: 'easeOutQuart'
                            },
                            colors: {
                                from: 'transparent',
                                duration: 800,
                                easing: 'easeOutQuart'
                            }
                        }
                    },
                    hide: {
                        animations: {
                            x: {
                                to: 0,
                                duration: 500,
                                easing: 'easeInQuart'
                            },
                            y: {
                                to: 0,
                                duration: 500,
                                easing: 'easeInQuart'
                            },
                            colors: {
                                to: 'transparent',
                                duration: 400,
                                easing: 'easeInQuart'
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onHover: function(event, activeElements) {
                    // Smooth hover transitions
                    if (activeElements.length > 0) {
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        event.native.target.style.cursor = 'default';
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 16,
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12
                        },
                        animation: {
                            animate: true,
                            duration: 1000
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(0, 212, 255, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 6,
                        animation: {
                            duration: 300,
                            easing: 'easeOutQuart'
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} birds`;
                            }
                        }
                    },
                    datalabels: typeof ChartDataLabels !== 'undefined' ? {
                        display: function(context) {
                            // Check if context and parsed exist
                            if (!context || !context.parsed || context.parsed.y === undefined || context.parsed.y === null) {
                                return false;
                            }
                            
                            // Only show label if value > 0
                            const value = context.parsed.y || 0;
                            if (value <= 0) return false;
                            
                            // Check if chart and scales exist
                            if (!context.chart || !context.chart.scales) {
                                return false;
                            }
                            
                            const yAxisId = context.dataset.yAxisID || 'y';
                            const yScale = context.chart.scales[yAxisId];
                            if (!yScale) return false;
                            
                            try {
                                const barHeight = yScale.getPixelForValue(value);
                                const basePixel = yScale.getPixelForValue(0);
                                const actualHeight = Math.abs(barHeight - basePixel);
                                return actualHeight > 15; // Only show if bar is at least 15px tall
                            } catch (e) {
                                console.warn('Error calculating bar height for datalabel:', e);
                                return false;
                            }
                        },
                        clamp: true,
                        clip: false
                    } : {}
                },
                scales: {
                    x: {
                        // X-axis: Truck numbers (grouped bars, not stacked)
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'Trucks',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y: {
                        // Left Y-axis: Missing Birds and Extra Birds (smaller scale)
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        // Calculate max for missing/extra birds (add 20% padding)
                        max: (() => {
                            const allSmallValues = [...missingBirds, ...extraBirds];
                            const maxSmall = allSmallValues.length > 0 ? Math.max(...allSmallValues) : 100;
                            return Math.max(maxSmall * 1.2, 100);
                        })(),
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.08)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            drawOnChartArea: true
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#6b7280', // Gray color for smaller values
                            padding: 10,
                            stepSize: (() => {
                                const allSmallValues = [...missingBirds, ...extraBirds];
                                const maxSmall = allSmallValues.length > 0 ? Math.max(...allSmallValues) : 100;
                                if (maxSmall <= 50) return 10;
                                if (maxSmall <= 200) return 50;
                                if (maxSmall <= 500) return 100;
                                return 200;
                            })(),
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'Missing / Extra Birds',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#6b7280',
                            padding: { top: 0, bottom: 0, left: 0, right: 0 }
                        }
                    },
                    y1: {
                        // Right Y-axis: D/O Quantity (larger scale)
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: chartMax,
                        suggestedMax: chartMax,
                        grid: {
                            display: false, // Don't show grid lines for right axis
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)'
                        },
                        ticks: {
                            stepSize: scaleConfig.stepSize,
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#3b82f6', // Blue color for D/O Quantity axis
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'D/O Quantity',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#3b82f6',
                            padding: { top: 0, bottom: 0, left: 10, right: 0 }
                        }
                    }
                }
            }
        });
        
        window.dashboardApp.chartInstances.truckLossChart = chart;
        console.log('✅ Truck Performance GROUPED BAR chart created successfully!');
        console.log('Chart data points:', labels.length);
        console.log('Chart visible:', chart.canvas.offsetWidth > 0 && chart.canvas.offsetHeight > 0);

        // Add scroll-triggered grow animation
        setTimeout( () => {
            const chartContainer = canvas.closest( '.chart-container' );
            console.log( '🔍 Setting up Truck Performance animation observer' );

            if ( chartContainer ) {
                const observer = new IntersectionObserver( ( entries ) => {
                    entries.forEach( entry => {
                        if ( entry.isIntersecting ) {
                            console.log( '🎬 Triggering Truck Performance grow animation!' );

                            // Store all original values for all datasets
                            const originalDatasets = chart.data.datasets.map( dataset => ( {
                                label: dataset.label,
                                data: [ ...dataset.data ]
                            } ) );

                            // Set all bars to zero
                            chart.data.datasets.forEach( dataset => {
                                dataset.data = dataset.data.map( () => 0 );
                            } );
                            chart.update( 'none' );

                            // Animate to actual values
                            setTimeout( () => {
                                chart.data.datasets.forEach( ( dataset, i ) => {
                                    dataset.data = originalDatasets[ i ].data;
                                } );
                                chart.update( {
                                    duration: 3000,
                                    easing: 'easeOutQuart'
                                } );
                                console.log( '✅ Truck Performance animation started!' );
                            }, 100 );

                            observer.unobserve( entry.target );
                        }
                    } );
                }, {
                    threshold: 0.9 // Trigger when 90% of chart is visible
                } );

                observer.observe( chartContainer );
                console.log( '✅ Observer attached to Truck Performance chart' );
            }
        }, 500 );

        console.log('=== createTruckLossChart END ===');
    } catch (error) {
        console.error('❌ Error creating truck performance chart:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Show error message on canvas parent
        const wrapper = canvas.parentElement;
        if (wrapper) {
            wrapper.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle"></i><br>
                Chart Error: ${error.message}
            </div>`;
        }
    }
}

function createVariationTrendsChart(trucks) {
    console.log('=== createVariationTrendsChart START (AREA CHART) ===');
    const canvas = document.getElementById('varianceTrendsChart');
    if (!canvas) {
        console.warn('varianceTrendsChart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.varianceTrendsChart) {
        try {
            window.dashboardApp.chartInstances.varianceTrendsChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing variation chart:', e);
        }
    }
    
    if (!trucks || trucks.length === 0) {
        console.warn('No truck data available for variation chart');
        return;
    }
    
    // Fetch truck variation data from API
    const uploadId = window.dashboardApp.currentUploadId || 1;
    const apiUrl = `${API_BASE_URL}/truck-farm-variance/${uploadId}`;
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(matrixData => {
            console.log('Truck Variation Data:', matrixData);
            
            const truckNos = matrixData.trucks || [];
            const data = matrixData.data || [];
            
            if (truckNos.length === 0) {
                console.warn('No truck data available');
                return;
            }
            
            // Aggregate variation by truck (average across all farms)
            const truckVariationMap = {};
            data.forEach(item => {
                if (!truckVariationMap[item.truck_no]) {
                    truckVariationMap[item.truck_no] = {
                        total: 0,
                        count: 0
                    };
                }
                truckVariationMap[item.truck_no].total += item.variance_percentage || 0;
                truckVariationMap[item.truck_no].count += 1;
            });
            
            // Calculate average variation for each truck
            const chartData = truckNos.map(truckNo => {
                const truckData = truckVariationMap[truckNo];
                if (truckData && truckData.count > 0) {
                    return truckData.total / truckData.count;
                }
                return 0;
            });
            
            console.log('Truck Numbers:', truckNos);
            console.log('Variation Data:', chartData);
            
            // Create the area chart
            const ctx = canvas.getContext('2d');
            
            window.dashboardApp.chartInstances.varianceTrendsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: truckNos,
                    datasets: [{
                        label: 'Difference Percentage',
                        data: chartData,
                        fill: true,
                        backgroundColor: 'rgba(34, 197, 94, 0.2)', // Light green fill
                        borderColor: 'rgba(34, 197, 94, 1)', // Green border
                        borderWidth: 2.5,
                        tension: 0.4, // Smooth curve
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(34, 197, 94, 1)',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: {
                                    family: "'Poppins', 'Inter', sans-serif",
                                    size: 12,
                                    weight: '500'
                                },
                                color: '#4a5568',
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        title: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                family: "'Poppins', 'Inter', sans-serif",
                                size: 13,
                                weight: 'bold'
                            },
                            bodyFont: {
                                family: "'Poppins', 'Inter', sans-serif",
                                size: 12
                            },
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const status = value > 0 ? 'Extra Birds' : value < 0 ? 'Missing Birds' : 'Perfect Match';
                                    return [
                                        `Difference Percentage: ${ value.toFixed( 2 ) }%`,
                                        `Status: ${status}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Truck Number',
                                font: {
                                    family: "'Poppins', 'Inter', sans-serif",
                                    size: 14,
                                    weight: '600'
                                },
                                color: '#1a1a1a',
                                padding: {
                                    top: 10
                                }
                            },
                            ticks: {
                                font: {
                                    family: "'Poppins', 'Inter', sans-serif",
                                    size: 11
                                },
                                color: '#4a5568',
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Difference Percentage (%)',
                                font: {
                                    family: "'Poppins', 'Inter', sans-serif",
                                    size: 14,
                                    weight: '600'
                                },
                                color: '#1a1a1a',
                                padding: {
                                    bottom: 10
                                }
                            },
                            ticks: {
                                font: {
                                    family: "'Poppins', 'Inter', sans-serif",
                                    size: 11
                                },
                                color: '#4a5568',
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            },
                            grid: {
                                display: true,
                                color: 'rgba(0, 0, 0, 0.08)',
                                drawBorder: false
                            },
                            beginAtZero: true
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
            
            console.log('=== Variation Area Chart Created Successfully ===');
        })
        .catch(error => {
            console.error('Error fetching truck variation data:', error);
        });
}

function createDeathByTruckChart(trucks) {
    console.log('=== createDeathByTruckChart START (LOLLIPOP CHART) ===');
    const canvas = document.getElementById('deathByTruckChart');
    if (!canvas) {
        console.warn('deathByTruckChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.deathByTruckChart) {
        try {
            window.dashboardApp.chartInstances.deathByTruckChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing death by truck chart:', e);
        }
    }
    
    if (!trucks || trucks.length === 0) {
        console.warn('No truck data available for death chart');
        return;
    }
    
    // Set fixed height for horizontal chart (vertical bars)
    const canvasContainer = canvas.parentElement;
    if (canvasContainer) {
        canvasContainer.style.height = '450px';
    }
    
    const labels = trucks.map(t => t.truck_no || 'Unknown');
    const doaCounts = trucks.map(t => t.total_doa || 0);
    const deathPercentages = trucks.map(t => t.death_percentage || 0);
    
    // Calculate max value for scaling
    const maxDOA = Math.max(...doaCounts, 1);
    
    // Color based on DOA count (green for low, red for high)
    const colors = doaCounts.map(count => {
        if (count > 5) {
            return '#dc2626'; // Dark red for high DOA
        }
        return '#059669'; // Dark green for normal DOA
    });
    
    console.log('Death Rate by Truck - Labels:', labels);
    console.log('DOA Counts:', doaCounts);
    console.log('Death Percentages:', deathPercentages);
    
    // Register lollipop plugin BEFORE creating the chart
    const lollipopPlugin = {
        id: 'lollipopCircles',
        afterDatasetsDraw: (chart) => {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            
            meta.data.forEach((bar, index) => {
                if (bar.hidden || !bar) return;
                
                try {
                    const x = bar.x;
                    const y = bar.y;
                    const color = colors[index];
                    
                    // Draw circle (lollipop head) at end of bar
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, 9, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.restore();
                } catch (e) {
                    console.warn('Error drawing lollipop circle:', e);
                }
            });
        }
    };
    
    // DON'T register globally - we'll add it as a chart-specific plugin
    console.log('Lollipop plugin defined (will be added to chart only)');
    
    try {
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'DOA Count per Truck',
                    data: doaCounts,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 0,
                    barThickness: 3, // Very thin bars for lollipop stems
                    maxBarThickness: 3,
                    categoryPercentage: 0.85,
                    barPercentage: 0.75
                }]
            },
            plugins: [lollipopPlugin], // Add plugin ONLY to this chart
            options: {
                indexAxis: 'x', // Vertical orientation (standard bar chart)
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable initial animation
                },
                layout: {
                    padding: {
                        top: 50, // More space for top labels
                        bottom: 30,
                        left: 30,
                        right: 30
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(0, 212, 255, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 6,
                        callbacks: {
                            label: function(context) {
                                if (!context || !context.parsed || context.parsed.y === undefined || context.parsed.y === null) {
                                    return '';
                                }
                                const doaCount = context.parsed.y || 0;
                                const index = context.dataIndex || 0;
                                const percentage = deathPercentages[index] || 0;
                                return [
                                    `DOA Count: ${new Intl.NumberFormat('en-US').format(doaCount)} birds`,
                                    `Death Rate: ${percentage.toFixed(2)}%`,
                                    `Truck: ${labels[index] || 'Unknown'}`
                                ];
                            }
                        }
                    },
                    datalabels: typeof ChartDataLabels !== 'undefined' ? {
                        display: function(context) {
                            // Always show labels
                            return true;
                        },
                        color: '#ffffff',
                        backgroundColor: function(context) {
                            const doaCount = context.dataset.data[context.dataIndex] || 0;
                            if (doaCount > 5) {
                                return 'rgba(220, 38, 38, 0.95)'; // Red background
                            }
                            return 'rgba(5, 150, 105, 0.95)'; // Green background
                        },
                        borderColor: function(context) {
                            const doaCount = context.dataset.data[context.dataIndex] || 0;
                            if (doaCount > 5) {
                                return 'rgba(185, 28, 28, 0.95)';
                            }
                            return 'rgba(4, 120, 87, 0.95)';
                        },
                        borderWidth: 2,
                        borderRadius: 12, // Circular shape for lollipop head
                        padding: {
                            top: 6,
                            bottom: 6,
                            left: 10,
                            right: 10
                        },
                        font: {
                            size: 12, // Increased font size for better visibility
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        anchor: 'end', // Position at end of lollipop
                        align: 'top',
                        offset: function(context) {
                            // Add offset to position label next to the lollipop head
                            return 8; // Fixed offset for consistent positioning
                        },
                        clamp: true, // Keep labels within chart area
                        clip: false,
                        formatter: function(value, context) {
                            // Format as decimal with one decimal place
                            return value.toFixed(1);
                        }
                    } : {}
                },
                scales: {
                    x: {
                        // X-axis: Truck names (vertical bars)
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            autoSkip: false, // Show all trucks
                            maxRotation: 45,
                            minRotation: 45
                        },
                        title: {
                            display: true,
                            text: 'Truck',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 10 }
                        }
                    },
                    y: {
                        // Y-axis: DOA Count
                        beginAtZero: true,
                        max: Math.ceil(maxDOA * 1.2), // 20% padding at top
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'DOA Count',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { bottom: 10 }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                onHover: function(event, activeElements) {
                    if (activeElements.length > 0) {
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        event.native.target.style.cursor = 'default';
                    }
                }
            }
        });

        window.dashboardApp.chartInstances.deathByTruckChart = chart;
        console.log('✅ Death Rate by Truck LOLLIPOP chart created successfully!');
        console.log('=== createDeathByTruckChart END ===');
    } catch (error) {
        console.error('❌ Error creating death by truck lollipop chart:', error);
        console.error('Error details:', error.stack);
        const wrapper = canvas.parentElement;
        if (wrapper) {
            wrapper.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-triangle"></i><br>
                Chart Error: ${error.message}
            </div>`;
        }
    }
}

function createMissingByFarmChart(farms) {
    console.log('=== createMissingByFarmChart START (Dotted Line) ===');
    const canvas = document.getElementById('missingByFarmChart');
    if (!canvas) {
        console.warn('missingByFarmChart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.dashboardApp.chartInstances.missingByFarmChart) {
        try {
            window.dashboardApp.chartInstances.missingByFarmChart.destroy();
        } catch (e) {
            console.warn('Error destroying existing missing birds chart:', e);
        }
    }
    
    if (!farms || farms.length === 0) {
        console.warn('No farm data available for missing birds chart');
        return;
    }
    
    const labels = farms.map(f => f.farm || 'Unknown');
    const missingPercentages = farms.map(f => f.missing_birds_percentage || 0);
    
    // Calculate max absolute value for scaling (centered at zero)
    const absValues = missingPercentages.map(Math.abs);
    const maxAbsValue = absValues.length > 0 ? Math.max(...absValues) : 5;
    const chartMax = Math.max(maxAbsValue * 1.2, 5);
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Variation (%)',
                data: missingPercentages,
                borderColor: chartColors.warning, // Yellow
                backgroundColor: chartColors.warning,
                borderWidth: 3,
                borderDash: [8, 8], // Dotted line style
                pointBackgroundColor: chartColors.warning,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 8, // Big size dots
                pointHoverRadius: 10,
                fill: false,
                tension: 0.4 // Smooth curve
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                x: {
                    ...commonChartOptions.scales.x,
                    title: {
                        display: true,
                        text: 'Farms',
                        font: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        color: '#1a1a1a',
                        padding: { top: 10, bottom: 0 }
                    }
                },
                y: {
                    ...commonChartOptions.scales.y,
                    min: -chartMax,
                    max: chartMax,
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: {
                            size: 12,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        color: '#323130',
                        padding: { top: 10, bottom: 0 }
                    },
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    },
                    grid: {
                        ...commonChartOptions.scales.y.grid,
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return 'rgba(0, 0, 0, 0.3)'; // Darker line for zero
                            }
                            return 'rgba(0, 0, 0, 0.08)';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2; // Thicker line for zero
                            }
                            return 1;
                        }
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    display: false // Hide legend as it's a single line
                },
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            if (value > 0) {
                                return `Missing Birds: ${value.toFixed(2)}%`;
                            } else if (value < 0) {
                                return `Extra Birds: ${Math.abs(value).toFixed(2)}%`;
                            } else {
                                return `No difference: 0%`;
                            }
                        }
                    }
                }
            }
        }
    });
    
    window.dashboardApp.chartInstances.missingByFarmChart = chart;
    console.log('=== Missing By Farm Chart Created (Dotted Line) ===');

    // Add scroll-triggered line drawing animation
    setTimeout( () => {
        const chartContainer = canvas.closest( '.chart-container' );
        console.log( '🔍 Setting up Missing Birds line drawing animation observer' );

        if ( chartContainer ) {
            const observer = new IntersectionObserver( ( entries ) => {
                entries.forEach( entry => {
                    if ( entry.isIntersecting ) {
                        console.log( '🎬 Triggering Missing Birds line drawing animation!' );

                        // Store original data
                        const originalData = [ ...chart.data.datasets[ 0 ].data ];
                        const totalPoints = originalData.length;

                        // Start with empty data
                        chart.data.datasets[ 0 ].data = [];
                        chart.update( 'none' );

                        // Animate drawing line from first to last farm
                        const animationDuration = 2000; // 2 seconds
                        const intervalTime = animationDuration / totalPoints;

                        let currentIndex = 0;
                        const drawInterval = setInterval( () => {
                            if ( currentIndex < totalPoints ) {
                                chart.data.datasets[ 0 ].data.push( originalData[ currentIndex ] );
                                chart.update( 'none' );
                                currentIndex++;
                            } else {
                                clearInterval( drawInterval );
                                console.log( '✅ Line drawing animation completed!' );
                            }
                        }, intervalTime );

                        observer.unobserve( entry.target );
                    }
                } );
            }, {
                threshold: 0.9 // Trigger when 90% of chart is visible
            } );

            observer.observe( chartContainer );
            console.log( '✅ Observer attached to Missing Birds chart' );
        }
    }, 500 );
}

/**
 * Create Delivered vs Received Chart
 */
function createDeliveredVsReceivedChart(data) {
    console.log('=== createDeliveredVsReceivedChart START (DUAL AXIS) ===');
    console.log('Data:', data);
    
    const canvas = document.getElementById('deliveredReceivedChart');
    if (!canvas) {
        console.error('❌ deliveredReceivedChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Could not get 2d context');
        return;
    }
    
    // Destroy existing chart
    if (window.dashboardApp.chartInstances.deliveredReceivedChart) {
        window.dashboardApp.chartInstances.deliveredReceivedChart.destroy();
    }
    
    if (!data || data.length === 0) {
        console.warn('No data for delivered vs received chart');
        return;
    }
    
    const farms = data.map(item => item.farm || 'Unknown');
    const differences = data.map(item => item.difference || 0);
    
    // Calculate Missing Birds (negative difference) and Extra Birds (positive difference)
    const missingBirds = differences.map(diff => diff < 0 ? Math.abs(diff) : 0);
    const extraBirds = differences.map(diff => diff > 0 ? diff : 0);
    
    // Calculate max value for each axis
    const maxMissing = Math.max(...missingBirds, 10);
    const maxExtra = Math.max(...extraBirds, 10);
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: farms,
            datasets: [
                {
                    label: 'Missing Birds',
                    data: missingBirds,
                    backgroundColor: chartColors.danger, // Red for missing
                    borderColor: chartColors.danger,
                    borderWidth: 2,
                    borderRadius: 6,
                    yAxisID: 'y1', // Right Axis (Small Values)
                    order: 1
                },
                {
                    label: 'Extra Birds',
                    data: extraBirds,
                    backgroundColor: chartColors.success, // Green for extra
                    borderColor: chartColors.success,
                    borderWidth: 2,
                    borderRadius: 6,
                    yAxisID: 'y', // Left Axis (Large Values)
                    order: 2
                }
            ]
        },
        options: {
            ...commonChartOptions,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    ...commonChartOptions.scales.x,
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Farms',
                        font: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        color: '#1a1a1a',
                        padding: { top: 10, bottom: 0 }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    suggestedMax: maxExtra * 1.1,
                    title: {
                        display: true,
                        text: 'Extra Birds (Count)',
                        font: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        color: chartColors.success,
                        padding: { top: 0, bottom: 0 }
                    },
                    ticks: {
                        color: chartColors.success,
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US').format(value);
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    suggestedMax: maxMissing * 1.1,
                    title: {
                        display: true,
                        text: 'Missing Birds (Count)',
                        font: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        color: chartColors.danger,
                        padding: { top: 0, bottom: 0 }
                    },
                    ticks: {
                        color: chartColors.danger,
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US').format(value);
                        }
                    },
                    grid: {
                        drawOnChartArea: false // Only draw grid for left axis
                    }
                }
            },
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    ...commonChartOptions.plugins.legend,
                    position: 'top'
                },
                tooltip: {
                    ...commonChartOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ${new Intl.NumberFormat('en-US').format(value)} birds`;
                        }
                    }
                }
            }
        }
    });
    
    window.dashboardApp.chartInstances.deliveredReceivedChart = chart;
    console.log('✅ Delivered vs Received chart created (Dual Axis)');
}

/**
 * Create Slaughter Yield Chart
 */
function createSlaughterYieldChart(data) {
    console.log('=== createSlaughterYieldChart START ===');
    console.log('Data:', data);
    
    const canvas = document.getElementById('slaughterYieldChart');
    if (!canvas) {
        console.error('❌ slaughterYieldChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    // Set high resolution for crisp rendering (2x for retina displays)
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    if (!ctx) {
        console.error('❌ Could not get 2d context');
        return;
    }
    
    // Destroy existing chart completely
    if (window.dashboardApp.chartInstances.slaughterYieldChart) {
        try {
            window.dashboardApp.chartInstances.slaughterYieldChart.destroy();
            window.dashboardApp.chartInstances.slaughterYieldChart = null;
        } catch (e) {
            console.warn('Error destroying existing chart:', e);
        }
    }
    
    if (!data || data.length === 0) {
        console.warn('No data for slaughter yield chart');
        return;
    }
    
    console.log('Creating PIE chart with', data.length, 'farms');
    
    // Prepare data with farm names and yields
    const chartData = data.map(item => ({
        farm: item.farm || 'Unknown',
        yield: item.slaughter_yield_percentage || 0,
        total_slaughter: item.total_slaughter || 0,
        total_counter_plus_doa: item.total_counter_plus_doa || 0
    }));
    
    // Sort by yield (descending) for better visual presentation
    chartData.sort((a, b) => b.yield - a.yield);
    
    const farms = chartData.map(item => item.farm);
    const yields = chartData.map(item => item.yield);
    
    // Vibrant colorful palette - professional gradient colors
    const vibrantColors = [
        '#00d4ff', // Bright Cyan
        '#8b5cf6', // Vibrant Purple
        '#ec4899', // Hot Pink
        '#10b981', // Emerald Green
        '#f59e0b', // Golden Orange
        '#3b82f6', // Royal Blue
        '#06b6d4', // Cyan Teal
        '#a855f7', // Deep Violet
        '#f97316', // Burnt Orange
        '#14b8a6', // Turquoise
        '#ef4444', // Bright Red
        '#6366f1', // Indigo
        '#22c55e', // Lime Green
        '#eab308', // Bright Yellow
        '#0ea5e9'  // Sky Blue
    ];
    
    // Generate vibrant colors - rotate through palette for visual variety
    const backgroundColors = yields.map((yield, index) => {
        return vibrantColors[index % vibrantColors.length];
    });
    
    console.log('Chart type: DOUGHNUT');

    // Create IntersectionObserver to trigger animation when 90% visible
    const observer = new IntersectionObserver( ( entries ) => {
        entries.forEach( entry => {
            if ( entry.isIntersecting ) {
                console.log( '🎬 Triggering Slaughter Yield animation!' );

                const chart = new Chart( ctx, {
                    type: 'doughnut',
                    data: {
                        labels: farms.map( ( farm, index ) => `${ farm } (${ yields[ index ].toFixed( 1 ) }%)` ),
                        datasets: [ {
                            label: 'Total Slaughter Percentage',
                            data: yields,
                            backgroundColor: backgroundColors,
                            borderColor: '#ffffff',
                            borderWidth: 0, // Remove border for cleaner look
                            hoverBorderWidth: 0,
                            hoverOffset: 10,
                            borderRadius: 20, // Rounded corners
                            spacing: 5 // Spacing between segments
                        } ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%', // Thinner ring (Make it a donut chart)
                        animation: {
                            duration: 2000, // 2 seconds duration
                            easing: 'easeOutQuart', // Smooth easing
                            animateRotate: true, // Animate rotation (circular fill)
                            animateScale: false // Do not animate scale
                        },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'right',
                                labels: {
                                    padding: 20,
                                    font: {
                                        size: 13,
                                        weight: '600',
                                        family: "'Poppins', 'Inter', sans-serif"
                                    },
                                    color: '#1a1a1a',
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    boxWidth: 12,
                                    boxHeight: 12,
                                    generateLabels: function ( chart ) {
                                        const data = chart.data;
                                        if ( data.labels.length && data.datasets.length ) {
                                            return data.labels.map( ( label, i ) => {
                                                const value = data.datasets[ 0 ].data[ i ];
                                                return {
                                                    text: label,
                                                    fillStyle: data.datasets[ 0 ].backgroundColor[ i ],
                                                    strokeStyle: data.datasets[ 0 ].borderColor,
                                                    lineWidth: data.datasets[ 0 ].borderWidth,
                                                    hidden: false,
                                                    index: i
                                                };
                                            } );
                                        }
                                        return [];
                                    }
                                },
                                onClick: function ( e, legendItem, legend ) {
                                    const index = legendItem.index;
                                    const chart = legend.chart;
                                    const meta = chart.getDatasetMeta( 0 );

                                    meta.data[ index ].hidden = !meta.data[ index ].hidden;
                                    chart.update();
                                }
                            },
                            tooltip: {
                                enabled: true,
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                padding: 16,
                                titleFont: {
                                    size: 15,
                                    weight: '700',
                                    family: "'Poppins', 'Inter', sans-serif"
                                },
                                bodyFont: {
                                    size: 13,
                                    weight: '500',
                                    family: "'Poppins', 'Inter', sans-serif"
                                },
                                borderColor: 'rgba(0, 212, 255, 0.4)',
                                borderWidth: 2,
                                cornerRadius: 12,
                                displayColors: true,
                                titleColor: '#1a1a1a',
                                bodyColor: '#1a1a1a',
                                boxPadding: 8,
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                callbacks: {
                                    title: function ( context ) {
                                        return context[ 0 ].label.split( ' (' )[ 0 ]; // Farm name only
                                    },
                                    label: function ( context ) {
                                        const index = context.dataIndex;
                                        const item = chartData[ index ];
                                        const yield = context.parsed;
                                        const total = yields.reduce( ( a, b ) => a + b, 0 );
                                        const percentage = total > 0 ? ( ( yield / total ) * 100 ).toFixed( 1 ) : 0;

                                        return [
                                            `Total Slaughter Percentage: ${ yield.toFixed( 2 ) }%`,
                                            `Total Slaughter: ${ new Intl.NumberFormat( 'en-US' ).format( item.total_slaughter ) }`,
                                            `Counter + DOA: ${ new Intl.NumberFormat( 'en-US' ).format( item.total_counter_plus_doa ) }`,
                                            `Share: ${ percentage }% of total`
                                        ];
                                    },
                                    footer: function ( tooltipItems ) {
                                        const total = yields.reduce( ( a, b ) => a + b, 0 );
                                        const avg = ( total / yields.length ).toFixed( 2 );
                                        return `Average Total Slaughter Percentage: ${ avg }%`;
                                    }
                                }
                            },
                            datalabels: typeof ChartDataLabels !== 'undefined' ? {
                                display: true,
                                color: '#ffffff',
                                font: {
                                    size: 13,
                                    weight: '700',
                                    family: "'Poppins', 'Inter', sans-serif"
                                },
                                formatter: function ( value, context ) {
                                    return value.toFixed( 1 ) + '%';
                                },
                                textStrokeColor: 'rgba(0, 0, 0, 0.5)',
                                textStrokeWidth: 3,
                                padding: 8,
                                textAlign: 'center',
                                clip: false
                            } : {}
                        }
                    }
                } );

                // Register datalabels plugin if available
                if ( typeof ChartDataLabels !== 'undefined' ) {
                    chart.config.options.plugins.plugins = [ ChartDataLabels ];
                }

                window.dashboardApp.chartInstances.slaughterYieldChart = chart;
                console.log( '✅ Slaughter Yield PIE chart created successfully' );
                console.log( 'Chart type:', chart.config.type );
                console.log( 'Number of farms:', chart.data.datasets[ 0 ].data.length );

                // Stop observing once triggered
                observer.unobserve( entry.target );
            }
        } );
    }, {
        threshold: 0.9 // Trigger when 90% of chart is visible
    } );

    // Start observing the canvas
    observer.observe( canvas );


}

// Calculate optimal Y-axis scale with adaptive stepped scaling
// 0-500: 50 unit steps, 500-1000: 100 steps, 1000-2000: 200 steps, 2000+: 500 steps
function calculateOptimalScale(maxValue) {
    if (!maxValue || maxValue <= 0) {
        return {
            max: 100,
            stepSize: 50,
            ticks: [0, 50, 100]
        };
    }
    
    let stepSize;
    let max;
    let ticks = [];
    
    if (maxValue <= 500) {
        stepSize = 50;
        max = Math.ceil(maxValue / 50) * 50;
        // Generate ticks: 0, 50, 100, ..., max
        for (let i = 0; i <= max; i += 50) {
            ticks.push(i);
        }
    } else if (maxValue <= 1000) {
        stepSize = 100;
        max = Math.ceil(maxValue / 100) * 100;
        // Generate ticks: 0, 50, 100, 150, ..., 500, 600, 700, ..., max
        for (let i = 0; i <= 500; i += 50) {
            ticks.push(i);
        }
        for (let i = 600; i <= max; i += 100) {
            ticks.push(i);
        }
    } else if (maxValue <= 2000) {
        stepSize = 200;
        max = Math.ceil(maxValue / 200) * 200;
        // Generate ticks: 0, 50, 100, ..., 500, 600, ..., 1000, 1200, ..., max
        for (let i = 0; i <= 500; i += 50) {
            ticks.push(i);
        }
        for (let i = 600; i <= 1000; i += 100) {
            ticks.push(i);
        }
        for (let i = 1200; i <= max; i += 200) {
            ticks.push(i);
        }
    } else {
        stepSize = 500;
        max = Math.ceil(maxValue / 500) * 500;
        // Generate ticks: 0, 50, 100, ..., 500, 600, ..., 1000, 1200, ..., 2000, 2500, ..., max
        for (let i = 0; i <= 500; i += 50) {
            ticks.push(i);
        }
        for (let i = 600; i <= 1000; i += 100) {
            ticks.push(i);
        }
        for (let i = 1200; i <= 2000; i += 200) {
            ticks.push(i);
        }
        for (let i = 2500; i <= max; i += 500) {
            ticks.push(i);
        }
    }
    
    // Ensure max is at least 10% above the actual max value for padding
    const paddedMax = Math.max(max, Math.ceil(maxValue * 1.1));
    
    return {
        max: paddedMax,
        stepSize: stepSize,
        ticks: ticks
    };
}

// Extract date from filename (format: day-month-year.xlsx)
function extractDateFromFilename(filename) {
    if (!filename) return null;
    // Remove .xlsx extension
    const nameWithoutExt = filename.replace(/\.xlsx?$/i, '');
    // Try to parse day-month-year format
    const parts = nameWithoutExt.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10); // Month in filename is 1-indexed (1-12)
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
            // Create date in local timezone to avoid UTC conversion issues
            // JavaScript Date months are 0-indexed, so subtract 1
            const date = new Date(year, month - 1, day);
            // Verify the date is valid
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                return date;
            }
        }
    }
    return null;
}



// Overall Trend by Trucks Chart
let overallTrendTruckChartInstance = null;
function createOverallTrendTruckChart(trucks) {
    console.log('=== createOverallTrendTruckChart START (Dual Axis, Dotted) ===');
    const canvas = document.getElementById('overallTrendTruckChart');
    if (!canvas) {
        console.warn('overallTrendTruckChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (!trucks || trucks.length === 0) {
        console.warn('No truck data available for chart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (overallTrendTruckChartInstance) {
        try {
            overallTrendTruckChartInstance.destroy();
        } catch (e) {
            console.warn('Error destroying existing truck trend chart:', e);
        }
    }
    
    // Extract data for 4 lines: DO Ordered, Total Slaughter, DOA, Net Difference
    const labels = trucks.map(t => t.truck_no || 'Unknown');
    const doOrdered = trucks.map(t => t.total_birds_arrived || 0);
    const totalSlaughter = trucks.map(t => t.total_birds_slaughtered || 0);
    const totalDOA = trucks.map(t => t.total_doa || 0);
    const netDifference = trucks.map(t => t.total_variance || 0);
    
    console.log('Overall Trend by Trucks - Labels:', labels);
    console.log('DO Ordered:', doOrdered);
    console.log('Total Slaughter:', totalSlaughter);
    console.log('Total DOA:', totalDOA);
    console.log('Net Difference:', netDifference);
    
    // Calculate max values for scaling
    const maxLarge = Math.max(...doOrdered, ...totalSlaughter, 100);
    const maxSmall = Math.max(...totalDOA, ...netDifference.map(Math.abs), 10);
    
    try {
        overallTrendTruckChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total DO Ordered',
                        data: doOrdered,
                        borderColor: chartColors.chart1,
                        backgroundColor: chartColors.primaryLight,
                        borderWidth: 2, // Thinner line
                        borderDash: [6, 4], // Dotted line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.chart1,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y' // Left Axis
                    },
                    {
                        label: 'Total Slaughter',
                        data: totalSlaughter,
                        borderColor: chartColors.success,
                        backgroundColor: chartColors.successLight,
                        borderWidth: 2, // Thinner line
                        borderDash: [6, 4], // Dotted line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.success,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y' // Left Axis
                    },
                    {
                        label: 'Total DOA',
                        data: totalDOA,
                        borderColor: chartColors.danger,
                        backgroundColor: chartColors.dangerLight,
                        borderWidth: 2, // Thinner line
                        borderDash: [6, 4], // Dotted line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.danger,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1' // Right Axis
                    },
                    {
                        label: 'Total Difference',
                        data: netDifference,
                        borderColor: chartColors.warning,
                        backgroundColor: chartColors.warningLight,
                        borderWidth: 2, // Thinner line
                        borderDash: [6, 4], // Dotted line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.warning,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1' // Right Axis
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 16,
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 10,
                            boxHeight: 10
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(0, 212, 255, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 6,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} birds`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        border: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.15)',
                            width: 2
                        },
                        title: {
                            display: true,
                            text: 'Trucks',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        suggestedMax: maxLarge * 1.1,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)'
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Total Birds (Ordered/Slaughtered)',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        suggestedMax: maxSmall * 1.1,
                        grid: {
                            display: false,
                            drawOnChartArea: false
                        },
                        ticks: {
                            stepSize: 15, // Specific step size
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ef4444',
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Difference / DOA',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ef4444',
                            padding: { top: 10, bottom: 0 }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Overall Trend by Trucks chart created successfully!');
    } catch (error) {
        console.error('❌ Error creating overall trend by trucks chart:', error);
    }
}

// Historical Trend by Date Chart
let historicalTrendDateChartInstance = null;
async function createHistoricalTrendDateChart() {
    const canvas = document.getElementById('historicalTrendDateChart');
    if (!canvas) {
        console.warn('historicalTrendDateChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js is not loaded!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get API base URL (use same logic as app.js)
    const API_BASE_URL = window.ENV_API_URL || 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:8001' 
            : window.location.origin);
    
    // Destroy existing chart if it exists
    if (historicalTrendDateChartInstance) {
        try {
            historicalTrendDateChartInstance.destroy();
            historicalTrendDateChartInstance = null;
        } catch (e) {
            console.warn('Error destroying existing historical date trend chart:', e);
        }
    }
    
    // Also check if Chart.js has a chart on this canvas
    try {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.log('Destroying existing chart on historicalTrendDateChart canvas');
            existingChart.destroy();
        }
    } catch (e) {
        console.warn('Error checking existing chart:', e);
    }
    
    try {
        // Fetch all uploads to get dates from filenames
        const uploadsResponse = await fetch(`${API_BASE_URL}/api/uploads`);
        if (!uploadsResponse.ok) {
            console.error('Failed to fetch uploads:', uploadsResponse.status, uploadsResponse.statusText);
            showNoDataMessage(canvas, 'Failed to load upload data');
            return;
        }
        const uploads = await uploadsResponse.json();
        
        if (!uploads || uploads.length === 0) {
            console.warn('No uploads found in database');
            showNoDataMessage(canvas, 'No data available. Please upload files to see historical trends.');
            return;
        }
        
        // Group data by date (from filename)
        const dateGroups = {};
        console.log(`Processing ${uploads.length} uploads for historical trend...`);
        
        for (const upload of uploads) {
            const date = extractDateFromFilename(upload.filename);
            if (!date) {
                console.warn(`Could not extract date from filename: ${upload.filename}`);
                continue;
            }
            
            // Use local date to avoid timezone issues with toISOString()
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD format
            
            // Fetch truck data for this upload
            try {
                const trucksResponse = await fetch(`${API_BASE_URL}/trucks/${upload.id}`);
                if (!trucksResponse.ok) {
                    console.warn(`Failed to fetch trucks for upload ${upload.id}:`, trucksResponse.status);
                    continue;
                }
                const trucksData = await trucksResponse.json();
                
                if (!dateGroups[dateKey]) {
                    dateGroups[dateKey] = {
                        doQuantity: 0,
                        totalSlaughter: 0,
                        totalDOA: 0,
                        netDifference: 0
                    };
                }
                
                // Aggregate data from trucks
                const trucks = trucksData.trucks || [];
                
                if (trucks.length === 0) {
                    console.warn(`No truck data for upload ${upload.id}`);
                    continue;
                }
                
                trucks.forEach(truck => {
                    const doQty = truck.total_birds_arrived || 0;
                    const slaughter = truck.total_birds_slaughtered || 0;
                    const doa = truck.total_doa || 0;
                    const variance = truck.total_variance || 0;
                    
                    dateGroups[dateKey].doQuantity += doQty;
                    dateGroups[dateKey].totalSlaughter += slaughter;
                    dateGroups[dateKey].totalDOA += doa;
                    dateGroups[dateKey].netDifference += variance;
                });
            } catch (error) {
                console.error(`Error fetching trucks for upload ${upload.id}:`, error);
                continue;
            }
        }
        
        // Sort dates
        const sortedDates = Object.keys(dateGroups).sort();
        if (sortedDates.length === 0) {
            console.warn('No date data available for chart after processing uploads');
            showNoDataMessage(canvas, 'No data available. Please upload files to see historical trends.');
            return;
        }
        
        const labels = sortedDates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        });
        const doQuantities = sortedDates.map(d => dateGroups[d].doQuantity);
        const totalSlaughter = sortedDates.map(d => dateGroups[d].totalSlaughter);
        const totalDOA = sortedDates.map(d => dateGroups[d].totalDOA);
        const netDifference = sortedDates.map(d => dateGroups[d].netDifference);
        
        // Calculate max values for scaling
        const maxLarge = Math.max(...doQuantities, ...totalSlaughter, 100);
        const maxSmall = Math.max(...totalDOA, ...netDifference.map(Math.abs), 10);
        
        historicalTrendDateChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total DO Ordered',
                        data: doQuantities,
                        borderColor: chartColors.chart1,
                        backgroundColor: chartColors.primaryLight,
                        borderWidth: 2, // Thinner line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.chart1,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y' // Left Axis (Large Values)
                    },
                    {
                        label: 'Total Slaughter',
                        data: totalSlaughter,
                        borderColor: chartColors.success,
                        backgroundColor: chartColors.successLight,
                        borderWidth: 2, // Thinner line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.success,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y' // Left Axis (Large Values)
                    },
                    {
                        label: 'Total DOA',
                        data: totalDOA,
                        borderColor: chartColors.danger,
                        backgroundColor: chartColors.dangerLight,
                        borderWidth: 2, // Thinner line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.danger,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1' // Right Axis (Small Values)
                    },
                    {
                        label: 'Total Difference',
                        data: netDifference,
                        borderColor: chartColors.warning,
                        backgroundColor: chartColors.warningLight,
                        borderWidth: 2, // Thinner line
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chartColors.warning,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1' // Right Axis (Small Values)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 16,
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 10,
                            boxHeight: 10
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        padding: 12,
                        titleFont: {
                            size: 13,
                            weight: '600',
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        bodyFont: {
                            size: 12,
                            family: "'Poppins', 'Inter', sans-serif"
                        },
                        borderColor: 'rgba(0, 212, 255, 0.5)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        displayColors: true,
                        titleColor: '#1a1a1a',
                        bodyColor: '#1a1a1a',
                        boxPadding: 6,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ${new Intl.NumberFormat('en-US').format(value)} birds`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            maxRotation: 45,
                            minRotation: 0
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#1a1a1a',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        suggestedMax: maxLarge * 1.1,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true,
                            borderColor: 'rgba(0, 0, 0, 0.15)'
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Total Birds (Ordered/Slaughtered)',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#4a5568',
                            padding: { top: 10, bottom: 0 }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        suggestedMax: maxSmall * 1.1,
                        grid: {
                            display: false, // Keep grid cleaner by only showing left axis grid
                            drawOnChartArea: false
                        },
                        ticks: {
                            stepSize: 15, // Specific step size as requested
                            font: {
                                size: 11,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ef4444', // Red color for attention
                            padding: 10,
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US').format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Difference / DOA',
                            font: {
                                size: 12,
                                weight: '600',
                                family: "'Poppins', 'Inter', sans-serif"
                            },
                            color: '#ef4444',
                            padding: { top: 10, bottom: 0 }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Historical Trend by Date chart created successfully!');
    } catch (error) {
        console.error('❌ Error creating historical trend by date chart:', error);
        showNoDataMessage(canvas, 'Error loading chart data. Please try refreshing the page.');
    }
}

// Helper function to show "No data" message on chart canvas
function showNoDataMessage(canvas, message) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a message element
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #6b7280;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        padding: 20px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 10;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-info-circle" style="font-size: 24px; color: #9ca3af; margin-bottom: 8px; display: block;"></i>
        <div>${message}</div>
    `;
    
    // Make sure parent has relative positioning
    if (parent) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === 'static') {
            parent.style.position = 'relative';
        }
        
        // Remove existing message if any
        const existingMessage = parent.querySelector('.no-data-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        messageDiv.className = 'no-data-message';
        parent.appendChild(messageDiv);
    }
}

// Make functions available globally
window.createVisualizations = createVisualizations;
window.createDeliveredVsReceivedChart = createDeliveredVsReceivedChart;
window.createSlaughterYieldChart = createSlaughterYieldChart;

window.createOverallTrendTruckChart = createOverallTrendTruckChart;
window.createHistoricalTrendDateChart = createHistoricalTrendDateChart;
window.extractDateFromFilename = extractDateFromFilename;

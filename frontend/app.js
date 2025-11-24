/**
 * Main application logic for poultry processing dashboard
 * Fully automatic - no user interaction required
 */
    
// API Base URL - can be overridden by environment variable
const API_BASE_URL = window.ENV_API_URL || 'http://localhost:8001';
console.log('API Base URL:', API_BASE_URL);

let currentUploadId = null;
let chartInstances = {};
let currentFilterDays = 7; // Default: 7 days
let isNewFileMode = false; // Track if showing a new file (no aggregation)
let currentDateRange = null; // Track date range filter: { startDate, endDate }

// Initialize Animated Background
function initAnimatedBackground() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = `rgba(0, 212, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Draw connections
        particles.forEach((particle, i) => {
            particles.slice(i + 1).forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    ctx.strokeStyle = `rgba(0, 212, 255, ${0.2 * (1 - distance / 150)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// DOM Elements
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const kpisSection = document.getElementById('kpisSection');
const truckSection = document.getElementById('truckSection');
const visualizations = document.getElementById('visualizations');
const deliveredReceivedSection = document.getElementById('deliveredReceivedSection');

const slaughterYieldSection = document.getElementById('slaughterYieldSection');
const truckAlertsSection = document.getElementById('truckAlertsSection');
const truckTableBody = document.getElementById('truckTableBody'); // May be null if truck table section removed

// Initialize - automatically load data
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');
    initAnimatedBackground();
    initScrollHeader();
    initFilterControls();
    initScrollAnimations(); // Add scroll animations
    await autoLoadDashboard();
});

// Initialize scroll animations for KPI cards and section headers
function initScrollAnimations () {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    const observer = new IntersectionObserver( ( entries ) => {
        entries.forEach( entry => {
            if ( entry.isIntersecting ) {
                // Add animation class when element comes into view
                entry.target.classList.add( 'animate-in' );
                // Stop observing after animation is triggered
                observer.unobserve( entry.target );
            }
        } );
    }, observerOptions );

    // Observe all KPI cards
    const observeKPICards = () => {
        const kpiCards = document.querySelectorAll( '.kpi-card' );
        kpiCards.forEach( card => {
            observer.observe( card );
        } );
    };

    // Observe all section headers
    const observeSectionHeaders = () => {
        const sectionHeaders = document.querySelectorAll( '.section-header' );
        sectionHeaders.forEach( header => {
            observer.observe( header );
        } );
    };

    // Initial observation
    observeKPICards();
    observeSectionHeaders();

    // Re-observe when data is loaded (in case elements are re-rendered)
    window.addEventListener( 'kpi-cards-updated', () => {
        observeKPICards();
        observeSectionHeaders();
    } );
}

// Trigger all dashboard animations manually (called after loading completes)
function triggerDashboardAnimations () {
    console.log( '🎬 Triggering dashboard animations after loading complete' );

    setTimeout( () => {
        // Animate all visible section headers first
        const visibleHeaders = document.querySelectorAll( '.section-header' );
        visibleHeaders.forEach( ( header, index ) => {
            const rect = header.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

            if ( isVisible ) {
                setTimeout( () => {
                    header.classList.add( 'animate-in' );
                }, index * 100 ); // Stagger headers by 100ms
            }
        } );

        // Then animate KPI cards (with delay after headers)
        setTimeout( () => {
            const visibleCards = document.querySelectorAll( '.kpi-card' );
            visibleCards.forEach( ( card, index ) => {
                const rect = card.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

                if ( isVisible ) {
                    card.classList.add( 'animate-in' );
                }
            } );
        }, visibleHeaders.length * 100 + 200 ); // Wait for headers to finish
    }, 100 );
}

// Initialize filter controls
function initFilterControls() {
    const filterDropdown = document.getElementById('filterDropdown');
    
    if (filterDropdown) {
        filterDropdown.addEventListener('change', () => {
            const value = filterDropdown.value;
            
            // Set filter to selected days (7, 15, or 30)
            currentFilterDays = parseInt(value);
            isNewFileMode = false;
            currentDateRange = null;
            
            // Reload data with new filter
            if (currentUploadId) {
                loadAndDisplayData(currentUploadId);
            } else {
                autoLoadDashboard();
            }
        });
    }
}

// Scroll header behavior - only show at top
let lastScrollTop = 0;
let scrollTimeout = null;

function initScrollHeader() {
    const header = document.querySelector('.floating-header');
    if (!header) return;
    
    let isScrolling = false;
    
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Only show header when at the very top (within 10px)
                if (scrollTop < 10) {
                    header.style.transform = 'translateY(0)';
                    header.style.opacity = '1';
                    header.style.pointerEvents = 'auto';
                } else {
                    // Hide header when scrolled down
                    header.style.transform = 'translateY(-100%)';
                    header.style.opacity = '0';
                    header.style.pointerEvents = 'none';
                }
                
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
                isScrolling = false;
            });
            isScrolling = true;
        }
    });
}

async function autoLoadDashboard() {
    try {
        showLoading('Connecting to server...');
        
        // Wait a bit for server to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        showLoading('Fetching latest data...');
        
        // Get the latest processed data (this will auto-process if needed)
        const response = await fetch(`${API_BASE_URL}/latest`);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Latest data response:', data);
        
        if (data.upload_id) {
            showLoading(`Loading data from: ${data.filename || 'file'}...`);
            currentUploadId = data.upload_id;
            
            // Check if this is a new file (uploaded within last hour) - if so, show only that file
            // Otherwise, use default filter (7 days)
            const isNewFile = data.is_new_file || false;
            if (isNewFile) {
                isNewFileMode = true;
                currentFilterDays = 0;
                // Update UI to show "Latest File" as active
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.days === '0') {
                        btn.classList.add('active');
                    }
                });
            } else {
                // Default: 7 days average
                isNewFileMode = false;
                currentFilterDays = 7;
                // Update UI to show "7 Days" as active
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.days === '7') {
                        btn.classList.add('active');
                    }
                });
            }
            
            await loadAndDisplayData(data.upload_id);
            // Note: hideLoading() is now called inside loadAndDisplayData after charts are created
        } else {
            // No data yet - check if server is processing
            showLoading('No data found. Waiting for files to be processed...');
            console.log('No upload_id returned from /latest endpoint. Response:', data);
            
            // Check if there are files in uploads folder
            try {
                const uploadsResponse = await fetch(`${API_BASE_URL}/api/uploads`);
                if (uploadsResponse.ok) {
                    const uploads = await uploadsResponse.json();
                    console.log('Available uploads:', uploads);
                    if (uploads && uploads.length > 0) {
                        // Files exist but may not be processed yet
                        showLoading(`Found ${uploads.length} file(s). Processing may take a moment...`);
                    } else {
                        showLoading('No files found. Please ensure Excel files are in the uploads folder.');
                    }
                }
            } catch (e) {
                console.warn('Could not check uploads:', e);
            }
            
            // Retry after delay
            setTimeout(async () => {
                await autoLoadDashboard();
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError(`Failed to load dashboard: ${error.message}. Please ensure the server is running and Excel files are in the uploads folder.`);
        hideLoading();
    }
}

// Helper function to build API URL with optional days or date range parameter
function buildApiUrl(endpoint, uploadId, days = null, dateRange = null) {
    const baseUrl = `${API_BASE_URL}${endpoint}/${uploadId}`;
    const params = new URLSearchParams();
    
    // Priority: date range > days > no parameter
    if (dateRange && dateRange.startDate && dateRange.endDate) {
        params.append('start_date', dateRange.startDate);
        params.append('end_date', dateRange.endDate);
    } else if (days !== null && days > 0) {
        params.append('days', days);
    }
    // If days is 0 or null and no date range, no parameter = show only that upload
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

async function loadAndDisplayData(uploadId) {
    try {
        let filterInfo = 'Latest File';
        if (currentDateRange && currentDateRange.startDate && currentDateRange.endDate) {
            filterInfo = `${currentDateRange.startDate} to ${currentDateRange.endDate}`;
        } else if (!isNewFileMode && currentFilterDays) {
            filterInfo = `${currentFilterDays} days`;
        }
        console.log(`Loading data for upload ID: ${uploadId}, filter: ${filterInfo}`);
        
        // Show loading and hide error
        showLoading('Loading data...');
        hideError();
        
        // Determine if we should use days parameter or date range
        const daysParam = isNewFileMode ? null : currentFilterDays;
        const dateRangeParam = currentDateRange;
        
        showLoading('Loading KPIs...');
        const summaryResponse = await fetch(buildApiUrl('/summary', uploadId, daysParam, dateRangeParam));
        if (!summaryResponse.ok) {
            const errorData = await summaryResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to load summary: ${summaryResponse.status}`);
        }
        const summary = await summaryResponse.json();
        
        showLoading('Loading truck data...');
        const truckResponse = await fetch(buildApiUrl('/trucks', uploadId, daysParam, dateRangeParam));
        if (!truckResponse.ok) {
            const errorData = await truckResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to load truck data: ${truckResponse.status}`);
        }
        const truckData = await truckResponse.json();
        
        showLoading('Loading farm data...');
        const farmResponse = await fetch(buildApiUrl('/farms', uploadId, daysParam, dateRangeParam));
        if (!farmResponse.ok) {
            const errorData = await farmResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to load farm data: ${farmResponse.status}`);
        }
        const farmData = await farmResponse.json();
        
        showLoading('Loading raw data...');
        const dataResponse = await fetch(`${API_BASE_URL}/data/${uploadId}`);
        if (!dataResponse.ok) {
            const errorData = await dataResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to load raw data: ${dataResponse.status}`);
        }
        const data = await dataResponse.json();
        
        showLoading('Loading overall summary...');
        const overallSummaryResponse = await fetch(buildApiUrl('/overall-summary', uploadId, daysParam, dateRangeParam));
        let overallSummary = null;
        if (overallSummaryResponse.ok) {
            try {
                overallSummary = await overallSummaryResponse.json();
                console.log('✅ Overall Summary loaded:', overallSummary);
            } catch (e) {
                console.error('❌ Error parsing overall summary response:', e);
            }
        } else {
            const errorText = await overallSummaryResponse.text().catch(() => 'Unknown error');
            console.error('❌ Failed to load overall summary:', overallSummaryResponse.status, errorText);
        }
        
        showLoading('Loading delivered vs received...');
        const deliveredVsReceivedResponse = await fetch(buildApiUrl('/delivered-vs-received', uploadId, daysParam, dateRangeParam));
        let deliveredVsReceived = null;
        if (deliveredVsReceivedResponse.ok) {
            try {
                deliveredVsReceived = await deliveredVsReceivedResponse.json();
                console.log('✅ Delivered vs Received loaded:', deliveredVsReceived);
            } catch (e) {
                console.error('Error parsing delivered vs received response:', e);
            }
        } else {
            console.warn('⚠️ Failed to load delivered vs received:', deliveredVsReceivedResponse.status);
        }
        
        showLoading('Loading slaughter yield...');
        const slaughterYieldResponse = await fetch(buildApiUrl('/slaughter-yield', uploadId, daysParam, dateRangeParam));
        const slaughterYield = slaughterYieldResponse.ok ? await slaughterYieldResponse.json() : null;
        
        showLoading('Loading truck alerts...');
        const truckAlertsResponse = await fetch(buildApiUrl('/truck-alerts', uploadId, daysParam, dateRangeParam));
        const truckAlerts = truckAlertsResponse.ok ? await truckAlertsResponse.json() : null;
        
        showLoading('Loading historical trends...');
        const historicalTrendsResponse = await fetch(`${API_BASE_URL}/historical-trends/${uploadId}`);
        const historicalTrends = historicalTrendsResponse.ok ? await historicalTrendsResponse.json() : null;
        
        // Display KPIs (new 8 KPIs)
        displayKPIs(overallSummary, summary, data, truckAlerts);
        
        // Display truck alerts table (last table)
        if (truckAlerts) {
            displayTruckAlertsTable(truckAlerts.trucks || []);
        }
        
        // Show all sections first (with null checks) - FORCE VISIBILITY
        console.log('Showing all dashboard sections...');
        
        if (kpisSection) {
            kpisSection.style.display = 'block';
            kpisSection.style.visibility = 'visible';
            kpisSection.style.opacity = '1';
            console.log('✅ KPIs section shown');
        } else {
            console.warn('⚠️ KPIs section not found!');
        }
        
        if (visualizations) {
            visualizations.style.display = 'block';
            visualizations.style.visibility = 'visible';
            visualizations.style.opacity = '1';
            console.log('✅ Visualizations section shown');
        } else {
            console.warn('⚠️ Visualizations section not found!');
        }
        
        if (deliveredReceivedSection) {
            deliveredReceivedSection.style.display = 'block';
            deliveredReceivedSection.style.visibility = 'visible';
            deliveredReceivedSection.style.opacity = '1';
            console.log('✅ Delivered vs Received section shown');
        } else {
            console.warn('⚠️ Delivered vs Received section not found!');
        }
        

        
        if (slaughterYieldSection) {
            slaughterYieldSection.style.display = 'block';
            slaughterYieldSection.style.visibility = 'visible';
            slaughterYieldSection.style.opacity = '1';
            console.log('✅ Slaughter Yield section shown');
        } else {
            console.warn('⚠️ Slaughter Yield section not found!');
        }
        
        if (truckAlertsSection) {
            truckAlertsSection.style.display = 'block';
            truckAlertsSection.style.visibility = 'visible';
            truckAlertsSection.style.opacity = '1';
            console.log('✅ Truck Alerts section shown');
        } else {
            console.warn('⚠️ Truck Alerts section not found!');
        }
        
        // Also show the new trend sections
        const truckTrendSection = document.getElementById('truckTrendSection');
        if (truckTrendSection) {
            truckTrendSection.style.display = 'block';
            truckTrendSection.style.visibility = 'visible';
            truckTrendSection.style.opacity = '1';
            console.log('✅ Truck Trend section shown');
        }
        
        const historicalDateTrendSection = document.getElementById('historicalDateTrendSection');
        if (historicalDateTrendSection) {
            historicalDateTrendSection.style.display = 'block';
            historicalDateTrendSection.style.visibility = 'visible';
            historicalDateTrendSection.style.opacity = '1';
            console.log('✅ Historical Date Trend section shown');
        }
        
        // Wait a moment for sections to be visible, then create charts
        setTimeout(() => {
            console.log('=== Preparing to create charts ===');
            console.log('Visualizations section visible:', visualizations?.style?.display);
            console.log('Chart.js loaded:', typeof Chart !== 'undefined');
            console.log('Chart.js version:', typeof Chart !== 'undefined' ? Chart.version : 'NOT LOADED');
            console.log('createVisualizations function:', typeof createVisualizations);
            
            // Test if canvas elements exist
            const testCanvas = document.getElementById('overallChart');
            console.log('overallChart canvas exists:', !!testCanvas);
            if (testCanvas) {
                console.log('Canvas dimensions:', testCanvas.width, 'x', testCanvas.height);
                console.log('Canvas parent:', testCanvas.parentElement?.className);
            }
            
            // Ensure visualizations section is visible
            if (visualizations) {
                visualizations.style.display = 'block';
                visualizations.style.visibility = 'visible';
                visualizations.style.opacity = '1';
            }
            
            // Create charts directly - no test chart needed
            if (typeof Chart !== 'undefined') {
                // Ensure window.dashboardApp exists for chart tracking
                if (!window.dashboardApp) {
                    window.dashboardApp = { chartInstances: {} };
                }
                if (!window.dashboardApp.chartInstances) {
                    window.dashboardApp.chartInstances = {};
                }
                
                // Destroy any existing charts on all canvas elements
                const allCanvases = document.querySelectorAll('canvas');
                allCanvases.forEach(canvas => {
                    try {
                        const existingChart = Chart.getChart(canvas);
                        if (existingChart) {
                            console.log(`Destroying existing chart on ${canvas.id} canvas`);
                            existingChart.destroy();
                        }
                    } catch (e) {
                        console.warn(`Error checking/destroying chart on ${canvas.id}:`, e);
                    }
                });
                
                // Create real charts immediately
                console.log('Creating real charts...');
                createRealCharts();
            } else {
                console.error('Chart.js is not loaded!');
            }
            
            function createRealCharts() {
                // Create visualizations - ensure charts.js is loaded
                if (typeof createVisualizations === 'function') {
                    console.log('Calling createVisualizations with data...');
                    console.log('Summary:', summary);
                    console.log('Trucks:', truckData.trucks?.length || 0);
                    console.log('Farms:', farmData.farms?.length || 0);
                    console.log('Overall Summary:', overallSummary);
                    createVisualizations(truckData.trucks || [], farmData.farms || [], summary, overallSummary, deliveredVsReceived);
                    
                    // Create overall chart with farm data (line chart)
                    if (typeof createOverallChart === 'function') {
                        setTimeout(() => {
                            console.log('Creating overall chart with farm data...');
                            console.log('Delivered vs Received:', deliveredVsReceived);
                            console.log('Farm data available:', farmData.farms?.length || 0);
                            // Pass both deliveredVsReceived and farms as fallback
                            createOverallChart(summary, overallSummary, deliveredVsReceived, farmData.farms || []);
                        }, 200);
                    }
                    
                    // Create new charts
                    if (deliveredVsReceived && typeof createDeliveredVsReceivedChart === 'function') {
                        setTimeout(() => {
                            createDeliveredVsReceivedChart(deliveredVsReceived.data || []);
                        }, 100);
                    }
                    
                    if (slaughterYield && typeof createSlaughterYieldChart === 'function') {
                        setTimeout(() => {
                            createSlaughterYieldChart(slaughterYield.data || []);
                        }, 200);
                    }
                } else {
                    console.error('createVisualizations function not found. Make sure charts.js is loaded.');
                    // Check if charts.js script exists
                    const chartsScript = Array.from(document.scripts).find(s => s.src.includes('charts.js'));
                    if (!chartsScript) {
                        console.error('charts.js script tag not found in HTML!');
                    }
                    // Try to load it manually
                    const script = document.createElement('script');
                    script.src = '/static/charts.js';
                    script.onload = () => {
                        console.log('charts.js loaded manually');
                        if (typeof createVisualizations === 'function') {
                            createVisualizations(truckData.trucks || [], farmData.farms || [], summary);
                        }
                    };
                    script.onerror = () => {
                        console.error('Failed to load charts.js');
                    };
                    document.head.appendChild(script);
                }
                

                
                if (truckData.trucks && typeof createOverallTrendTruckChart === 'function') {
                    setTimeout(() => {
                        createOverallTrendTruckChart(truckData.trucks || []);
                    }, 350);
                }
                
                // Create historical trend by date chart (async - wait for it to complete)
                if (typeof createHistoricalTrendDateChart === 'function') {
                    setTimeout(async () => {
                        try {
                            await createHistoricalTrendDateChart();
                        } catch (error) {
                            console.error('Error creating historical trend chart:', error);
                        } finally {
                            // Hide loading after all charts are created
                            hideLoading();
                            console.log('✅ All charts created, loading hidden');
                            // Trigger animations after loading is complete
                            triggerDashboardAnimations();
                        }
                    }, 400);
                } else {
                    // If historical chart function doesn't exist, hide loading after a delay
                    setTimeout(() => {
                        hideLoading();
                        console.log('✅ All charts created, loading hidden');
                        // Trigger animations after loading is complete
                        triggerDashboardAnimations();
                    }, 1000);
                }
                
                // Fallback: Hide loading after maximum 5 seconds in case something goes wrong
                setTimeout(() => {
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl && loadingEl.style.display !== 'none') {
                        console.log('⚠️ Loading still visible after 5 seconds, forcing hide...');
                        hideLoading();
                        console.log('⚠️ Loading hidden by fallback timeout');
                        // Trigger animations even in fallback case
                        triggerDashboardAnimations();
                    } else {
                        console.log('✅ Loading already hidden, fallback not needed');
                    }
                }, 5000);
            }
        }, 500);
        
        // Force show all sections again (in case they got hidden)
        const allSections = [
            'kpisSection',
            'visualizations',
            'deliveredReceivedSection',

            'truckTrendSection',
            'historicalDateTrendSection',
            'slaughterYieldSection',
            'truckAlertsSection'
        ];
        
        allSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                section.style.visibility = 'visible';
                section.style.opacity = '1';
                console.log(`✅ Force shown: ${sectionId}`);
            } else {
                console.warn(`⚠️ Section not found: ${sectionId}`);
            }
        });
        
        console.log('Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoading();
        showError(`Failed to load dashboard: ${error.message}. Please try again.`);
        // Still show sections even if there's an error
        if (kpisSection) kpisSection.style.display = 'block';
        if (visualizations) visualizations.style.display = 'block';
        throw error;
    }
}

function displayKPIs(overallSummary, summary, data = null, truckAlerts = null) {
    // Format numbers with commas
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
    const formatPercent = (num) => (num || 0).toFixed(2) + '%';
    
    console.log('📊 displayKPIs called with:', {
        hasOverallSummary: !!overallSummary,
        overallSummary: overallSummary,
        hasSummary: !!summary,
        hasData: !!data
    });
    
    if (overallSummary) {
        // Display new 8 KPIs with null checks
        const totalDeliveredEl = document.getElementById('totalDelivered');
        if (totalDeliveredEl) totalDeliveredEl.textContent = formatNumber(overallSummary.total_delivered);
        
        const totalBirdsCountedEl = document.getElementById('totalBirdsCounted');
        if (totalBirdsCountedEl) totalBirdsCountedEl.textContent = formatNumber(overallSummary.total_birds_counted);
        
        const netDifferenceEl = document.getElementById('netDifference');
        if (netDifferenceEl) netDifferenceEl.textContent = formatNumber(overallSummary.net_difference);
        
        const totalDOAEl = document.getElementById('totalDOA');
        if (totalDOAEl) totalDOAEl.textContent = formatNumber(overallSummary.total_doa);
        
        const doaPercentageEl = document.getElementById('doaPercentage');
        if (doaPercentageEl) doaPercentageEl.textContent = formatPercent(overallSummary.doa_percentage);
        
        const totalSlaughterEl = document.getElementById('totalSlaughter');
        if (totalSlaughterEl) totalSlaughterEl.textContent = formatNumber(overallSummary.total_slaughter);
        
        const slaughterYieldPercentageEl = document.getElementById('slaughterYieldPercentage');
        if (slaughterYieldPercentageEl) slaughterYieldPercentageEl.textContent = formatPercent(overallSummary.slaughter_yield_percentage);
        
        // Display Total Non-Halal (calculate from truck alerts data)
        const totalNonHalalEl = document.getElementById('totalNonHalal');
        if (totalNonHalalEl) {
            let totalNonHalal = 0;
            // Calculate from truck alerts data which has the non_halal field
            if (truckAlerts && truckAlerts.trucks) {
                truckAlerts.trucks.forEach(truck => {
                    totalNonHalal += (truck.non_halal || 0);
                });
            }
            totalNonHalalEl.textContent = formatNumber(totalNonHalal);
        }


        
        // Color code Net Difference (green if positive, red if negative)
        const netDiffCard = document.getElementById('netDifferenceCard');
        if (netDiffCard) {
            if (overallSummary.net_difference > 0) {
                netDiffCard.className = 'kpi-card kpi-success';
            } else if (overallSummary.net_difference < 0) {
                netDiffCard.className = 'kpi-card kpi-danger';
            } else {
                netDiffCard.className = 'kpi-card kpi-info';
            }
        }
        
        // Color code DOA % (red if > 5%)
        const doaPctCard = document.getElementById('doaPercentageCard');
        if (doaPctCard) {
            if (overallSummary.doa_percentage > 5) {
                doaPctCard.className = 'kpi-card kpi-danger';
            } else {
                doaPctCard.className = 'kpi-card kpi-warning';
            }
        }
        
        // Color code Slaughter Yield % (green if high, warning if low)
        const yieldCard = document.getElementById('slaughterYieldCard');
        if (yieldCard) {
            if (overallSummary.slaughter_yield_percentage >= 80) {
                yieldCard.className = 'kpi-card kpi-success';
            } else if (overallSummary.slaughter_yield_percentage >= 70) {
                yieldCard.className = 'kpi-card kpi-warning';
            } else {
                yieldCard.className = 'kpi-card kpi-danger';
            }
        }
    } else if (summary && summary.grand_total) {
        // Fallback to old KPIs if overall summary not available
        console.log('⚠️ Using fallback KPIs from summary.grand_total');
        const grandTotal = summary.grand_total;
        
        const totalDeliveredEl = document.getElementById('totalDelivered');
        if (totalDeliveredEl) totalDeliveredEl.textContent = formatNumber(grandTotal.total_birds_arrived || 0);
        
        const totalBirdsCountedEl = document.getElementById('totalBirdsCounted');
        if (totalBirdsCountedEl) totalBirdsCountedEl.textContent = formatNumber((grandTotal.total_bird_counter || 0) + (grandTotal.total_doa || 0));
        
        const netDifferenceEl = document.getElementById('netDifference');
        if (netDifferenceEl) {
            const counted = (grandTotal.total_bird_counter || 0) + (grandTotal.total_doa || 0);
            const delivered = grandTotal.total_birds_arrived || 0;
            netDifferenceEl.textContent = formatNumber(counted - delivered);
        }
        
        const totalDOAEl = document.getElementById('totalDOA');
        if (totalDOAEl) totalDOAEl.textContent = formatNumber(grandTotal.total_doa || 0);
        
        const doaPercentageEl = document.getElementById('doaPercentage');
        if (doaPercentageEl) {
            const counted = (grandTotal.total_bird_counter || 0) + (grandTotal.total_doa || 0);
            const doaPct = counted > 0 ? ((grandTotal.total_doa || 0) / counted * 100) : 0;
            doaPercentageEl.textContent = formatPercent(doaPct);
        }
        
        const totalSlaughterEl = document.getElementById('totalSlaughter');
        if (totalSlaughterEl) totalSlaughterEl.textContent = formatNumber(grandTotal.total_birds_slaughtered || 0);
        
        const slaughterYieldPercentageEl = document.getElementById('slaughterYieldPercentage');
        if (slaughterYieldPercentageEl) {
            const counted = (grandTotal.total_bird_counter || 0) + (grandTotal.total_doa || 0);
            const yieldPct = counted > 0 ? ((grandTotal.total_birds_slaughtered || 0) / counted * 100) : 0;
            slaughterYieldPercentageEl.textContent = formatPercent(yieldPct);
        }
        
        const totalNonHalalEl = document.getElementById('totalNonHalal');
        if (totalNonHalalEl) {
            let totalNonHalal = 0;
            // Calculate from truck alerts data which has the non_halal field
            if (truckAlerts && truckAlerts.trucks) {
                truckAlerts.trucks.forEach(truck => {
                    totalNonHalal += (truck.non_halal || 0);
                });
            }
            totalNonHalalEl.textContent = formatNumber(totalNonHalal);
        }
    }

    // Trigger scroll animation observation for KPI cards
    setTimeout( () => {
        window.dispatchEvent( new Event( 'kpi-cards-updated' ) );
    }, 100 );
}

function updateTrendIndicator(elementId, value, threshold, type) {
    const trendEl = document.getElementById(elementId);
    if (!trendEl) return;
    
    let icon = '';
    
    if (type === 'lower is better') {
        if (value <= threshold) {
            icon = '<i class="fas fa-arrow-down" style="color: #107C10;"></i>';
        } else {
            icon = '<i class="fas fa-arrow-up" style="color: #E81123;"></i>';
        }
    } else if (type === 'closer to 0 is better') {
        if (Math.abs(value) <= threshold) {
            icon = '<i class="fas fa-check-circle" style="color: #107C10;"></i>';
        } else {
            icon = '<i class="fas fa-exclamation-circle" style="color: #FF8C00;"></i>';
        }
    }
    
    trendEl.innerHTML = icon;
}

function displayTruckTable(trucks, rawData, farms) {
    // Truck table section was removed, so this function is no longer used
    // Return immediately to prevent any errors
    return;
    
    // The code below is unreachable but kept for reference
    if (!truckTableBody) return;
    
    truckTableBody.innerHTML = '';
    
    if (!trucks || trucks.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="10" style="text-align: center; padding: 40px; color: #605E5C;">No truck data available</td>';
        if (truckTableBody) truckTableBody.appendChild(tr);
        return;
    }
    
    // Create a map of truck to farms
    const truckFarmMap = {};
    rawData.forEach(row => {
        if (row.truck_no && row.farm) {
            if (!truckFarmMap[row.truck_no]) {
                truckFarmMap[row.truck_no] = new Set();
            }
            truckFarmMap[row.truck_no].add(row.farm);
        }
    });
    
    // Create a map of farm performance
    const farmPerfMap = {};
    farms.forEach(farm => {
        farmPerfMap[farm.farm] = farm;
    });
    
    trucks.forEach(truck => {
        const tr = document.createElement('tr');
        
        const farmsForTruck = truckFarmMap[truck.truck_no] || new Set();
        const farmPerformance = Array.from(farmsForTruck).map(farmName => {
            const perf = farmPerfMap[farmName];
            if (perf) {
                return `${farmName}: ${perf.variance_percentage.toFixed(2)}%`;
            }
            return farmName;
        }).join(', ') || 'N/A';
        
        const truckPerformance = `${truck.variance_percentage.toFixed(2)}%`;
        
        const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
        const formatPercent = (num) => (num || 0).toFixed(2) + '%';
        
        // Color coding for variance
        let varianceColor = '#605E5C';
        let varianceIcon = '';
        if (truck.variance_percentage > 0) {
            varianceColor = '#107C10';
            varianceIcon = '<i class="fas fa-arrow-up"></i> ';
        } else if (truck.variance_percentage < 0) {
            varianceColor = '#E81123';
            varianceIcon = '<i class="fas fa-arrow-down"></i> ';
        } else {
            varianceIcon = '<i class="fas fa-equals"></i> ';
        }
        
        tr.innerHTML = `
            <td><strong>${truck.serial_numbers || 'N/A'}</strong></td>
            <td><strong>${truck.truck_no}</strong></td>
            <td>${formatNumber(truck.total_birds_arrived)}</td>
            <td>${formatNumber(truck.total_birds_slaughtered)}</td>
            <td><span style="color: #E81123; font-weight: 600;">${formatNumber(truck.total_doa)}</span></td>
            <td>${farmPerformance}</td>
            <td>${truckPerformance}</td>
            <td style="color: ${varianceColor}; font-weight: 600;">
                ${varianceIcon}${formatPercent(truck.variance_percentage)}
            </td>
            <td><span style="color: #E81123; font-weight: 600;">${formatPercent(truck.death_percentage)}</span></td>
            <td><span style="color: #FF8C00; font-weight: 600;">${formatPercent(truck.missing_birds_percentage)}</span></td>
        `;
        
        if (truckTableBody) {
            truckTableBody.appendChild(tr);
        }
    });
}

function showLoading(text) {
    if (loading) {
        loading.style.display = 'block';
    }
    if (loadingText) {
        loadingText.textContent = text || 'Loading...';
    }
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

function hideLoading() {
    if (loading) {
        loading.style.display = 'none';
        loading.style.visibility = 'hidden';
        loading.style.opacity = '0';
    }
    // Also try to find by ID in case the reference is stale
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
        loadingEl.style.visibility = 'hidden';
        loadingEl.style.opacity = '0';
    }
    console.log('hideLoading() called - loading element hidden');
}

function showError(message) {
    if (errorMessage) {
        errorMessage.style.display = 'block';
    }
    if (errorText) {
        errorText.textContent = message;
    }
    if (loading) {
        loading.style.display = 'none';
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// Display Delivered vs Received Table
function displayDeliveredVsReceivedTable(data) {
    const tbody = document.getElementById('deliveredReceivedTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align: center; padding: 40px; color: #605E5C;">No data available</td>';
        tbody.appendChild(tr);
        return;
    }
    
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
    
    data.forEach(item => {
        const tr = document.createElement('tr');
        const diff = item.difference || 0;
        const diffClass = diff < 0 ? 'text-danger' : diff > 0 ? 'text-success' : '';
        
        tr.innerHTML = `
            <td>${item.farm || 'Unknown'}</td>
            <td>${formatNumber(item.total_do_quantity)}</td>
            <td>${formatNumber(item.total_received)}</td>
            <td class="${diffClass}">${formatNumber(diff)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Display Slaughter Yield Table
function displaySlaughterYieldTable(data) {
    const tbody = document.getElementById('slaughterYieldTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align: center; padding: 40px; color: #605E5C;">No data available</td>';
        tbody.appendChild(tr);
        return;
    }
    
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
    const formatPercent = (num) => (num || 0).toFixed(2) + '%';
    
    data.forEach(item => {
        const tr = document.createElement('tr');
        const yieldPct = item.slaughter_yield_percentage || 0;
        let rowClass = '';
        if (yieldPct < 70) {
            rowClass = 'low-yield';
        } else if (yieldPct < 80) {
            rowClass = 'medium-yield';
        }
        
        tr.className = rowClass;
        tr.innerHTML = `
            <td>${item.farm || 'Unknown'}</td>
            <td class="${yieldPct < 80 ? 'text-danger' : ''}">${formatPercent(yieldPct)}</td>
            <td>${formatNumber(item.total_slaughter)}</td>
            <td>${formatNumber(item.total_counter_plus_doa)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Display Truck Alerts Table
function displayTruckAlertsTable(data) {
    const tbody = document.getElementById('truckAlertsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="12" style="text-align: center; padding: 40px; color: #605E5C;">No data available</td>';
        tbody.appendChild(tr);
        return;
    }
    
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
    const formatPercent = (num) => (num || 0).toFixed(2) + '%';
    
    data.forEach(item => {
        const tr = document.createElement('tr');
        const status = item.status || 'OK';
        const statusClass = status === 'ALERT' ? 'alert-row' : '';
        const diff = item.difference || 0;
        const diffClass = diff < 0 ? 'text-danger' : diff > 0 ? 'text-success' : '';
        
        tr.className = statusClass;
        tr.innerHTML = `
            <td>${item.truck || 'Unknown'}</td>
            <td>${item.do_number || ''}</td>
            <td>${item.farm || 'Unknown'}</td>
            <td>${formatNumber(item.do_quantity)}</td>
            <td>${formatNumber(item.counter)}</td>
            <td>${formatNumber(item.slaughtered)}</td>
            <td>${formatNumber(item.doa)}</td>
            <td>${formatNumber(item.non_halal)}</td>
            <td>${formatNumber(item.counter_plus_doa)}</td>
            <td class="${diffClass}">${formatNumber(diff)}</td>
            <td>${formatPercent(item.yield_percentage)}</td>
            <td class="${status === 'ALERT' ? 'status-alert' : 'status-ok'}">
                ${status === 'ALERT' ? '<i class="fas fa-exclamation-triangle"></i> ALERT' : '<i class="fas fa-check-circle"></i> OK'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Extract date from filename (format: date-month-year.xlsx)
function extractDateFromFilename(filename) {
    if (!filename) return null;
    // Remove .xlsx extension
    const nameWithoutExt = filename.replace(/\.xlsx?$/i, '');
    // Try to parse date-month-year format
    const parts = nameWithoutExt.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    return null;
}

// Historical Data Modal
let historicalChartInstance = null;
document.addEventListener('DOMContentLoaded', () => {
    const viewHistoricalBtn = document.getElementById('viewHistoricalBtn');
    const closeHistoricalModal = document.getElementById('closeHistoricalModal');
    const historicalModal = document.getElementById('historicalModal');
    const applyHistoricalFilter = document.getElementById('applyHistoricalFilter');
    
    if (viewHistoricalBtn) {
        viewHistoricalBtn.addEventListener('click', async () => {
            historicalModal.style.display = 'block';
            await loadHistoricalData();
        });
    }
    
    if (closeHistoricalModal) {
        closeHistoricalModal.addEventListener('click', () => {
            historicalModal.style.display = 'none';
        });
    }
    
    if (applyHistoricalFilter) {
        applyHistoricalFilter.addEventListener('click', async () => {
            await loadHistoricalData();
        });
    }
    
    // Filter buttons for difference trend
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            // Reload difference trend chart with new filter
            if (currentUploadId) {
                fetch(`${API_BASE_URL}/historical-trends/${currentUploadId}`)
                    .then(res => res.json())
                    .then(data => {
                        createDifferenceTrendChart(data.trends || [], filter);
                    });
            }
        });
    });
});

async function loadHistoricalData() {
    const farmFilter = document.getElementById('farmFilter')?.value || '';
    const doFilter = document.getElementById('doFilter')?.value || '';
    
    let url = `${API_BASE_URL}/historical-trends`;
    const params = new URLSearchParams();
    if (farmFilter) params.append('farm', farmFilter);
    if (doFilter) params.append('do_number', doFilter);
    if (params.toString()) url += '?' + params.toString();
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Populate filter dropdowns
        const farms = [...new Set(data.trends.map(t => t.farm).filter(f => f))];
        const dos = [...new Set(data.trends.map(t => t.do_number).filter(d => d))];
        
        const farmSelect = document.getElementById('farmFilter');
        const doSelect = document.getElementById('doFilter');
        
        if (farmSelect) {
            const currentValue = farmSelect.value;
            farmSelect.innerHTML = '<option value="">All Farms</option>';
            farms.forEach(farm => {
                const option = document.createElement('option');
                option.value = farm;
                option.textContent = farm;
                if (farm === currentValue) option.selected = true;
                farmSelect.appendChild(option);
            });
        }
        
        if (doSelect) {
            const currentValue = doSelect.value;
            doSelect.innerHTML = '<option value="">All D/O Numbers</option>';
            dos.forEach(doNum => {
                const option = document.createElement('option');
                option.value = doNum;
                option.textContent = doNum;
                if (doNum === currentValue) option.selected = true;
                doSelect.appendChild(option);
            });
        }
        
        // Create historical chart
        const ctx = document.getElementById('historicalTrendChart');
        if (ctx && data.trends && data.trends.length > 0) {
            if (historicalChartInstance) {
                historicalChartInstance.destroy();
            }
            
            // Group by date
            const dateGroups = {};
            data.trends.forEach(trend => {
                const date = new Date(trend.upload_date).toLocaleDateString();
                if (!dateGroups[date]) {
                    dateGroups[date] = [];
                }
                dateGroups[date].push(trend.difference || 0);
            });
            
            const labels = Object.keys(dateGroups).sort();
            const avgDifferences = labels.map(date => {
                const diffs = dateGroups[date];
                return diffs.reduce((a, b) => a + b, 0) / diffs.length;
            });
            
            historicalChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Average Difference',
                        data: avgDifferences,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Difference'
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

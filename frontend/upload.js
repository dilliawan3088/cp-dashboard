/**
 * Upload page JavaScript - handles file validation and upload
 */

// API Base URL
const API_BASE_URL = window.ENV_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8001' 
    : window.location.origin);

console.log('Upload page - API Base URL:', API_BASE_URL);

// Global variables
let selectedFile = null;
let validationResult = null;

// DOM Elements - will be initialized in DOMContentLoaded
let uploadArea;
let fileInput;
let browseButton;
let selectedFileDiv;
let fileNameSpan;
let fileSizeSpan;
let removeFileBtn;
let validationStatus;
let validationIcon;
let validationMessage;
let validationDetails;
let errorContainer;
let errorList;
let uploadSubmitBtn;
let downloadFormatBtn;
let loadingOverlay;
let loadingText;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Upload page DOMContentLoaded');
    
    // Initialize DOM elements
    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('fileInput');
    browseButton = document.getElementById('browseButton');
    selectedFileDiv = document.getElementById('selectedFile');
    fileNameSpan = document.getElementById('fileName');
    fileSizeSpan = document.getElementById('fileSize');
    removeFileBtn = document.getElementById('removeFileBtn');
    validationStatus = document.getElementById('validationStatus');
    validationIcon = document.getElementById('validationIcon');
    validationMessage = document.getElementById('validationMessage');
    validationDetails = document.getElementById('validationDetails');
    errorContainer = document.getElementById('errorContainer');
    errorList = document.getElementById('errorList');
    uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
    downloadFormatBtn = document.getElementById('downloadFormatBtn');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingText = document.getElementById('loadingText');
    
    console.log('Elements found:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        browseButton: !!browseButton,
        downloadFormatBtn: !!downloadFormatBtn
    });
    
    initUploadArea();
    initFileInput();
    initButtons();
    
    console.log('Upload page initialized');
});

// Initialize upload area (drag & drop)
function initUploadArea() {
    if (!uploadArea) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    uploadArea.classList.add('drag-over');
}

function unhighlight(e) {
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

// Initialize file input
function initFileInput() {
    if (!fileInput) {
        console.error('fileInput element not found');
        return;
    }

    console.log('Initializing file input');
    fileInput.addEventListener('change', (e) => {
        console.log('File input changed', e.target.files);
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// Initialize buttons
function initButtons() {
    if (browseButton && fileInput) {
        browseButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Browse button clicked');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('fileInput not found');
            }
        });
    } else {
        console.error('Browse button or fileInput not found', { browseButton, fileInput });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            clearFile();
        });
    }

    if (uploadSubmitBtn) {
        uploadSubmitBtn.addEventListener('click', () => {
            handleUpload();
        });
    }

    if (downloadFormatBtn) {
        downloadFormatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Download format button clicked');
            downloadFormatTemplate();
        });
    } else {
        console.error('Download format button not found');
    }
}

// Handle file selection
async function handleFileSelect(file) {
    selectedFile = file;
    displaySelectedFile(file);
    hideValidationStatus();
    hideErrorContainer();
    disableUploadButton();

    // Validate file format
    await validateFile(file);
}

// Display selected file info
function displaySelectedFile(file) {
    if (!selectedFileDiv || !fileNameSpan || !fileSizeSpan) return;

    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = formatFileSize(file.size);
    selectedFileDiv.style.display = 'block';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Clear selected file
function clearFile() {
    selectedFile = null;
    validationResult = null;
    if (fileInput) fileInput.value = '';
    if (selectedFileDiv) selectedFileDiv.style.display = 'none';
    hideValidationStatus();
    hideErrorContainer();
    disableUploadButton();
}

// Validate file format
async function validateFile(file) {
    showLoading('Validating file format...');

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Call validation endpoint
        const response = await fetch(`${API_BASE_URL}/validate-file-format`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Validation failed: ${response.status}`);
        }

        const result = await response.json();
        validationResult = result;

        // Display validation results
        displayValidationResult(result);

    } catch (error) {
        console.error('Validation error:', error);
        showValidationError(['Failed to validate file: ' + error.message]);
    } finally {
        hideLoading();
    }
}

// Display validation result
function displayValidationResult(result) {
    if (!validationStatus || !validationIcon || !validationMessage || !validationDetails) return;

    if (result.valid) {
        // Show success
        validationStatus.className = 'validation-status valid';
        validationIcon.className = 'fas fa-check-circle validation-icon';
        validationMessage.textContent = 'File format is valid!';
        
        // Show found headers
        let detailsHtml = '<strong>Found Headers:</strong><br>';
        result.headers_found.forEach((header, index) => {
            detailsHtml += `${index + 1}. ${header}<br>`;
        });
        validationDetails.innerHTML = detailsHtml;

        validationStatus.style.display = 'block';
        hideErrorContainer();
        enableUploadButton();
    } else {
        // Show errors
        showValidationError(result.errors || ['File format validation failed']);
        
        // Show expected vs found headers
        if (result.headers_found && result.headers_found.length > 0) {
            let detailsHtml = '<strong>Found Headers:</strong><br>';
            result.headers_found.forEach((header, index) => {
                detailsHtml += `${index + 1}. ${header}<br>`;
            });
            detailsHtml += '<br><strong>Expected Headers:</strong><br>';
            result.headers_expected.forEach((header, index) => {
                detailsHtml += `${index + 1}. ${header}<br>`;
            });
            validationDetails.innerHTML = detailsHtml;
        }
    }
}

// Show validation error
function showValidationError(errors) {
    if (!errorContainer || !errorList) return;

    errorList.innerHTML = '';
    errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        errorList.appendChild(li);
    });

    errorContainer.style.display = 'block';

    // Also show in validation status
    if (validationStatus && validationIcon && validationMessage) {
        validationStatus.className = 'validation-status invalid';
        validationIcon.className = 'fas fa-times-circle validation-icon';
        validationMessage.textContent = 'File format validation failed';
        validationStatus.style.display = 'block';
    }

    disableUploadButton();
}

// Hide validation status
function hideValidationStatus() {
    if (validationStatus) {
        validationStatus.style.display = 'none';
    }
}

// Hide error container
function hideErrorContainer() {
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

// Enable upload button
function enableUploadButton() {
    if (uploadSubmitBtn) {
        uploadSubmitBtn.disabled = false;
    }
}

// Disable upload button
function disableUploadButton() {
    if (uploadSubmitBtn) {
        uploadSubmitBtn.disabled = true;
    }
}

// Handle file upload
async function handleUpload() {
    if (!selectedFile || !validationResult || !validationResult.valid) {
        alert('Please select a valid file first.');
        return;
    }

    showLoading('Uploading and processing file...');

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Upload file
        const response = await fetch(`${API_BASE_URL}/upload-file`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Upload failed: ${response.status}`);
        }

        const result = await response.json();

        // Show success message
        showLoading('File uploaded successfully! Redirecting to dashboard...');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);

    } catch (error) {
        console.error('Upload error:', error);
        hideLoading();
        alert('Failed to upload file: ' + error.message);
    }
}

// Download format template
function downloadFormatTemplate() {
    console.log('downloadFormatTemplate called, API_BASE_URL:', API_BASE_URL);
    
    if (downloadFormatBtn) {
        downloadFormatBtn.disabled = true;
        const originalHTML = downloadFormatBtn.innerHTML;
        downloadFormatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    }

    try {
        // Use fetch to download the file
        fetch(`${API_BASE_URL}/download-format`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'sample_format.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                // Reset button
                if (downloadFormatBtn) {
                    downloadFormatBtn.disabled = false;
                    downloadFormatBtn.innerHTML = '<i class="fas fa-download"></i> Download Format Template';
                }
            })
            .catch(error => {
                console.error('Error downloading format:', error);
                alert('Failed to download format template: ' + error.message);
                // Reset button
                if (downloadFormatBtn) {
                    downloadFormatBtn.disabled = false;
                    downloadFormatBtn.innerHTML = '<i class="fas fa-download"></i> Download Format Template';
                }
            });
    } catch (error) {
        console.error('Error in downloadFormatTemplate:', error);
        alert('Failed to download format template: ' + error.message);
        // Reset button
        if (downloadFormatBtn) {
            downloadFormatBtn.disabled = false;
            downloadFormatBtn.innerHTML = '<i class="fas fa-download"></i> Download Format Template';
        }
    }
}

// Show loading overlay
function showLoading(message) {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    if (loadingText) {
        loadingText.textContent = message || 'Processing...';
    }
}

// Hide loading overlay
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}


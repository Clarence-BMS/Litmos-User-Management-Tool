/**
 * Main JavaScript file for shared functionality across the application
 */

// Function to detect backend URL
function getBackendUrl() {
    // Default to same host if we're running on the same server
    return window.location.origin;
}

// Function to show loading spinner
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

// Function to hide loading spinner
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// Function to display error messages
function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorAlert.classList.remove('d-none');
    
    // Scroll to error
    errorAlert.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-hide after 7 seconds
    setTimeout(() => {
        errorAlert.classList.add('d-none');
    }, 7000);
}

// Function to hide error messages
function hideError() {
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.classList.add('d-none');
}

// Function to reset a form
function resetForm(formId) {
    document.getElementById(formId).reset();
}

// Function to validate if a file is a CSV
function validateCsvFile(file) {
    if (!file) {
        return false;
    }
    
    // Check file extension
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    if (fileExt !== 'csv') {
        showError('Please upload a CSV file.');
        return false;
    }
    
    return true;
}

// Function to preview CSV file contents
function previewCsvFile(file, previewElementId, maxRows = 5) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csvContent = e.target.result;
        const rows = csvContent.split('\n');
        const headers = rows[0].split(',');
        
        // Check if username column exists
        if (!headers.map(h => h.trim().toLowerCase()).includes('username')) {
            showError('CSV file must contain a "username" column.');
            return;
        }
        
        // Create preview table
        let tableHtml = '<div class="table-responsive csv-preview"><table class="table table-sm table-striped">';
        
        // Add header
        tableHtml += '<thead><tr>';
        for (const header of headers) {
            tableHtml += `<th>${header.trim()}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        
        // Add rows (limit to maxRows)
        const rowsToShow = Math.min(rows.length, maxRows + 1);
        for (let i = 1; i < rowsToShow; i++) {
            if (rows[i].trim()) {
                const cells = rows[i].split(',');
                tableHtml += '<tr>';
                for (const cell of cells) {
                    tableHtml += `<td>${cell.trim()}</td>`;
                }
                tableHtml += '</tr>';
            }
        }
        
        // Add indication if there are more rows
        if (rows.length > maxRows + 1) {
            tableHtml += `<tr><td colspan="${headers.length}" class="text-center">...and ${rows.length - maxRows - 1} more rows</td></tr>`;
        }
        
        tableHtml += '</tbody></table></div>';
        
        // Display the preview
        document.getElementById(previewElementId).innerHTML = tableHtml;
    };
    
    reader.readAsText(file);
}

// Function to redirect to results page
function redirectToResults() {
    window.location.href = '/results';
}

// Initialize tooltips when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Add event listener to close alerts
    document.querySelectorAll('.alert .btn-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.alert').classList.add('d-none');
        });
    });
});

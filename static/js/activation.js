/**
 * JavaScript for the user activation page
 */

document.addEventListener('DOMContentLoaded', function() {
    const activationForm = document.getElementById('activationForm');
    const csvFileInput = document.getElementById('csvFile');
    const csvPreview = document.getElementById('csvPreview');
    
    // Add event listener for file selection to show preview
    csvFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (validateCsvFile(file)) {
            previewCsvFile(file, 'csvPreview');
        } else {
            csvPreview.innerHTML = '';
            csvFileInput.value = '';
        }
    });
    
    // Add event listener for form submission
    activationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        const file = csvFileInput.files[0];
        if (!validateCsvFile(file)) {
            return;
        }
        
        // Show loading spinner
        showLoading();
        
        // Create form data
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('operation_type', 'activation');
        
        // Send the request to the backend
        fetch(`${getBackendUrl()}/api/process-csv`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'An error occurred while processing the request.');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading spinner
            hideLoading();
            
            if (data.success) {
                // Redirect to results page
                redirectToResults();
            } else {
                // Show error message
                showError(data.error || 'An error occurred while processing the request.');
            }
        })
        .catch(error => {
            // Hide loading spinner
            hideLoading();
            
            // Show error message
            showError(error.message || 'An error occurred while connecting to the server.');
        });
    });
});

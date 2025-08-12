/**
 * JavaScript for the results page
 */

document.addEventListener('DOMContentLoaded', function() {
    const downloadButton = document.getElementById('downloadResults');
    
    if (downloadButton) {
        downloadButton.addEventListener('click', function() {
            // Get the results table
            const resultsTable = document.getElementById('resultsTable');
            
            // Get operation type for filename
            const operationType = this.getAttribute('data-operation-type');
            
            if (!resultsTable) {
                showError('No results available to download.');
                return;
            }
            
            // Function to export the table to CSV
            exportTableToCSV(resultsTable, `litmos_${operationType.toLowerCase()}_results_${formatDate(new Date())}.csv`);
        });
    }
    
    // Filter results by status
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterResultsByStatus(this.value);
        });
    }
});

// Function to filter results table by status
function filterResultsByStatus(status) {
    const rows = document.querySelectorAll('#resultsTable tbody tr');
    
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const isSuccess = row.classList.contains('result-success');
            if ((status === 'success' && isSuccess) || (status === 'failure' && !isSuccess)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
    
    // Update the counter
    updateFilterCounter(status);
}

// Function to update the counter after filtering
function updateFilterCounter(status) {
    const visibleRows = document.querySelectorAll('#resultsTable tbody tr:not([style*="display: none"])').length;
    const totalRows = document.querySelectorAll('#resultsTable tbody tr').length;
    
    const counterElement = document.getElementById('filterCounter');
    if (counterElement) {
        if (status === 'all') {
            counterElement.textContent = `Showing all ${totalRows} results`;
        } else {
            counterElement.textContent = `Showing ${visibleRows} of ${totalRows} results`;
        }
    }
}

// Function to export table to CSV
function exportTableToCSV(table, filename) {
    const rows = table.querySelectorAll('tr');
    
    // Convert the table to CSV
    let csv = [];
    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll('td, th');
        
        for (let j = 0; j < cols.length; j++) {
            // Escape double quotes and add quotes around each field
            let text = cols[j].innerText;
            text = text.replace(/"/g, '""');
            row.push('"' + text + '"');
        }
        
        csv.push(row.join(','));
    }
    
    // Download the CSV file
    downloadCSV(csv.join('\n'), filename);
}

// Function to download CSV
function downloadCSV(csv, filename) {
    const csvFile = new Blob([csv], {type: 'text/csv'});
    const downloadLink = document.createElement('a');
    
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Format date for filename
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
}

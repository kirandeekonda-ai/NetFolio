// Mobile Navigation
function setupMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navList = document.querySelector('.nav-list');
    
    if (navToggle && navList) {
        navToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav')) {
                navList.classList.remove('active');
            }
        });
    }
}

// File Upload Handling
document.addEventListener('DOMContentLoaded', function() {
    setupMobileNav();
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewArea = document.getElementById('previewArea');

    if (dropZone && fileInput) {
        // Handle drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border-color)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            handleFiles(files);
        });

        // Handle file input click
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            handleFiles(files);
        });
    }

    // Category label clicking
    document.querySelectorAll('.label').forEach(label => {
        label.addEventListener('click', function() {
            // Toggle active state
            this.classList.toggle('active');
        });
    });

    // Table row hover effect
    document.querySelectorAll('.table tr').forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'var(--neutral-light-gray)';
        });
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        const fileType = file.name.split('.').pop().toLowerCase();
        const allowedTypes = ['csv', 'xlsx', 'xls'];
        
        // Remove any existing feedback
        removeFeedback();
        
        if (allowedTypes.includes(fileType)) {
            // Show success feedback
            showFeedback('File accepted: ' + file.name, 'success');
            // Show preview area with dummy data
            document.getElementById('previewArea').style.display = 'block';
        } else {
            // Show error feedback
            showFeedback('Invalid file type. Please upload CSV or Excel files only.', 'error');
            document.getElementById('previewArea').style.display = 'none';
        }
    }
}

function showFeedback(message, type) {
    const feedback = document.createElement('div');
    feedback.className = `upload-feedback ${type}`;
    feedback.textContent = message;
    
    const uploadArea = document.getElementById('dropZone');
    uploadArea.appendChild(feedback);
}

function removeFeedback() {
    const existingFeedback = document.querySelector('.upload-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
}

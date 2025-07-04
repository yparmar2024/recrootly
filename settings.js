// Settings page JavaScript functionality

// Initialize Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const confirmationModal = document.getElementById('confirmation-modal');
const userEmail = document.getElementById('user-email');

// Mobile navigation elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const navMenu = document.getElementById('nav-menu');

// Settings data object to store current settings
let currentSettings = {
    defaultSortOrder: 'score-desc',
    autoRankApplicants: true,
    dataRetention: 60
};

// Mobile navigation functions
function toggleMobileMenu() {
    hamburgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    hamburgerMenu.classList.remove('active');
    navMenu.classList.remove('active');
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    initializeProfileDropdown();
    initializeSettingsControls();
    loadSettings();
    initializeMobileNavigation();
});

// Initialize mobile navigation
function initializeMobileNavigation() {
    // Mobile navigation event listeners
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking on navigation links
    if (navMenu) {
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (hamburgerMenu && navMenu) {
            if (!hamburgerMenu.contains(event.target) && !navMenu.contains(event.target)) {
                closeMobileMenu();
            }
        }
    });
}

// Check authentication state and update UI
function checkAuthState() {
    // Show loading state immediately
    if (userEmail) {
        userEmail.textContent = 'Loading...';
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            updateUIForUser(session.user);
        } else {
            updateUIForUser(null);
        }
    }).catch((error) => {
        console.error('Error checking auth state:', error);
        // Show error and redirect
        if (userEmail) {
            userEmail.textContent = 'Error loading user data';
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    });
}

// Update UI for logged-in user
function updateUIForUser(user) {
    if (user && userEmail) {
        userEmail.textContent = user.email;
    } else if (userEmail) {
        userEmail.textContent = 'Loading...'; // Fallback text
    }
    
    // Also update the account email in settings section
    const accountEmail = document.getElementById('account-email');
    if (user && accountEmail) {
        accountEmail.textContent = user.email;
    } else if (accountEmail) {
        accountEmail.textContent = 'Loading...'; // Fallback text
    }
}

// Profile dropdown functionality
function initializeProfileDropdown() {
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            profileMenu.classList.toggle('show');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (profileDropdown && !profileDropdown.contains(event.target)) {
            profileMenu.classList.remove('show');
        }
    });

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Initialize all settings controls
function initializeSettingsControls() {
    // Toggle switch functionality
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const settingName = this.getAttribute('data-setting');
            currentSettings[settingName] = this.checked;
            saveSettings(currentSettings);
        });
    });

    // Select control functionality
    document.querySelectorAll('.select-control').forEach(select => {
        select.addEventListener('change', function() {
            const settingName = this.getAttribute('data-setting');
            currentSettings[settingName] = this.value;
            saveSettings(currentSettings);
        });
    });

    // Button click handlers
    document.querySelectorAll('.btn-secondary').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action) {
                handleButtonAction(action);
            }
        });
    });

    // Danger button handlers
    document.querySelectorAll('.danger-button').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action) {
                handleDangerAction(action);
            }
        });
    });
}

// Function to load settings
function loadSettings() {
    const savedSettings = localStorage.getItem('recrootlySettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            currentSettings = {
                defaultSortOrder: parsed.defaultSortOrder || 'score-desc',
                autoRankApplicants: parsed.autoRankApplicants !== undefined ? parsed.autoRankApplicants : true,
                dataRetention: parseInt(parsed.dataRetention, 10) || 60
            };
        } catch (error) {
            console.error('Error parsing saved settings:', error);
        }
    }

    // Apply settings to UI
    applySettingsToUI();
}

// Function to apply settings to UI
function applySettingsToUI() {
    // Apply sort order setting
    const sortOrderSelect = document.querySelector('[data-setting="defaultSortOrder"]');
    if (sortOrderSelect) {
        sortOrderSelect.value = currentSettings.defaultSortOrder;
    }

    // Apply auto-rank setting
    const autoRankCheckbox = document.querySelector('[data-setting="autoRankApplicants"]');
    if (autoRankCheckbox) {
        autoRankCheckbox.checked = currentSettings.autoRankApplicants;
    }

    // Apply data retention setting
    const dataRetentionSelect = document.querySelector('[data-setting="dataRetention"]');
    if (dataRetentionSelect) {
        dataRetentionSelect.value = currentSettings.dataRetention;
    }
}

// Save settings functionality
function saveSettings(settings) {
    // Force convert numeric values to numbers
    settings.dataRetention = parseInt(settings.dataRetention, 10);
    
    // Save to localStorage
    localStorage.setItem('recrootlySettings', JSON.stringify(settings));
    
    // Show confirmation modal
    showConfirmationModal('Settings saved successfully!', 'success');
    
    // Here you would typically also send settings to your backend
}

// Close confirmation modal
function closeConfirmation() {
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}

// Handle button actions
function handleButtonAction(action) {
    switch (action) {
        case 'change-email':
            showChangeEmailModal();
            break;
        case 'change-password':
            showChangePasswordModal();
            break;
        case 'export-data':
            handleExportData();
            break;
        case 'delete-resumes':
            handleDeleteResumes();
            break;
        case 'delete-jobs':
            handleDeleteJobs();
            break;
        case 'reset-account':
            handleResetAccount();
            break;
        default:
            // Unknown action
            break;
    }
}

// Handle danger actions
function handleDangerAction(action) {
    switch (action) {
        case 'reset-account':
            showResetAccountConfirmation();
            break;
        default:
            // Unknown danger action
            break;
    }
}

// Show change email modal
function showChangeEmailModal() {
    const modal = document.getElementById('change-email-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Clear form
        document.getElementById('change-email-form').reset();
        
        // Add form submit handler
        const form = document.getElementById('change-email-form');
        form.onsubmit = handleChangeEmail;
    }
}

// Close change email modal
function closeChangeEmailModal() {
    const modal = document.getElementById('change-email-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle change email form submission
async function handleChangeEmail(e) {
    e.preventDefault();
    
    const newEmail = document.getElementById('new-email').value.trim();
    const password = document.getElementById('confirm-password').value;
    
    if (!newEmail || !password) {
        showModal('Error', 'Please fill in all fields.', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        showModal('Error', 'Please enter a valid email address.', 'error');
        return;
    }
    
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showModal('Error', 'No active session found. Please log in again.', 'error');
            closeChangeEmailModal();
            return;
        }
        
        // Check if new email is different from current email
        if (newEmail === session.user.email) {
            showModal('Error', 'New email address must be different from your current email.', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Changing Email...';
        submitBtn.disabled = true;
        
        // Update email using Supabase Auth
        const { error } = await supabase.auth.updateUser({
            email: newEmail
        });
        
        if (error) {
            console.error('Error updating email:', error);
            
            // Handle specific error cases
            if (error.message.includes('password')) {
                showModal('Error', 'Invalid password. Please try again.', 'error');
            } else if (error.message.includes('email')) {
                showModal('Error', 'This email address is already in use.', 'error');
            } else {
                showModal('Error', 'Failed to update email. Please try again.', 'error');
            }
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Close modal
        closeChangeEmailModal();
        
        // Show success message
        showModal(
            'Email Update Initiated', 
            'A confirmation email has been sent to your old and new email address. Please check your old email address inbox and click the confirmation link to complete the email change.',
            'success'
        );
        
        // Update UI to show pending email change
        updateUIForUser(session.user);
        
    } catch (error) {
        console.error('Error in handleChangeEmail:', error);
        showModal('Error', 'An unexpected error occurred. Please try again.', 'error');
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Change Email';
        submitBtn.disabled = false;
    }
}

// Show change password modal
function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Clear form
        document.getElementById('change-password-form').reset();
        
        // Reset submit button text and state
        const submitBtn = document.querySelector('#change-password-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Change Password';
            submitBtn.disabled = false;
        }
        
        // Add form submit handler
        const form = document.getElementById('change-password-form');
        form.onsubmit = handleChangePassword;
    }
}

// Close change password modal
function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle change password form submission
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showModal('Error', 'Please fill in all fields.', 'error');
        return;
    }
    
    // Check if new password meets minimum requirements
    if (newPassword.length < 6) {
        showModal('Error', 'New password must be at least 6 characters long.', 'error');
        return;
    }
    
    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
        showModal('Error', 'New passwords do not match. Please try again.', 'error');
        return;
    }
    
    // Check if new password is different from current
    if (newPassword === currentPassword) {
        showModal('Error', 'New password must be different from your current password.', 'error');
        return;
    }
    
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showModal('Error', 'No active session found. Please log in again.', 'error');
            closeChangePasswordModal();
            return;
        }
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Changing Password...';
        submitBtn.disabled = true;
        
        // Update password using Supabase Auth
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            console.error('Error updating password:', error);
            
            // Handle specific error cases
            if (error.message.includes('password')) {
                showModal('Error', 'Invalid current password. Please try again.', 'error');
            } else if (error.message.includes('weak')) {
                showModal('Error', 'Password is too weak. Please choose a stronger password.', 'error');
            } else {
                showModal('Error', 'Failed to update password. Please try again.', 'error');
            }
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Close modal
        closeChangePasswordModal();
        
        // Show success message
        showModal(
            'Password Updated', 
            'Your password has been successfully updated. You can now use your new password to log in.',
            'success'
        );
        
        // Clear form
        document.getElementById('change-password-form').reset();
        
    } catch (error) {
        console.error('Error in handleChangePassword:', error);
        showModal('Error', 'An unexpected error occurred. Please try again.', 'error');
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Change Password';
        submitBtn.disabled = false;
    }
}

// Export user data
async function handleExportData() {
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            showModal('Login Required', 'Please log in to export your data.', 'error');
            return;
        }

        const userId = session.user.id;
        
        // Show loading modal
        showModal('Exporting Data', 'Please wait while we prepare your export...', 'info', false);
        
        // Fetch all user's data from database
        const exportData = {
            settings: currentSettings,
            jobs: [],
            resumes: [],
            timestamp: new Date().toISOString(),
            user: session.user.email,
            note: "This export contains analysis data only. Resume files are not included for privacy and security reasons."
        };

        // Fetch jobs for this user
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', userId);

        if (jobsError) {
            console.error('Error fetching jobs:', jobsError);
            closeCustomModal();
            showModal('Export Error', 'Error fetching job data. Please try again.', 'error');
            return;
        }

        exportData.jobs = jobs || [];

        // Fetch resumes for each job
        for (const job of exportData.jobs) {
            const { data: resumes, error: resumesError } = await supabase
                .from('resumes')
                .select('id, job_id, name, score, strengths, weaknesses, assessment, created_at')
                .eq('job_id', job.id);

            if (resumesError) {
                console.error('Error fetching resumes for job:', job.id, resumesError);
                continue;
            }

            exportData.resumes.push(...(resumes || []));
        }

        // Close loading modal
        closeCustomModal();

        // Create and download the file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recrootly-analysis-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showModal('Export Successful', 'Analysis data exported successfully! Resume files are not included for privacy reasons.', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        closeCustomModal();
        showModal('Export Error', 'Error exporting data. Please try again.', 'error');
    }
}

// Show reset account confirmation
function showResetAccountConfirmation() {
    const modal = document.getElementById('reset-account-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeResetAccountModal() {
    const modal = document.getElementById('reset-account-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function confirmResetAccount() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            showModal('Error', 'No active session found.', 'error');
            closeResetAccountModal();
            return;
        }

        const userId = session.user.id;

        // Show loading state
        const resetButton = document.querySelector('#reset-account-modal .danger-button');
        resetButton.textContent = 'Resetting...';
        resetButton.disabled = true;

        // Delete all user's data from database
        const { error: resumesError } = await supabase
            .from('resumes')
            .delete()
            .in('job_id', 
                supabase
                    .from('jobs')
                    .select('id')
                    .eq('user_id', userId)
            );

        if (resumesError) {
            console.error('Error deleting resumes:', resumesError);
            showModal('Error', 'Failed to delete resume data. Please try again.', 'error');
            closeResetAccountModal();
            return;
        }

        // Delete jobs
        const { error: jobsError } = await supabase
            .from('jobs')
            .delete()
            .eq('user_id', userId);

        if (jobsError) {
            console.error('Error deleting jobs:', jobsError);
            showModal('Error', 'Failed to delete job data. Please try again.', 'error');
            closeResetAccountModal();
            return;
        }

        // Clear local storage
        localStorage.removeItem('recrootlySettings');

        // Sign out user
        await supabase.auth.signOut();

        // Close modal
        closeResetAccountModal();

        // Show success message
        showModal(
            'Account Reset Complete', 
            'All your data has been cleared and you have been signed out. You can log in again with the same credentials to start fresh.',
            'success'
        );

        // Redirect to home page after a delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);

    } catch (error) {
        console.error('Error resetting account:', error);
        showModal('Error', 'An error occurred while resetting your account. Please try again.', 'error');
        closeResetAccountModal();
    }
}

// Handle logout
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showModal('Logout Error', 'Error logging out: ' + error.message, 'error');
    } else {
        // Clear any stored data
        localStorage.removeItem('recrootlySettings');
        
        showModal('Logged Out', 'Successfully logged out!', 'success');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Close confirmation modal when clicking outside
if (confirmationModal) {
    confirmationModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeConfirmation();
        }
    });
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        updateUIForUser(session.user);
    } else if (event === 'SIGNED_OUT') {
        // Redirect to home page if user logs out
        window.location.href = 'index.html';
    }
});

// Make functions globally available for onclick handlers
window.saveSettings = saveSettings;
window.closeConfirmation = closeConfirmation;
window.closeChangeEmailModal = closeChangeEmailModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.closeResetAccountModal = closeResetAccountModal;
window.confirmResetAccount = confirmResetAccount;

// Add this after your existing functions
function showModal(title, message, type = 'success', showCloseButton = true) {
    // Remove existing modal if present
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
        <div id="custom-modal" class="confirmation-modal">
            <div class="confirmation-content">
                <div class="confirmation-icon">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                ${showCloseButton ? '<button id="custom-modal-ok-btn">OK</button>' : ''}
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show modal
    const modal = document.getElementById('custom-modal');
    modal.style.display = 'flex';

    // Add event listener to OK button if it exists
    if (showCloseButton) {
        const okButton = document.getElementById('custom-modal-ok-btn');
        if (okButton) {
            okButton.addEventListener('click', closeCustomModal);
        }
    }

    // Auto-close for success messages after 3 seconds
    if (type === 'success' && !showCloseButton) {
        setTimeout(() => {
            closeCustomModal();
        }, 3000);
    }
}

function closeCustomModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.remove();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('custom-modal');
    if (modal && event.target === modal) {
        closeCustomModal();
    }
});

// Custom dropdown functionality
const sortOrderBtn = document.getElementById('sort-order-btn');
const sortOrderMenu = document.getElementById('sort-order-menu');
const sortOrderText = document.getElementById('sort-order-text');

// Toggle dropdown
sortOrderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sortOrderMenu.classList.toggle('show');
    sortOrderBtn.classList.toggle('active');
});

// Handle dropdown item selection
sortOrderMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('dropdown-item')) {
        e.preventDefault();
        e.stopPropagation();
        
        const value = e.target.dataset.value;
        const text = e.target.textContent;
        
        // Update button text
        sortOrderText.textContent = text;
        
        // Update selected state
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('selected');
        });
        e.target.classList.add('selected');
        
        // Save setting to currentSettings object
        currentSettings.defaultSortOrder = value;
        
        // Close dropdown immediately
        sortOrderMenu.classList.remove('show');
        sortOrderBtn.classList.remove('active');
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!sortOrderBtn.contains(e.target) && !sortOrderMenu.contains(e.target)) {
        sortOrderMenu.classList.remove('show');
        sortOrderBtn.classList.remove('active');
    }
});

// Load saved sort order setting
function loadSortOrderSetting() {
    const savedSettings = localStorage.getItem('recrootlySettings');
    let savedSortOrder = 'score-desc'; // Default value
    
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            savedSortOrder = parsed.defaultSortOrder || 'score-desc';
        } catch (error) {
            console.error('Error parsing saved settings:', error);
        }
    }
    
    const sortOrderMap = {
        'score-desc': 'AI Score (High to Low)',
        'score-asc': 'AI Score (Low to High)',
        'date-desc': 'Recently Added',
        'date-asc': 'Oldest First',
        'name-asc': 'Name (A-Z)',
        'name-desc': 'Name (Z-A)'
    };
    
    sortOrderText.textContent = sortOrderMap[savedSortOrder];
    
    // Update selected state
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.value === savedSortOrder) {
            item.classList.add('selected');
        }
    });
}

// Call this function when the page loads
loadSortOrderSetting();

// Add click-outside-to-close functionality for all modals
document.addEventListener('click', function(event) {
    // Close change email modal when clicking outside
    const changeEmailModal = document.getElementById('change-email-modal');
    if (changeEmailModal && event.target === changeEmailModal) {
        closeChangeEmailModal();
    }
    
    // Close change password modal when clicking outside
    const changePasswordModal = document.getElementById('change-password-modal');
    if (changePasswordModal && event.target === changePasswordModal) {
        closeChangePasswordModal();
    }
    
    // Close reset account modal when clicking outside
    const resetAccountModal = document.getElementById('reset-account-modal');
    if (resetAccountModal && event.target === resetAccountModal) {
        closeResetAccountModal();
    }
    
    // Close confirmation modal when clicking outside
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal && event.target === confirmationModal) {
        closeConfirmation();
    }
});

// SECURITY ISSUE: API keys exposed in client-side code
export const CONFIG = {
    OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY,
    // This should be server-side only
};

// DUPLICATED: Similar modal logic across files
function showConfirmationModal(message, type = 'success') {
    // Repeated in index.js, dashboard.js, settings.js
}

// DUPLICATED: Profile menu toggle logic
function toggleProfileMenu() {
    profileMenu.classList.toggle('show');
}

// MISSING: No documentation for complex functions
function compressResumeText(resume) {
    // Complex logic without explanation
}

function extractResumeSections(resume) {
    // No documentation of expected input/output
}

// UNCLEAR: Generic error messages
throw new Error('Invalid response format from API');
// Should include more context about what was expected vs received

// ISSUE: Magic numbers and strings
const MAX_TOKENS = 30000;  // Should be configurable
const resumesPerPage = 5;  // Should be user-configurable

// ISSUE: Event listeners not properly cleaned up
window.onclick = function(event) {
    // Global event handler that could accumulate
}; 
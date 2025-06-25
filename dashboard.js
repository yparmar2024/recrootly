// Import the resume analysis module
import { getResumeFeedback } from './resumeAnalysis.js';

// Demo Dashboard JavaScript

// Initialize Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jobs = [];

let currentJobId = null;
let currentPage = 1;
let resumesPerPage = 5;
let isLoading = false;

// DOM Elements
const addJobBtn = document.getElementById('add-job-btn');
const addJobModal = document.getElementById('add-job-modal');
const addResumeModal = document.getElementById('add-resume-modal');
const analysisModal = document.getElementById('analysis-modal');
const jobsList = document.getElementById('jobs-list');
const jobDetails = document.getElementById('job-details');

// Auth elements
const authModal = document.getElementById('auth-modal');
const openLoginBtn = document.getElementById('open-login');
const closeAuthModal = document.getElementById('close-auth-modal');

// Profile dropdown elements
const profileDropdown = document.getElementById('profile-dropdown');
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Mobile navigation elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const navMenu = document.getElementById('nav-menu');

// Modal close buttons
const closeModals = document.querySelectorAll('.close-modal');
const cancelJobBtn = document.getElementById('cancel-job');
const cancelResumeBtn = document.getElementById('cancel-resume');

// Forms
const addJobForm = document.getElementById('add-job-form');
const addResumeForm = document.getElementById('add-resume-form');

// Auth form elements
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');
const authForm = document.getElementById('auth-form');

let isLoginMode = true;

// Resume remove modal elements
const removeResumeModal = document.getElementById('remove-resume-modal');
const cancelRemoveResumeBtn = document.getElementById('cancel-remove-resume');
const confirmRemoveResumeBtn = document.getElementById('confirm-remove-resume');

let resumeIdToRemove = null;
let jobIdToRemoveFrom = null;

// Job remove modal elements
const removeJobModal = document.getElementById('remove-job-modal');
const cancelRemoveJobBtn = document.getElementById('cancel-remove-job');
const confirmRemoveJobBtn = document.getElementById('confirm-remove-job');

let jobIdToRemove = null;

// Mobile navigation functions
function toggleMobileMenu() {
    hamburgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    hamburgerMenu.classList.remove('active');
    navMenu.classList.remove('active');
}

// Custom confirmation modal function
function showConfirmationModal(message, type = 'success') {
    const confirmationModal = document.getElementById('confirmation-modal');
    const icon = confirmationModal.querySelector('.confirmation-icon i');
    const title = confirmationModal.querySelector('#confirmation-title');
    const messageEl = confirmationModal.querySelector('#confirmation-message');
    
    // Update the modal content
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
    title.textContent = type === 'success' ? 'Success!' : 'Notice';
    messageEl.textContent = message;
    
    // Show the modal
    confirmationModal.style.display = 'flex';
}

function closeConfirmationModal() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}

// Function to get current settings
function getCurrentSettings() {
    const savedSettings = localStorage.getItem('recrootlySettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            return {
                defaultSortOrder: parsed.defaultSortOrder || 'score-desc',
                autoRankApplicants: parsed.autoRankApplicants !== undefined ? parsed.autoRankApplicants : true,
                dataRetention: parseInt(parsed.dataRetention, 10) || 60
            };
        } catch (error) {
            console.error('Error parsing saved settings:', error);
        }
    }
    return {
        defaultSortOrder: 'score-desc',
        autoRankApplicants: true,
        dataRetention: 60
    };
}

// Function to apply settings to dashboard
function applySettingsToDashboard() {
    // If we're currently viewing job details, re-render them with new settings
    if (currentJobId) {
        renderJobDetails(currentJobId);
    }
}

// Function to sort resumes based on settings
function sortResumes(resumes, sortOrder = 'score-desc') {
    const sortedResumes = [...resumes];
    
    switch (sortOrder) {
        case 'score-desc':
            return sortedResumes.sort((a, b) => b.score - a.score);
        case 'score-asc':
            return sortedResumes.sort((a, b) => a.score - b.score);
        case 'date-desc':
            return sortedResumes.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date-asc':
            return sortedResumes.sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'name-asc':
            return sortedResumes.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sortedResumes.sort((a, b) => b.name.localeCompare(a.name));
        default:
            return sortedResumes.sort((a, b) => b.score - a.score);
    }
}

// Function to apply settings to Add Job modal
function applySettingsToAddJobModal() {
    const settings = getCurrentSettings();
    const sortOrderText = document.getElementById('job-sort-order-text');
    
    if (sortOrderText) {
        const sortOrderMap = {
            'score-desc': 'AI Score (High to Low)',
            'score-asc': 'AI Score (Low to High)',
            'date-desc': 'Recently Added',
            'date-asc': 'Oldest First',
            'name-asc': 'Name (A-Z)',
            'name-desc': 'Name (Z-A)'
        };
        
        const defaultSortOrder = settings.defaultSortOrder || 'score-desc';
        sortOrderText.textContent = sortOrderMap[defaultSortOrder];
        
        // Update selected state
        const dropdownItems = document.querySelectorAll('#job-sort-order-menu .dropdown-item');
        dropdownItems.forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.value === defaultSortOrder) {
                item.classList.add('selected');
            }
        });
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    await loadDataFromDatabase(); // Load from database first
    checkAuthState();
    applySettingsToDashboard();
    applySettingsToAddJobModal();

    // Setup confirmation modal event listeners
    const confirmationOkBtn = document.getElementById('confirmation-ok-btn');
    if (confirmationOkBtn) {
        confirmationOkBtn.addEventListener('click', closeConfirmationModal);
    }

    // Close confirmation modal when clicking outside
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                closeConfirmationModal();
            }
        });
    }

    if (cancelRemoveResumeBtn) {
        cancelRemoveResumeBtn.onclick = closeRemoveResumeModal;
    }
    if (confirmRemoveResumeBtn) {
        confirmRemoveResumeBtn.onclick = async function() {
            if (resumeIdToRemove && jobIdToRemoveFrom) {
                await removeResume(resumeIdToRemove, jobIdToRemoveFrom);
            }
            closeRemoveResumeModal();
        };
    }

    // Optional: close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === removeResumeModal) {
            closeRemoveResumeModal();
        }
    });

    if (cancelRemoveJobBtn) {
        cancelRemoveJobBtn.addEventListener('click', closeRemoveJobModal);
    }
    if (confirmRemoveJobBtn) {
        confirmRemoveJobBtn.addEventListener('click', async function() {
            if (jobIdToRemove) {
                await removeJob(jobIdToRemove);
            }
            closeRemoveJobModal();
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === removeJobModal) {
            closeRemoveJobModal();
        }
    });
});

// Auth functions
function openModal(mode) {
    isLoginMode = mode === 'login';
    if (isLoginMode) {
        authTitle.textContent = 'Login';
        authSubmit.textContent = 'Login';
        authToggle.innerHTML = 'Don\'t have an account? <span style="color: #ffffff; text-decoration: underline;">Sign up</span>';
    } else {
        authTitle.textContent = 'Sign Up';
        authSubmit.textContent = 'Sign Up';
        authToggle.innerHTML = 'Already have an account? <span style="color: #ffffff; text-decoration: underline;">Login</span>';
    }
    authModal.style.display = 'flex';
}

function updateUIForUser(user) {
    if (user) {
        // User is logged in
        if (openLoginBtn) openLoginBtn.style.display = 'none';
        if (profileDropdown) {
            profileDropdown.style.display = 'block';
            if (userEmail) userEmail.textContent = user.email;
        }
    } else {
        // User is not logged in
        if (openLoginBtn) openLoginBtn.style.display = 'block';
        if (profileDropdown) profileDropdown.style.display = 'none';
    }
}

function toggleProfileMenu() {
    profileMenu.classList.toggle('show');
}

function checkAuthState() {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            updateUIForUser(session.user);
        } else {
            updateUIForUser(null);
        }
    });
}

function setupEventListeners() {
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

    // Add Job Modal
    addJobBtn.addEventListener('click', () => {
        showAddJobModal();
    });

    // Close modals
    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            addJobModal.style.display = 'none';
            addResumeModal.style.display = 'none';
            analysisModal.style.display = 'none';
        });
    });

    cancelJobBtn.addEventListener('click', () => {
        addJobModal.style.display = 'none';
        addJobForm.reset();
        applySettingsToAddJobModal();
        // Clear editing state
        window.editingJobId = null;
        document.getElementById('edit-warning').style.display = 'none';
    });

    cancelResumeBtn.addEventListener('click', () => {
        addResumeModal.style.display = 'none';
    });

    // Auth event listeners
    if (openLoginBtn) openLoginBtn.onclick = () => { openModal('login'); };
    if (closeAuthModal) closeAuthModal.onclick = () => { authModal.style.display = 'none'; };
    if (profileBtn) profileBtn.onclick = toggleProfileMenu;

    // Logout function
    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showConfirmationModal('Error logging out: ' + error.message, 'error');
        } else {
            showConfirmationModal('Successfully logged out!', 'success');
            updateUIForUser(null);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    }

    if (logoutBtn) logoutBtn.onclick = handleLogout;

    // Auth form toggle
    if (authToggle) {
        authToggle.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = 'Login';
                authSubmit.textContent = 'Login';
                authToggle.innerHTML = 'Don\'t have an account? <span style="color: #ffffff; text-decoration: underline;">Sign up</span>';
            } else {
                authTitle.textContent = 'Sign Up';
                authSubmit.textContent = 'Sign Up';
                authToggle.innerHTML = 'Already have an account? <span style="color: #ffffff; text-decoration: underline;">Login</span>';
            }
        });
    }

    // Auth form submission
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            
            if (isLoginMode) {
                // Login
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    showConfirmationModal(error.message, 'error');
                } else {
                    showConfirmationModal('Successfully logged in!', 'success');
                    authModal.style.display = 'none';
                    updateUIForUser(supabase.auth.getUser());
                }
            } else {
                // Signup
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) {
                    showConfirmationModal(error.message, 'error');
                } else {
                    showConfirmationModal('Please check your email for confirmation link!', 'success');
                    authModal.style.display = 'none';
                }
            }
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addJobModal) addJobModal.style.display = 'none';
        if (e.target === addResumeModal) addResumeModal.style.display = 'none';
        if (e.target === analysisModal) analysisModal.style.display = 'none';
        if (event.target == authModal) authModal.style.display = 'none';
        if (event.target == document.getElementById('confirmation-modal')) closeConfirmationModal();
        
        // Close profile menu if clicking outside
        if (profileDropdown && !profileDropdown.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    });

    // Add Job Form
    addJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showConfirmationModal('Please log in to create/edit a job.', 'error');
                return;
            }

            const title = document.getElementById('job-title').value;
            const description = document.getElementById('job-description').value;
            const customInstructions = document.getElementById('custom-instructions').value;
            const sortOrder = document.querySelector('#job-sort-order-menu .dropdown-item.selected')?.dataset.value || 'score-desc';

            // Check if we're editing an existing job
            if (window.editingJobId) {
                // Update existing job
                const { error: jobError } = await supabase
                    .from('jobs')
                    .update({
                        title: title,
                        description: description,
                        custom_instructions: customInstructions,
                        sort_order: sortOrder
                    })
                    .eq('id', window.editingJobId)
                    .eq('user_id', session.user.id);

                if (jobError) {
                    console.error('Error updating job:', jobError);
                    showConfirmationModal('Error updating job. Please try again.', 'error');
                    return;
                }

                // Update local data
                const job = jobs.find(j => j.id === window.editingJobId);
                if (job) {
                    job.title = title;
                    job.description = description.length > 100 ? description.substring(0, 100) + '...' : description;
                    job.fullDescription = description;
                    job.customInstructions = customInstructions;
                    job.sortOrder = sortOrder;
                }

                // Re-render jobs list and job details
                renderJobs();
                renderJobDetails(window.editingJobId);
                
                showConfirmationModal('Job updated successfully!', 'success');
                
            } else {
                // Create new job (existing code)
                const { data: newJob, error: jobError } = await supabase
                    .from('jobs')
                    .insert([
                        {
                            user_id: session.user.id,
                            title: title,
                            description: description,
                            custom_instructions: customInstructions,
                            sort_order: sortOrder,
                            applicants: 0
                        }
                    ])
                    .select()
                    .single();

                if (jobError) {
                    console.error('Error creating job:', jobError);
                    showConfirmationModal('Error creating job. Please try again.', 'error');
                    return;
                }

                // Add to local array for immediate UI update
                jobs.push({
                    id: newJob.id,
                    title: newJob.title,
                    description: newJob.description.length > 100 ? newJob.description.substring(0, 100) + '...' : newJob.description,
                    fullDescription: newJob.description,
                    customInstructions: newJob.custom_instructions,
                    sortOrder: newJob.sort_order,
                    applicants: newJob.applicants,
                    date: 'Just now',
                    resumes: []
                });

                renderJobs();
                showConfirmationModal('Job created successfully!', 'success');
            }

            addJobModal.style.display = 'none';
            addJobForm.reset();
            applySettingsToAddJobModal();
            
        } catch (error) {
            console.error('Error creating/updating job:', error);
            showConfirmationModal('Error creating/updating job. Please try again.', 'error');
        }
    });

    // Add Resume Form
    addResumeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showConfirmationModal('Please log in to add a resume.', 'error');
                return;
            }

            const name = document.getElementById('resume-name').value;
            const file = document.getElementById('resume-file').files[0];
            const resumeTextArea = document.getElementById('resume-text');

            if (!currentJobId) {
                showConfirmationModal('Please select a job first.', 'error');
                return;
            }

            // Get the current job to access its description and custom instructions
            const currentJob = jobs.find(j => j.id === currentJobId);
            if (!currentJob) {
                showConfirmationModal('Job not found. Please try again.', 'error');
                return;
            }

            // Show loading state
            const submitBtn = addResumeForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Analyzing Resume...';
            submitBtn.disabled = true;

            let resumeText = '';
            
            // If a file is uploaded, read its content
            if (file) {
                try {
                    if (file.type === 'application/pdf') {
                        // Handle PDF files with special extraction
                        const arrayBuffer = await readFileContent(file);
                        resumeText = await extractTextFromPDF(arrayBuffer);
                    } else {
                        // Handle other file types
                        resumeText = await readFileContent(file);
                    }
                } catch (fileError) {
                    console.error('Error reading file:', fileError);
                    showConfirmationModal(`Error reading resume file: ${fileError.message}`, 'error');
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                    return;
                }
            } else if (resumeTextArea && resumeTextArea.value.trim()) {
                // If no file, use text area content
                resumeText = resumeTextArea.value.trim();
            } else {
                showConfirmationModal('Please provide resume content (either upload a file or enter text).', 'error');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            // Use the resume analysis module
            const analysisResult = await getResumeFeedback(
                resumeText,
                currentJob.fullDescription || currentJob.description,
                currentJob.customInstructions || ''
            );

            if (!analysisResult.success) {
                showConfirmationModal(`Analysis failed: ${analysisResult.error}`, 'error');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            const { score, strengths, weaknesses, assessment } = analysisResult.data;

            // Save resume to database
            const { data: newResume, error: resumeError } = await supabase
                .from('resumes')
                .insert([
                    {
                        job_id: currentJobId,
                        name: name,
                        score: score,
                        strengths: strengths,
                        weaknesses: weaknesses,
                        assessment: assessment,
                        file_path: file ? `resumes/${file.name}` : null
                    }
                ])
                .select()
                .single();

            if (resumeError) {
                console.error('Error adding resume:', resumeError);
                showConfirmationModal('Error adding resume. Please try again.', 'error');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            // Update local data for immediate UI update
            if (currentJob) {
                currentJob.resumes.push({
                    id: newResume.id,
                    name: newResume.name,
                    score: newResume.score,
                    strengths: newResume.strengths,
                    weaknesses: newResume.weaknesses,
                    assessment: newResume.assessment
                });
                currentJob.applicants = currentJob.resumes.length;
            }

            renderJobs();
            renderJobDetails(currentJobId);
            
            addResumeModal.style.display = 'none';
            addResumeForm.reset();
            
            showConfirmationModal('Resume analyzed successfully!', 'success');
            
        } catch (error) {
            console.error('Error adding resume:', error);
            showConfirmationModal('Error adding resume. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = addResumeForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Analyze Resume';
            submitBtn.disabled = false;
        }
    });

    // Add event listeners
    const addResumeBtn = document.getElementById('add-resume-btn');
    if (addResumeBtn) {
        addResumeBtn.addEventListener('click', () => {
            addResumeModal.style.display = 'flex';
        });
    }

    // Add Edit Job button event listener
    const editJobBtn = document.getElementById('edit-job-btn');
    if (editJobBtn) {
        editJobBtn.addEventListener('click', () => {
            showEditJobModal(currentJobId);
        });
    }

    // Add Remove Job button event listener
    const removeJobBtn = document.getElementById('remove-job-btn');
    if (removeJobBtn) {
        removeJobBtn.addEventListener('click', () => {
            showRemoveJobModal(currentJobId);
        });
    }

    // Custom dropdown functionality for job sort order
    const jobSortOrderBtn = document.getElementById('job-sort-order-btn');
    const jobSortOrderMenu = document.getElementById('job-sort-order-menu');
    
    if (jobSortOrderBtn && jobSortOrderMenu) {
        // Toggle dropdown
        jobSortOrderBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            jobSortOrderMenu.classList.toggle('show');
            jobSortOrderBtn.classList.toggle('active');
        });

        // Handle dropdown item selection
        jobSortOrderMenu.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const text = e.target.textContent;
                
                // Update button text
                const sortOrderText = document.getElementById('job-sort-order-text');
                if (sortOrderText) {
                    sortOrderText.textContent = text;
                }
                
                // Update selected state
                document.querySelectorAll('#job-sort-order-menu .dropdown-item').forEach(item => {
                    item.classList.remove('selected');
                });
                e.target.classList.add('selected');
                
                // Close dropdown
                jobSortOrderMenu.classList.remove('show');
                jobSortOrderBtn.classList.remove('active');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!jobSortOrderBtn.contains(e.target) && !jobSortOrderMenu.contains(e.target)) {
                jobSortOrderMenu.classList.remove('show');
                jobSortOrderBtn.classList.remove('active');
            }
        });
    }
}

// Helper function to read file content
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        
        if (file.type === 'text/plain') {
            reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
            // For PDFs, read as array buffer for PDF.js processing
            reader.readAsArrayBuffer(file);
        } else {
            // For other file types, try to read as text
            reader.readAsText(file);
        }
    });
}

// Helper function to extract text from PDF using PDF.js
async function extractTextFromPDF(arrayBuffer) {
    try {
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items from the page
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            fullText += pageText + '\n';
        }
        
        return fullText.trim();
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF. Please try copying and pasting the text instead.');
    }
}

// Helper function to clone and populate templates
function cloneTemplate(templateId, data = {}) {
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template ${templateId} not found`);
        return null;
    }
    
    const clone = template.content.cloneNode(true);
    
    // Populate data if provided
    Object.keys(data).forEach(key => {
        const elements = clone.querySelectorAll(`[data-${key}]`);
        elements.forEach(element => {
            element.setAttribute(`data-${key}`, data[key]);
        });
        
        const classElements = clone.querySelectorAll(`.${key}`);
        classElements.forEach(element => {
            element.textContent = data[key];
        });
    });
    
    return clone;
}

// Updated renderJobs function
function renderJobs() {
    // Clear existing content
    while (jobsList.firstChild) {
        jobsList.removeChild(jobsList.firstChild);
    }
    
    jobs.forEach(job => {
        const jobCard = cloneTemplate('job-card-template', {
            'job-id': job.id,
            'job-title': job.title,
            'job-description': job.description,
            'applicants-count': `${job.applicants} applicants`,
            'job-date': `Added ${job.date}`
        });
        
        if (jobCard) {
            // Add click event to job card
            const cardElement = jobCard.querySelector('.job-card');
            cardElement.addEventListener('click', () => {
                renderJobDetails(job.id);
            });
            
            // Add remove button listener
            const removeBtn = jobCard.querySelector('.remove-job-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showRemoveJobModal(job.id);
                });
            }
            
            jobsList.appendChild(jobCard);
        }
    });
}

// Updated renderJobDetails function - NO innerHTML
function renderJobDetails(jobId) {
    currentJobId = jobId;
    currentPage = 1;
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) return;

    // Get current settings
    const settings = getCurrentSettings();
    const jobSortOrder = job.sortOrder || settings.defaultSortOrder;

    // Sort resumes based on job-specific sort order or user preference
    const sortedResumes = sortResumes(job.resumes, jobSortOrder);

    // Clear existing content
    while (jobDetails.firstChild) {
        jobDetails.removeChild(jobDetails.firstChild);
    }
    
    // Clone and populate job details template
    const jobDetailsTemplate = cloneTemplate('job-details-template', {
        'job-details-title': job.title,
        'job-details-meta': `${job.applicants} applicants • Added ${job.date}`
    });
    
    if (jobDetailsTemplate) {
        jobDetails.appendChild(jobDetailsTemplate);
    }

    // Populate resumes list with sorted resumes
    const resumesList = document.getElementById('resumes-list');
    if (resumesList) {
        // Clear existing content
        while (resumesList.firstChild) {
            resumesList.removeChild(resumesList.firstChild);
        }
        
        if (sortedResumes.length === 0) {
            const emptyTemplate = cloneTemplate('empty-resumes-template');
            if (emptyTemplate) {
                resumesList.appendChild(emptyTemplate);
            }
        } else {
            sortedResumes.slice(0, resumesPerPage).forEach(resume => {
                const resumeCard = cloneTemplate('resume-card-template', {
                    'resume-id': resume.id,
                    'resume-name': resume.name,
                    'resume-score': resume.score
                });
                if (resumeCard) {
                    resumesList.appendChild(resumeCard);
                }
            });
        }
    }

    // Add load more button if needed
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        // Clear existing content
        while (loadMoreContainer.firstChild) {
            loadMoreContainer.removeChild(loadMoreContainer.firstChild);
        }
        
        if (job.resumes.length > resumesPerPage) {
            const loadMoreTemplate = cloneTemplate('load-more-button-template');
            if (loadMoreTemplate) {
                loadMoreContainer.appendChild(loadMoreTemplate);
            }
        }
    }

    // Add event listeners
    const addResumeBtn = document.getElementById('add-resume-btn');
    if (addResumeBtn) {
        addResumeBtn.addEventListener('click', () => {
            addResumeModal.style.display = 'flex';
        });
    }

    const editJobBtn = document.getElementById('edit-job-btn');
    if (editJobBtn) {
        editJobBtn.addEventListener('click', () => {
            showEditJobModal(currentJobId);
        });
    }

    const removeJobBtn = document.getElementById('remove-job-btn');
    if (removeJobBtn) {
        removeJobBtn.addEventListener('click', () => {
            showRemoveJobModal(job.id);
        });
    }

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadMoreResumes(job);
        });
    }

    // Setup search functionality
    setupSearchFunctionality(job);

    // Add event listeners to resume cards - with a small delay to ensure DOM is ready
    setTimeout(() => {
        addResumeCardListeners();
    }, 10);
}

// Updated renderResumesList function - NO innerHTML
function renderResumesList(resumes, page = 1) {
    const startIndex = (page - 1) * resumesPerPage;
    const endIndex = startIndex + resumesPerPage;
    const pageResumes = resumes.slice(startIndex, endIndex);
    
    const container = document.createElement('div');
    
    pageResumes.forEach(resume => {
        const resumeCard = cloneTemplate('resume-card-template', {
            'resume-id': resume.id,
            'resume-name': resume.name,
            'resume-score': resume.score
        });
        
        if (resumeCard) {
            container.appendChild(resumeCard);
        }
    });
    
    return container;
}

// Updated loadMoreResumes function - NO innerHTML
function loadMoreResumes(job) {
    if (isLoading) return;
    
    isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;
    }
    
    setTimeout(() => {
        currentPage++;
        const resumesList = document.getElementById('resumes-list');
        const newResumes = renderResumesList(job.resumes, currentPage);
        
        if (newResumes.childNodes.length > 0) {
            resumesList.appendChild(newResumes);
        }
        
        // Update or hide load more button
        const loadMoreContainer = document.getElementById('load-more-container');
        const totalPages = Math.ceil(job.resumes.length / resumesPerPage);
        
        if (currentPage >= totalPages) {
            // Clear existing content
            while (loadMoreContainer.firstChild) {
                loadMoreContainer.removeChild(loadMoreContainer.firstChild);
            }
            
            const allLoadedTemplate = cloneTemplate('all-loaded-template');
            if (allLoadedTemplate) {
                loadMoreContainer.appendChild(allLoadedTemplate);
            }
        } else {
            loadMoreBtn.textContent = 'Load More Resumes';
            loadMoreBtn.disabled = false;
        }
        
        addResumeCardListeners();
        isLoading = false;
    }, 500);
}

function addResumeCardListeners() {
    const resumeCards = document.querySelectorAll('.resume-card');
    
    resumeCards.forEach(card => {
        // Remove existing listeners to prevent duplicates
        card.removeEventListener('click', handleResumeClick);
        card.addEventListener('click', handleResumeClick);
        
        // Add trash button listener
        const trashBtn = card.querySelector('.btn-trash-resume');
        if (trashBtn) {
            // Remove existing listeners to prevent duplicates
            trashBtn.removeEventListener('click', handleTrashClick);
            trashBtn.addEventListener('click', handleTrashClick);
        }
    });
}

function handleResumeClick(e) {
    const resumeId = parseInt(e.currentTarget.getAttribute('data-resume-id'));
    showResumeAnalysis(currentJobId, resumeId);
}

function showResumeAnalysis(jobId, resumeId) {
    const job = jobs.find(j => j.id === jobId);
    const resume = job.resumes.find(r => r.id === resumeId);
    
    if (!resume) return;

    // Update analysis modal content
    const analysisTitle = document.getElementById('analysis-title');
    if (analysisTitle) {
        analysisTitle.textContent = `Resume Analysis - ${resume.name}`;
    }
    
    const aiScore = document.getElementById('ai-score');
    if (aiScore) {
        aiScore.textContent = resume.score;
    }
    
    // Update strengths
    const strengthsList = document.getElementById('strengths-list');
    if (strengthsList) {
        // Clear existing content
        while (strengthsList.firstChild) {
            strengthsList.removeChild(strengthsList.firstChild);
        }
        
        // Add new strengths
        resume.strengths.forEach(strength => {
            const li = document.createElement('li');
            li.textContent = strength;
            strengthsList.appendChild(li);
        });
    }
    
    // Update weaknesses
    const weaknessesList = document.getElementById('weaknesses-list');
    if (weaknessesList) {
        // Clear existing content
        while (weaknessesList.firstChild) {
            weaknessesList.removeChild(weaknessesList.firstChild);
        }
        
        // Add new weaknesses
        resume.weaknesses.forEach(weakness => {
            const li = document.createElement('li');
            li.textContent = weakness;
            weaknessesList.appendChild(li);
        });
    }
    
    // Update assessment
    const overallAssessment = document.getElementById('overall-assessment');
    if (overallAssessment) {
        overallAssessment.textContent = resume.assessment;
    }
    
    // Show modal
    analysisModal.style.display = 'flex';
}

function setupSearchFunctionality(job) {
    const searchInput = document.getElementById('applicant-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const resumesList = document.getElementById('resumes-list');
    
    if (!searchInput) return;
    
    // Get current settings for sorting
    const settings = getCurrentSettings();
    const jobSortOrder = job.sortOrder || settings.defaultSortOrder;

    // Clear previous search
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    
    // Search input event listener
    searchInput.addEventListener('input', function() {
        const regSearchTerm = this.value;
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            // Clear existing content first
            while (resumesList.firstChild) {
                resumesList.removeChild(resumesList.firstChild);
            }
            
            // Append the rendered resumes
            const renderedResumes = renderResumesList(job.resumes, 1);
            if (renderedResumes) {
                resumesList.appendChild(renderedResumes);
            }
            
            clearSearchBtn.style.display = 'none';
            addResumeCardListeners();
        } else {
            // Filter resumes based on search term
            const filteredResumes = job.resumes.filter(resume => 
                resume.name.toLowerCase().includes(searchTerm)
            );
            
            // Sort filtered results
            const sortedFilteredResumes = sortResumes(filteredResumes, jobSortOrder);

            // Clear existing content
            while (resumesList.firstChild) {
                resumesList.removeChild(resumesList.firstChild);
            }
            
            if (sortedFilteredResumes.length === 0) {
                resumesList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #888888;">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>No applicants found matching "${regSearchTerm}"</p>
                    </div>
                `;
            } else {
                // Append the rendered filtered resumes
                const renderedResumes = renderResumesList(sortedFilteredResumes, 1);
                if (renderedResumes) {
                    resumesList.appendChild(renderedResumes);
                }
                addResumeCardListeners();
            }
            
            clearSearchBtn.style.display = 'block';
        }
    });
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            
            // Clear existing content
            while (resumesList.firstChild) {
                resumesList.removeChild(resumesList.firstChild);
            }
            
            // Append the rendered resumes
            const renderedResumes = renderResumesList(job.resumes, 1);
            if (renderedResumes) {
                resumesList.appendChild(renderedResumes);
            }
            
            this.style.display = 'none';
            addResumeCardListeners();
        });
    }
}

// Add this function to load data from database on page load
async function loadDataFromDatabase() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return; // User not logged in, keep demo data
        }

        // Load jobs from database
        const { data: dbJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (jobsError) {
            console.error('Error loading jobs:', jobsError);
            return;
        }

        // Load resumes for each job
        for (const dbJob of dbJobs) {
            const { data: dbResumes, error: resumesError } = await supabase
                .from('resumes')
                .select('*')
                .eq('job_id', dbJob.id);

            if (resumesError) {
                console.error('Error loading resumes for job:', dbJob.id, resumesError);
                continue;
            }

            // Convert database format to local format
            const job = {
                id: dbJob.id,
                title: dbJob.title,
                description: dbJob.description.length > 100 ? dbJob.description.substring(0, 100) + '...' : dbJob.description,
                fullDescription: dbJob.description,
                customInstructions: dbJob.custom_instructions,
                sortOrder: dbJob.sort_order || 'score-desc',
                applicants: dbResumes.length,
                date: formatDate(dbJob.created_at),
                resumes: dbResumes.map(resume => ({
                    id: resume.id,
                    name: resume.name,
                    score: resume.score,
                    strengths: resume.strengths,
                    weaknesses: resume.weaknesses,
                    assessment: resume.assessment
                }))
            };

            jobs.push(job);
        }

        // Render the loaded data
        renderJobs();
        
    } catch (error) {
        console.error('Error loading data from database:', error);
    }
}

// Helper function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

// Initialize all settings controls
function initializeSettingsControls() {
    // Toggle switch functionality
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const settingName = this.getAttribute('data-setting');
            if (settingName) {
                currentSettings[settingName] = this.checked;
            }
        });
    });

    // Select control functionality
    document.querySelectorAll('.select-control').forEach(select => {
        select.addEventListener('change', function() {
            const settingName = this.getAttribute('data-setting');
            if (settingName) {
                // Convert to number for numeric settings
                if (settingName === 'defaultTopApplicants' || settingName === 'dataRetention') {
                    currentSettings[settingName] = parseInt(this.value, 10);
                } else {
                    currentSettings[settingName] = this.value;
                }
            }
        });
    });

    // ... rest of your existing code ...
}

// Function to remove a resume
async function removeResume(resumeId, jobId) {
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showConfirmationModal('Please log in to remove a resume.', 'error');
            return;
        }

        // Delete the resume from database
        const { error: resumeError } = await supabase
            .from('resumes')
            .delete()
            .eq('id', resumeId);

        if (resumeError) {
            console.error('Error deleting resume:', resumeError);
            showConfirmationModal('Error removing resume. Please try again.', 'error');
            return;
        }

        // Update local data
        const job = jobs.find(j => j.id === jobId);
        if (job) {
            job.resumes = job.resumes.filter(r => r.id !== resumeId);
            job.applicants = job.resumes.length;
        }

        // Re-render jobs list to update applicant count
        renderJobs();
        
        // Re-render job details if this job is currently selected
        if (currentJobId === jobId) {
            renderJobDetails(jobId);
        }
        
        showConfirmationModal('Resume removed successfully!', 'success');
        
    } catch (error) {
        console.error('Error removing resume:', error);
        showConfirmationModal('Error removing resume. Please try again.', 'error');
    }
}

// Add this new function to handle trash button clicks
function handleTrashClick(e) {
    e.stopPropagation();
    const resumeCard = e.currentTarget.closest('.resume-card');
    const resumeId = parseInt(resumeCard.getAttribute('data-resume-id'));
    resumeIdToRemove = resumeId;
    jobIdToRemoveFrom = currentJobId;
    showRemoveResumeModal();
}

function showRemoveResumeModal() {
    if (removeResumeModal) {
        removeResumeModal.style.display = 'flex';
    }
}

function closeRemoveResumeModal() {
    if (removeResumeModal) {
        removeResumeModal.style.display = 'none';
    }
    resumeIdToRemove = null;
    jobIdToRemoveFrom = null;
}

function showRemoveJobModal(jobId) {
    jobIdToRemove = jobId;
    if (removeJobModal) {
        removeJobModal.style.display = 'flex';
    }
}

function closeRemoveJobModal() {
    if (removeJobModal) {
        removeJobModal.style.display = 'none';
    }
    jobIdToRemove = null;
}

async function removeJob(jobId) {
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            showConfirmationModal('Please log in to remove a job.', 'error');
            return;
        }

        // Delete resumes first (due to foreign key constraint)
        const { error: resumesError } = await supabase
            .from('resumes')
            .delete()
            .eq('job_id', jobId);

        if (resumesError) {
            console.error('Error deleting resumes:', resumesError);
            showConfirmationModal('Error removing job. Please try again.', 'error');
            return;
        }

        // Delete the job
        const { error: jobError } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId)
            .eq('user_id', session.user.id);

        if (jobError) {
            console.error('Error deleting job:', jobError);
            showConfirmationModal('Error removing job. Please try again.', 'error');
            return;
        }

        // Remove from local array
        jobs = jobs.filter(job => job.id !== jobId);

        // Re-render jobs list
        renderJobs();

        // Clear job details if the removed job was selected
        if (currentJobId === jobId) {
            currentJobId = null;
            const jobDetails = document.getElementById('job-details');
            if (jobDetails) {
                jobDetails.innerHTML = `
                    <div class="section-header">
                        <h2>Select a Job</h2>
                        <p>Choose a job posting to view applicants and add resumes</p>
                    </div>
                `;
            }
        }

        showConfirmationModal('Job removed successfully!', 'success');

    } catch (error) {
        console.error('Error removing job:', error);
        showConfirmationModal('Error removing job. Please try again.', 'error');
    }
}

// Function to show edit job modal
function showEditJobModal(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Change modal title and button text
    document.getElementById('job-modal-title').textContent = 'Edit Job Posting';
    document.getElementById('job-submit-btn').textContent = 'Save Changes';
    
    // Show warning message
    document.getElementById('edit-warning').style.display = 'flex';
    
    // Populate the form with current job data
    document.getElementById('job-title').value = job.title;
    document.getElementById('job-description').value = job.fullDescription || job.description;
    document.getElementById('custom-instructions').value = job.customInstructions || '';
    
    // Set the sort order in the custom dropdown
    const sortOrderMap = {
        'score-desc': 'AI Score (High to Low)',
        'score-asc': 'AI Score (Low to High)',
        'date-desc': 'Recently Added',
        'date-asc': 'Oldest First',
        'name-asc': 'Name (A-Z)',
        'name-desc': 'Name (Z-A)'
    };
    
    const jobSortOrder = job.sortOrder || 'score-desc';
    const sortOrderText = document.getElementById('job-sort-order-text');
    if (sortOrderText) {
        sortOrderText.textContent = sortOrderMap[jobSortOrder];
    }
    
    // Update selected state in dropdown
    const dropdownItems = document.querySelectorAll('#job-sort-order-menu .dropdown-item');
    dropdownItems.forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.value === jobSortOrder) {
            item.classList.add('selected');
        }
    });

    // Store the job ID being edited
    window.editingJobId = jobId;
    
    // Show the modal
    addJobModal.style.display = 'flex';
}

// Function to show add new job modal
function showAddJobModal() {
    // Reset modal title and button text
    document.getElementById('job-modal-title').textContent = 'Add New Job Posting';
    document.getElementById('job-submit-btn').textContent = 'Create Job';
    
    // Hide warning message
    document.getElementById('edit-warning').style.display = 'none';
    
    // Clear the editing job ID
    window.editingJobId = null;
    
    // Reset form
    addJobForm.reset();
    applySettingsToAddJobModal();
    
    // Show the modal
    addJobModal.style.display = 'flex';
} 
// 1. Initialize Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

let supabase;
try {
    if (window.supabase && SUPABASE_URL !== 'https://your-project.supabase.co' && SUPABASE_ANON_KEY !== 'your-anon-key') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        // Supabase not available or environment variables not set
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
    // Fallback: show login button if initialization fails
    document.addEventListener('DOMContentLoaded', () => {
        const openLoginBtn = document.getElementById('open-login');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (openLoginBtn) openLoginBtn.style.display = 'block';
        if (profileDropdown) profileDropdown.style.display = 'none';
    });
}

// 2. Modal logic
const authModal = document.getElementById('auth-modal');
const openLoginBtn = document.getElementById('open-login');
const heroDashboardBtn = document.getElementById('hero-dashboard-btn');
const closeAuthModal = document.getElementById('close-auth-modal');

// 3. Profile dropdown elements
const profileDropdown = document.getElementById('profile-dropdown');
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// 4. Mobile navigation elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const navMenu = document.getElementById('nav-menu');

// Mobile navigation toggle
function toggleMobileMenu() {
    hamburgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
}

// Close mobile menu when clicking on a link
function closeMobileMenu() {
    hamburgerMenu.classList.remove('active');
    navMenu.classList.remove('active');
}

// Add event listeners for mobile navigation
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

// 5. Custom confirmation modal
function showConfirmationModal(message, type = 'success') {
  let confirmationModal = document.getElementById('confirmation-modal');
  if (!confirmationModal) {
    confirmationModal = document.createElement('div');
    confirmationModal.id = 'confirmation-modal';
    confirmationModal.className = 'confirmation-modal';
    confirmationModal.innerHTML = `
      <div class="confirmation-content">
        <div class="confirmation-icon">
          <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        </div>
        <h3>${type === 'success' ? 'Success!' : 'Notice'}</h3>
        <p>${message}</p>
        <button class="btn-primary" onclick="window.closeConfirmationModal()">OK</button>
      </div>
    `;
    document.body.appendChild(confirmationModal);
  } else {
    const icon = confirmationModal.querySelector('.confirmation-icon i');
    const title = confirmationModal.querySelector('h3');
    const messageEl = confirmationModal.querySelector('p');
    
    icon.className = `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`;
    title.textContent = type === 'success' ? 'Success!' : 'Notice';
    messageEl.textContent = message;
  }
  
  confirmationModal.style.display = 'flex';
}

function closeConfirmationModal() {
  const confirmationModal = document.getElementById('confirmation-modal');
  if (confirmationModal) {
    confirmationModal.style.display = 'none';
  }
}

// Make the function globally available
window.closeConfirmationModal = closeConfirmationModal;

// 6. Profile dropdown functions
function toggleProfileMenu() {
  profileMenu.classList.toggle('show');
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

// 7. Conditional dashboard button logic
function handleDashboardClick() {
    if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = 'dashboard.html';
            } else {
                openModal('signup');
            }
        });
    } else {
        // If Supabase is not available, show signup modal
        openModal('signup');
    }
}

// 8. Event listeners
if (openLoginBtn) openLoginBtn.onclick = () => { openModal('login'); };
if (heroDashboardBtn) heroDashboardBtn.onclick = handleDashboardClick;
if (closeAuthModal) closeAuthModal.onclick = () => { authModal.style.display = 'none'; };
if (profileBtn) profileBtn.onclick = toggleProfileMenu;
if (logoutBtn) logoutBtn.onclick = async () => {
    if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showConfirmationModal('Error logging out: ' + error.message, 'error');
        } else {
            showConfirmationModal('Successfully logged out!', 'success');
            updateUIForUser(null);
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    } else {
        showConfirmationModal('Authentication service not available', 'error');
    }
};

// Close profile menu when clicking outside
window.onclick = function(event) {
  if (event.target == authModal) authModal.style.display = 'none';
  if (event.target == document.getElementById('confirmation-modal')) closeConfirmationModal();
  
  // Close profile menu if clicking outside
  if (profileDropdown && !profileDropdown.contains(event.target)) {
    profileMenu.classList.remove('show');
  }
};

// 9. Auth form toggle logic
let isLoginMode = true;
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authToggle = document.getElementById('auth-toggle');

function toggleAuthMode() {
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
}

if (authToggle) {
  authToggle.addEventListener('click', toggleAuthMode);
}

// 10. Single auth form handler
const authForm = document.getElementById('auth-form');
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      showConfirmationModal('Authentication service not available. Please try again later.', 'error');
      return;
    }
    
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
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
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

// 11. Check session on load and update UI
if (supabase) {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
            console.error('Error checking session:', error);
            // Show login button if there's an error
            updateUIForUser(null);
        } else if (session) {
            // User is logged in
            updateUIForUser(session.user);
        } else {
            // No active session, showing login button
            updateUIForUser(null);
        }
    }).catch((error) => {
        console.error('Error in session check:', error);
        // Show login button if there's an error
        updateUIForUser(null);
    });

    // 12. Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            updateUIForUser(session.user);
        } else if (event === 'SIGNED_OUT') {
            updateUIForUser(null);
        }
    });
} else {
    // Fallback: show login button if Supabase isn't available
    document.addEventListener('DOMContentLoaded', () => {
        const openLoginBtn = document.getElementById('open-login');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (openLoginBtn) openLoginBtn.style.display = 'block';
        if (profileDropdown) profileDropdown.style.display = 'none';
    });
}

// 13. Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// 14. Add viewport meta tag for mobile optimization
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.head.appendChild(viewport);
}

// 15. EmailJS Integration
// Initialize EmailJS
(function() {
  emailjs.init('lHfbeCrhcjVrwCnHW');
})();

// Contact form functionality
document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.querySelector('.contact-form');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form data
      const userEmail = document.getElementById('contact-email').value.trim();
      const userMessage = document.getElementById('contact-message').value.trim();
      
      // Input validation
      if (!userEmail || !userMessage) {
        showConfirmationModal('Please fill in all fields before submitting.', 'error');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        showConfirmationModal('Please enter a valid email address.', 'error');
        return;
      }
      
      // Show loading state
      const submitButton = contactForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Sending...';
      submitButton.disabled = true;
      
      // Prepare template parameters
      const templateParams = {
        name: userEmail.split('@')[0], // Use email prefix as name
        email: userEmail,
        message: userMessage,
        title: 'Contact Form Submission',
        date: new Date().toLocaleString()
      };
      
      // Send email using EmailJS
      emailjs.send('service_q5l9qyr', 'template_fsdoj1u', templateParams)
        .then(function(response) {
          if (response.ok) {
            // Success
            showConfirmationModal('Message sent successfully!', 'success');
            contactForm.reset();
          } else {
            // Error
            showConfirmationModal('Failed to send message. Please try again.', 'error');
          }
        }, function(error) {
          showConfirmationModal('Failed to send message. Please try again.', 'error');
        })
        .finally(function() {
          // Reset button state
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        });
    });
  }
});
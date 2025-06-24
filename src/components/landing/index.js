// 1. Initialize Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// 4. Custom confirmation modal
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

// 5. Profile dropdown functions
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

// 6. Conditional dashboard button logic
function handleDashboardClick() {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      window.location.href = 'dashboard.html';
    } else {
      openModal('signup');
    }
  });
}

// 7. Event listeners
if (openLoginBtn) openLoginBtn.onclick = () => { openModal('login'); };
if (heroDashboardBtn) heroDashboardBtn.onclick = handleDashboardClick;
if (closeAuthModal) closeAuthModal.onclick = () => { authModal.style.display = 'none'; };
if (profileBtn) profileBtn.onclick = toggleProfileMenu;
if (logoutBtn) logoutBtn.onclick = async () => {
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

// 8. Auth form toggle logic
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

// 9. Single auth form handler
const authForm = document.getElementById('auth-form');
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

// 10. Check session on load and update UI
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    updateUIForUser(session.user);
  } else {
    updateUIForUser(null);
  }
});

// 11. Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    updateUIForUser(session.user);
  } else if (event === 'SIGNED_OUT') {
    updateUIForUser(null);
  }
});
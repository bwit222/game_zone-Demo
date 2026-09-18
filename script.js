/**
 * Roxy Game Zone • Authentication & Portal Script
 * Handles Sign In, Sign Up, Profile, Sessions, and Modals
 */

(function () {
  'use strict';

  // Determine Backend API Base URL
  // If hosted via the Express server (same origin), relative URL is used.
  // If opened via VS Code Live Server or another port, points to Express on localhost:5000.
  const API_BASE =
    window.location.origin.startsWith('http://localhost:5000') ||
    window.location.origin.startsWith('http://127.0.0.1:5000')
      ? ''
      : 'http://localhost:5000';

  // State
  let currentUser = null;

  // DOM Elements
  const guestGroup = document.getElementById('guestGroup');
  const userGroup = document.getElementById('userGroup');
  const headerUsername = document.getElementById('headerUsername');

  const openSignInBtn = document.getElementById('openSignInBtn');
  const openSignUpBtn = document.getElementById('openSignUpBtn');
  const openProfileBtn = document.getElementById('openProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const modalLogoutBtn = document.getElementById('modalLogoutBtn');
  const userBadge = document.getElementById('userBadge');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const signInModal = document.getElementById('signInModal');
  const signUpModal = document.getElementById('signUpModal');
  const profileModal = document.getElementById('profileModal');

  const closeSignInBtn = document.getElementById('closeSignInBtn');
  const closeSignUpBtn = document.getElementById('closeSignUpBtn');
  const closeProfileBtn = document.getElementById('closeProfileBtn');

  const switchToSignUp = document.getElementById('switchToSignUp');
  const switchToSignIn = document.getElementById('switchToSignIn');

  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');

  const toastContainer = document.getElementById('toastContainer');

  // Form Inputs
  const signInIdentifier = document.getElementById('signInIdentifier');
  const signInPassword = document.getElementById('signInPassword');
  const signInRemember = document.getElementById('signInRemember');
  const signInSubmitBtn = document.getElementById('signInSubmitBtn');

  const signUpFullName = document.getElementById('signUpFullName');
  const signUpUsername = document.getElementById('signUpUsername');
  const signUpEmail = document.getElementById('signUpEmail');
  const signUpPassword = document.getElementById('signUpPassword');
  const signUpConfirmPassword = document.getElementById('signUpConfirmPassword');
  const signUpSubmitBtn = document.getElementById('signUpSubmitBtn');

  // Profile fields
  const profileFullName = document.getElementById('profileFullName');
  const profileUsername = document.getElementById('profileUsername');
  const profileEmail = document.getElementById('profileEmail');
  const profileJoined = document.getElementById('profileJoined');

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message, type = 'info', duration = 4000) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Modal Management
  // ==========================================================================
  function openModal(modal) {
    closeAllModals(false);
    if (!modal) return;
    modal.hidden = false;
    modalBackdrop.classList.add('is-active');
    // Allow DOM reflow then trigger transition
    requestAnimationFrame(() => {
      modal.classList.add('is-active');
      const firstInput = modal.querySelector('input:not([type="hidden"]), button');
      if (firstInput) firstInput.focus();
    });
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-active');
    setTimeout(() => {
      modal.hidden = true;
      // If no other modal is active, deactivate backdrop
      const anyActive = document.querySelector('.auth-modal.is-active');
      if (!anyActive) {
        modalBackdrop.classList.remove('is-active');
      }
    }, 250);
  }

  function closeAllModals(clearBackdrop = true) {
    [signInModal, signUpModal, profileModal].forEach((m) => {
      if (m) {
        m.classList.remove('is-active');
        m.hidden = true;
      }
    });
    if (clearBackdrop && modalBackdrop) {
      modalBackdrop.classList.remove('is-active');
    }
  }

  // Event Listeners for Opening/Closing Modals
  if (openSignInBtn) {
    openSignInBtn.addEventListener('click', () => {
      clearFormErrors(signInForm);
      openModal(signInModal);
    });
  }

  if (openSignUpBtn) {
    openSignUpBtn.addEventListener('click', () => {
      clearFormErrors(signUpForm);
      openModal(signUpModal);
    });
  }

  if (openProfileBtn) {
    openProfileBtn.addEventListener('click', () => {
      populateProfileModal();
      openModal(profileModal);
    });
  }

  if (userBadge) {
    userBadge.addEventListener('click', () => {
      populateProfileModal();
      openModal(profileModal);
    });
  }

  if (closeSignInBtn) closeSignInBtn.addEventListener('click', () => closeModal(signInModal));
  if (closeSignUpBtn) closeSignUpBtn.addEventListener('click', () => closeModal(signUpModal));
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => closeModal(profileModal));

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => closeAllModals(true));
  }

  // Switch between Sign In and Sign Up
  if (switchToSignUp) {
    switchToSignUp.addEventListener('click', (e) => {
      e.preventDefault();
      clearFormErrors(signUpForm);
      openModal(signUpModal);
    });
  }

  if (switchToSignIn) {
    switchToSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      clearFormErrors(signInForm);
      openModal(signInModal);
    });
  }

  // Close modals on ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals(true);
    }
  });

  // ==========================================================================
  // Password Visibility Toggle
  // ==========================================================================
  document.querySelectorAll('.toggle-password-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const eye = btn.querySelector('.eye-icon');
      if (eye) {
        eye.textContent = isPassword ? '🙈' : '👁️';
      }
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });

  // ==========================================================================
  // Input Validation Helpers
  // ==========================================================================
  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}Error`);
    if (input) input.classList.add('is-invalid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  function clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}Error`);
    if (input) input.classList.remove('is-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }

  function clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-msg').forEach((el) => {
      el.textContent = '';
      el.classList.remove('show');
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,30}$/.test(username);
  }

  function isValidPassword(password) {
    if (password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  // Attach live clear on input
  [
    'signInIdentifier',
    'signInPassword',
    'signUpFullName',
    'signUpUsername',
    'signUpEmail',
    'signUpPassword',
    'signUpConfirmPassword'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => clearFieldError(id));
    }
  });

  // Button Loading State Helper
  function setButtonLoading(button, isLoading, normalText, loadingText) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text');
    const spinnerSpan = button.querySelector('.btn-spinner');

    if (isLoading) {
      button.disabled = true;
      if (textSpan) textSpan.textContent = loadingText;
      if (spinnerSpan) spinnerSpan.hidden = false;
    } else {
      button.disabled = false;
      if (textSpan) textSpan.textContent = normalText;
      if (spinnerSpan) spinnerSpan.hidden = true;
    }
  }

  // ==========================================================================
  // Authentication State Updates
  // ==========================================================================
  function updateUIForUser(user) {
    currentUser = user;
    if (user) {
      // User is logged in
      if (guestGroup) guestGroup.style.display = 'none';
      if (userGroup) userGroup.style.display = 'flex';
      if (headerUsername) headerUsername.textContent = user.username;
    } else {
      // User is logged out
      if (guestGroup) guestGroup.style.display = 'flex';
      if (userGroup) userGroup.style.display = 'none';
      if (headerUsername) headerUsername.textContent = 'Player';
    }
  }

  function populateProfileModal() {
    if (!currentUser) return;
    if (profileFullName) profileFullName.textContent = currentUser.full_name || 'Player';
    if (profileUsername) profileUsername.textContent = `@${currentUser.username}`;
    if (profileEmail) profileEmail.textContent = currentUser.email || 'N/A';

    if (profileJoined) {
      if (currentUser.created_at) {
        const date = new Date(currentUser.created_at);
        profileJoined.textContent = date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else {
        profileJoined.textContent = 'Active Player';
      }
    }
  }

  // ==========================================================================
  // Check Current Session (GET /api/auth/me)
  // ==========================================================================
  async function checkAuthSession() {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          updateUIForUser(data.user);
          return;
        }
      }
      updateUIForUser(null);
    } catch (err) {
      console.warn('[Game Zone] Auth session check could not reach backend API:', err.message);
      updateUIForUser(null);
    }
  }

  // ==========================================================================
  // Sign Up Handler (POST /api/auth/signup)
  // ==========================================================================
  if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(signUpForm);

      const fullName = signUpFullName.value.trim();
      const username = signUpUsername.value.trim();
      const email = signUpEmail.value.trim().toLowerCase();
      const password = signUpPassword.value;
      const confirmPassword = signUpConfirmPassword.value;

      // Frontend Validations
      let hasError = false;

      if (!fullName) {
        setFieldError('signUpFullName', 'Full name cannot be empty.');
        hasError = true;
      }

      if (!username) {
        setFieldError('signUpUsername', 'Username cannot be empty.');
        hasError = true;
      } else if (!isValidUsername(username)) {
        setFieldError('signUpUsername', 'Username must be 3–30 chars (letters, numbers, underscores).');
        hasError = true;
      }

      if (!email) {
        setFieldError('signUpEmail', 'Email address cannot be empty.');
        hasError = true;
      } else if (!isValidEmail(email)) {
        setFieldError('signUpEmail', 'Please enter a valid email address.');
        hasError = true;
      }

      if (!password) {
        setFieldError('signUpPassword', 'Password cannot be empty.');
        hasError = true;
      } else if (!isValidPassword(password)) {
        setFieldError(
          'signUpPassword',
          'Must be at least 8 chars with uppercase, lowercase, number & symbol.'
        );
        hasError = true;
      }

      if (!confirmPassword) {
        setFieldError('signUpConfirmPassword', 'Please confirm your password.');
        hasError = true;
      } else if (password !== confirmPassword) {
        setFieldError('signUpConfirmPassword', 'Passwords do not match.');
        hasError = true;
      }

      if (hasError) return;

      // Send to Backend
      setButtonLoading(signUpSubmitBtn, true, 'Create Account', 'Creating Account...');

      try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            full_name: fullName,
            username,
            email,
            password,
            confirm_password: confirmPassword
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showToast(data.message || 'Account created successfully!', 'success');
          updateUIForUser(data.user);
          signUpForm.reset();
          closeModal(signUpModal);
        } else {
          // Handle specific error conflicts
          if (response.status === 409) {
            if (data.message && data.message.toLowerCase().includes('username')) {
              setFieldError('signUpUsername', data.message);
            } else if (data.message && data.message.toLowerCase().includes('email')) {
              setFieldError('signUpEmail', data.message);
            }
          }
          showToast(data.message || 'Registration failed.', 'error');
        }
      } catch (err) {
        console.error('[Auth] Sign up network error:', err);
        showToast(
          'Unable to connect to the authentication server. Please verify the backend is running.',
          'error'
        );
      } finally {
        setButtonLoading(signUpSubmitBtn, false, 'Create Account', 'Creating Account...');
      }
    });
  }

  // ==========================================================================
  // Sign In Handler (POST /api/auth/signin)
  // ==========================================================================
  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(signInForm);

      const identifier = signInIdentifier.value.trim();
      const password = signInPassword.value;
      const rememberMe = signInRemember ? signInRemember.checked : false;

      let hasError = false;

      if (!identifier) {
        setFieldError('signInIdentifier', 'Please enter your email or username.');
        hasError = true;
      }

      if (!password) {
        setFieldError('signInPassword', 'Please enter your password.');
        hasError = true;
      }

      if (hasError) return;

      // Send to Backend
      setButtonLoading(signInSubmitBtn, true, 'Sign In', 'Signing In...');

      try {
        const response = await fetch(`${API_BASE}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            identifier,
            password,
            remember_me: rememberMe
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showToast(data.message || `Welcome back, ${data.user.username}!`, 'success');
          updateUIForUser(data.user);
          signInForm.reset();
          closeModal(signInModal);
        } else {
          showToast(data.message || 'Invalid email/username or password.', 'error');
          setFieldError('signInPassword', data.message || 'Invalid email/username or password.');
        }
      } catch (err) {
        console.error('[Auth] Sign in network error:', err);
        showToast(
          'Unable to connect to the authentication server. Please ensure the backend is running.',
          'error'
        );
      } finally {
        setButtonLoading(signInSubmitBtn, false, 'Sign In', 'Signing In...');
      }
    });
  }

  // ==========================================================================
  // Logout Handler (POST /api/auth/logout)
  // ==========================================================================
  async function performLogout() {
    try {
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await response.json();
      showToast(data.message || 'You have been logged out successfully.', 'success');
    } catch (err) {
      console.warn('[Auth] Logout network request error:', err);
      showToast('You have been logged out.', 'info');
    } finally {
      updateUIForUser(null);
      closeAllModals(true);
    }
  }

  if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
  if (modalLogoutBtn) modalLogoutBtn.addEventListener('click', performLogout);

  // ==========================================================================
  // Initialization
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
  });
})();

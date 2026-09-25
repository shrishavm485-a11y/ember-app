const tabBtns = document.querySelectorAll('.tab-btn');
const forms = document.querySelectorAll('.auth-form');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
  });
});

// If already signed in, skip straight to the app.
if (getSession()) window.location.href = 'app.html';

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const result = verifyUser(username, password);
  const errorEl = document.getElementById('login-error');
  if (!result.ok) {
    errorEl.textContent = result.error;
    return;
  }
  errorEl.textContent = '';
  setSession(result.user.username);
  window.location.href = 'app.html';
});

document.getElementById('signup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const display = document.getElementById('signup-display').value;
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  const result = createUser(username, password, display);
  const errorEl = document.getElementById('signup-error');
  if (!result.ok) {
    errorEl.textContent = result.error;
    return;
  }
  errorEl.textContent = '';
  setSession(username.trim().toLowerCase());
  window.location.href = 'app.html';
});
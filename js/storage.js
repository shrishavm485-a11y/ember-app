/* Ember — shared storage layer.
   Everything lives in this browser's localStorage. There is no server:
   two different ACCOUNTS in two different TABS of the same browser can
   message each other live, because localStorage fires a 'storage' event
   in other open tabs whenever it changes. That's what makes the demo work. */

const DB_USERS = 'ember_users';
const DB_SESSION = 'ember_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(DB_USERS) || '{}');
}
function saveUsers(users) {
  localStorage.setItem(DB_USERS, JSON.stringify(users));
}

// NOTE: this is a client-only demo. Passwords are stored in plain text in
// this browser's localStorage — fine for trying the app locally, but never
// do this in anything real. A production build needs a real backend with
// proper hashing (e.g. bcrypt) and auth tokens.
function createUser(username, password, displayName) {
  const users = getUsers();
  const key = username.trim().toLowerCase();
  if (!key || !password) return { ok: false, error: 'Fill in every field.' };
  if (users[key]) return { ok: false, error: 'That username is taken.' };
  users[key] = {
    username: key,
    password,
    displayName: displayName.trim() || key,
    color: colorForUsername(key),
    createdAt: Date.now(),
  };
  saveUsers(users);
  return { ok: true };
}

function verifyUser(username, password) {
  const users = getUsers();
  const key = username.trim().toLowerCase();
  const u = users[key];
  if (!u || u.password !== password) return { ok: false, error: 'Wrong username or password.' };
  return { ok: true, user: u };
}

function setSession(username) {
  localStorage.setItem(DB_SESSION, username);
}
function getSession() {
  return localStorage.getItem(DB_SESSION);
}
function clearSession() {
  localStorage.removeItem(DB_SESSION);
}

function colorForUsername(username) {
  const palette = ['#e4a63a', '#c86e5c', '#6ea8b0', '#8a95c4', '#b58ac9', '#7fae7a'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

function pairKey(a, b) {
  return [a, b].sort().join('__');
}

function getContacts(username) {
  return JSON.parse(localStorage.getItem(`ember_contacts_${username}`) || '[]');
}
function addContact(username, otherUsername) {
  const list = getContacts(username);
  if (!list.includes(otherUsername)) {
    list.push(otherUsername);
    localStorage.setItem(`ember_contacts_${username}`, JSON.stringify(list));
  }
  // mutual — so it shows up on both sides
  const otherList = getContacts(otherUsername);
  if (!otherList.includes(username)) {
    otherList.push(username);
    localStorage.setItem(`ember_contacts_${otherUsername}`, JSON.stringify(otherList));
  }
}

function getMessages(key) {
  return JSON.parse(localStorage.getItem(`ember_messages_${key}`) || '[]');
}
function saveMessages(key, messages) {
  localStorage.setItem(`ember_messages_${key}`, JSON.stringify(messages));
}

function getChatSettings(key) {
  return JSON.parse(localStorage.getItem(`ember_settings_${key}`) || '{"disappearing":false,"duration":60000}');
}
function saveChatSettings(key, settings) {
  localStorage.setItem(`ember_settings_${key}`, JSON.stringify(settings));
}

// Presence: a heartbeat timestamp per user, refreshed while the tab is open.
function touchPresence(username) {
  localStorage.setItem(`ember_presence_${username}`, String(Date.now()));
}
function isOnline(username) {
  const t = Number(localStorage.getItem(`ember_presence_${username}`) || 0);
  return Date.now() - t < 10000;
}

// Typing signal, keyed by "who is typing, to whom".
function setTyping(from, to, isTyping) {
  const k = `ember_typing_${from}_${to}`;
  if (isTyping) localStorage.setItem(k, String(Date.now()));
  else localStorage.removeItem(k);
}
function isTyping(from, to) {
  const t = Number(localStorage.getItem(`ember_typing_${from}_${to}`) || 0);
  return Date.now() - t < 2500;
}
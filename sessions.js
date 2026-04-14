/* ============================================================
   FocusSync - Shared JavaScript (public/js/app.js)
   Syllabus Topics Covered:
   ─ CO1: JavaScript functions, variables, scope
   ─ CO2: DOM manipulation (getElementById, createElement)
   ─ CO2: Event handling (addEventListener)
   ─ CO2: XMLHttpRequest AJAX (NOT fetch/axios – syllabus req.)
   ─ CO2: Window object methods & properties
   ─ CO5: Page Visibility API (distraction detection)
   ─ CO5: Keyboard Events (Space / E / D shortcuts)
   ─ CO5: Blob API (export session report as .txt file)
   ─ CO2: Browser session auth (cookies via express-session)
   ============================================================ */


// ══════════════════════════════════════════════════════════════
// 1. TOAST NOTIFICATION SYSTEM
//    CO2: DOM manipulation — dynamically create/remove elements
// ══════════════════════════════════════════════════════════════

function showToast(message, type, duration) {
  type     = type     || 'info';
  duration = duration || 3500;

  var container = document.getElementById('toast-container');
  if (!container) return;

  var toast        = document.createElement('div');
  toast.className  = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity    = '0';
    setTimeout(function () { toast.remove(); }, 400);
  }, duration);
}


// ══════════════════════════════════════════════════════════════
// 2. AJAX HELPER — XMLHttpRequest
//    CO2: xmlhttp object — open, setRequestHeader, send, onreadystatechange
// ══════════════════════════════════════════════════════════════

function ajaxRequest(method, url, data, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      try {
        var response = JSON.parse(xhr.responseText);
        callback(xhr.status, response);
      } catch (e) {
        callback(xhr.status, { message: 'Invalid server response' });
      }
    }
  };
  xhr.send(data ? JSON.stringify(data) : null);
}


// ══════════════════════════════════════════════════════════════
// 3. AUTH HELPERS
//    CO2: Session-based auth via cookies (not JWT)
// ══════════════════════════════════════════════════════════════

function checkAuth(callback) {
  ajaxRequest('GET', '/api/auth/me', null, function (status, data) {
    if (status === 200) {
      callback(true, data.user);
    } else {
      callback(false, null);
    }
  });
}

function logout() {
  ajaxRequest('POST', '/api/auth/logout', {}, function () {
    window.location.href = '/login';
  });
}


// ══════════════════════════════════════════════════════════════
// 4. NAVBAR STATE UPDATE
//    CO2: DOM manipulation based on auth state
// ══════════════════════════════════════════════════════════════

function updateNavbar(user) {
  var guestLinks   = document.getElementById('nav-guest');
  var userLinks    = document.getElementById('nav-user');
  var userNameSpan = document.getElementById('nav-username');

  if (user) {
    if (guestLinks)   guestLinks.classList.add('hidden');
    if (userLinks)    userLinks.classList.remove('hidden');
    if (userNameSpan) userNameSpan.textContent = user.name;
  } else {
    if (guestLinks) guestLinks.classList.remove('hidden');
    if (userLinks)  userLinks.classList.add('hidden');
  }
}


// ══════════════════════════════════════════════════════════════
// 5. IST DATE/TIME HELPER — FIX-6
//    CO2: Date object, toLocaleString with timezone
//    Converts any Date / epoch-ms value to IST (Asia/Kolkata) AM/PM format
// ══════════════════════════════════════════════════════════════

/**
 * toIST(dateOrTimestamp)
 * Returns a human-readable IST string, e.g. "14 Apr 2026, 09:30 AM"
 * FIX-6: All timestamps in the UI now show Indian Standard Time with AM/PM
 */
function toIST(dateOrTimestamp) {
  if (!dateOrTimestamp) return 'N/A';
  var d = (dateOrTimestamp instanceof Date) ? dateOrTimestamp : new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    timeZone:     'Asia/Kolkata',
    day:          '2-digit',
    month:        'short',
    year:         'numeric',
    hour:         'numeric',
    minute:       '2-digit',
    hour12:       true     // AM / PM
  });
}

/**
 * toISTTime(dateOrTimestamp)
 * Returns only the time portion in IST, e.g. "09:30 AM"
 */
function toISTTime(dateOrTimestamp) {
  if (!dateOrTimestamp) return 'N/A';
  var d = (dateOrTimestamp instanceof Date) ? dateOrTimestamp : new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour:     'numeric',
    minute:   '2-digit',
    hour12:   true
  });
}

// Expose globally so room.html / leaderboard.html can use them
window.toIST     = toIST;
window.toISTTime = toISTTime;


// ══════════════════════════════════════════════════════════════
// 6. PAGE VISIBILITY API — DISTRACTION DETECTION (FIX-2)
//    CO5: HTML5 Page Visibility API
//
//    FIX-2 / FIX-4d: Added a debounce guard so that a single
//    tab-switch only fires ONE distraction, never a spurious
//    reconnect that would trigger the server-side leave event.
// ══════════════════════════════════════════════════════════════

window.focusSyncSessionActive = false;
window.onFocusDistraction     = null;

// FIX-2: debounce state – prevents duplicate distraction events
// and prevents rapid hide/show from firing multiple times in 1 second
var _distractionCooldown = false;

document.addEventListener('visibilitychange', function () {
  if (document.hidden && window.focusSyncSessionActive) {
    if (_distractionCooldown) return;          // FIX-2: skip if within cooldown
    _distractionCooldown = true;
    setTimeout(function () { _distractionCooldown = false; }, 1000); // 1 s cooldown

    if (typeof window.onFocusDistraction === 'function') {
      window.onFocusDistraction('visibility');
    }
  }
});

// FIX-2: Also guard the window blur event – some browsers fire BOTH
// visibilitychange AND window.blur when switching tabs. We only want ONE.
// The visibilitychange handler above is the authoritative one; this guard
// on window.blur ensures it only fires when visibilitychange doesn't cover it.
var _lastVisibilityDistraction = 0;
window.addEventListener('blur', function () {
  // Only fire if session is active AND it's NOT a simple re-focus from an
  // in-page element (e.g., clicking a button). Check that document isn't
  // already hidden (that case is handled by visibilitychange above).
  if (!window.focusSyncSessionActive) return;
  if (document.hidden) return;   // already handled by visibilitychange
  var now = Date.now();
  if (now - _lastVisibilityDistraction < 2000) return;  // dedupe within 2 s
  _lastVisibilityDistraction = now;

  if (typeof window.onFocusDistraction === 'function') {
    window.onFocusDistraction('blur');
  }
});


// ══════════════════════════════════════════════════════════════
// 7. KEYBOARD SHORTCUTS
//    CO2: KeyboardEvent handling
// ══════════════════════════════════════════════════════════════

window.focusSyncShortcuts = {
  onSpace:    null,
  onEnd:      null,
  onDistract: null
};

document.addEventListener('keydown', function (e) {
  var tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case ' ':
    case 'Space':
      e.preventDefault();
      if (typeof window.focusSyncShortcuts.onSpace === 'function') {
        window.focusSyncShortcuts.onSpace();
        showToast('▶ Session started via Space key', 'info', 2000);
      }
      break;

    case 'e':
    case 'E':
      if (typeof window.focusSyncShortcuts.onEnd === 'function') {
        window.focusSyncShortcuts.onEnd();
        showToast('⏹ Ending session via E key', 'info', 2000);
      }
      break;

    case 'd':
    case 'D':
      if (typeof window.focusSyncShortcuts.onDistract === 'function') {
        window.focusSyncShortcuts.onDistract();
        showToast('⚡ Distraction self-reported via D key', 'info', 2000);
      }
      break;
  }
});


// ══════════════════════════════════════════════════════════════
// 8. BLOB API — EXPORT SESSION REPORT (FIX-6: IST timestamps)
//    CO5: Blob API to create downloadable text files in browser
// ══════════════════════════════════════════════════════════════

function exportSessionReport(sessionData) {
  // FIX-6: use toIST() for the report date
  var reportDate = sessionData.date
    ? toIST(new Date(sessionData.date))
    : toIST(new Date());

  var lines = [
    '========================================',
    '       FocusSync - Session Report       ',
    '========================================',
    '',
    'Room ID       : ' + (sessionData.roomId      || 'N/A'),
    'Date (IST)    : ' + reportDate,             // FIX-6: IST
    'Duration      : ' + (sessionData.duration     || 0) + ' minutes',
    'Distractions  : ' + (sessionData.distractions || 0),
    'Focus Score   : ' + (sessionData.focusScore   || 100) + '%',
    '',
    '--- Performance Assessment ---',
    getFocusGrade(sessionData.focusScore),
    '',
    'Tips for next session:',
    ' - Put phone on silent mode',
    ' - Close unrelated browser tabs',
    ' - Stay hydrated',
    '',
    'Generated by FocusSync at ' + toIST(new Date()),   // FIX-6: IST
    '========================================'
  ];

  var reportText = lines.join('\n');
  var blob = new Blob([reportText], { type: 'text/plain' });
  var url  = URL.createObjectURL(blob);

  var a      = document.createElement('a');
  a.href     = url;
  a.download = 'focussync-report-' + Date.now() + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('📄 Report downloaded!', 'success', 3000);
}

function getFocusGrade(score) {
  if (score >= 90) return 'Excellent focus! Keep it up! 🌟';
  if (score >= 70) return 'Good session. A few distractions but well done! 👍';
  if (score >= 50) return 'Average session. Try to reduce distractions next time. 🙂';
  return 'Needs improvement. Limit distractions for a better score. 💪';
}


// ══════════════════════════════════════════════════════════════
// 9. DOMContentLoaded — INIT
//    CO2: Event-driven initialization
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  checkAuth(function (isLoggedIn, user) {
    updateNavbar(isLoggedIn ? user : null);
  });

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });
  }

  var currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  if (currentPath === '/room') {
    setTimeout(function () {
      showToast('⌨️ Shortcuts: Space=Start  E=End  D=Distraction', 'info', 5000);
    }, 1500);
  }
});


// ══════════════════════════════════════════════════════════════
// 10. WEB AUDIO API — AUDIO FEEDBACK
//     CO2: Feature 4 — AudioContext, OscillatorNode, GainNode
// ══════════════════════════════════════════════════════════════

var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function _beep(frequency, duration, type, volume) {
  try {
    var ctx  = getAudioCtx();
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
  }
}

function playBeepStart() {
  _beep(440, 0.15, 'sine', 0.35);
  setTimeout(function () { _beep(880, 0.25, 'sine', 0.3); }, 160);
}

function playBeepDistraction() {
  _beep(220, 0.1, 'sawtooth', 0.4);
  setTimeout(function () { _beep(200, 0.15, 'square', 0.3); }, 120);
}

function playBeepEnd() {
  _beep(880, 0.2, 'sine', 0.3);
  setTimeout(function () { _beep(660, 0.2, 'sine', 0.25); }, 220);
  setTimeout(function () { _beep(550, 0.35, 'sine', 0.2);  }, 440);
}

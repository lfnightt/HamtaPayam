(function () {
  const WORKER_BASE_URL = 'https://payamresan-worker.ltfyamyry-0lt.workers.dev/';
  const ROOM_ID = 'public';
  const STORAGE_KEY = 'hamtapayam_public_messages_v1';
  const UID_KEY = 'hamtapayam_uid_v1';

  const getOrCreateUid = () => {
    try {
      const existing = localStorage.getItem(UID_KEY);
      if (existing) return existing;
      const next = (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : String(Date.now());
      localStorage.setItem(UID_KEY, next);
      return next;
    } catch {
      return 'anonymous';
    }
  };

  const selfUid = getOrCreateUid();

  const chats = {
    public: {
      name: 'Public Chat',
      status: 'public',
      messages: [{ id: 'welcome', uid: 'system', text: 'Welcome to Public Chat.', ts: Date.now(), dir: 'in', time: ' ' }],
    }
  };

  const chatRoot = document.querySelector('main.chat');
  const listRoot = document.querySelector('.chat-list');
  if (!chatRoot || !listRoot) return;

  const headerName = chatRoot.querySelector('.chat__name');
  const headerStatus = chatRoot.querySelector('.chat__status');
  const messagesRoot = chatRoot.querySelector('.chat__messages');

  const formatTime = (date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const setChatListPreview = (chatId, previewText, timeText) => {
    const item = listRoot.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (!item) return;
    const preview = item.querySelector('.chat-item__preview');
    const time = item.querySelector('.chat-item__time');
    if (preview) preview.textContent = previewText;
    if (time) time.textContent = timeText;
  };

  const setActiveChatItem = (chatId) => {
    const items = listRoot.querySelectorAll('.chat-item[data-chat-id]');
    items.forEach((el) => {
      const active = el.getAttribute('data-chat-id') === chatId;
      el.classList.toggle('chat-item--active', active);
      if (active) {
        el.setAttribute('aria-current', 'true');
      } else {
        el.removeAttribute('aria-current');
      }
    });
  };

  const renderMessages = (messages) => {
    if (!messagesRoot) return;
    messagesRoot.innerHTML = '';

    for (const m of messages) {
      const wrap = document.createElement('div');
      wrap.className = `message message--${m.dir}`;

      const bubble = document.createElement('div');
      bubble.className = 'message__bubble';
      bubble.textContent = m.text;

      const meta = document.createElement('div');
      meta.className = 'message__meta';
      meta.textContent = m.time;

      wrap.appendChild(bubble);
      wrap.appendChild(meta);
      messagesRoot.appendChild(wrap);
    }

    messagesRoot.scrollTop = messagesRoot.scrollHeight;
  };

  const openChat = (chatId) => {
    const chat = chats[chatId];
    if (!chat) return;

    if (headerName) headerName.textContent = chat.name;
    if (headerStatus) headerStatus.textContent = chat.status;

    setActiveChatItem(chatId);
    renderMessages(chat.messages);
  };

  listRoot.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.chat-item[data-chat-id]') : null;
    if (!(btn instanceof HTMLButtonElement)) return;

    const id = btn.getAttribute('data-chat-id');
    if (!id) return;

    openChat(id);
  });

  const msgMenu = document.createElement('div');
  msgMenu.className = 'msg-menu';
  msgMenu.innerHTML = `
    <button class="msg-menu__item" type="button" data-action="reply"><i class="fa-solid fa-reply" aria-hidden="true"></i><span>Reply</span></button>
    <button class="msg-menu__item" type="button" data-action="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy</span></button>
    <button class="msg-menu__item" type="button" data-action="pin"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i><span>Pin</span></button>
    <button class="msg-menu__item" type="button" data-action="select"><i class="fa-regular fa-circle-check" aria-hidden="true"></i><span>Select</span></button>
    <button class="msg-menu__item msg-menu__item--danger" type="button" data-action="delete"><i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>Delete</span></button>
  `;
  document.body.appendChild(msgMenu);

  let msgMenuTarget = null;

  const closeMsgMenu = () => {
    msgMenu.classList.remove('is-open');
    msgMenuTarget = null;
  };

  const openMsgMenuUnderCursor = (bubble, clientX, clientY) => {
    const margin = 8;
    const w = 194;
    const h = 170;

    let left = clientX;
    let top = clientY + margin;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + w + margin > vw) left = vw - w - margin;
    if (left < margin) left = margin;

    if (top + h + margin > vh) top = clientY - h - margin;
    if (top < margin) top = margin;

    msgMenu.style.left = left + 'px';
    msgMenu.style.top = top + 'px';
    msgMenuTarget = bubble;
    msgMenu.classList.add('is-open');
  };

  document.addEventListener('contextmenu', (e) => {
    if (!(e.target instanceof Element)) {
      e.preventDefault();
      return;
    }

    const bubble = e.target.closest('.message__bubble');
    if (bubble) {
      e.preventDefault();
      e.stopPropagation();
      openMsgMenuUnderCursor(bubble, e.clientX, e.clientY);
      return;
    }

    e.preventDefault();
    closeMsgMenu();
  });

  msgMenu.addEventListener('click', async (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    if (!(msgMenuTarget instanceof HTMLElement)) return;

    const action = btn.getAttribute('data-action');
    const text = msgMenuTarget.textContent || '';

    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      closeMsgMenu();
      return;
    }

    if (action === 'delete') {
      const wrap = msgMenuTarget.closest('.message');
      wrap?.remove();
      closeMsgMenu();
      return;
    }

    if (action === 'reply') {
      if (composerInput) {
        composerInput.value = (composerInput.value ? composerInput.value + ' ' : '') + text;
        composerInput.focus();
      }
      closeMsgMenu();
      return;
    }

    closeMsgMenu();
  });

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const inside = e.target.closest('.msg-menu');
    if (!inside) closeMsgMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMsgMenu();
  });

  window.addEventListener('scroll', closeMsgMenu, { passive: true });
  window.addEventListener('resize', closeMsgMenu, { passive: true });

  const loadLocalMessages = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed
        .filter((m) => m && typeof m === 'object')
        .map((m) => ({
          id: typeof m.id === 'string' ? m.id : String(Date.now()),
          uid: typeof m.uid === 'string' ? m.uid : 'anonymous',
          text: typeof m.text === 'string' ? m.text : '',
          ts: typeof m.ts === 'number' ? m.ts : Date.now(),
        }))
        .filter((m) => m.text.trim());
      if (!cleaned.length) return;

      const chat = chats.public;
      const toUi = cleaned.map((m) => ({
        ...m,
        dir: m.uid === selfUid ? 'out' : 'in',
        time: formatTime(new Date(m.ts)),
      }));
      chat.messages = toUi.slice(-200);
    } catch {
      return;
    }
  };

  const saveLocalMessages = () => {
    try {
      const chat = chats.public;
      const data = chat.messages
        .slice(-200)
        .map((m) => ({ id: m.id, uid: m.uid, text: m.text, ts: m.ts }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      return;
    }
  };

  const seenIds = new Set();
  const ingestMessage = (m) => {
    if (!m || typeof m !== 'object') return;
    if (typeof m.id !== 'string' || !m.id) return;
    if (seenIds.has(m.id)) return;
    const text = typeof m.text === 'string' ? m.text : '';
    if (!text.trim()) return;
    const ts = typeof m.ts === 'number' ? m.ts : Date.now();
    const uid = typeof m.uid === 'string' ? m.uid : 'anonymous';

    seenIds.add(m.id);

    const ui = {
      id: m.id,
      uid,
      text,
      ts,
      dir: uid === selfUid ? 'out' : 'in',
      time: formatTime(new Date(ts)),
    };

    const chat = chats.public;
    chat.messages.push(ui);
    chat.messages = chat.messages.slice(-200);
    saveLocalMessages();
    renderMessages(chat.messages);
    setChatListPreview('public', ui.text, ui.time);
  };

  const ingestHistory = (messages) => {
    if (!Array.isArray(messages)) return;
    for (const m of messages) ingestMessage(m);
  };

  const createFabBtn = document.querySelector('.sidebar-fab__btn');
  const createMenu = document.createElement('div');
  createMenu.className = 'create-menu';
  createMenu.innerHTML = `
    <button class="create-menu__item" type="button" data-action="new-channel"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i><span>New Channel</span></button>
    <button class="create-menu__item" type="button" data-action="new-group"><i class="fa-solid fa-user-group" aria-hidden="true"></i><span>New Group</span></button>
  `;
  document.body.appendChild(createMenu);

  const overlay = document.querySelector('.sidebar-overlay');
  const overlayTitle = overlay?.querySelector('.sidebar-overlay__title');
  const overlayBack = overlay?.querySelector('.sidebar-overlay__back');
  const overlayName = overlay?.querySelector('.overlay-input--name');
  const overlayDesc = overlay?.querySelector('.overlay-input--desc');
  const overlayNext = overlay?.querySelector('.overlay-next');
  const sidebarRoot = document.querySelector('.sidebar');
  let overlayMode = 'channel';

  let overlayClosing = false;
  let overlayCloseToken = 0;

  const setOverlayOpen = (open) => {
    if (!(overlay instanceof HTMLElement)) return;

    overlayCloseToken += 1;
    const token = overlayCloseToken;

    if (open) {
      overlayClosing = false;
      overlay.classList.remove('is-closing');
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      if (sidebarRoot) sidebarRoot.classList.add('sidebar--overlay-open');

      overlay.classList.add('is-preopen');
      void overlay.offsetWidth;

      requestAnimationFrame(() => {
        if (token !== overlayCloseToken) return;
        overlay.classList.remove('is-preopen');
        overlay.classList.add('is-open');
      });
      return;
    }

    if (overlayClosing) return;
    overlayClosing = true;
    if (overlayNext) overlayNext.classList.remove('is-visible');

    overlay.classList.remove('is-open');
    overlay.classList.remove('is-preopen');
    overlay.classList.add('is-closing');
    overlay.setAttribute('aria-hidden', 'true');
    if (sidebarRoot) sidebarRoot.classList.remove('sidebar--overlay-open');

    const onEnd = (e) => {
      if (token !== overlayCloseToken) return;
      if (e && e.target !== overlay) return;
      if (e && e.propertyName !== 'transform') return;

      overlay.removeEventListener('transitionend', onEnd);
      overlay.classList.remove('is-closing');
      overlayClosing = false;
    };

    overlay.addEventListener('transitionend', onEnd);
    setTimeout(() => {
      if (token !== overlayCloseToken) return;
      if (!overlay.classList.contains('is-closing')) return;
      overlay.removeEventListener('transitionend', onEnd);
      overlay.classList.remove('is-closing');
      overlayClosing = false;
    }, 350);
  };

  const configureOverlay = (mode) => {
    overlayMode = mode;
    if (overlayTitle) overlayTitle.textContent = mode === 'group' ? 'New Group' : 'New Channel';
    if (overlayName instanceof HTMLInputElement) {
      overlayName.placeholder = mode === 'group' ? 'Group name' : 'Channel name';
      overlayName.setAttribute('aria-label', mode === 'group' ? 'Group name' : 'Channel name');
    }
  };

  const updateOverlayNextVisibility = () => {
    if (!(overlayNext instanceof HTMLButtonElement)) return;
    const value = overlayName instanceof HTMLInputElement ? overlayName.value.trim() : '';
    overlayNext.classList.toggle('is-visible', Boolean(value));
  };

  const closeCreateMenu = () => {
    createMenu.classList.remove('is-open');
    if (createFabBtn) createFabBtn.setAttribute('aria-expanded', 'false');
  };

  const openCreateMenuAtFab = () => {
    if (!(createFabBtn instanceof HTMLElement)) return;

    const rect = createFabBtn.getBoundingClientRect();
    const margin = 8;
    const w = 180;
    const h = 74;

    let left = rect.left - w + 18;
    let top = rect.top - h - margin;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + w + margin > vw) left = vw - w - margin;
    if (left < margin) left = margin;

    if (top < margin) top = rect.bottom + margin;
    if (top + h + margin > vh) top = vh - h - margin;

    createMenu.style.left = left + 'px';
    createMenu.style.top = top + 'px';
    createMenu.classList.add('is-open');
    createFabBtn.setAttribute('aria-expanded', 'true');
  };

  if (createFabBtn) {
    createFabBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = createMenu.classList.contains('is-open');
      if (open) closeCreateMenu();
      else openCreateMenuAtFab();
    });
  }

  createMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    const action = btn.getAttribute('data-action');
    closeCreateMenu();
    if (action === 'new-channel') {
      configureOverlay('channel');
      if (overlayName instanceof HTMLInputElement) overlayName.value = '';
      if (overlayDesc instanceof HTMLInputElement) overlayDesc.value = '';
      setOverlayOpen(true);
      if (overlayName instanceof HTMLInputElement) overlayName.focus();
      updateOverlayNextVisibility();
      return;
    }
    if (action === 'new-group') {
      configureOverlay('group');
      if (overlayName instanceof HTMLInputElement) overlayName.value = '';
      if (overlayDesc instanceof HTMLInputElement) overlayDesc.value = '';
      setOverlayOpen(true);
      if (overlayName instanceof HTMLInputElement) overlayName.focus();
      updateOverlayNextVisibility();
      return;
    }
  });

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const inside = e.target.closest('.create-menu') || e.target.closest('.sidebar-fab__btn');
    if (!inside) closeCreateMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCreateMenu();
      setOverlayOpen(false);
    }
  });

  window.addEventListener('scroll', closeCreateMenu, { passive: true });
  window.addEventListener('resize', closeCreateMenu, { passive: true });

  if (overlayBack) {
    overlayBack.addEventListener('click', () => setOverlayOpen(false));
  }

  if (overlayNext) {
    overlayNext.addEventListener('click', () => setOverlayOpen(false));
  }

  if (overlayName instanceof HTMLInputElement) {
    overlayName.addEventListener('input', updateOverlayNextVisibility);
  }

  const emojiBtn = document.querySelector('.composer__btn--emoji');
  const emojiMenu = document.querySelector('.emoji-menu');
  const emojiPicker = document.querySelector('emoji-picker');
  const composerInput = document.querySelector('.composer__input');
  const sendBtn = document.querySelector('.composer__mic');

  if (sendBtn) sendBtn.setAttribute('aria-label', 'Send');

  let es = null;
  let esReconnectTimer = null;

  const connectStream = () => {
    if (!WORKER_BASE_URL) return;
    if (es) return;

    const sseUrl = WORKER_BASE_URL.replace(/\/$/, '') + `/sse?room=${encodeURIComponent(ROOM_ID)}`;
    es = new EventSource(sseUrl);

    es.addEventListener('open', () => {
      console.log('[SSE] connected', sseUrl);
    });

    const handlePayload = (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'history') {
        ingestHistory(data.messages);
        return;
      }
      if (data.type === 'msg' && data.message) {
        ingestMessage(data.message);
      }
    };

    es.addEventListener('history', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      handlePayload(evt.data);
    });

    es.addEventListener('msg', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      handlePayload(evt.data);
    });

    const scheduleReconnect = () => {
      if (!WORKER_BASE_URL) return;
      if (esReconnectTimer) return;
      console.log('[SSE] reconnecting soon...');
      esReconnectTimer = setTimeout(() => {
        esReconnectTimer = null;
        if (es) {
          try { es.close(); } catch { /* noop */ }
        }
        es = null;
        connectStream();
      }, 1200);
    };

    es.addEventListener('error', (e) => {
      console.error('[SSE] error', e);
      scheduleReconnect();
    });
  };

  const sendMessage = () => {
    if (!(composerInput instanceof HTMLInputElement)) return;
    const text = composerInput.value.trim();
    if (!text) return;

    const msg = {
      id: (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : String(Date.now()),
      uid: selfUid,
      text,
      ts: Date.now(),
    };

    composerInput.value = '';

    ingestMessage(msg);

    if (WORKER_BASE_URL) {
      try {
        void fetch(WORKER_BASE_URL.replace(/\/$/, '') + `/send?room=${encodeURIComponent(ROOM_ID)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
          }
        );
      } catch {
        return;
      }
    }
  };

  const setEmojiOpen = (open) => {
    if (!emojiBtn || !emojiMenu) return;
    emojiMenu.classList.toggle('is-open', open);
    emojiBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  if (emojiBtn && emojiMenu) {
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !emojiMenu.classList.contains('is-open');
      setEmojiOpen(open);
    });

    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      const inside = e.target.closest('.emoji-menu') || e.target.closest('.composer__btn--emoji');
      if (!inside) setEmojiOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setEmojiOpen(false);
    });
  }

  if (emojiPicker && composerInput) {
    emojiPicker.addEventListener('emoji-click', (e) => {
      const detail = e && typeof e === 'object' ? e.detail : null;
      const emoji = detail && typeof detail.unicode === 'string' ? detail.unicode : '';
      if (!emoji) return;

      const el = composerInput;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
      const next = start + emoji.length;
      el.setSelectionRange(next, next);
      el.focus();
    });
  }

  if (composerInput instanceof HTMLInputElement) {
    composerInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      sendMessage();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  loadLocalMessages();
  for (const m of chats.public.messages) {
    if (m && typeof m.id === 'string') seenIds.add(m.id);
  }

  connectStream();

  openChat('public');
})();

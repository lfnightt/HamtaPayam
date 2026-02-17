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

  // Online users count display
  const onlineCountBadge = document.createElement('span');
  onlineCountBadge.className = 'online-count';
  onlineCountBadge.style.cssText = 'background:#00c853;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px;';
  if (headerStatus) headerStatus.appendChild(onlineCountBadge);

  // Typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.style.cssText = 'padding:8px 16px;color:#888;font-size:13px;font-style:italic;display:none;';
  typingIndicator.textContent = '';
  if (messagesRoot) messagesRoot.parentNode.insertBefore(typingIndicator, messagesRoot.nextSibling);

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
    messageElements.clear();

    for (const m of messages) {
      renderSingleMessage(m);
    }

    messagesRoot.scrollTop = messagesRoot.scrollHeight;
  };

  const messageElements = new Map();

  const renderSingleMessage = (m, prepend = false) => {
    const wrap = document.createElement('div');
    wrap.className = `message message--${m.dir}`;
    wrap.dataset.id = m.id;
    wrap.dataset.uid = m.uid;
    wrap.dataset.ts = m.ts;

    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = m.text;
    if (m.deleted) {
      bubble.style.fontStyle = 'italic';
      bubble.style.color = '#999';
    }

    const meta = document.createElement('div');
    meta.className = 'message__meta';
    let metaText = m.time;
    if (m.edited) metaText += ' (ویرایش شده)';
    meta.textContent = metaText;

    wrap.appendChild(bubble);
    wrap.appendChild(meta);

    if (prepend) {
      messagesRoot.insertBefore(wrap, messagesRoot.firstChild);
    } else {
      messagesRoot.appendChild(wrap);
    }
    
    messageElements.set(m.id, wrap);
    return wrap;
  };

  const startEdit = (id, text) => {
    if (composerInput) {
      composerInput.value = text;
      composerInput.dataset.editing = id;
      composerInput.focus();
    }
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
    <button class="msg-menu__item" type="button" data-action="edit"><i class="fa-regular fa-pen-to-square" aria-hidden="true"></i><span>Edit</span></button>
    <button class="msg-menu__item" type="button" data-action="delete"><i class="fa-regular fa-trash-can" aria-hidden="true"></i><span>حذف پیام</span></button>
    <button class="msg-menu__item" type="button" data-action="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy</span></button>
    <button class="msg-menu__item" type="button" data-action="pin"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i><span>Pin</span></button>
    <button class="msg-menu__item" type="button" data-action="select"><i class="fa-regular fa-circle-check" aria-hidden="true"></i><span>Select</span></button>
  `;
  document.body.appendChild(msgMenu);

  const deleteModalOverlay = document.createElement('div');
  deleteModalOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:9999;';
  const deleteModal = document.createElement('div');
  deleteModal.style.cssText = 'width:312px;height:172px;background:#212121;border-radius:12px;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;';
  deleteModal.innerHTML = `
    <div style="color:#fff;font-weight:700;font-size:16px;line-height:20px;">حذف پیام</div>
    <div style="color:#cfcfcf;font-size:13px;line-height:18px;margin-top:10px;">آیا از حذف پیام مطمئنید؟</div>
    <div style="display:flex;gap:18px;justify-content:flex-end;align-items:center;margin-top:auto;">
      <button type="button" data-action="cancel" style="background:transparent;border:0;padding:6px 0;color:#8774E1;font-weight:700;font-size:14px;cursor:pointer;">کنسل</button>
      <button type="button" data-action="confirm" style="background:transparent;border:0;padding:6px 0;color:#E85354;font-weight:700;font-size:14px;cursor:pointer;">حذف</button>
    </div>
  `;
  deleteModalOverlay.appendChild(deleteModal);
  document.body.appendChild(deleteModalOverlay);

  let pendingDeleteId = '';

  let msgMenuTarget = null;
  let msgMenuTargetWrap = null;

  const closeMsgMenu = () => {
    msgMenu.classList.remove('is-open');
    msgMenuTarget = null;
    msgMenuTargetWrap = null;
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
    msgMenuTargetWrap = bubble.closest('.message');

    const actionEdit = msgMenu.querySelector('[data-action="edit"]');
    const actionDelete = msgMenu.querySelector('[data-action="delete"]');
    const uid = msgMenuTargetWrap?.getAttribute('data-uid') || '';
    const tsRaw = msgMenuTargetWrap?.getAttribute('data-ts') || '0';
    const ts = Number(tsRaw) || 0;
    const text = bubble.textContent || '';
    const canMutate = uid === selfUid && ts > 0 && (Date.now() - ts) < (5 * 60 * 1000) && text !== '[deleted]';

    if (actionEdit instanceof HTMLButtonElement) actionEdit.style.display = canMutate ? '' : 'none';
    if (actionDelete instanceof HTMLButtonElement) {
      actionDelete.style.display = canMutate ? '' : 'none';
      actionDelete.style.color = '#E85354';
    }

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
    if (!(msgMenuTargetWrap instanceof HTMLElement)) return;

    const action = btn.getAttribute('data-action');
    const text = msgMenuTarget.textContent || '';
    const id = msgMenuTargetWrap.getAttribute('data-id') || '';
    const uid = msgMenuTargetWrap.getAttribute('data-uid') || '';
    const tsRaw = msgMenuTargetWrap.getAttribute('data-ts') || '0';
    const ts = Number(tsRaw) || 0;

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

    if (action === 'edit') {
      if (!id || uid !== selfUid || !ts || (Date.now() - ts) > (5 * 60 * 1000) || text === '[deleted]') {
        closeMsgMenu();
        return;
      }
      startEdit(id, text);
      closeMsgMenu();
      return;
    }

    if (action === 'delete') {
      if (!id || uid !== selfUid || !ts || (Date.now() - ts) > (5 * 60 * 1000) || text === '[deleted]') {
        closeMsgMenu();
        return;
      }
      pendingDeleteId = id;
      closeMsgMenu();
      deleteModalOverlay.style.display = 'flex';
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

  const closeDeleteModal = () => {
    pendingDeleteId = '';
    deleteModalOverlay.style.display = 'none';
  };

  deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === deleteModalOverlay) closeDeleteModal();
  });

  deleteModal.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    const action = btn.getAttribute('data-action');
    if (action === 'cancel') {
      closeDeleteModal();
      return;
    }
    if (action === 'confirm') {
      const id = pendingDeleteId;
      closeDeleteModal();
      if (id) deleteMessage(id);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && deleteModalOverlay.style.display !== 'none') closeDeleteModal();
  });

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
          edited: m.edited || false,
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
        .map((m) => ({ id: m.id, uid: m.uid, text: m.text, ts: m.ts, edited: m.edited || false }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      return;
    }
  };

  const seenIds = new Set();
  const messageMap = new Map();
  let lastCursor = 0;

  const removeLocalMessage = (id) => {
    if (!id) return;

    const chat = chats.public;
    if (Array.isArray(chat.messages) && chat.messages.length) {
      chat.messages = chat.messages.filter((m) => m && m.id !== id);
    }

    messageMap.delete(id);
    seenIds.delete(id);

    const el = messageElements.get(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    messageElements.delete(id);

    saveLocalMessages();
  };

  const deleteMessage = (id) => {
    if (!id) return;
    removeLocalMessage(id);

    if (!WORKER_BASE_URL) return;
    fetch(WORKER_BASE_URL.replace(/\/$/, '') + `/delete?room=${encodeURIComponent(ROOM_ID)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, uid: selfUid }),
    }).catch(() => {});
  };

  const applyLocalEdit = (id, nextText) => {
    if (!id) return false;
    const text = String(nextText ?? '');

    const chat = chats.public;
    const idx = Array.isArray(chat.messages) ? chat.messages.findIndex((mm) => mm && mm.id === id) : -1;
    const fromList = idx > -1 ? chat.messages[idx] : null;
    const base = messageMap.get(id) || fromList;

    if (base) {
      base.text = text;
      base.edited = true;
      if (fromList) {
        fromList.text = text;
        fromList.edited = true;
      }
      messageMap.set(id, base);

      const el = messageElements.get(id);
      if (el) {
        const bubble = el.querySelector('.message__bubble');
        const meta = el.querySelector('.message__meta');
        if (bubble) bubble.textContent = text;
        if (meta) {
          const timeText = base && typeof base.time === 'string' ? base.time : formatTime(new Date((base && base.ts) || Date.now()));
          meta.textContent = timeText + ' (ویرایش شده)';
        }
      }

      saveLocalMessages();
      if (base) {
        const c = Math.max(Number(base.ts || 0), Number(base.editTs || 0), Date.now());
        if (c > lastCursor) lastCursor = c;
      }
      return true;
    }
    return false;
  };

  const ingestMessage = (m, isEdit = false, isDelete = false) => {
    if (!m || typeof m !== 'object') return;
    if (typeof m.id !== 'string' || !m.id) return;

    if (m.deleted || isDelete) {
      removeLocalMessage(m.id);
      const cursor = Math.max(Number(m.ts || 0), Number(m.deleteTs || 0));
      if (cursor > lastCursor) lastCursor = cursor;
      return;
    }
    
    const existing = messageMap.get(m.id);
    
    if (isEdit) {
      const applied = applyLocalEdit(m.id, m.text);
      if (!applied) {
        // Message not found locally - force re-render by removing from seen and creating new
        seenIds.delete(m.id);
        messageElements.delete(m.id);
        // Directly create the message object and render it
        const editedMsg = {
          id: m.id,
          uid: m.uid || 'anonymous',
          text: m.text || '',
          ts: typeof m.ts === 'number' ? m.ts : Date.now(),
          edited: true,
          dir: (m.uid || 'anonymous') === selfUid ? 'out' : 'in',
          time: formatTime(new Date(typeof m.ts === 'number' ? m.ts : Date.now())),
        };
        messageMap.set(m.id, editedMsg);
        chats.public.messages.push(editedMsg);
        chats.public.messages = chats.public.messages.slice(-200);
        renderSingleMessage(editedMsg);
        saveLocalMessages();
      }
      return;
    }

    if (seenIds.has(m.id)) return;
    
    const text = typeof m.text === 'string' ? m.text : '';
    if (!text.trim() && !m.deleted) return;
    
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
      edited: m.edited || false,
      deleted: m.deleted || false,
    };

    messageMap.set(m.id, ui);
    const cursor = Math.max(Number(ui.ts || 0), Number(m.editTs || 0));
    if (cursor > lastCursor) lastCursor = cursor;

    const chat = chats.public;
    chat.messages.push(ui);
    chat.messages = chat.messages.slice(-200);
    saveLocalMessages();
    renderSingleMessage(ui);
    setChatListPreview('public', ui.text, ui.time);
    messagesRoot.scrollTop = messagesRoot.scrollHeight;
  };

  const ingestHistory = (messages) => {
    if (!Array.isArray(messages)) return;
    for (const m of messages) ingestMessage(m);
    const chat = chats.public;
    for (const mm of chat.messages) {
      if (!mm) continue;
      const c = Math.max(Number(mm.ts || 0), Number(mm.editTs || 0));
      if (c > lastCursor) lastCursor = c;
    }
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

  // Typing detection
  let typingTimeout = null;
  const sendTyping = (isTyping) => {
    if (!WORKER_BASE_URL) return;
    fetch(WORKER_BASE_URL.replace(/\/$/, '') + `/send?room=${encodeURIComponent(ROOM_ID)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'typing', uid: selfUid, isTyping }),
    }).catch(() => {});
  };

  if (composerInput) {
    composerInput.addEventListener('input', () => {
      sendTyping(true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => sendTyping(false), 2000);
    });
  }

  let es = null;
  let esReconnectTimer = null;

  let pollTimer = null;
  let pollInFlight = false;

  const pollHistory = async () => {
    if (!WORKER_BASE_URL) return;
    if (pollInFlight) return;
    pollInFlight = true;

    try {
      const url = WORKER_BASE_URL.replace(/\/$/, '') + `/history?room=${encodeURIComponent(ROOM_ID)}&since=${encodeURIComponent(String(lastCursor || 0))}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.messages)) return;
      for (const m of data.messages) ingestMessage(m);
      if (typeof data.cursor === 'number' && data.cursor > lastCursor) lastCursor = data.cursor;
    } catch {
      return;
    } finally {
      pollInFlight = false;
    }
  };

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      void pollHistory();
    }, 3000);
    void pollHistory();
  };

  const connectStream = () => {
    if (!WORKER_BASE_URL) return;
    if (es) return;

    const sseUrl = WORKER_BASE_URL.replace(/\/$/, '') + `/sse?room=${encodeURIComponent(ROOM_ID)}&uid=${encodeURIComponent(selfUid)}`;
    es = new EventSource(sseUrl);

    es.addEventListener('open', () => {
      console.log('[SSE] connected', sseUrl);
    });

    es.addEventListener('history', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'history') ingestHistory(data.messages);
      } catch {}
    });

    es.addEventListener('msg', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'msg' && data.message) ingestMessage(data.message);
      } catch {}
    });

    es.addEventListener('edit', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'edit' && data.message) {
          const m = data.message;
          // Try to find and update existing message
          const existing = messageMap.get(m.id);
          if (existing) {
            existing.text = m.text;
            existing.edited = true;
            const el = messageElements.get(m.id);
            if (el) {
              const bubble = el.querySelector('.message__bubble');
              const meta = el.querySelector('.message__meta');
              if (bubble) bubble.textContent = m.text;
              if (meta) meta.textContent = existing.time + ' (ویرایش شده)';
            }
            saveLocalMessages();
          } else {
            // Message not found, ingest as new
            ingestMessage(m);
          }
        }
      } catch {}
    });

    es.addEventListener('delete', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'delete' && data.message) {
          ingestMessage(data.message, false, true);
        }
      } catch {}
    });

    es.addEventListener('typing', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'typing') {
          const others = data.users.filter(u => u !== selfUid);
          if (others.length > 0) {
            typingIndicator.textContent = others.length === 1 
              ? 'یک نفر در حال نوشتن...' 
              : `${others.length} نفر در حال نوشتن...`;
            typingIndicator.style.display = 'block';
          } else {
            typingIndicator.style.display = 'none';
          }
        }
      } catch {}
    });

    es.addEventListener('presence', (evt) => {
      if (!evt || typeof evt.data !== 'string') return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'presence') {
          onlineCountBadge.textContent = `${data.count} آنلاین`;
        }
      } catch {}
    });

    const scheduleReconnect = () => {
      if (!WORKER_BASE_URL) return;
      if (esReconnectTimer) return;
      console.log('[SSE] reconnecting soon...');
      esReconnectTimer = setTimeout(() => {
        esReconnectTimer = null;
        if (es) {
          try { es.close(); } catch {}
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

    const editingId = composerInput.dataset.editing;

    if (editingId) {
      // Edit mode

      const existing = messageMap.get(editingId);
      const ts = existing && typeof existing.ts === 'number' ? existing.ts : Date.now();
      ingestMessage({ id: editingId, uid: selfUid, text, ts }, true, false);

      fetch(WORKER_BASE_URL.replace(/\/$/, '') + `/edit?room=${encodeURIComponent(ROOM_ID)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, text, uid: selfUid }),
      }).catch(() => {});
      
      delete composerInput.dataset.editing;
    } else {
      // Send new message
      const msg = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        uid: selfUid,
        text,
        ts: Date.now(),
      };

      ingestMessage(msg);

      if (WORKER_BASE_URL) {
        fetch(WORKER_BASE_URL.replace(/\/$/, '') + `/send?room=${encodeURIComponent(ROOM_ID)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        }).catch(() => {});
      }
    }

    composerInput.value = '';
    sendTyping(false);
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
    if (m) {
      const c = Math.max(Number(m.ts || 0), Number(m.editTs || 0));
      if (c > lastCursor) lastCursor = c;
    }
    if (m && typeof m.id === 'string') messageMap.set(m.id, m);
  }

  connectStream();
  startPolling();

  openChat('public');
})();

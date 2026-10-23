(function () {
  'use strict';

  const TASKS_KEY = 'daymark.tasks';
  const LINKS_KEY = 'daymark.links';
  const DEFAULT_LINKS = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'Gmail', url: 'https://mail.google.com' }
  ];
  const TIMER_LENGTH = 25 * 60;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 80;

  const elements = {
    greeting: document.getElementById('greeting-text'),
    subtitle: document.getElementById('greeting-subtitle'),
    clock: document.getElementById('clock'),
    date: document.getElementById('date-display'),
    timerTime: document.getElementById('timer-time'),
    timerStatus: document.getElementById('timer-status'),
    timerProgress: document.getElementById('timer-progress'),
    timerStart: document.getElementById('timer-start'),
    timerStop: document.getElementById('timer-stop'),
    timerReset: document.getElementById('timer-reset'),
    taskInput: document.getElementById('todo-input'),
    taskAdd: document.getElementById('todo-add-btn'),
    taskList: document.getElementById('todo-list'),
    taskSummary: document.getElementById('todo-summary'),
    filters: document.querySelector('.todo-filters'),
    linksGrid: document.getElementById('links-grid'),
    addLink: document.getElementById('add-link-btn'),
    linkModal: document.getElementById('link-modal'),
    linkName: document.getElementById('link-name-input'),
    linkUrl: document.getElementById('link-url-input'),
    linkSave: document.getElementById('link-modal-save'),
    linkCancel: document.getElementById('link-modal-cancel'),
    toastContainer: document.getElementById('toast-container')
  };

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast('Browser storage is unavailable. Changes may not be saved.');
    }
  }

  let tasks = readStorage(TASKS_KEY, []);
  if (!Array.isArray(tasks)) tasks = [];

  let links = readStorage(LINKS_KEY, null);
  if (!Array.isArray(links)) {
    links = DEFAULT_LINKS.slice();
    writeStorage(LINKS_KEY, links);
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
  }

  function updateClock() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const subtitle = hour < 12 ? 'A fresh day, a clear mind.' : hour < 17 ? 'One thing at a time. You’ve got this.' : 'Wrap up well, then rest easy.';

    elements.greeting.textContent = greeting;
    elements.subtitle.textContent = subtitle;
    elements.clock.textContent = now.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    elements.date.textContent = now.toLocaleDateString([], {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  let secondsLeft = TIMER_LENGTH;
  let timerInterval = null;

  function renderTimer() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const elapsed = TIMER_LENGTH - secondsLeft;
    elements.timerTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    elements.timerProgress.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
    elements.timerProgress.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * elapsed / TIMER_LENGTH);
  }

  elements.timerStart.addEventListener('click', () => {
    if (timerInterval || secondsLeft === 0) return;
    elements.timerStatus.textContent = 'FOCUSING';
    timerInterval = window.setInterval(() => {
      secondsLeft -= 1;
      renderTimer();
      if (secondsLeft <= 0) {
        window.clearInterval(timerInterval);
        timerInterval = null;
        elements.timerStatus.textContent = 'COMPLETE';
        showToast('Focus session complete. Take a short break.');
      }
    }, 1000);
  });

  elements.timerStop.addEventListener('click', () => {
    if (!timerInterval) return;
    window.clearInterval(timerInterval);
    timerInterval = null;
    elements.timerStatus.textContent = 'PAUSED';
  });

  elements.timerReset.addEventListener('click', () => {
    window.clearInterval(timerInterval);
    timerInterval = null;
    secondsLeft = TIMER_LENGTH;
    elements.timerStatus.textContent = 'READY';
    renderTimer();
  });

  let activeFilter = 'all';

  function renderTasks() {
    elements.taskList.replaceChildren();
    const visibleTasks = tasks.filter((task) => {
      if (activeFilter === 'active') return !task.completed;
      if (activeFilter === 'done') return task.completed;
      return true;
    });

    if (visibleTasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = tasks.length === 0 ? 'Your list is clear. Add a task to get started.' : 'Nothing to show here.';
      elements.taskList.appendChild(empty);
    }

    visibleTasks.forEach((task) => {
      const row = document.createElement('li');
      row.className = `todo-item${task.completed ? ' completed' : ''}`;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-check';
      checkbox.checked = Boolean(task.completed);
      checkbox.setAttribute('aria-label', `Mark ${task.text} ${task.completed ? 'not done' : 'done'}`);
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks();
      });

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const editButton = createIconButton('Edit task', '✎', () => editTask(task));
      const deleteButton = createIconButton('Delete task', '×', () => {
        tasks = tasks.filter((item) => item.id !== task.id);
        saveTasks();
      });
      actions.append(editButton, deleteButton);
      row.append(checkbox, text, actions);
      elements.taskList.appendChild(row);
    });

    const remaining = tasks.filter((task) => !task.completed).length;
    elements.taskSummary.textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`;
  }

  function createIconButton(label, icon, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = icon;
    button.addEventListener('click', onClick);
    return button;
  }

  function saveTasks() {
    writeStorage(TASKS_KEY, tasks);
    renderTasks();
  }

  function addTask() {
    const text = elements.taskInput.value.trim();
    if (!text) {
      elements.taskInput.focus();
      return;
    }
    tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, completed: false });
    elements.taskInput.value = '';
    saveTasks();
    elements.taskInput.focus();
  }

  function editTask(task) {
    const nextText = window.prompt('Edit task', task.text);
    if (nextText === null) return;
    const text = nextText.trim();
    if (!text) {
      showToast('A task cannot be empty.');
      return;
    }
    task.text = text;
    saveTasks();
  }

  elements.taskAdd.addEventListener('click', addTask);
  elements.taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addTask();
  });

  elements.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    elements.filters.querySelectorAll('[data-filter]').forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle('active', selected);
      filterButton.setAttribute('aria-pressed', String(selected));
    });
    renderTasks();
  });

  function renderLinks() {
    elements.linksGrid.replaceChildren();
    links.forEach((link, index) => {
      const item = document.createElement('div');
      item.className = 'quick-link-item';
      const anchor = document.createElement('a');
      anchor.className = 'quick-link';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('aria-label', `Open ${link.name} in a new tab`);
      const mark = document.createElement('span');
      mark.className = 'link-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = link.name.slice(0, 1);
      const name = document.createElement('span');
      name.className = 'link-name';
      name.textContent = link.name;
      anchor.append(mark, name);

      const remove = createIconButton(`Remove ${link.name}`, '×', () => {
        links.splice(index, 1);
        writeStorage(LINKS_KEY, links);
        renderLinks();
      });
      remove.classList.add('link-remove');
      item.append(anchor, remove);
      elements.linksGrid.appendChild(item);
    });
  }

  function openLinkModal() {
    elements.linkModal.classList.remove('hidden');
    elements.linkName.focus();
  }

  function closeLinkModal() {
    elements.linkModal.classList.add('hidden');
    elements.linkName.value = '';
    elements.linkUrl.value = '';
  }

  function saveLink() {
    const name = elements.linkName.value.trim();
    const rawUrl = elements.linkUrl.value.trim();
    if (!name || !rawUrl) {
      showToast('Enter both a name and a website address.');
      return;
    }

    let url;
    try {
      url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
    } catch (error) {
      showToast('Enter a valid website address.');
      return;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      showToast('Only http and https links are supported.');
      return;
    }

    links.push({ name, url: url.href });
    writeStorage(LINKS_KEY, links);
    renderLinks();
    closeLinkModal();
  }

  elements.addLink.addEventListener('click', openLinkModal);
  elements.linkCancel.addEventListener('click', closeLinkModal);
  elements.linkSave.addEventListener('click', saveLink);
  elements.linkUrl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveLink();
  });
  elements.linkModal.addEventListener('click', (event) => {
    if (event.target === elements.linkModal) closeLinkModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.linkModal.classList.contains('hidden')) closeLinkModal();
  });

  updateClock();
  window.setInterval(updateClock, 1000);
  renderTimer();
  renderTasks();
  renderLinks();
})();
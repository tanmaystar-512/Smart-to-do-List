//Array to store all tasks
let tasks = [];

// Current filters and views
let currentFilter = 'all';
let currentCategory = 'all';
let currentView = 'list';
let currentSort = 'date-desc';
let searchQuery = '';
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

// Priority values for sorting
const priorityValues = {
    'High': 3,
    'Medium': 2,
    'Low': 1
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    updateStats();
    renderTasks();
    setupTheme();
    setupReminders();
    renderCalendar();
    updateCharts();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('taskDate').value = today;
});

// Load tasks from localStorage
function loadTasks() {
    const stored = localStorage.getItem('smartTodoTasks');
    if (stored) {
        tasks = JSON.parse(stored);
        // Process recurring tasks
        processRecurringTasks();
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('smartTodoTasks', JSON.stringify(tasks));
    updateStats();
    renderTasks();
    renderCalendar();
    updateCharts();
}

// Process recurring tasks
function processRecurringTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    tasks.forEach(task => {
        if (task.recurring && task.recurring !== 'none' && task.completed) {
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);
            
            let shouldRecur = false;
            
            if (task.recurring === 'daily') {
                shouldRecur = taskDate < today;
            } else if (task.recurring === 'weekly') {
                const daysDiff = Math.floor((today - taskDate) / (1000 * 60 * 60 * 24));
                shouldRecur = daysDiff >= 7;
            } else if (task.recurring === 'monthly') {
                const monthsDiff = (today.getFullYear() - taskDate.getFullYear()) * 12 + 
                                 (today.getMonth() - taskDate.getMonth());
                shouldRecur = monthsDiff >= 1;
            }
            
            if (shouldRecur) {
                task.completed = false;
                // Update date based on recurring type
                const newDate = new Date(taskDate);
                if (task.recurring === 'daily') {
                    newDate.setDate(newDate.getDate() + 1);
                } else if (task.recurring === 'weekly') {
                    newDate.setDate(newDate.getDate() + 7);
                } else if (task.recurring === 'monthly') {
                    newDate.setMonth(newDate.getMonth() + 1);
                }
                task.date = newDate.toISOString().split('T')[0];
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add task form
    document.getElementById('taskForm').addEventListener('submit', handleAddTask);
    
    // Edit task form
    document.getElementById('editForm').addEventListener('submit', handleEditTask);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderTasks();
        });
    });
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            switchView(currentView);
        });
    });
    
    // Sort select
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Modal close
    document.querySelector('.close-modal').addEventListener('click', closeEditModal);
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') {
            closeEditModal();
        }
    });
}

// Handle add task
function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const date = document.getElementById('taskDate').value;
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const recurring = document.getElementById('taskRecurring').value;
    
    if (!title || !date) {
        alert('Please fill in required fields');
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        title,
        date,
        description,
        category,
        priority,
        recurring,
        completed: false,
        subtasks: [],
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    
    // Reset form
    document.getElementById('taskForm').reset();
    document.getElementById('taskDate').value = new Date().toISOString().split('T')[0];
    
    // Show animation
    const taskElement = document.querySelector(`[data-task-id="${newTask.id}"]`);
    if (taskElement) {
        taskElement.style.animation = 'slideIn 0.3s ease';
    }
}

// Handle edit task
function handleEditTask(e) {
    e.preventDefault();
    
    const id = document.getElementById('editTaskId').value;
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;
    
    task.title = document.getElementById('editTitle').value.trim();
    task.date = document.getElementById('editDate').value;
    task.description = document.getElementById('editDescription').value.trim();
    task.category = document.getElementById('editCategory').value;
    task.priority = document.getElementById('editPriority').value;
    task.recurring = document.getElementById('editRecurring').value;
    
    saveTasks();
    closeEditModal();
}

// Delete task
function deleteTask(id) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('deleting');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
        }, 300);
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
    }
}

// Toggle task completion
function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
    }
}

// Open edit modal
function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editDate').value = task.date;
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editCategory').value = task.category;
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editRecurring').value = task.recurring || 'none';
    
    document.getElementById('editModal').classList.add('show');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Filter and sort tasks
function getFilteredAndSortedTasks() {
    let filtered = [...tasks];
    
    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(searchQuery) ||
            (task.description && task.description.toLowerCase().includes(searchQuery)) ||
            task.category.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply status filter
    if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    } else if (currentFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(t => t.date === today);
    }
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(t => t.category === currentCategory);
    }
    
    // Sort tasks
    filtered.sort((a, b) => {
        if (currentSort === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (currentSort === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (currentSort === 'priority') {
            return priorityValues[b.priority] - priorityValues[a.priority];
        } else if (currentSort === 'title') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });
    
    return filtered;
}

// Render tasks
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const filteredTasks = getFilteredAndSortedTasks();
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">No tasks found. Add a new task to get started!</div>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
    
    // Attach event listeners
    filteredTasks.forEach(task => {
        // Checkbox
        const checkbox = document.querySelector(`[data-task-id="${task.id}"] .task-checkbox`);
        if (checkbox) {
            checkbox.addEventListener('change', () => toggleComplete(task.id));
        }
        
        // Edit button
        const editBtn = document.querySelector(`[data-task-id="${task.id}"] .task-btn-edit`);
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditModal(task.id));
        }
        
        // Delete button
        const deleteBtn = document.querySelector(`[data-task-id="${task.id}"] .task-btn-delete`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
        }
        
        // Subtasks toggle
        const subtasksToggle = document.querySelector(`[data-task-id="${task.id}"] .subtasks-toggle`);
        if (subtasksToggle) {
            subtasksToggle.addEventListener('click', () => toggleSubtasks(task.id));
        }
        
        // Add subtask
        const addSubtaskBtn = document.querySelector(`[data-task-id="${task.id}"] .add-subtask-btn`);
        if (addSubtaskBtn) {
            addSubtaskBtn.addEventListener('click', () => addSubtask(task.id));
        }
        
        // Subtask checkboxes
        if (task.subtasks) {
            task.subtasks.forEach((subtask, index) => {
                const subtaskCheckbox = document.querySelector(
                    `[data-task-id="${task.id}"] .subtask-checkbox[data-subtask-index="${index}"]`
                );
                if (subtaskCheckbox) {
                    subtaskCheckbox.addEventListener('change', () => toggleSubtask(task.id, index));
                }
            });
        }
    });
}

// Create task HTML
function createTaskHTML(task) {
    const taskDate = new Date(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = taskDate < today && !task.completed;
    const isToday = task.date === today.toISOString().split('T')[0];
    
    const dateDisplay = isToday ? 'Today' : 
                       isOverdue ? `Overdue: ${formatDate(task.date)}` : 
                       formatDate(task.date);
    
    const recurringIcon = task.recurring && task.recurring !== 'none' ? 
        `<span class="task-recurring">🔄 ${task.recurring}</span>` : '';
    
    const subtasksHTML = task.subtasks && task.subtasks.length > 0 ? `
        <div class="subtasks-section">
            <div class="subtasks-toggle">
                <span>▼</span> Subtasks (${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})
            </div>
            <div class="subtasks-list" style="display: none;">
                ${task.subtasks.map((subtask, index) => `
                    <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
                        <input type="checkbox" class="subtask-checkbox" 
                               data-subtask-index="${index}" ${subtask.completed ? 'checked' : ''}>
                        <span class="subtask-text">${escapeHtml(subtask.text)}</span>
                    </div>
                `).join('')}
                <div class="add-subtask">
                    <input type="text" class="subtask-input" placeholder="Add subtask...">
                    <button class="add-subtask-btn btn btn-small btn-primary">Add</button>
                </div>
            </div>
        </div>
    ` : `
        <div class="subtasks-section">
            <div class="subtasks-toggle" style="display: none;">
                <span>▼</span> Subtasks
            </div>
            <div class="add-subtask" style="margin-top: 10px;">
                <input type="text" class="subtask-input" placeholder="Add subtask...">
                <button class="add-subtask-btn btn btn-small btn-primary">Add</button>
            </div>
        </div>
    `;
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} priority-${task.priority.toLowerCase()}" 
             data-task-id="${task.id}">
            <div class="task-header">
                <div class="task-title-section">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-title">${escapeHtml(task.title)}</span>
                    <span class="task-priority ${task.priority.toLowerCase()}">${task.priority}</span>
                </div>
                <div class="task-actions">
                    <button class="task-btn task-btn-edit">✏️ Edit</button>
                    <button class="task-btn task-btn-delete">❌ Delete</button>
                </div>
            </div>
            <div class="task-body">
                ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    <div class="task-meta-item">
                        <span>📅</span>
                        <span class="task-date ${isOverdue ? 'overdue' : ''}">${dateDisplay}</span>
                    </div>
                    <div class="task-meta-item">
                        <span>📂</span>
                        <span class="task-category">${escapeHtml(task.category)}</span>
                    </div>
                    ${recurringIcon}
                </div>
                ${subtasksHTML}
            </div>
        </div>
    `;
}

// Toggle subtasks visibility
function toggleSubtasks(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const subtasksList = document.querySelector(`[data-task-id="${taskId}"] .subtasks-list`);
    const toggle = document.querySelector(`[data-task-id="${taskId}"] .subtasks-toggle`);
    
    if (subtasksList && toggle) {
        const isHidden = subtasksList.style.display === 'none';
        subtasksList.style.display = isHidden ? 'flex' : 'none';
        toggle.querySelector('span').textContent = isHidden ? '▲' : '▼';
    }
}

// Add subtask
function addSubtask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const input = document.querySelector(`[data-task-id="${taskId}"] .subtask-input`);
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    if (!task.subtasks) {
        task.subtasks = [];
    }
    
    task.subtasks.push({
        text,
        completed: false
    });
    
    input.value = '';
    saveTasks();
    
    // Show subtasks section if hidden
    const toggle = document.querySelector(`[data-task-id="${taskId}"] .subtasks-toggle`);
    if (toggle) {
        toggle.style.display = 'flex';
    }
}

// Toggle subtask completion
function toggleSubtask(taskId, index) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subtasks && task.subtasks[index]) {
        task.subtasks[index].completed = !task.subtasks[index].completed;
        saveTasks();
    }
}

// Update stats
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${progress}%`;
}

// Switch view
function switchView(view) {
    document.getElementById('tasksView').classList.toggle('hidden', view !== 'list');
    document.getElementById('calendarView').classList.toggle('hidden', view !== 'calendar');
    document.getElementById('statsChartView').classList.toggle('hidden', view !== 'stats');
    
    if (view === 'calendar') {
        renderCalendar();
    } else if (view === 'stats') {
        updateCharts();
    }
}

// Render calendar
function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Add empty cells for days before month starts
    let calendarDays = '';
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays += '<div class="calendar-day"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.date === dateStr);
        const hasTasks = dayTasks.length > 0;

        calendarDays += `
            <div class="calendar-day ${hasTasks ? 'has-tasks' : ''}" data-date="${dateStr}">
                <div class="calendar-day-number">${day}</div>
                ${hasTasks ? `<div class="calendar-day-tasks">${dayTasks.map(t => t.title).join(', ')}</div>` : ''}
            </div>
        `;
    }

    // Create calendar with month title centered at top, day headers above dates, nav at bottom
    const calendarHTML = `
        <div class="calendar-month-title">
            <h3 style="text-align: center;">${monthNames[calendarMonth]} ${calendarYear}</h3>
        </div>
        <div class="calendar-header">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
${calendarDays}
        </div>
        <div class="calendar-month-nav">
            <button onclick="changeMonth(-1)">← Prev</button>
            <button onclick="changeMonth(1)">Next →</button>
        </div>
    `;

    container.innerHTML = calendarHTML;
}

// Change month (needs to be global for onclick)
window.changeMonth = function(delta) {
    calendarMonth += delta;
    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    } else if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    }
    renderCalendar();
};

// Update charts
let priorityChart = null;
let categoryChart = null;

function updateCharts() {
    // Priority chart
    const priorityCtx = document.getElementById('priorityChart');
    if (priorityCtx) {
        if (priorityChart) {
            priorityChart.destroy();
        }
        
        const priorityData = {
            High: tasks.filter(t => t.priority === 'High').length,
            Medium: tasks.filter(t => t.priority === 'Medium').length,
            Low: tasks.filter(t => t.priority === 'Low').length
        };
        
        priorityChart = new Chart(priorityCtx, {
            type: 'doughnut',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    data: [priorityData.High, priorityData.Medium, priorityData.Low],
                    backgroundColor: ['#f56565', '#ed8936', '#48bb78']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tasks by Priority',
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                        }
                    }
                }
            }
        });
    }
    
    // Category chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        const categories = ['Work', 'Personal', 'Shopping', 'Health', 'Other'];
        const categoryData = categories.map(cat => 
            tasks.filter(t => t.category === cat).length
        );
        
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Tasks',
                    data: categoryData,
                    backgroundColor: '#4299e1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tasks by Category',
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    }
                }
            }
        });
    }
}

// Setup theme
function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Update charts if they exist
    if (priorityChart) updateCharts();
    if (categoryChart) updateCharts();
}

// Update theme icon
function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Setup reminders
function setupReminders() {
    // Check for reminders every minute
    setInterval(checkReminders, 60000);
    checkReminders(); // Check immediately
}

// Check reminders
function checkReminders() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    tasks.forEach(task => {
        if (task.completed) return;
        
        // Check if task is due today or tomorrow
        if (task.date === today || task.date === tomorrowStr) {
            const taskDate = new Date(task.date);
            const hoursUntilDue = (taskDate - now) / (1000 * 60 * 60);
            
            // Show reminder if due within 24 hours and not already reminded today
            if (hoursUntilDue <= 24 && hoursUntilDue >= 0) {
                const reminderKey = `reminder_${task.id}_${today}`;
                if (!localStorage.getItem(reminderKey)) {
                    showReminder(task);
                    localStorage.setItem(reminderKey, 'true');
                }
            }
        }
    });
}

// Show reminder
function showReminder(task) {
    const isToday = task.date === new Date().toISOString().split('T')[0];
    const message = isToday 
        ? `⏰ Reminder: "${task.title}" is due today!`
        : `⏰ Reminder: "${task.title}" is due tomorrow!`;
    
    // Use browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Task Reminder', {
            body: message,
            icon: '📅'
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Task Reminder', {
                    body: message,
                    icon: '📅'
                });
            }
        });
    }
    
    // Also show alert as fallback
    alert(message);
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Utility functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate.getTime() === today.getTime()) {
        return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (taskDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                 type === 'danger' ? '<i class="fas fa-trash-alt"></i>' : 
                 '<i class="fas fa-info-circle"></i>';
                 
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
};

async function cargarSidebar() {
    try {
        const response = await fetch('./components/sidebar.html');
        if (!response.ok) throw new Error(response.status);
        
        const html = await response.text();
        const container = document.getElementById('sidebar-container');
        if (container) container.innerHTML = html;

        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('i');
            if (document.body.classList.contains('dark-theme') && icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }

            themeToggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                
                if (icon) {
                    if (isDark) {
                        icon.classList.remove('fa-moon');
                        icon.classList.add('fa-sun');
                    } else {
                        icon.classList.remove('fa-sun');
                        icon.classList.add('fa-moon');
                    }
                }
            });
        }

        const path = window.location.pathname;
        let activeNavId = 'nav-dashboard';
        if (path.includes('tareas.html')) activeNavId = 'nav-tareas';
        else if (path.includes('calendario.html')) activeNavId = 'nav-calendario';
        else if (path.includes('configuracion.html')) activeNavId = 'nav-config';

        const activeNav = document.getElementById(activeNavId);
        if (activeNav) activeNav.parentElement.classList.add('active');

    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarSidebar();

    const tbody = document.getElementById('tasks-tbody');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    const selectAllCheckbox = document.getElementById('select-all-tasks');
    const modalTitle = document.getElementById('modal-title');
    
    const viewModal = document.getElementById('view-task-modal');
    const btnCloseView = document.getElementById('btn-close-view');
    const btnEditFromView = document.getElementById('btn-edit-from-view');
    
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('calendar-month-year');
    const monthPicker = document.getElementById('month-picker'); 
    
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-select') || document.getElementById('filter-status');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const filterDateSingle = document.getElementById('filter-date');
    const thFecha = document.getElementById('th-fecha');
    const sortIcon = document.getElementById('sort-icon');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('page-info');

    const btnPrevMonth = document.getElementById('prev-month');
    const btnNextMonth = document.getElementById('next-month');

    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteModalTitle = document.getElementById('delete-modal-title');
    const deleteModalText = document.getElementById('delete-modal-text');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    let selectedTaskIds = new Set();
    let currentViewTaskId = null;
    let navDate = new Date(); 
    let currentPage = 1;
    const itemsPerPage = 15; 
    let dateSortOrder = 'desc';
    let idsToDelete = []; 

    let metricsWorker;
    if (window.Worker) {
        metricsWorker = new Worker('js/worker.js');
        metricsWorker.onmessage = function(e) {
            const elTotal = document.getElementById('metric-total');
            const elComp = document.getElementById('metric-completed');
            const elPend = document.getElementById('metric-pending');
            if (elTotal) elTotal.textContent = e.data.total;
            if (elComp) elComp.textContent = e.data.completadas;
            if (elPend) elPend.textContent = e.data.pendientes;
        };
    }

    const resetPaginationAndRender = () => {
        currentPage = 1;
        renderApp();
    };

    if (searchInput) searchInput.addEventListener('input', resetPaginationAndRender);
    if (filterStatus) filterStatus.addEventListener('change', resetPaginationAndRender);
    if (filterDateStart) filterDateStart.addEventListener('change', resetPaginationAndRender);
    if (filterDateEnd) filterDateEnd.addEventListener('change', resetPaginationAndRender);
    if (filterDateSingle) filterDateSingle.addEventListener('change', resetPaginationAndRender);
    
    if (thFecha) {
        thFecha.addEventListener('click', () => {
            dateSortOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';
            if (sortIcon) {
                sortIcon.className = dateSortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
            resetPaginationAndRender();
        });
    }
    
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderApp();
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            currentPage++;
            renderApp();
        });
    }

    if (monthPicker) {
        monthPicker.addEventListener('change', (e) => {
            if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                navDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
                renderCalendar();
            }
        });
    }

    if (btnPrevMonth) {
        btnPrevMonth.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (btnNextMonth) {
        btnNextMonth.addEventListener('click', () => {
            navDate.setMonth(navDate.getMonth() + 1);
            renderCalendar();
        });
    }

    function renderCalendar() {
        if (!calendarDays) return; 

        const year = navDate.getFullYear();
        const month = navDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        if (monthYearText) monthYearText.textContent = `${monthNames[month]} ${year}`;
        
        if (monthPicker) {
            const mesStr = (month + 1).toString().padStart(2, '0');
            monthPicker.value = `${year}-${mesStr}`;
        }
        
        calendarDays.innerHTML = ''; 

        const firstDay = new Date(year, month, 1).getDay(); 
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        const tareas = typeof TaskManager !== 'undefined' ? TaskManager.getTasks() : [];

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day';
            emptyDiv.style.backgroundColor = 'transparent';
            emptyDiv.style.borderColor = 'transparent';
            calendarDays.appendChild(emptyDiv);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const diaStr = i.toString().padStart(2, '0');
            const mesStr = (month + 1).toString().padStart(2, '0');
            const dateStr = `${year}-${mesStr}-${diaStr}`;

            dayDiv.innerHTML = `<span class="day-number">${i}</span>`;

            const tareasDelDia = tareas.filter(t => t.fecha === dateStr);
            
            tareasDelDia.forEach(tarea => {
                const statusClass = tarea.estado === 'completed' ? 'completed' : '';
                const icon = tarea.estado === 'completed' ? 'fa-check' : 'fa-circle-notch';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = `cal-task ${statusClass}`;
                taskDiv.innerHTML = `<i class="fas ${icon}"></i> ${tarea.titulo}`;
                taskDiv.title = tarea.descripcion || ''; 
                
                taskDiv.onclick = (e) => {
                    e.stopPropagation(); 
                    window.viewTask(tarea.id);
                };
                
                dayDiv.appendChild(taskDiv);
            });

            calendarDays.appendChild(dayDiv);
        }
    }

    function renderApp() {
        let tareas = typeof TaskManager !== 'undefined' ? TaskManager.getTasks() : [];
        if (metricsWorker) metricsWorker.postMessage(tareas);

        if (tbody) {
            if (searchInput && searchInput.value.trim() !== '') {
                const term = searchInput.value.toLowerCase().trim();
                tareas = tareas.filter(t => 
                    (t.titulo && t.titulo.toLowerCase().includes(term)) ||
                    (t.id && t.id.toString().toLowerCase().includes(term))
                );
            }

            if (filterStatus && filterStatus.value !== 'all') {
                tareas = tareas.filter(t => t.estado === filterStatus.value);
            }

            if (filterDateStart && filterDateStart.value) tareas = tareas.filter(t => t.fecha >= filterDateStart.value);
            if (filterDateEnd && filterDateEnd.value) tareas = tareas.filter(t => t.fecha <= filterDateEnd.value);
            if (filterDateSingle && filterDateSingle.value) tareas = tareas.filter(t => t.fecha === filterDateSingle.value);

            tareas.sort((a, b) => {
                const dateA = a.fecha || '';
                const dateB = b.fecha || '';
                return dateSortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA); 
            });

            const totalPages = Math.ceil(tareas.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedTasks = tareas.slice(startIdx, startIdx + itemsPerPage);

            if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            
            if (btnPrevPage) {
                btnPrevPage.disabled = currentPage === 1;
                btnPrevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
                btnPrevPage.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
            }
            if (btnNextPage) {
                btnNextPage.disabled = currentPage === totalPages;
                btnNextPage.style.opacity = currentPage === totalPages ? '0.5' : '1';
                btnNextPage.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
            }

            tbody.innerHTML = '';
            if (paginatedTasks.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-light);">No se encontraron tareas con estos filtros.</td></tr>`;
            } else {
                paginatedTasks.forEach(tarea => {
                    const statusClass = tarea.estado === 'pending' ? 'status-pending' : 'status-completed';
                    const statusText = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';
                    const isChecked = selectedTaskIds.has(tarea.id.toString()) ? 'checked' : '';
                    
                    const tr = document.createElement('tr');
                    const checkboxCol = selectAllCheckbox ? `
                        <td style="text-align: center;">
                            <input type="checkbox" class="task-checkbox" value="${tarea.id}" ${isChecked}>
                        </td>` : '';

                    tr.innerHTML = `
                        ${checkboxCol}
                        <td>#${tarea.id}</td>
                        <td>${tarea.titulo}</td>
                        <td>${tarea.descripcion || ''}</td>
                        <td><strong>${tarea.fecha || 'Sin fecha'}</strong></td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td class="action-btns">
                            <button class="btn-view" onclick="window.viewTask('${tarea.id}')" style="color: var(--primary-color);" title="Ver"><i class="fas fa-eye"></i></button>
                            <button class="btn-edit" onclick="window.editTask('${tarea.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete" onclick="window.deleteSingleTask('${tarea.id}')" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                const checkboxes = document.querySelectorAll('.task-checkbox');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        if (e.target.checked) selectedTaskIds.add(e.target.value);
                        else selectedTaskIds.delete(e.target.value);
                        
                        updateDeleteButtonState();
                        updateSelectAllCheckboxState(checkboxes);
                    });
                });

                updateSelectAllCheckboxState(checkboxes);
            }
        }

        renderCalendar();
    }

    function updateSelectAllCheckboxState(checkboxes) {
        if (selectAllCheckbox && checkboxes.length > 0) {
            selectAllCheckbox.checked = Array.from(checkboxes).every(cb => cb.checked);
        } else if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }

    function updateDeleteButtonState() {
        if (btnDeleteSelected) {
            if (selectedTaskIds.size > 0) {
                btnDeleteSelected.style.display = 'inline-flex';
                btnDeleteSelected.innerHTML = `<i class="fas fa-trash-alt"></i> Eliminar (${selectedTaskIds.size})`;
            } else {
                btnDeleteSelected.style.display = 'none';
            }
        }
    }

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            if (taskForm) taskForm.reset();
            const idInput = document.getElementById('task-id');
            if (idInput) idInput.value = '';
            if (modalTitle) modalTitle.textContent = "Agregar Nueva Tarea";
            if (modal) modal.style.display = "flex";
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if (modal) modal.style.display = "none";
        });
    }

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const existingId = document.getElementById('task-id').value;
            const isEditing = !!existingId; 
            
            const newTask = {
                id: existingId || Date.now().toString(),
                titulo: document.getElementById('task-title').value,
                descripcion: document.getElementById('task-desc').value,
                fecha: document.getElementById('task-date').value, 
                estado: document.getElementById('task-status').value
            };
            
            if (typeof TaskManager !== 'undefined') {
                TaskManager.saveTask(newTask);
            }
            
            if (modal) modal.style.display = "none";
            renderApp(); 
            
            window.showToast(
                isEditing ? "Tarea actualizada correctamente." : "Nueva tarea creada exitosamente.", 
                isEditing ? "info" : "success"
            );
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.task-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) selectedTaskIds.add(cb.value);
                else selectedTaskIds.delete(cb.value);
            });
            updateDeleteButtonState();
        });
    }

    window.deleteSingleTask = function(id) {
        idsToDelete = [id.toString()];
        if (deleteModalTitle) deleteModalTitle.textContent = "¿Eliminar Tarea?";
        if (deleteModalText) deleteModalText.textContent = "Esta acción es permanente. ¿Estás seguro?";
        if (deleteModal) deleteModal.style.display = 'flex';
    };

    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            idsToDelete = Array.from(selectedTaskIds);
            if (deleteModalTitle) deleteModalTitle.textContent = `¿Eliminar ${idsToDelete.length} Tareas?`;
            if (deleteModalText) deleteModalText.textContent = `Vas a eliminar permanentemente ${idsToDelete.length} tareas. ¿Estás seguro?`;
            if (deleteModal) deleteModal.style.display = 'flex';
        });
    }

    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            if (deleteModal) deleteModal.style.display = 'none';
            idsToDelete = [];
        });
    }

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', () => {
            if (idsToDelete.length > 0 && typeof TaskManager !== 'undefined') {
                TaskManager.deleteMultipleTasks(idsToDelete);
                
                idsToDelete.forEach(id => selectedTaskIds.delete(id));
                updateDeleteButtonState();
                renderApp(); 
                
                window.showToast(idsToDelete.length > 1 ? `${idsToDelete.length} tareas eliminadas.` : "La tarea ha sido eliminada.", "danger");
            }
            if (deleteModal) deleteModal.style.display = 'none';
            idsToDelete = [];
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        });
    }

    window.viewTask = function(id) {
        if (typeof TaskManager === 'undefined') return;
        const tarea = TaskManager.getTasks().find(t => t.id.toString() === id.toString());
        
        if (tarea && viewModal) {
            currentViewTaskId = tarea.id;
            
            const titleEl = document.getElementById('view-task-title');
            const idEl = document.getElementById('view-task-id');
            const dateEl = document.getElementById('view-task-date');
            const descEl = document.getElementById('view-task-desc');
            const statusEl = document.getElementById('view-task-status');

            if (titleEl) titleEl.textContent = tarea.titulo;
            if (idEl) idEl.textContent = `#${tarea.id}`;
            if (dateEl) dateEl.textContent = tarea.fecha || 'Sin fecha asignada';
            if (descEl) descEl.textContent = tarea.descripcion || 'Sin descripción...';
            
            if (statusEl) {
                statusEl.textContent = tarea.estado === 'pending' ? 'Pendiente' : 'Completada';
                statusEl.className = `status-badge ${tarea.estado === 'pending' ? 'status-pending' : 'status-completed'}`;
            }
            
            viewModal.style.display = "flex";
        }
    };

    if (btnCloseView) {
        btnCloseView.addEventListener('click', () => {
            if (viewModal) viewModal.style.display = "none";
            currentViewTaskId = null;
        });
    }

    if (btnEditFromView) {
        btnEditFromView.addEventListener('click', () => {
            if (viewModal) viewModal.style.display = "none"; 
            if (currentViewTaskId) window.editTask(currentViewTaskId); 
        });
    }

    window.editTask = function(id) {
        if (typeof TaskManager === 'undefined') return;
        const tarea = TaskManager.getTasks().find(t => t.id.toString() === id.toString());
        
        if (tarea) {
            const idInput = document.getElementById('task-id');
            const titleInput = document.getElementById('task-title');
            const descInput = document.getElementById('task-desc');
            const dateInput = document.getElementById('task-date');
            const statusInput = document.getElementById('task-status');

            if (idInput) idInput.value = tarea.id;
            if (titleInput) titleInput.value = tarea.titulo;
            if (descInput) descInput.value = tarea.descripcion;
            if (dateInput) dateInput.value = tarea.fecha || ''; 
            if (statusInput) statusInput.value = tarea.estado;
            
            if (modalTitle) modalTitle.textContent = "Editar Tarea";
            if (modal) modal.style.display = "flex";
        }
    };

    renderApp();
});
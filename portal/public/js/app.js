/**
 * Главный JavaScript файл для портала промтов
 * 
 * Этот файл управляет всей логикой приложения:
 * - Загрузка и отображение категорий
 * - Загрузка и отображение промтов
 * - Поиск по промтам
 * - Модальное окно для просмотра промта
 * - Навигация между страницами
 */

// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ
// ==========================================

// Текущее состояние приложения
const state = {
    currentView: 'categories', // 'categories' или 'prompts'
    currentCategoryId: null,
    currentCategoryName: null,
    searchTimeout: null, // Для debounce поиска
};

// Кэш для данных (чтобы не загружать повторно)
const cache = {
    categories: null,
    categoryPrompts: {}, // { categoryId: prompts[] }
    prompts: {}, // { promptId: promptData }
};

// DOM элементы (получаем после загрузки страницы)
let elements = {};

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==========================================

/**
 * Инициализация приложения при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', () => {
    // Сохраняем ссылки на DOM элементы для быстрого доступа
    elements = {
        contentContainer: document.getElementById('contentContainer'),
        loading: document.getElementById('loading'),
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.getElementById('errorText'),
        retryButton: document.getElementById('retryButton'),
        breadcrumbs: document.getElementById('breadcrumbs'),
        breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),
        pageTitle: document.getElementById('pageTitle'),
        pageSubtitle: document.getElementById('pageSubtitle'),
        searchInput: document.getElementById('searchInput'),
        searchClear: document.getElementById('searchClear'),
        searchResults: document.getElementById('searchResults'),
        modalOverlay: document.getElementById('modalOverlay'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modalTitle'),
        modalDescription: document.getElementById('modalDescription'),
        modalPromptContent: document.getElementById('modalPromptContent'),
        modalClose: document.getElementById('modalClose'),
        copyButton: document.getElementById('copyButton'),
    };

    // Привязываем обработчики событий
    bindEventListeners();

    // Загружаем начальные данные
    loadCategories();
});

// ==========================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ==========================================

/**
 * Привязка всех обработчиков событий
 */
function bindEventListeners() {
    // Навигация по логотипу
    document.querySelectorAll('[data-nav="home"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToCategories();
        });
    });

    // Поиск
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchClear.addEventListener('click', clearSearch);
    
    // Закрытие результатов поиска при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });

    // Модальное окно
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) {
            closeModal();
        }
    });
    
    // Закрытие модального окна по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            hideSearchResults();
        }
    });

    // Кнопка копирования
    elements.copyButton.addEventListener('click', copyPromptToClipboard);

    // Кнопка повторной попытки
    elements.retryButton.addEventListener('click', () => {
        if (state.currentView === 'categories') {
            loadCategories();
        } else {
            loadCategoryPrompts(state.currentCategoryId);
        }
    });
}

// ==========================================
// ЗАГРУЗКА ДАННЫХ
// ==========================================

/**
 * Загрузка списка категорий
 */
async function loadCategories() {
    showLoading();
    hideError();

    try {
        // Проверяем кэш
        if (cache.categories) {
            renderCategories(cache.categories);
            return;
        }

        // Загружаем данные с сервера
        const response = await fetch('/api/categories');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить категории');
        }

        const data = await response.json();
        cache.categories = data.categories;
        
        renderCategories(data.categories);
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        showError('Не удалось загрузить категории. Проверьте подключение к серверу.');
    } finally {
        hideLoading();
    }
}

/**
 * Загрузка промтов для категории
 * @param {string} categoryId - ID категории
 */
async function loadCategoryPrompts(categoryId) {
    showLoading();
    hideError();

    try {
        // Проверяем кэш
        if (cache.categoryPrompts[categoryId]) {
            renderPrompts(cache.categoryPrompts[categoryId]);
            return;
        }

        // Загружаем данные с сервера
        const response = await fetch(`/api/categories/${categoryId}`);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить промты');
        }

        const data = await response.json();
        cache.categoryPrompts[categoryId] = data.prompts;
        
        renderPrompts(data.prompts);
    } catch (error) {
        console.error('Ошибка загрузки промтов:', error);
        showError('Не удалось загрузить промты. Попробуйте позже.');
    } finally {
        hideLoading();
    }
}

/**
 * Загрузка полных данных промта
 * @param {string} promptId - ID промта
 */
async function loadPrompt(promptId) {
    try {
        // Проверяем кэш
        if (cache.prompts[promptId]) {
            return cache.prompts[promptId];
        }

        // Загружаем данные с сервера
        const response = await fetch(`/api/prompts/${promptId}`);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить промт');
        }

        const data = await response.json();
        cache.prompts[promptId] = data;
        
        return data;
    } catch (error) {
        console.error('Ошибка загрузки промта:', error);
        throw error;
    }
}

// ==========================================
// РЕНДЕРИНГ (ОТРИСОВКА)
// ==========================================

/**
 * Отрисовка сетки категорий
 * @param {Array} categories - Массив категорий
 */
function renderCategories(categories) {
    state.currentView = 'categories';
    
    // Обновляем заголовок и подзаголовок
    elements.pageTitle.textContent = 'Библиотека промтов';
    elements.pageSubtitle.textContent = 'Выберите категорию для просмотра промтов';
    
    // Скрываем хлебные крошки
    elements.breadcrumbs.style.display = 'none';

    // Генерируем HTML для категорий
    const html = `
        <div class="categories-grid">
            ${categories.map(category => `
                <article class="card category-card glass-effect" 
                         data-category-id="${category.id}"
                         data-category-name="${category.name}"
                         role="button"
                         tabindex="0">
                    <div class="category-icon">${category.image}</div>
                    <div class="category-info">
                        <h2 class="category-name">${category.name}</h2>
                        <p class="category-count">${formatPromptCount(category.promptCount)}</p>
                    </div>
                </article>
            `).join('')}
        </div>
    `;

    elements.contentContainer.innerHTML = html;

    // Добавляем обработчики клика на карточки категорий
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const categoryId = card.dataset.categoryId;
            const categoryName = card.dataset.categoryName;
            navigateToCategory(categoryId, categoryName);
        });
        
        // Поддержка клавиатуры
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}

/**
 * Отрисовка списка промтов
 * @param {Array} prompts - Массив промтов
 */
function renderPrompts(prompts) {
    state.currentView = 'prompts';
    
    // Обновляем заголовок
    elements.pageTitle.textContent = state.currentCategoryName;
    elements.pageSubtitle.textContent = `${formatPromptCount(prompts.length)} в этой категории`;
    
    // Показываем хлебные крошки
    elements.breadcrumbs.style.display = 'flex';
    elements.breadcrumbCurrent.textContent = state.currentCategoryName;

    // Генерируем HTML для промтов
    const html = `
        <button class="back-button" data-nav="home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"></path>
            </svg>
            Назад к категориям
        </button>
        <div class="prompts-list">
            ${prompts.map(prompt => `
                <article class="card prompt-card glass-effect" 
                         data-prompt-id="${prompt.id}"
                         role="button"
                         tabindex="0">
                    <div class="prompt-content">
                        <h3 class="prompt-title">${prompt.title}</h3>
                        <p class="prompt-description">${prompt.description}</p>
                    </div>
                    <button class="prompt-copy-btn" 
                            data-prompt-id="${prompt.id}"
                            aria-label="Быстрое копирование промта"
                            title="Копировать промт">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </article>
            `).join('')}
        </div>
    `;

    elements.contentContainer.innerHTML = html;

    // Обработчик кнопки "Назад"
    document.querySelector('.back-button').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToCategories();
    });

    // Добавляем обработчики на карточки промтов
    document.querySelectorAll('.prompt-card').forEach(card => {
        // Клик на карточку открывает модальное окно
        card.addEventListener('click', (e) => {
            // Если клик был на кнопке копирования, не открываем модальное окно
            if (e.target.closest('.prompt-copy-btn')) return;
            
            const promptId = card.dataset.promptId;
            openPromptModal(promptId);
        });
        
        // Поддержка клавиатуры
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const promptId = card.dataset.promptId;
                openPromptModal(promptId);
            }
        });
    });

    // Обработчики быстрого копирования
    document.querySelectorAll('.prompt-copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const promptId = btn.dataset.promptId;
            await quickCopyPrompt(promptId, btn);
        });
    });
}

// ==========================================
// НАВИГАЦИЯ
// ==========================================

/**
 * Переход к списку категорий
 */
function navigateToCategories() {
    state.currentCategoryId = null;
    state.currentCategoryName = null;
    loadCategories();
}

/**
 * Переход к категории (списку промтов)
 * @param {string} categoryId - ID категории
 * @param {string} categoryName - Название категории
 */
function navigateToCategory(categoryId, categoryName) {
    state.currentCategoryId = categoryId;
    state.currentCategoryName = categoryName;
    loadCategoryPrompts(categoryId);
}

// ==========================================
// ПОИСК
// ==========================================

/**
 * Обработчик ввода в поле поиска
 */
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Показываем/скрываем кнопку очистки
    elements.searchClear.classList.toggle('visible', query.length > 0);
    
    // Debounce: ждём 300мс после последнего ввода
    clearTimeout(state.searchTimeout);
    
    if (query.length === 0) {
        hideSearchResults();
        return;
    }
    
    if (query.length < 2) {
        return; // Минимум 2 символа для поиска
    }
    
    state.searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
}

/**
 * Выполнение поиска
 * @param {string} query - Поисковый запрос
 */
async function performSearch(query) {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Ошибка поиска');
        }
        
        const data = await response.json();
        renderSearchResults(data.results);
    } catch (error) {
        console.error('Ошибка поиска:', error);
        elements.searchResults.innerHTML = `
            <div class="search-no-results">Ошибка поиска. Попробуйте ещё раз.</div>
        `;
        showSearchResults();
    }
}

/**
 * Отрисовка результатов поиска
 * @param {Array} results - Массив результатов
 */
function renderSearchResults(results) {
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div class="search-no-results">Ничего не найдено</div>
        `;
    } else {
        elements.searchResults.innerHTML = results.map(result => `
            <div class="search-result-item" 
                 data-prompt-id="${result.id}" 
                 data-category-id="${result.categoryId}"
                 data-category-name="${result.categoryName}">
                <div class="search-result-category">${result.categoryName}</div>
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-description">${result.description}</div>
            </div>
        `).join('');
        
        // Обработчики клика на результаты
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const promptId = item.dataset.promptId;
                const categoryId = item.dataset.categoryId;
                const categoryName = item.dataset.categoryName;
                
                // Сначала переходим к категории, потом открываем промт
                state.currentCategoryId = categoryId;
                state.currentCategoryName = categoryName;
                
                hideSearchResults();
                clearSearch();
                openPromptModal(promptId);
            });
        });
    }
    
    showSearchResults();
}

/**
 * Показать результаты поиска
 */
function showSearchResults() {
    elements.searchResults.classList.add('visible');
}

/**
 * Скрыть результаты поиска
 */
function hideSearchResults() {
    elements.searchResults.classList.remove('visible');
}

/**
 * Очистить поиск
 */
function clearSearch() {
    elements.searchInput.value = '';
    elements.searchClear.classList.remove('visible');
    hideSearchResults();
}

// ==========================================
// МОДАЛЬНОЕ ОКНО
// ==========================================

/**
 * Открытие модального окна с промтом
 * @param {string} promptId - ID промта
 */
async function openPromptModal(promptId) {
    try {
        // Загружаем данные промта
        const prompt = await loadPrompt(promptId);
        
        // Заполняем модальное окно
        elements.modalTitle.textContent = prompt.title;
        elements.modalDescription.textContent = prompt.description;
        elements.modalPromptContent.textContent = prompt.prompt;
        
        // Сбрасываем состояние кнопки копирования
        resetCopyButton();
        
        // Сохраняем ID текущего промта для копирования
        elements.copyButton.dataset.promptId = promptId;
        
        // Показываем модальное окно
        elements.modalOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        // Фокус на модальном окне для доступности
        elements.modal.focus();
    } catch (error) {
        console.error('Ошибка открытия промта:', error);
        alert('Не удалось загрузить промт. Попробуйте позже.');
    }
}

/**
 * Закрытие модального окна
 */
function closeModal() {
    elements.modalOverlay.classList.remove('visible');
    document.body.style.overflow = '';
}

// ==========================================
// КОПИРОВАНИЕ
// ==========================================

/**
 * Копирование промта в буфер обмена
 */
async function copyPromptToClipboard() {
    const promptText = elements.modalPromptContent.textContent;
    
    try {
        await navigator.clipboard.writeText(promptText);
        
        // Показываем успешное состояние
        const copyIcon = elements.copyButton.querySelector('.copy-icon');
        const checkIcon = elements.copyButton.querySelector('.check-icon');
        const copyText = elements.copyButton.querySelector('.copy-text');
        
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
        copyText.textContent = 'Скопировано!';
        elements.copyButton.classList.add('copied');
        
        // Возвращаем исходное состояние через 2 секунды
        setTimeout(resetCopyButton, 2000);
    } catch (error) {
        console.error('Ошибка копирования:', error);
        alert('Не удалось скопировать. Попробуйте выделить текст вручную.');
    }
}

/**
 * Быстрое копирование промта (по клику на иконку)
 * @param {string} promptId - ID промта
 * @param {HTMLElement} button - Кнопка, по которой кликнули
 */
async function quickCopyPrompt(promptId, button) {
    try {
        const prompt = await loadPrompt(promptId);
        await navigator.clipboard.writeText(prompt.prompt);
        
        // Показываем feedback
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        button.style.background = '#34c759';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
            button.style.color = '';
        }, 1500);
    } catch (error) {
        console.error('Ошибка копирования:', error);
    }
}

/**
 * Сброс кнопки копирования в исходное состояние
 */
function resetCopyButton() {
    const copyIcon = elements.copyButton.querySelector('.copy-icon');
    const checkIcon = elements.copyButton.querySelector('.check-icon');
    const copyText = elements.copyButton.querySelector('.copy-text');
    
    copyIcon.style.display = 'block';
    checkIcon.style.display = 'none';
    copyText.textContent = 'Копировать';
    elements.copyButton.classList.remove('copied');
}

// ==========================================
// УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

/**
 * Форматирование количества промтов с правильным склонением
 * @param {number} count - Количество промтов
 * @returns {string} Отформатированная строка
 */
function formatPromptCount(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    let word;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        word = 'промтов';
    } else if (lastDigit === 1) {
        word = 'промт';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        word = 'промта';
    } else {
        word = 'промтов';
    }
    
    return `${count} ${word}`;
}

/**
 * Показать индикатор загрузки
 */
function showLoading() {
    elements.loading.classList.add('visible');
    elements.contentContainer.innerHTML = '';
}

/**
 * Скрыть индикатор загрузки
 */
function hideLoading() {
    elements.loading.classList.remove('visible');
}

/**
 * Показать сообщение об ошибке
 * @param {string} message - Текст ошибки
 */
function showError(message) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = 'flex';
}

/**
 * Скрыть сообщение об ошибке
 */
function hideError() {
    elements.errorMessage.style.display = 'none';
}

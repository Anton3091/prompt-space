/**
 * Сервер для портала промтов
 * Использует Express.js для обслуживания статических файлов и API
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * GET /api/categories
 * Возвращает список всех категорий
 */
app.get('/api/categories', (req, res) => {
    try {
        const categoriesPath = path.join(__dirname, 'data', 'categories.json');
        const data = fs.readFileSync(categoriesPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        res.status(500).json({ error: 'Не удалось загрузить категории' });
    }
});

/**
 * GET /api/categories/:categoryId
 * Возвращает список промтов для указанной категории
 */
app.get('/api/categories/:categoryId', (req, res) => {
    try {
        const { categoryId } = req.params;
        const categoryPath = path.join(__dirname, 'data', 'categories', `${categoryId}.json`);
        
        if (!fs.existsSync(categoryPath)) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        const data = fs.readFileSync(categoryPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Ошибка при загрузке категории:', error);
        res.status(500).json({ error: 'Не удалось загрузить категорию' });
    }
});

/**
 * GET /api/prompts/:promptId
 * Возвращает полные данные промта
 */
app.get('/api/prompts/:promptId', (req, res) => {
    try {
        const { promptId } = req.params;
        const promptPath = path.join(__dirname, 'data', 'prompts', `${promptId}.json`);
        
        if (!fs.existsSync(promptPath)) {
            return res.status(404).json({ error: 'Промт не найден' });
        }
        
        const data = fs.readFileSync(promptPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Ошибка при загрузке промта:', error);
        res.status(500).json({ error: 'Не удалось загрузить промт' });
    }
});

/**
 * GET /api/search
 * Поиск по всем промтам
 */
app.get('/api/search', (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.json({ results: [] });
        }
        
        const searchQuery = q.toLowerCase().trim();
        const results = [];
        
        // Читаем все категории
        const categoriesPath = path.join(__dirname, 'data', 'categories.json');
        const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        
        // Создаем карту категорий для быстрого доступа
        const categoriesMap = {};
        categoriesData.categories.forEach(cat => {
            categoriesMap[cat.id] = cat.name;
        });
        
        // Ищем по всем промтам
        const promptsDir = path.join(__dirname, 'data', 'prompts');
        const promptFiles = fs.readdirSync(promptsDir);
        
        promptFiles.forEach(file => {
            if (file.endsWith('.json')) {
                const promptData = JSON.parse(
                    fs.readFileSync(path.join(promptsDir, file), 'utf8')
                );
                
                // Проверяем совпадение в заголовке, описании или тексте промта
                if (
                    promptData.title.toLowerCase().includes(searchQuery) ||
                    promptData.description.toLowerCase().includes(searchQuery) ||
                    promptData.prompt.toLowerCase().includes(searchQuery)
                ) {
                    results.push({
                        id: promptData.id,
                        categoryId: promptData.categoryId,
                        categoryName: categoriesMap[promptData.categoryId] || 'Неизвестная категория',
                        title: promptData.title,
                        description: promptData.description
                    });
                }
            }
        });
        
        res.json({ results });
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// Обработка всех остальных маршрутов - отдаём index.html
// Это нужно для работы SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Портал промтов запущен!                               ║
║                                                            ║
║   Откройте в браузере: http://localhost:${PORT}              ║
║                                                            ║
║   Для остановки нажмите Ctrl+C                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

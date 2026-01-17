/**
 * Backend Server for PromtSpace
 * Simple Express server to serve JSON data and static files
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('dist')); // Serve built frontend
app.use('/data', express.static('data')); // Serve data files

// API Routes

/**
 * GET /api/categories
 * Возвращает список всех категорий
 */
app.get('/api/categories', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'categories.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

/**
 * GET /api/categories/:id
 * Возвращает промты для конкретной категории
 */
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', 'categories', `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error(`Error reading category ${req.params.id}:`, error);
    res.status(404).json({ error: 'Category not found' });
  }
});

/**
 * GET /api/prompts/:id
 * Возвращает полную информацию о конкретном промте
 */
app.get('/api/prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', 'prompts', `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error(`Error reading prompt ${req.params.id}:`, error);
    res.status(404).json({ error: 'Prompt not found' });
  }
});

/**
 * GET /api/search
 * Поиск по промтам
 * Query параметр: q - поисковый запрос
 */
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q?.toString().toLowerCase();
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    // Читаем все категории
    const categoriesData = await fs.readFile(
      path.join(__dirname, 'data', 'categories.json'), 
      'utf-8'
    );
    const categories = JSON.parse(categoriesData);

    // Собираем все промты из всех категорий
    const allPrompts = [];
    for (const category of categories) {
      try {
        const categoryData = await fs.readFile(
          path.join(__dirname, 'data', 'categories', `${category.id}.json`),
          'utf-8'
        );
        const { prompts } = JSON.parse(categoryData);
        allPrompts.push(...prompts);
      } catch (err) {
        console.error(`Error reading category ${category.id}:`, err);
      }
    }

    // Фильтруем промты по запросу
    const results = allPrompts.filter(prompt => {
      const titleMatch = prompt.title.toLowerCase().includes(query);
      const descMatch = prompt.shortDescription.toLowerCase().includes(query);
      const tagMatch = prompt.tags.some(tag => tag.toLowerCase().includes(query));
      return titleMatch || descMatch || tagMatch;
    });

    res.json(results);
  } catch (error) {
    console.error('Error searching prompts:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Fallback route - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │   🚀 PromtSpace Server Running          │
  │                                         │
  │   URL: http://localhost:${PORT}        │
  │   API: http://localhost:${PORT}/api     │
  │                                         │
  └─────────────────────────────────────────┘
  `);
});

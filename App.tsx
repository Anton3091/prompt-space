import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ArrowRight, Folder, Zap, Terminal, Sparkles, LayoutGrid, Send } from 'lucide-react';
import { Category, Prompt } from './types';
import * as DataService from './services/dataService';
import GlassCard from './components/GlassCard';
import PromptModal from './components/PromptModal';

// Icon mapping helper
const IconMap: Record<string, React.ElementType> = {
  'Megaphone': Zap,
  'Code': Terminal,
  'Palette': Sparkles,
  'Default': Folder,
};

type View = 'home' | 'category';

const App: React.FC = () => {
  // State
  const [view, setView] = useState<View>('home');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived State
  const activeCategory = useMemo(() => 
    categories.find(c => c.id === activeCategoryId), 
  [categories, activeCategoryId]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categories, searchQuery]);

  // Effects
  useEffect(() => {
    const init = async () => {
      try {
        const cats = await DataService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (view === 'category' && activeCategoryId) {
      const loadPrompts = async () => {
        setLoadingPrompts(true);
        try {
          const data = await DataService.getPromptsByCategoryId(activeCategoryId);
          setPrompts(data);
        } finally {
          setLoadingPrompts(false);
        }
      };
      loadPrompts();
    } else if (view === 'home' && searchQuery.length > 2) {
      // Global Search Mode
      const doSearch = async () => {
        setLoadingPrompts(true);
        try {
          const results = await DataService.searchPrompts(searchQuery);
          setPrompts(results);
        } finally {
          setLoadingPrompts(false);
        }
      };
      doSearch();
    }
  }, [view, activeCategoryId, searchQuery]);

  // Handlers
  const handleCategoryClick = (id: string) => {
    setActiveCategoryId(id);
    setView('category');
    setSearchQuery(''); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setView('home');
    setActiveCategoryId(null);
    setSearchQuery('');
    setPrompts([]);
  };

  const handlePromptClick = async (promptSummary: Prompt) => {
    // Open modal immediately with summary data
    setSelectedPrompt(promptSummary);
    setIsModalOpen(true);

    // Fetch full details
    try {
      const fullPrompt = await DataService.getPromptById(promptSummary.id);
      if (fullPrompt) {
        // Only update if the modal is still open and showing this prompt
        setSelectedPrompt(prev => prev?.id === fullPrompt.id ? fullPrompt : prev);
      } else {
        // If fetch fails, close modal to prevent infinite loading state
        console.warn("Could not fetch details for prompt:", promptSummary.id);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error("Failed to load prompt details", e);
      setIsModalOpen(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length > 2) {
       if (view !== 'home') setView('home'); 
    }
  };

  // Render Helpers
  const renderHeader = () => (
    <header className="sticky top-0 z-40 pt-6 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all duration-300">
      <div className="relative">
        {/* Glass Header Background */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-xl border border-white/30 shadow-sm rounded-3xl -mx-2 -my-2 sm:-mx-4 sm:p-4"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 p-2 sm:p-0">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={handleBack}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <LayoutGrid className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight group-hover:opacity-80 transition-opacity">
              PromtSpace
            </h1>
          </div>

          <div className="relative w-full sm:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Поиск промтов..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-11 pr-4 py-3 bg-white/30 border border-white/40 rounded-2xl leading-5 text-slate-700 placeholder-slate-500 focus:outline-none focus:bg-white/60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 sm:text-sm transition-all shadow-inner hover:bg-white/40 backdrop-blur-md"
            />
          </div>
        </div>
      </div>
    </header>
  );

  const renderCategoryGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {filteredCategories.map((category, idx) => {
        const Icon = IconMap[category.iconName] || IconMap['Default'];
        return (
          <GlassCard 
            key={category.id} 
            interactive 
            onClick={() => handleCategoryClick(category.id)}
            className="group flex flex-col p-8 h-full animate-slide-up"
          >
            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-6 shadow-xl shadow-blue-900/5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
              <Icon className="text-white drop-shadow-md" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors tracking-tight">
              {category.name}
            </h3>
            <p className="text-slate-500 text-sm mb-6 flex-grow leading-relaxed font-medium">
              {category.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100/50">
              <span className="text-xs font-semibold text-slate-500 bg-white/50 px-3 py-1.5 rounded-full border border-white/60">
                {category.promptCount} промтов
              </span>
              <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-blue-500/30">
                <ArrowRight size={18} />
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );

  const renderPromptsList = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb / Navigation Header */}
      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-8 px-2">
        <button onClick={handleBack} className="hover:text-blue-600 hover:bg-white/50 px-3 py-1.5 rounded-lg transition-all">
          Категории
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800 px-3 py-1.5 bg-white/40 rounded-lg backdrop-blur-sm">
          {view === 'home' ? 'Результаты поиска' : activeCategory?.name}
        </span>
      </div>

      <div className="grid gap-4">
        {loadingPrompts ? (
           // Skeleton Loading
           Array.from({ length: 3 }).map((_, i) => (
             <GlassCard key={i} className="p-6 h-32 animate-pulse flex flex-col justify-center opacity-70">
               <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
               <div className="h-3 bg-slate-200 rounded w-3/4"></div>
             </GlassCard>
           ))
        ) : prompts.length === 0 ? (
          <div className="text-center py-24">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-slate-400">
                <Search size={32} />
             </div>
             <p className="text-slate-500 text-lg font-medium">Промты не найдены</p>
             {view === 'home' && searchQuery && (
               <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-500 hover:text-blue-600 font-medium hover:underline">
                 Очистить поиск
               </button>
             )}
          </div>
        ) : (
          prompts.map((prompt) => (
            <GlassCard 
              key={prompt.id} 
              interactive
              onClick={() => handlePromptClick(prompt)}
              className="p-6 group flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all border-l-4 border-l-transparent hover:border-l-blue-500"
            >
              <div className="flex-1">
                <h4 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {prompt.title}
                </h4>
                <p className="text-slate-500 text-sm leading-relaxed max-w-2xl font-medium">
                  {prompt.shortDescription}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                 <div className="flex flex-wrap gap-2">
                    {prompt.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/60 text-slate-500 text-xs font-semibold border border-white/60 shadow-sm backdrop-blur-sm">
                        #{tag}
                      </span>
                    ))}
                 </div>
                 <div className="hidden sm:block p-2 text-slate-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1">
                    <ChevronLeft className="rotate-180" size={24} />
                 </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
      {renderHeader()}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="relative w-16 h-16">
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : (
          <>
            {view === 'home' && !searchQuery ? (
              <div className="space-y-8">
                <div className="mb-10 text-center sm:text-left">
                  <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
                    Категории
                  </h2>
                  <p className="text-lg text-slate-500 font-medium max-w-2xl">
                    Выберите категорию, чтобы найти идеальный промт для ваших задач
                  </p>
                </div>
                {renderCategoryGrid()}
              </div>
            ) : (
              renderPromptsList()
            )}

            {/* Suggest Prompt Button - Visible on all pages at the bottom */}
            <div className="mt-16 mb-8 flex justify-center animate-fade-in">
              <a
                href="https://forms.gle/Eji6HbPJssicqK1YA"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center space-x-2 px-8 py-4 rounded-2xl bg-white/30 hover:bg-white/50 border border-white/40 text-slate-700 font-semibold backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95"
              >
                <Send className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                <span>Предложить промт</span>
              </a>
            </div>
          </>
        )}
      </main>

      <PromptModal 
        prompt={selectedPrompt} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default App;
export interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string; // We will map this to Lucide icons
  promptCount: number;
  gradient: string; // For visual flair
}

export interface Prompt {
  id: string;
  categoryId: string;
  title: string;
  shortDescription: string;
  fullDescription?: string; // Optional: loaded only on detail view
  content?: string; // Optional: loaded only on detail view
  tags: string[];
}

export interface SearchResult {
  prompts: Prompt[];
  categories: Category[];
}
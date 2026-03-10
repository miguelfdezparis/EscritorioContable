export interface Post {
  id: number;
  title: string;
  content: string;
  category: 'Financiero' | 'Contable' | 'Fiscal' | 'Laboral' | 'Actualidad/Opinión';
  date: string;
  slug: string;
  seoKeywords: string;
  readingTime: number;
  metaDescription: string;
  views?: number;
}

export interface Experience {
  id: number;
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface Author {
  name: string;
  photoUrl: string;
}
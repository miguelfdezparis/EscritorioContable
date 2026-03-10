import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Calendar, Clock, Search, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Post } from '../types';

export default function AllArticles({ posts }: { posts: Post[] }) {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearchQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const categories = ['Todos', 'Financiero', 'Contable', 'Fiscal', 'Laboral', 'Actualidad/Opinión'];

  const activeCategory = useMemo(() => {
    if (!categorySlug) return 'Todos';
    const found = categories.find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '-') === categorySlug);
    return found || 'Todos';
  }, [categorySlug, categories]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesCategory = activeCategory === 'Todos' || post.category === activeCategory;
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (post.seoKeywords && post.seoKeywords.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  const handleCategoryClick = (category: string) => {
    if (category === 'Todos') {
      navigate('/articulos');
    } else {
      navigate(`/categoria/${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    }
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <Helmet>
        <title>{activeCategory !== 'Todos' ? `${activeCategory} - ` : ''}Artículos | Escritorio Contable</title>
        <meta name="description" content="Explora todos los artículos sobre contabilidad, fiscalidad, laboral y finanzas." />
      </Helmet>

      <main className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-primary hover:text-accent font-bold text-xs uppercase tracking-widest transition-colors mb-6"
            >
              <ChevronLeft size={18} /> Volver al inicio
            </button>
            <h1 className="text-4xl md:text-5xl font-black text-primary uppercase tracking-tighter">
              {activeCategory === 'Todos' ? 'Todos los Artículos' : activeCategory}
            </h1>
          </div>
          
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-muted" size={20} />
            </div>
            <input 
              type="text"
              placeholder="Buscar artículos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-primary/10 rounded-xl focus:border-primary focus:bg-white outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === category 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-primary'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-primary/5">
            <p className="text-muted font-medium">No se encontraron artículos que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (
              <article 
                key={post.id} 
                className="group bg-white rounded-2xl border border-primary/10 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                onClick={() => navigate(`/articulo/${post.slug}`)}
              >
                {post.imageUrl && (
                  <div className="w-full h-48 overflow-hidden">
                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="bg-light-blue text-primary px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
                      {post.category}
                    </span>
                    <span className="text-muted text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <Clock size={12} /> {post.readingTime} min
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-primary mb-4 leading-tight group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted text-sm leading-relaxed mb-8 flex-1">
                    {post.metaDescription || post.content.substring(0, 150).replace(/[#*]/g, '') + '...'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-primary/5">
                    <div className="flex items-center gap-2 text-muted font-bold text-[10px] uppercase tracking-widest">
                      <Calendar size={14} />
                      {format(new Date(post.date), "d MMM, yyyy", { locale: es })}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

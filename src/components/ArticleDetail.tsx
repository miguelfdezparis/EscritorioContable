import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Calendar, Clock, Eye, Share2, Twitter, Linkedin, Link as LinkIcon, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Post } from '../types';

export default function ArticleDetail({ isAuthenticated, handleDeletePost }: { isAuthenticated: boolean, handleDeletePost: (id: number) => Promise<boolean> }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`/api/posts/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => navigate('/'));
  }, [slug, navigate]);

  const onDelete = async () => {
    const success = await handleDeletePost(post!.id);
    if (success) navigate('/');
  };

  if (loading) return <div className="min-h-screen pt-40 pb-20 text-center text-primary font-bold">Cargando artículo...</div>;
  if (!post) return null;

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <Helmet>
        <title>{post.title} | Escritorio Contable</title>
        <meta name="description" content={post.metaDescription || post.content.substring(0, 150).replace(/[#*]/g, '') + '...'} />
        <meta name="keywords" content={post.seoKeywords} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription || post.content.substring(0, 150).replace(/[#*]/g, '') + '...'} />
      </Helmet>

      <main className="max-w-5xl mx-auto px-6 lg:px-12 bg-white rounded-2xl md:shadow-xl md:border md:border-primary/10 overflow-hidden flex flex-col">
        <div className="px-8 py-6 flex justify-between items-center border-b border-primary/10 bg-light-blue">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary hover:text-accent font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={18} /> Volver al inicio
          </button>
          <div className="flex items-center gap-6">
            <span className="bg-primary text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
              {post.category}
            </span>
          </div>
        </div>
        
        <div className="px-8 md:px-20 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-6 text-muted mb-8 font-bold text-[10px] uppercase tracking-widest flex-wrap">
              <div className="flex items-center gap-2"><Calendar size={14} /> {format(new Date(post.date), "d MMMM, yyyy", { locale: es })}</div>
              <div className="w-1 h-1 rounded-full bg-primary/10" />
              <div className="flex items-center gap-2"><Clock size={14} /> {post.readingTime} min lectura</div>
              <div className="w-1 h-1 rounded-full bg-primary/10" />
              <div className="flex items-center gap-2"><Eye size={14} /> {post.views || 0} visualizaciones</div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-primary mb-12 leading-tight">
              {post.title}
            </h1>
            
            {post.imageUrl && (
              <div className="mb-12 w-full rounded-2xl overflow-hidden shadow-md">
                <img src={post.imageUrl} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
              </div>
            )}
            
            <div className="prose max-w-none">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
            
            <div className="mt-16 pt-8 border-t border-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Share2 size={14} /> Compartir artículo
                </span>
                <div className="flex items-center gap-6">
                  <a 
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-[#0A66C2] transition-colors"
                  >
                    <Linkedin size={20} />
                  </a>
                  <a 
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-[#1DA1F2] transition-colors"
                  >
                    <Twitter size={20} />
                  </a>
                  <a 
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-[#25D366] transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('¡Enlace copiado al portapapeles!');
                    }}
                    className="text-primary hover:text-accent transition-colors"
                    title="Copiar enlace"
                  >
                    <LinkIcon size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/10">
                  <img src="/author.jpg" alt="Author" />
                </div>
                <div>
                  <div className="text-xl font-black text-primary">Jose Ramón Fernández de la Cigoña Fraga</div>
                  <div className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Especialista en Contenido Técnico</div>
                </div>
              </div>
              {isAuthenticated && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate(`/?edit=${post.slug}`)}
                    className="bg-primary/5 text-primary px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button 
                    onClick={onDelete}
                    className="bg-red-50 text-red-600 px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

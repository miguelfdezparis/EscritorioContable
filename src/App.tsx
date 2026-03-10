import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { 
  Briefcase, 
  BookOpen, 
  FileText, 
  Newspaper,
  X, 
  ChevronRight, 
  Plus, 
  Lock,
  Calculator,
  TrendingUp,
  Scale,
  ArrowRight,
  Mail,
  Linkedin,
  Calendar,
  Clock,
  ChevronLeft,
  LogOut,
  ArrowDown,
  Menu,
  Edit,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Post, Experience, Author } from './types';

const LazyEditor = lazy(() => import('./components/LazyEditor'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AllArticles = lazy(() => import('./components/AllArticles'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Inner Content that has access to hooks and routing
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLinkedinModal, setShowLinkedinModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [adminTab, setAdminTab] = useState<'posts' | 'experience' | 'profile'>('posts');
  const [editExperienceId, setEditExperienceId] = useState<number | null>(null);
  const [newExperience, setNewExperience] = useState({
    company: '',
    role: '',
    period: '',
    description: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Updated initial state with new SEO fields
  const [newPost, setNewPost] = useState({ 
    title: '', 
    content: '', 
    category: 'Financiero',
    slug: '',
    seoKeywords: '',
    readingTime: 5,
    metaDescription: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'setup2fa' | 'verify2fa'>('credentials');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    fetchData();
    checkAuth();
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editSlug = params.get('edit');
    if (editSlug && posts.length > 0 && isAuthenticated) {
      const postToEdit = posts.find(p => p.slug === editSlug);
      if (postToEdit) {
        openEditModal(postToEdit);
        // Remove the query param from URL without reloading
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, posts, isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      const [postsRes, expRes, authorRes] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/experience'),
        fetch('/api/author')
      ]);
      const postsData = await postsRes.json();
      const expData = await expRes.json();
      const authorData = await authorRes.json();
      setPosts(postsData);
      setExperience(expData);
      setAuthor(authorData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/check-auth');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, twoFactorCode })
      });
      
      const data = await res.json();

      if (res.ok) {
        if (data.require2FASetup) {
          setQrCodeUrl(data.qrCode);
          setLoginStep('setup2fa');
        } else if (data.require2FA) {
          setLoginStep('verify2fa');
        } else if (data.success) {
          setIsAuthenticated(true);
          setUsername('');
          setPassword('');
          setTwoFactorCode('');
          setLoginStep('credentials');
          alert("Acceso Autorizado - Sesión Iniciada");
        }
      } else {
        alert(data.error || "Error de autenticación");
      }
    } catch (error) {
      alert("Error al conectar con el servidor");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setShowAdminModal(false);
    setLoginStep('credentials');
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Front-end Regex Validation for slug
    if (!/^[a-z0-9-]+$/.test(newPost.slug)) {
      alert("Error: El slug solo puede contener letras minúsculas, números y guiones.");
      return;
    }

    try {
      const url = editPostId ? `/api/posts/${editPostId}` : '/api/posts';
      const method = editPostId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      
      const data = await res.json().catch(() => ({ error: "Error al leer respuesta del servidor" }));
      
      if (res.ok) {
        setNewPost({ title: '', content: '', category: 'Financiero', slug: '', seoKeywords: '', readingTime: 5, metaDescription: '' });
        setEditPostId(null);
        setShowAdminModal(false);
        fetchData();
        alert(editPostId ? "Entrada actualizada con éxito" : "Entrada creada con éxito");
      } else {
        alert(data.error || `Error ${res.status}: ${res.statusText}`);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      const msg = error.message || "Error desconocido";
      alert(`Error al conectar con el servidor: ${msg}. Es posible que el contenido sea demasiado grande o haya un problema de red.`);
    }
  };

  const openEditModal = (post: Post) => {
    setNewPost({
      title: post.title,
      content: post.content,
      category: post.category,
      slug: post.slug,
      seoKeywords: post.seoKeywords || '',
      readingTime: post.readingTime || 5,
      metaDescription: post.metaDescription || ''
    });
    setEditPostId(post.id);
    setShowAdminModal(true);
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setEditPostId(null);
    setNewPost({ title: '', content: '', category: 'Financiero', slug: '', seoKeywords: '', readingTime: 5, metaDescription: '' });
  };

  const handleDeletePost = async (id: number): Promise<boolean> => {
    if (!confirm("¿Estás seguro de que quieres eliminar este artículo?")) return false;
    
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        fetchData();
        alert("Entrada eliminada");
        return true;
      } else {
        alert("Error al eliminar");
        return false;
      }
    } catch (error) {
      alert("Error al conectar con el servidor");
      return false;
    }
  };

  const handleCreateExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editExperienceId ? `/api/experience/${editExperienceId}` : '/api/experience';
      const method = editExperienceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExperience)
      });
      
      if (res.ok) {
        setNewExperience({ company: '', role: '', period: '', description: '' });
        setEditExperienceId(null);
        fetchData();
        alert(editExperienceId ? "Experiencia actualizada" : "Experiencia añadida");
      } else {
        const errorData = await res.json().catch(() => ({ error: `Error ${res.status}: ${res.statusText}` }));
        alert("Error al guardar la experiencia: " + (errorData.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Error al conectar con el servidor");
    }
  };

  const openEditExperience = (exp: Experience) => {
    setNewExperience({
      company: exp.company,
      role: exp.role,
      period: exp.period,
      description: exp.description || ''
    });
    setEditExperienceId(exp.id);
  };

  const handleDeleteExperience = async (id: number) => {
    if (!confirm("¿Eliminar esta experiencia?")) return;
    try {
      const res = await fetch(`/api/experience/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        fetchData();
        alert("Experiencia eliminada");
      } else {
        const errorData = await res.json().catch(() => ({ error: `Error ${res.status}: ${res.statusText}` }));
        alert("Error al eliminar: " + (errorData.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Delete experience error:", error);
      alert("Error al conectar con el servidor");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/articulos?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleReset2FA = async () => {
    if (!confirm("¿Estás seguro de que quieres resetear el 2FA? Se te pedirá configurar un nuevo código QR en el próximo inicio de sesión.")) return;
    try {
      const res = await fetch('/api/admin/reset-2fa', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert("2FA reseteado con éxito. Por favor, cierra sesión y vuelve a entrar para configurar el nuevo QR.");
      } else {
        const errorData = await res.json().catch(() => ({ error: `Error ${res.status}: ${res.statusText}` }));
        alert("Error al resetear 2FA: " + (errorData.error || "Error desconocido"));
      }
    } catch (error: any) {
      console.error("Reset 2FA error:", error);
      const msg = error.message || "Error desconocido";
      alert(`Error al conectar con el servidor: ${msg}`);
    }
  };

  const filteredPosts = activeCategory === 'Todos' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  const displayedPosts = filteredPosts.slice(0, 6);

  const categories = ['Todos', 'Financiero', 'Contable', 'Fiscal', 'Laboral', 'Actualidad/Opinión'];

  // Handler for dynamic slug generation from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const autoSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setNewPost(prev => ({ ...prev, title, slug: prev.slug || autoSlug }));
  };

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-primary/10">
      {/* Global SEO Tags */}
      <Helmet>
        <title>Escritorio Contable | Jose Ramón Fernández de la Cigoña Fraga</title>
        <meta name="description" content="Blog especializado de Jose Ramón Fernández de la Cigoña Fraga. Análisis experto y actualidad en materia financiera, contable, fiscal y laboral para profesionales y empresas." />
        <meta name="keywords" content="contabilidad, financiero, fiscal, laboral, jose ramon fernandez, asesoría, pyme, experto contable" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-300",
        scrolled ? "bg-primary py-3 shadow-lg" : "bg-primary/95 py-5"
      )}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <div className="bg-white text-primary w-10 h-10 flex items-center justify-center font-black text-xl rounded-sm">EC</div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg tracking-tight leading-none">Escritorio Contable</span>
                <span className="text-white/70 text-[10px] uppercase tracking-wider font-medium mt-1">Jose Ramón Fernández de la Cigoña Fraga</span>
              </div>
            </motion.div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {['Blog', 'Experiencia'].map((item) => (
                <a 
                  key={item}
                  href={`/#${item.toLowerCase()}`} 
                  onClick={() => navigate('/')}
                  className="text-xs uppercase tracking-widest font-bold text-white/80 hover:text-white transition-colors"
                >
                  {item}
                </a>
              ))}
              <a 
                href="mailto:jose.fcfraga@gmail.com" 
                className="bg-accent hover:bg-accent/90 text-white px-5 py-2 rounded-sm text-xs uppercase tracking-widest font-bold transition-all shadow-md"
              >
                Contacto
              </a>
              <button 
                onClick={() => setShowAdminModal(true)}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <Lock size={16} />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 focus:outline-none"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-primary border-t border-white/10 overflow-hidden"
            >
              <div className="flex flex-col px-6 py-4 gap-4">
                {['Blog', 'Experiencia'].map((item) => (
                  <a 
                    key={item}
                    href={`/#${item.toLowerCase()}`} 
                    onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                    className="text-sm uppercase tracking-widest font-bold text-white/80 hover:text-white transition-colors py-2"
                  >
                    {item}
                  </a>
                ))}
                <a 
                  href="mailto:jose.fcfraga@gmail.com" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-accent hover:bg-accent/90 text-white px-5 py-3 rounded-sm text-sm uppercase tracking-widest font-bold transition-all shadow-md text-center mt-2"
                >
                  Contacto
                </a>
                <button 
                  onClick={() => { setShowAdminModal(true); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 text-white/50 hover:text-white transition-colors py-3 mt-2 border-t border-white/10"
                >
                  <Lock size={16} /> <span className="text-xs uppercase tracking-widest font-bold">Admin</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <Routes>
        <Route path="/" element={
          <>
            <main className="max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-24">
              {/* Blog Section */}
              <section id="blog" className="mb-32">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                  <div>
                    <h2 className="text-4xl font-black text-primary uppercase tracking-tighter mb-2">Artículos & Análisis</h2>
                    <p className="text-muted font-medium">Análisis experto en materia contable y fiscal</p>
                  </div>
                  
                  <form onSubmit={handleSearch} className="w-full md:w-96 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="text-muted" size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Buscar artículos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-primary/10 rounded-xl focus:border-primary focus:shadow-md outline-none transition-all font-medium"
                    />
                  </form>
                </div>
                
                <div className="flex flex-wrap gap-3 mb-12">
                  {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                          activeCategory === cat 
                            ? "bg-primary text-white shadow-lg" 
                            : "bg-primary/5 text-primary hover:bg-primary/10"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <AnimatePresence mode="popLayout">
                    {displayedPosts.map((post, idx) => (
                      <motion.article
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => navigate(`/articulo/${post.slug}`)}
                        className="group cursor-pointer bg-white border border-primary/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all shadow-sm hover:shadow-xl flex flex-col md:flex-row"
                      >
                        <div className="md:w-1/3 bg-primary/5 flex items-center justify-center p-8">
                          {post.category === 'Financiero' && <TrendingUp size={48} className="text-primary/20" />}
                          {post.category === 'Contable' && <Calculator size={48} className="text-primary/20" />}
                          {post.category === 'Fiscal' && <Briefcase size={48} className="text-primary/20" />}
                          {post.category === 'Laboral' && <Scale size={48} className="text-primary/20" />}
                          {post.category === 'Actualidad/Opinión' && <Newspaper size={48} className="text-primary/20" />}
                        </div>
                        <div className="p-8 md:w-2/3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <span className="bg-accent/10 text-accent px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest">
                                {post.category}
                              </span>
                              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                                {format(new Date(post.date), "d MMM, yyyy", { locale: es })}
                              </span>
                            </div>
                            <h3 className="text-2xl font-bold text-primary mb-4 group-hover:text-accent transition-colors leading-tight">
                              {post.title}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between text-primary font-bold text-[10px] uppercase tracking-widest mt-4">
                            <span className="flex items-center gap-2 group-hover:gap-4 transition-all">
                              Leer Análisis <ArrowRight size={14} />
                            </span>
                            <span className="text-muted/70 flex items-center gap-1"><Clock size={12}/> {post.readingTime || 5} min</span>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
                
                {filteredPosts.length > 6 && (
                  <div className="mt-16 text-center">
                    <button 
                      onClick={() => navigate('/articulos')}
                      className="inline-flex items-center gap-3 bg-white border-2 border-primary/10 text-primary px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      Ver todos los artículos <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                
                {filteredPosts.length === 0 && !loading && (
                  <div className="py-20 text-center bg-primary/5 rounded-3xl border-2 border-dashed border-primary/10">
                    <div className="text-xl font-bold text-primary/40 uppercase tracking-widest">No hay publicaciones disponibles</div>
                  </div>
                )}
              </section>

              {/* About Section */}
              <section id="sobre-mi" className="mb-32 bg-light-blue rounded-3xl p-8 md:p-16 border border-primary/10 relative overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
                  <div className="lg:col-span-7">
                    <motion.div 
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                    >
                      <div className="inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                        Especialista en Contenido Técnico
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-primary mb-8 leading-[1.1]">
                        Escritorio <br />
                        <span className="text-accent">Contable</span>
                      </h2>
                      <p className="text-xl text-muted mb-8 leading-relaxed max-w-2xl font-medium">
                        Rigor técnico, claridad expositiva y visión estratégica para el sector contable, financiero y laboral. Más de 30 años de experiencia al servicio de la divulgación profesional.
                      </p>
                      
                      <div className="flex flex-wrap gap-6 items-center">
                        <button 
                          onClick={() => setShowLinkedinModal(true)}
                          className="bg-blue-600 hover:bg-blue-800 text-white px-8 py-4 rounded-sm font-bold uppercase tracking-widest text-sm transition-all shadow-xl flex items-center gap-3"
                        >
                          <Linkedin size={18} /> Nuestro grupo en LinkedIn
                        </button>
                        <div className="flex gap-6">
                          <a href="https://www.linkedin.com/in/josefcfraga/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                            <Linkedin size={20} />
                          </a>
                          <a href="mailto:jose.fcfraga@gmail.com" className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                            <Mail size={20} />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                  
                  <div className="lg:col-span-5 relative">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                      className="relative z-10"
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-8 border-white bg-white">
                        <img 
                          src="/author.jpg"
                          alt="Jose Ramón Fernández de la Cigoña Fraga" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {/* Accents */}
                      <div className="absolute -top-6 -left-6 w-24 h-24 bg-accent/10 rounded-full -z-10" />
                      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-2xl -z-10 rotate-12" />
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Experience Section */}
              <section id="experiencia">
                <div className="flex items-center gap-4 mb-16">
                  <div className="h-px flex-1 bg-primary/10" />
                  <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Trayectoria Profesional</h2>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {experience.map((exp, idx) => (
                    <motion.div 
                      key={exp.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white border border-primary/5 p-8 rounded-xl shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="text-accent font-bold text-xs uppercase tracking-widest mb-4">{exp.period}</div>
                      <h3 className="text-xl font-bold text-primary mb-2 group-hover:text-primary-dark transition-colors">{exp.role}</h3>
                      <div className="text-primary/60 font-bold text-[10px] uppercase tracking-wider mb-6">{exp.company}</div>
                      <p className="text-muted text-sm leading-relaxed">{exp.description}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            </main>
          </>
        } />
        
        {/* Isolated Article View Route */}
        <Route 
          path="/articulo/:slug" 
          element={
            <Suspense fallback={<div className="min-h-screen pt-40 pb-20 text-center text-primary font-bold">Cargando artículo...</div>}>
              <ArticleDetail isAuthenticated={isAuthenticated} handleDeletePost={handleDeletePost} />
            </Suspense>
          } 
        />

        {/* All Articles Route */}
        <Route 
          path="/articulos" 
          element={
            <Suspense fallback={<div className="min-h-screen pt-40 pb-20 text-center text-primary font-bold">Cargando artículos...</div>}>
              <AllArticles posts={posts} />
            </Suspense>
          } 
        />

        {/* Category Route */}
        <Route 
          path="/categoria/:categorySlug" 
          element={
            <Suspense fallback={<div className="min-h-screen pt-40 pb-20 text-center text-primary font-bold">Cargando artículos...</div>}>
              <AllArticles posts={posts} />
            </Suspense>
          } 
        />
      </Routes>

      {/* Footer */}
      <footer className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-16">
            <div className="md:col-span-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white text-primary w-10 h-10 flex items-center justify-center font-black text-xl rounded-sm">EC</div>
                <span className="text-2xl font-black tracking-tighter">Jose Ramón Fernández de la Cigoña Fraga</span>
              </div>
              <p className="text-white/60 leading-relaxed max-w-md font-medium mb-8">
                Divulgación técnica y consultoría estratégica especializada en el sector financiero, contable y laboral.
              </p>
              <div className="flex gap-6">
                <a href="https://www.linkedin.com/in/josefcfraga/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-primary transition-all">
                  <Linkedin size={20} />
                </a>
                <a href="mailto:jose.fcfraga@gmail.com" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white hover:text-primary transition-all">
                  <Mail size={20} />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-6 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-black text-white/40 mb-6">Navegación</h4>
                <ul className="space-y-4 text-sm font-bold">
                  <li><a href="/#" className="text-white/70 hover:text-white transition-colors">Inicio</a></li>
                  <li><a href="/#experiencia" className="text-white/70 hover:text-white transition-colors">Experiencia</a></li>
                  <li><a href="/#blog" className="text-white/70 hover:text-white transition-colors">Blog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-black text-white/40 mb-6">Contacto</h4>
                <ul className="space-y-4 text-sm font-bold">
                  <li><a href="mailto:jose.fcfraga@gmail.com" className="text-white/70 hover:text-white transition-colors">Email</a></li>
                  <li><a href="https://www.linkedin.com/in/josefcfraga/" className="text-white/70 hover:text-white transition-colors">LinkedIn</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-white/30">
            <div>© {new Date().getFullYear()} Jose Ramón Fernández de la Cigoña Fraga</div>
          </div>
        </div>
      </footer>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAdminModal}
              className="absolute inset-0 bg-primary/95 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-12 overflow-y-auto">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">{editPostId ? 'Editar Artículo' : 'Panel de Gestión'}</h2>
                    <p className="text-muted font-bold mt-2 text-[10px] uppercase tracking-widest">Acceso Seguro Restringido</p>
                  </div>
                  <button onClick={closeAdminModal} className="p-3 hover:bg-primary/5 rounded-full transition-colors text-primary">
                    <X size={24} />
                  </button>
                </div>

                {!isAuthenticated ? (
                  <form onSubmit={handleLogin} className="space-y-8">
                    {loginStep === 'credentials' && (
                      <>
                        <div className="bg-light-blue p-6 rounded-xl border border-primary/5 mb-8">
                          <div className="flex items-center gap-3 text-primary mb-4">
                            <Lock size={18} />
                            <span className="font-bold text-xs uppercase tracking-widest">Acceso de Administrador</span>
                          </div>
                          <p className="text-[10px] text-muted font-medium leading-relaxed">
                            Introduzca sus credenciales. El sistema monitoriza los intentos de acceso mediante Rate Limiting.
                          </p>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Usuario</label>
                            <input 
                              required
                              type="text" 
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-sm"
                              placeholder="admin"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Contraseña</label>
                            <input 
                              required
                              type="password" 
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-sm"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {loginStep === 'setup2fa' && (
                      <div className="space-y-6 text-center">
                        <div className="bg-light-blue p-6 rounded-xl border border-primary/5 mb-8 text-left">
                          <div className="flex items-center gap-3 text-primary mb-4">
                            <Lock size={18} />
                            <span className="font-bold text-xs uppercase tracking-widest">Configurar 2FA</span>
                          </div>
                          <p className="text-[10px] text-muted font-medium leading-relaxed">
                            Escanea este código QR con Google Authenticator o Authy para configurar tu segundo factor de autenticación.
                          </p>
                        </div>
                        
                        <div className="flex justify-center mb-6">
                          <div className="p-4 bg-white rounded-xl shadow-sm border border-primary/10">
                            <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48" />
                          </div>
                        </div>

                        <div className="text-left">
                          <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Código de Verificación</label>
                          <input 
                            required
                            type="text" 
                            value={twoFactorCode}
                            onChange={e => setTwoFactorCode(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-sm tracking-[0.5em] text-center"
                            placeholder="000000"
                            maxLength={6}
                          />
                        </div>
                      </div>
                    )}

                    {loginStep === 'verify2fa' && (
                      <div className="space-y-6">
                        <div className="bg-light-blue p-6 rounded-xl border border-primary/5 mb-8">
                          <div className="flex items-center gap-3 text-primary mb-4">
                            <Lock size={18} />
                            <span className="font-bold text-xs uppercase tracking-widest">Verificación 2FA</span>
                          </div>
                          <p className="text-[10px] text-muted font-medium leading-relaxed">
                            Introduce el código de 6 dígitos generado por tu aplicación de autenticación (ej. Google Authenticator).
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Código 2FA</label>
                          <input 
                            required
                            type="text" 
                            value={twoFactorCode}
                            onChange={e => setTwoFactorCode(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-sm tracking-[0.5em] text-center"
                            placeholder="000000"
                            maxLength={6}
                            autoFocus
                          />
                        </div>
                      </div>
                    )}
                    
                    <button 
                      type="submit"
                      className="w-full py-5 bg-primary text-white rounded-sm font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all shadow-xl"
                    >
                      {loginStep === 'credentials' ? 'Continuar' : 'Verificar Identidad'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-10">
                    <div className="flex gap-8 border-b border-primary/10 mb-8">
                      <button 
                        onClick={() => setAdminTab('posts')}
                        className={cn(
                          "pb-4 text-[10px] font-black uppercase tracking-widest transition-all",
                          adminTab === 'posts' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-primary"
                        )}
                      >
                        Artículos
                      </button>
                      <button 
                        onClick={() => setAdminTab('experience')}
                        className={cn(
                          "pb-4 text-[10px] font-black uppercase tracking-widest transition-all",
                          adminTab === 'experience' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-primary"
                        )}
                      >
                        Experiencia
                      </button>
                      <button 
                        onClick={() => setAdminTab('profile')}
                        className={cn(
                          "pb-4 text-[10px] font-black uppercase tracking-widest transition-all",
                          adminTab === 'profile' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-primary"
                        )}
                      >
                        Seguridad
                      </button>
                    </div>

                    {adminTab === 'posts' ? (
                      <form onSubmit={handleCreatePost} className="space-y-10">
                        <div className="space-y-8">
                          <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Título del Artículo</label>
                            <input 
                              required
                              type="text" 
                              value={newPost.title}
                              onChange={handleTitleChange}
                              className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xl"
                              placeholder="Ej: Análisis del nuevo Plan Contable..."
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Slug (URL)</label>
                              <input 
                                required
                                type="text" 
                                value={newPost.slug}
                                onChange={e => setNewPost({...newPost, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})}
                                className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-mono text-xs"
                                placeholder="ej: analisis-plan-contable"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">SEO Keywords</label>
                              <input 
                                required
                                type="text" 
                                value={newPost.seoKeywords}
                                onChange={e => setNewPost({...newPost, seoKeywords: e.target.value})}
                                className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                                placeholder="ej: contabilidad, plan, normativas..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Meta Descripción (SEO)</label>
                            <textarea 
                              required
                              rows={2}
                              value={newPost.metaDescription}
                              onChange={e => setNewPost({...newPost, metaDescription: e.target.value})}
                              className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                              placeholder="Breve descripción que aparecerá en los resultados de Google..."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Categoría</label>
                              <select 
                                value={newPost.category}
                                onChange={e => setNewPost({...newPost, category: e.target.value as any})}
                                className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs uppercase tracking-widest"
                              >
                                <option value="Financiero">Financiero</option>
                                <option value="Contable">Contable</option>
                                <option value="Fiscal">Fiscal</option>
                                <option value="Laboral">Laboral</option>
                                <option value="Actualidad/Opinión">Actualidad/Opinión</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Tiempo de lectura (minutos)</label>
                              <input 
                                required
                                type="number" 
                                min="1"
                                value={newPost.readingTime}
                                onChange={e => setNewPost({...newPost, readingTime: parseInt(e.target.value) || 1})}
                                className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                              />
                            </div>
                          </div>

                          <div data-color-mode="light">
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Contenido</label>
                            <Suspense fallback={<div className="h-[400px] flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-gray-400">Cargando editor...</div>}>
                              <LazyEditor
                                value={newPost.content}
                                onChange={(val) => setNewPost({...newPost, content: val || ''})}
                              />
                            </Suspense>
                            <p className="text-[10px] text-muted mt-2 font-medium">
                              Puedes usar el icono de imagen en la barra de herramientas para subir imágenes directamente en el editor.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button 
                            type="submit"
                            className="flex-1 py-5 bg-primary text-white rounded-sm font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all shadow-xl flex items-center justify-center gap-3"
                          >
                            {editPostId ? <><Edit size={20} /> Guardar Cambios</> : <><Plus size={20} /> Publicar Artículo</>}
                          </button>
                          {editPostId && (
                            <button 
                              type="button"
                              onClick={() => { setEditPostId(null); setNewPost({ title: '', content: '', category: 'Financiero', slug: '', seoKeywords: '', readingTime: 5, metaDescription: '' }); }}
                              className="px-8 py-5 bg-gray-100 text-primary rounded-sm font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    ) : adminTab === 'experience' ? (
                      <div className="space-y-12">
                        <form onSubmit={handleCreateExperience} className="space-y-8 bg-primary/5 p-8 rounded-xl border border-primary/10">
                          <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6">{editExperienceId ? 'Editar Experiencia' : 'Añadir Nueva Experiencia'}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Empresa/Sector</label>
                              <input 
                                required
                                type="text" 
                                value={newExperience.company}
                                onChange={e => setNewExperience({...newExperience, company: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Cargo/Rol</label>
                              <input 
                                required
                                type="text" 
                                value={newExperience.role}
                                onChange={e => setNewExperience({...newExperience, role: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Periodo</label>
                              <input 
                                required
                                type="text" 
                                value={newExperience.period}
                                onChange={e => setNewExperience({...newExperience, period: e.target.value})}
                                className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                                placeholder="Ej: 2010 - Actualidad"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Descripción</label>
                            <textarea 
                              rows={3}
                              value={newExperience.description}
                              onChange={e => setNewExperience({...newExperience, description: e.target.value})}
                              className="w-full px-4 py-3 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xs"
                            />
                          </div>
                          <div className="flex gap-4">
                            <button 
                              type="submit"
                              className="flex-1 py-4 bg-primary text-white rounded-sm font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all"
                            >
                              {editExperienceId ? 'Actualizar' : 'Añadir'}
                            </button>
                            {editExperienceId && (
                              <button 
                                type="button"
                                onClick={() => { setEditExperienceId(null); setNewExperience({ company: '', role: '', period: '', description: '' }); }}
                                className="px-6 py-4 bg-gray-200 text-primary rounded-sm font-black uppercase tracking-widest text-xs"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </form>

                        <div className="space-y-4">
                          <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Lista de Experiencia</h3>
                          {experience.map(exp => (
                            <div key={exp.id} className="flex items-center justify-between p-6 bg-white border border-primary/10 rounded-xl hover:border-primary/30 transition-all">
                              <div>
                                <div className="font-black text-primary text-xs uppercase tracking-widest">{exp.role}</div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-wider">{exp.company} | {exp.period}</div>
                              </div>
                              <div className="flex gap-4">
                                <button onClick={() => openEditExperience(exp)} className="p-2 text-primary hover:bg-primary/5 rounded-full transition-all"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteExperience(exp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all"><X size={16} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-12">
                        <div className="p-8 border border-red-200 rounded-xl bg-red-50/30">
                          <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4">Seguridad Avanzada</h4>
                          <p className="text-[10px] text-muted mb-6 font-medium">Si has perdido el acceso a tu aplicación de autenticación o quieres cambiar de dispositivo, puedes resetear el 2FA aquí.</p>
                          <button 
                            onClick={handleReset2FA}
                            className="px-6 py-3 border border-red-200 text-red-600 rounded-sm font-black uppercase tracking-widest text-[10px] hover:bg-red-600 hover:text-white transition-all"
                          >
                            Resetear 2FA (Nuevo QR)
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end border-t border-primary/10 pt-8">
                      <button 
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
                      >
                        <LogOut size={16} /> Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LinkedIn Group Modal */}
      <AnimatePresence>
        {showLinkedinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLinkedinModal(false)}
              className="absolute inset-0 bg-primary/95 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 md:p-12 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Linkedin size={24} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-tighter">Nuestro grupo en LinkedIn</h2>
                  </div>
                  <button 
                    onClick={() => setShowLinkedinModal(false)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="prose max-w-none text-muted font-medium space-y-6">
                  <p>
                    Un escritorio es un lugar para escribir, y este foro es lo que pretende ser, un lugar donde escribir sobre los temas que nos interesan y compartir conocimiento. Porque las redes sociales y especialmente Linkedin nos permiten desarrollar la inteligencia colaborativa, una forma de inteligencia que emerge de la acción de muchos individuos que interactúan entre sí generando valor.
                  </p>
                  <p>
                    Porque compartir nuestras experiencias y nuestros conocimientos, sin vulnerar información confidencial, es el nuevo poder en contraposición al concepto caduco de almacenar información sin compartirla, permitiéndonos además mantener actualizados nuestros conocimientos, con el valor añadido que genera la diversidad de opiniones. Antes, la información era poder. Ahora no. Ahora el poder está en generar valor compartiendo información y experiencias, con el fin ayudar a mejorar a las personas, organizaciones y a la sociedad.
                  </p>
                  
                  <h3 className="text-xl font-bold text-primary mt-8 mb-4">Los objetivos de este foro son:</h3>
                  <ul className="list-disc pl-6 space-y-3">
                    <li>Mantener nuestros conocimientos actualizados enriqueciéndonos con los conocimientos y experiencia de los miembros del grupo.</li>
                    <li>Recibir, compartir y debatir información sobre los temas que consideremos relevantes en los ámbitos que son de nuestro interés.</li>
                    <li>Crear una red independiente de profesionales que nos permita estar en contacto para ayudarnos mutuamente en las dudas que nos puedan surgir, algo que es de gran importancia en el contexto tan cambiante en el que nos toca vivir.</li>
                  </ul>
                  
                  <blockquote className="border-l-4 border-accent pl-6 py-2 my-8 italic text-primary/80 bg-accent/5 rounded-r-lg">
                    Tal y como dijo Aristóteles: "La inteligencia consiste no sólo en el conocimiento, sino también en la destreza de aplicar los conocimientos en la práctica" y es en la práctica de nuestro trabajo diario donde podemos quitarle el máximo rendimiento a nuestros conocimientos.
                  </blockquote>
                </div>
                
                <div className="mt-12 pt-8 border-t border-primary/10 flex justify-center">
                  <a 
                    href="https://www.linkedin.com/groups/4474977/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-800 text-white px-10 py-5 rounded-sm font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center gap-3"
                  >
                    Únete a nuestro grupo <ArrowRight size={18} />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Global Wrapper Context Provider
export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
      </Router>
    </HelmetProvider>
  );
}

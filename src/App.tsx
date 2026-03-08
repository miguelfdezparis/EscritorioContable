import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  BookOpen, 
  FileText, 
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
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Post {
  id: number;
  title: string;
  content: string;
  category: 'Financiero' | 'Contable' | 'Fiscal' | 'Laboral';
  date: string;
}

interface Experience {
  id: number;
  company: string;
  role: string;
  period: string;
  description: string;
}

interface Author {
  name: string;
  photoUrl: string;
}

// Main App Component
export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'Financiero' });
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
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      if (res.ok) {
        setNewPost({ title: '', content: '', category: 'Financiero' });
        setShowAdminModal(false);
        fetchData();
        alert("Entrada creada con éxito");
      } else {
        alert("Error al crear la entrada");
      }
    } catch (error) {
      alert("Error al conectar con el servidor");
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este artículo?")) return;
    
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        fetchData();
        setSelectedPost(null);
        alert("Entrada eliminada");
      } else {
        alert("Error al eliminar");
      }
    } catch (error) {
      alert("Error al conectar con el servidor");
    }
  };

  const filteredPosts = activeCategory === 'Todos' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  const categories = ['Todos', 'Financiero', 'Contable', 'Fiscal', 'Laboral'];

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-primary/10">
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
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="bg-white text-primary w-10 h-10 flex items-center justify-center font-black text-xl rounded-sm">JR</div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg tracking-tight leading-none">Escritorio Contable</span>
                <span className="text-white/70 text-[10px] uppercase tracking-wider font-medium mt-1">Jose Ramón Fernández</span>
              </div>
            </motion.div>
            
            <div className="hidden md:flex items-center gap-8">
              {['Experiencia', 'Blog'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`} 
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 bg-light-blue overflow-hidden border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                  Especialista en Contenido Técnico
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-primary mb-8 leading-[1.1]">
                  Generación de Contenido <br />
                  <span className="text-accent">Financiero y Laboral</span>
                </h1>
                <p className="text-xl text-muted mb-8 leading-relaxed max-w-2xl font-medium">
                  Rigor técnico, claridad expositiva y visión estratégica para el sector contable, financiero y laboral. Más de 30 años de experiencia al servicio de la divulgación profesional.
                </p>
                
                <ul className="text-muted mb-10 space-y-2 font-medium">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Financiero</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Contable</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Fiscal</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent"></div> Laboral</li>
                </ul>
                
                <div className="flex flex-wrap gap-6 items-center">
                  <a href="#blog" className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-sm font-bold uppercase tracking-widest text-sm transition-all shadow-xl flex items-center gap-3">
                    Ver Artículos <ArrowRight size={18} />
                  </a>
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
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="relative z-10"
              >
                <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-8 border-white bg-white">
                  <img 
                    src={author?.photoUrl || "https://media.licdn.com/dms/image/v2/C4D03AQE-z-z-z-z-z/profile-displayphoto-shrink_800_800/0/1516247345678?e=1715817600&v=beta&t=z-z-z"} 
                    alt="Jose Ramón Fernández de la Cigoña Fraga" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* CEF Style accents */}
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-accent/10 rounded-full -z-10" />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-2xl -z-10 rotate-12" />
              </motion.div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        {/* Experience Section */}
        <section id="experiencia" className="mb-32">
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

        {/* Blog Section */}
        <section id="blog">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
            <div>
              <h2 className="text-4xl font-black text-primary uppercase tracking-tighter mb-2">Artículos & Análisis</h2>
              <p className="text-muted font-medium">Divulgación técnica de alto nivel</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post, idx) => (
                <motion.article
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedPost(post)}
                  className="group cursor-pointer bg-white border border-primary/10 rounded-2xl overflow-hidden hover:border-primary/30 transition-all shadow-sm hover:shadow-xl flex flex-col md:flex-row"
                >
                  <div className="md:w-1/3 bg-primary/5 flex items-center justify-center p-8">
                    {post.category === 'Financiero' && <TrendingUp size={48} className="text-primary/20" />}
                    {post.category === 'Contable' && <Calculator size={48} className="text-primary/20" />}
                    {post.category === 'Fiscal' && <Briefcase size={48} className="text-primary/20" />}
                    {post.category === 'Laboral' && <Scale size={48} className="text-primary/20" />}
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
                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                      Leer Análisis <ArrowRight size={14} />
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
          
          {filteredPosts.length === 0 && !loading && (
            <div className="py-20 text-center bg-primary/5 rounded-3xl border-2 border-dashed border-primary/10">
              <div className="text-xl font-bold text-primary/40 uppercase tracking-widest">No hay publicaciones disponibles</div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-16">
            <div className="md:col-span-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white text-primary w-10 h-10 flex items-center justify-center font-black text-xl rounded-sm">JR</div>
                <span className="text-2xl font-black tracking-tighter">Jose Ramón Fernández</span>
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
                  <li><a href="#" className="text-white/70 hover:text-white transition-colors">Inicio</a></li>
                  <li><a href="#experiencia" className="text-white/70 hover:text-white transition-colors">Experiencia</a></li>
                  <li><a href="#blog" className="text-white/70 hover:text-white transition-colors">Blog</a></li>
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
            <div className="flex gap-8">
              <span>Rigor y Excelencia</span>
              <a href="https://www.cef.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">CEF.- Centro de Estudios Financieros</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="absolute inset-0 bg-primary/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative bg-white w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 flex justify-between items-center border-b border-primary/10 bg-light-blue">
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="flex items-center gap-2 text-primary hover:text-accent font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <ChevronLeft size={18} /> Volver
                </button>
                <div className="flex items-center gap-6">
                  <span className="bg-primary text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
                    {selectedPost.category}
                  </span>
                  <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-primary/5 rounded-full transition-colors text-primary">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 md:px-20 py-16">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center gap-6 text-muted mb-8 font-bold text-[10px] uppercase tracking-widest">
                    <div className="flex items-center gap-2"><Calendar size={14} /> {format(new Date(selectedPost.date), "d MMMM, yyyy", { locale: es })}</div>
                    <div className="w-1 h-1 rounded-full bg-primary/10" />
                    <div className="flex items-center gap-2"><Clock size={14} /> 5 min lectura</div>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-black text-primary mb-12 leading-tight">
                    {selectedPost.title}
                  </h1>
                  
                  <div className="prose max-w-none">
                    <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                  </div>
                  
                  <div className="mt-20 pt-12 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/10">
                        <img src={author?.photoUrl} alt={author?.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xl font-black text-primary">Jose Ramón Fernández</div>
                        <div className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Especialista en Contenido Técnico</div>
                      </div>
                    </div>
                    {isAuthenticated && (
                      <button 
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="bg-red-50 text-red-600 px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                      >
                        Eliminar Artículo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-primary/95 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-12">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Panel de Gestión</h2>
                    <p className="text-muted font-bold mt-2 text-[10px] uppercase tracking-widest">Acceso Seguro Restringido</p>
                  </div>
                  <button onClick={() => setShowAdminModal(false)} className="p-3 hover:bg-primary/5 rounded-full transition-colors text-primary">
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
                  <form onSubmit={handleCreatePost} className="space-y-10">
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Título del Artículo</label>
                        <input 
                          required
                          type="text" 
                          value={newPost.title}
                          onChange={e => setNewPost({...newPost, title: e.target.value})}
                          className="w-full px-4 py-4 bg-white border border-primary/10 rounded-sm focus:border-primary outline-none transition-all font-bold text-xl"
                          placeholder="Ej: Análisis del nuevo Plan Contable..."
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
                          </select>
                        </div>
                        <div className="flex items-end justify-end">
                          <button 
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
                          >
                            <LogOut size={16} /> Cerrar Sesión
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-4">Contenido (Markdown)</label>
                        <textarea 
                          required
                          rows={10}
                          value={newPost.content}
                          onChange={e => setNewPost({...newPost, content: e.target.value})}
                          className="w-full px-6 py-6 rounded-xl bg-gray-50 border border-primary/5 focus:border-primary outline-none transition-all font-mono text-sm leading-relaxed"
                          placeholder="Escribe aquí el contenido técnico..."
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-primary text-white rounded-sm font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      <Plus size={20} /> Publicar Artículo
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

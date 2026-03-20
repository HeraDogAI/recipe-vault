'use client';
import { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, Donut, Printer, Heart, Users, 
  Trash2, ChevronRight, Play, X, ChevronLeft, Moon, Sun 
} from 'lucide-react';

export default function Home() {
  // --- 1. STATE MANAGEMENT ---
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [servings, setServings] = useState(1);
  const [isCookMode, setIsCookMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDark, setIsDark] = useState(false);

  // --- 2. INITIALIZATION (VAULT & THEME) ---
  useEffect(() => {
    const saved = localStorage.getItem('recipe-vault');
    if (saved) setSavedRecipes(JSON.parse(saved));
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  // --- 3. CORE LOGIC ---
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setRecipe(data);
      setServings(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToVault = () => {
    if (!recipe) return;
    const newVault = [recipe, ...savedRecipes.filter(r => r.title !== recipe.title)];
    setSavedRecipes(newVault);
    localStorage.setItem('recipe-vault', JSON.stringify(newVault));
  };

  const deleteFromVault = (title: string) => {
    const newVault = savedRecipes.filter(r => r.title !== title);
    setSavedRecipes(newVault);
    localStorage.setItem('recipe-vault', JSON.stringify(newVault));
  };

  const scaleAmount = (text: string) => {
    if (servings === 1) return text;
    return text.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      return (num * servings).toString();
    });
  };

  return (
    <main className={`min-h-screen transition-colors duration-500 font-sans selection:bg-orange-100 
      ${isDark ? 'bg-[#1A1614] text-[#F6EFEA]' : 'bg-[#FFF9F3] text-[#544F49]'} 
      ${isCookMode ? 'overflow-hidden' : ''}`}>
      
      <div className="max-w-5xl mx-auto p-4 md:p-12">
        
        {/* THEME TOGGLE */}
        <div className="flex justify-end mb-4 no-print">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-full transition-all shadow-sm ${isDark ? 'bg-[#2D2724] text-yellow-400' : 'bg-white text-gray-400'}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* HEADER */}
        <header className="mb-12 text-center no-print">
          <div className="flex justify-center items-center gap-4 mb-2">
            <UtensilsCrossed size={40} className="text-[#E66961]" />
            <h1 className="text-5xl font-black text-[#E66961] tracking-tighter">Recipe Vault</h1>
            <Donut size={40} className="text-[#E66961]" />
          </div>
          <p className="text-[#A29C96] font-medium italic">Clean recipes, zero life stories.</p>
        </header>

        {/* INPUT FORM */}
        <section className="no-print">
          <form onSubmit={handleImport} className="flex flex-col md:flex-row gap-3 mb-8">
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any recipe URL..." 
              className={`flex-1 p-5 rounded-2xl border-2 shadow-sm outline-none transition-all
                ${isDark ? 'bg-[#2D2724] border-[#3D3531] text-white focus:border-[#E66961]' : 'bg-white border-white text-black focus:border-[#F7C664]'}`}
              required
            />
            <button disabled={loading} className="bg-[#E66961] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#D55F58] transition-all disabled:opacity-50 shadow-lg shadow-[#E66961]/20">
              {loading ? '✨ Scraping...' : 'Clean Recipe'}
            </button>
          </form>
        </section>

        {/* MAIN RECIPE CARD */}
        {recipe && (
          <article className={`rounded-[40px] shadow-2xl overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-500
            ${isDark ? 'bg-[#2D2724] border border-[#3D3531]' : 'bg-white border border-orange-50'}`}>
            
            <div className={`p-6 border-b flex flex-wrap justify-between items-center gap-4 no-print
              ${isDark ? 'bg-[#362F2B] border-[#4A413D]' : 'bg-[#FFF9F3] border-orange-50'}`}>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex items-center gap-2 font-bold hover:text-[#E66961] transition-colors">
                  <Printer size={18} /> Print
                </button>
                <button onClick={saveToVault} className="flex items-center gap-2 text-[#E66961] font-bold">
                  <Heart size={18} fill={savedRecipes.some(r => r.title === recipe.title) ? "currentColor" : "none"} /> Save
                </button>
                <button 
                  onClick={() => {setIsCookMode(true); setCurrentStep(0);}} 
                  className="flex items-center gap-2 bg-[#E66961] text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md hover:bg-[#D55F58]"
                >
                  <Play size={16} fill="white" /> Cook Mode
                </button>
              </div>
              
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${isDark ? 'bg-[#2D2724] border-[#4A413D]' : 'bg-white border-orange-100'}`}>
                <Users size={18} className="text-orange-400" />
                <span className="text-sm font-bold opacity-60 uppercase tracking-tighter">Scale:</span>
                <select 
                  value={servings} 
                  onChange={(e) => setServings(parseFloat(e.target.value))}
                  className="bg-transparent font-black text-[#E66961] outline-none cursor-pointer"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
            </div>

            <div className="p-8 md:p-14">
              <h2 className="text-4xl md:text-5xl font-black mb-12 text-center leading-tight tracking-tight">{recipe.title}</h2>
              <div className="grid md:grid-cols-[1fr,1.5fr] gap-12">
                <div>
                  <h3 className="text-xl font-black text-[#E66961] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <span className="w-2 h-8 bg-[#F7C664] rounded-full"></span> Ingredients
                  </h3>
                  <ul className="space-y-5">
                    {recipe.ingredients.map((ing: string, i: number) => (
                      <li key={i} className="flex gap-4 text-lg group">
                        <input type="checkbox" className="mt-1 w-6 h-6 border-2 border-orange-100 rounded-lg accent-[#E66961] shrink-0" />
                        <span>{scaleAmount(ing)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#E66961] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <span className="w-2 h-8 bg-[#F7C664] rounded-full"></span> Instructions
                  </h3>
                  <ol className="space-y-8">
                    {recipe.instructions.map((step: string, i: number) => (
                      <li key={i} className="flex gap-6 group">
                        <span className={`font-black text-5xl italic leading-none ${isDark ? 'text-[#3D3531]' : 'text-orange-100'}`}>{i+1}</span>
                        <p className="text-lg leading-relaxed pt-1">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </article>
        )}

        {/* VAULT SECTION */}
        {savedRecipes.length > 0 && (
          <section className="no-print mt-20 border-t-4 border-dashed border-orange-100/20 pt-16">
            <h3 className="text-3xl font-black mb-8">Your Vault</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedRecipes.map((r, i) => (
                <div key={i} className={`p-6 rounded-[24px] shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                  ${isDark ? 'bg-[#2D2724] border border-[#3D3531]' : 'bg-white border border-orange-50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h4 onClick={() => {setRecipe(r); window.scrollTo(0,0)}} className="font-bold text-lg cursor-pointer group-hover:text-[#E66961] line-clamp-2 leading-tight">
                      {r.title}
                    </h4>
                    <button onClick={() => deleteFromVault(r.title)} className="text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <button onClick={() => {setRecipe(r); window.scrollTo(0,0)}} className="text-xs font-black text-orange-400 tracking-widest flex items-center gap-1">
                    OPEN RECIPE <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* COOK MODE OVERLAY */}
      {isCookMode && recipe && (
        <div className={`fixed inset-0 z-50 flex flex-col p-6 md:p-12 animate-in fade-in zoom-in duration-300 ${isDark ? 'bg-[#1A1614]' : 'bg-[#FFF9F3]'}`}>
          <div className="flex justify-between items-center mb-8 max-w-4xl mx-auto w-full">
            <div className="flex-1 mr-8">
              <div className={`h-3 w-full rounded-full overflow-hidden ${isDark ? 'bg-[#2D2724]' : 'bg-orange-100'}`}>
                <div className="h-full bg-[#E66961] transition-all duration-500 shadow-[0_0_10px_rgba(230,105,97,0.5)]" 
                  style={{ width: `${((currentStep + 1) / recipe.instructions.length) * 100}%` }}></div>
              </div>
              <p className="text-[#A29C96] text-sm mt-2 font-bold uppercase tracking-widest">Step {currentStep + 1} of {recipe.instructions.length}</p>
            </div>
            <button onClick={() => setIsCookMode(false)} className={`p-3 rounded-full shadow-md transition-colors ${isDark ? 'bg-[#2D2724] text-gray-400' : 'bg-white text-gray-400'} hover:text-[#E66961]`}>
              <X size={28} />
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full text-center p-4">
            <span className={`text-7xl md:text-9xl font-black mb-8 select-none ${isDark ? 'text-[#2D2724]' : 'text-orange-100'}`}>{currentStep + 1}</span>
            <p className="text-2xl md:text-5xl font-bold leading-[1.3] tracking-tight">{recipe.instructions[currentStep]}</p>
          </div>
          <div className="flex gap-4 justify-between max-w-4xl mx-auto w-full mt-8">
            <button disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)}
              className={`flex-1 flex items-center justify-center gap-3 border-2 p-6 rounded-[24px] font-black text-xl disabled:opacity-30 transition-all ${isDark ? 'bg-[#2D2724] border-[#3D3531]' : 'bg-white border-orange-100'}`}>
              <ChevronLeft size={32} /> BACK
            </button>
            <button onClick={() => currentStep < recipe.instructions.length - 1 ? setCurrentStep(prev => prev + 1) : setIsCookMode(false)}
              className="flex-[2] flex items-center justify-center gap-3 bg-[#E66961] p-6 rounded-[24px] text-white font-black text-2xl shadow-xl shadow-[#E66961]/30 hover:scale-[1.02] active:scale-95 transition-all">
              {currentStep === recipe.instructions.length - 1 ? 'FINISH' : 'NEXT STEP'} <ChevronRight size={32} />
            </button>
          </div>
        </div>
      )}

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          article { box-shadow: none !important; border: none !important; background: white !important; }
          h2, h3, p, li, span { color: black !important; }
        }
      `}</style>
    </main>
  );
}
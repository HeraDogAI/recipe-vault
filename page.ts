'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    const res = await fetch('/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setRecipe(data);
    setLoading(false);
  };

  return (
    <main className="p-10 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-orange-500">Recipe Vault</h1>
      
      <div className="flex gap-2 mb-10">
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a recipe URL..." 
          className="flex-1 p-3 border rounded text-black"
        />
        <button 
          onClick={handleImport}
          className="bg-orange-600 text-white px-6 py-3 rounded font-bold"
        >
          {loading ? 'Processing...' : 'Import'}
        </button>
      </div>

      {recipe && (
        <div className="bg-white p-6 rounded-lg shadow-lg text-black">
          <h2 className="text-2xl font-bold mb-4">{recipe.title}</h2>
          <h3 className="font-bold mt-4">Ingredients:</h3>
          <ul className="list-disc ml-5">
            {recipe.ingredients.map((ing: string, i: number) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
      )}
    </main>
  );
}
import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const maxDuration = 30; // Matches your vercel.json

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

  // 1. Launch the "Mini-Browser" (Chromium)
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath() as any,
      headless: true, // We hardcode this to true so TypeScript doesn't look for chromium.headless
    });

    const page = await browser.newPage();
    
    // Set a User-Agent so websites don't immediately block the "bot"
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    // Go to the recipe page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    // 2. THE EXTRACTION BRAIN
    const recipeData = await page.evaluate(() => {
      // --- LAYER 1: SEARCH FOR JSON-LD (THE GOLD STANDARD) ---
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          
          // JSON-LD can be a single object, an array, or a @graph
          const findRecipe = (obj: any): any => {
            if (!obj) return null;
            if (obj['@type'] === 'Recipe') return obj;
            if (obj['@graph'] && Array.isArray(obj['@graph'])) return obj['@graph'].find((i: any) => i['@type'] === 'Recipe');
            if (Array.isArray(obj)) return obj.find((i: any) => i['@type'] === 'Recipe');
            return null;
          };

          const recipe = findRecipe(data);
          if (recipe) {
            return {
              title: recipe.name,
              ingredients: recipe.recipeIngredient || [],
              instructions: Array.isArray(recipe.recipeInstructions) 
                ? recipe.recipeInstructions.map((i: any) => i.text || i.name || i) 
                : [recipe.recipeInstructions],
              image: Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image)
            };
          }
        } catch (e) { continue; }
      }

      // --- LAYER 2: CSS SELECTOR FALLBACK (FOR OLDER BLOGS) ---
      const getList = (selectors: string[]) => {
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) return elements.map(el => (el as HTMLElement).innerText.trim());
        }
        return [];
      };

      return {
        title: document.title.split('|')[0].split('-')[0].trim(),
        ingredients: getList(['.wprm-recipe-ingredient', '.recipe-ingredients li', '.ingredients-list li', '[class*="ingredient"] li']),
        instructions: getList(['.wprm-recipe-instruction', '.recipe-directions li', '.instructions-list li', '[class*="instruction"] li']),
        image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
      };
    });

    await browser.close();

    // 3. CLEAN UP THE DATA
    if (!recipeData.ingredients.length && !recipeData.instructions.length) {
      return NextResponse.json({ error: 'Could not find recipe details on this page.' }, { status: 404 });
    }

    return NextResponse.json(recipeData);

  } catch (error: any) {
    console.error('Scrape Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape recipe' }, { status: 500 });
  }
}
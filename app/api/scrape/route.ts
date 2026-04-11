import { NextResponse } from 'next/server';
// 1. Change this to chromium-min
import chromium from '@sparticuz/chromium-min'; 
import puppeteer from 'puppeteer-core';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    // 2. The browser needs a remote URL to download the light version on the fly
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(
        `https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar`
      ) as any,
      headless: true,
    });


    const page = await browser.newPage();
    
    // Pretend to be a real browser to avoid "Bot Blockers"
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Go to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    // 2. EXTRACTION LOGIC
    const recipeData = await page.evaluate(() => {
      // Helper: Search for the "Recipe" schema in JSON-LD
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          
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

      // Fallback: If no Schema is found, hunt for common CSS classes
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

    // 3. VALIDATION
    if (!recipeData.ingredients.length && !recipeData.instructions.length) {
      return NextResponse.json({ error: 'Recipe details not found' }, { status: 404 });
    }

    return NextResponse.json(recipeData);

  } catch (error: any) {
    console.error('Final Scrape Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export const maxDuration = 30; 

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // 1. THE STABLE LAUNCH
    // We point to a specific remote 'pack' that includes all missing libraries (like libnss3)
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(
        `https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar`
      ) as any,
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set a realistic User Agent so recipes don't block you
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Go to the page and wait until the recipe is likely loaded
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    // 2. THE EXTRACTION BRAIN
    const recipeData = await page.evaluate(() => {
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

      // Fallback CSS selectors
      const getList = (selectors: string[]) => {
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) return elements.map(el => (el as HTMLElement).innerText.trim());
        }
        return [];
      };

      return {
        title: document.title.split('|')[0].trim(),
        ingredients: getList(['.wprm-recipe-ingredient', '.recipe-ingredients li', '.ingredients-list li']),
        instructions: getList(['.wprm-recipe-instruction', '.recipe-directions li', '.instructions-list li']),
        image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
      };
    });

    await browser.close();

    if (!recipeData.ingredients.length) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipeData);

  } catch (error: any) {
    console.error('Final Scrape Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape' }, { status: 500 });
  }
}
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { NextResponse } from 'next/server'; // If using App Router

export async function POST(req) { // Modern Next.js App Router syntax
  try {
    // FIX 1: Extract the URL from the POST request
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (process.env.VERCEL) {
      process.env.LD_LIBRARY_PATH = `${process.env.LD_LIBRARY_PATH}:/var/task/node_modules/@sparticuz/chromium/bin`;
    }

    const browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Timeout check: Vercel hobby limits are tight, 25s is good.
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    const recipeData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '{}');
          
          // FIX 2: Removed ': any' types so the browser doesn't crash
          const findRecipe = (obj) => {
            if (!obj) return null;
            if (obj['@type'] === 'Recipe') return obj;
            if (obj['@graph'] && Array.isArray(obj['@graph'])) return obj['@graph'].find((i) => i['@type'] === 'Recipe');
            if (Array.isArray(obj)) return obj.find((i) => i['@type'] === 'Recipe');
            return null;
          };

          const recipe = findRecipe(data);
          if (recipe) {
            return {
              title: recipe.name,
              ingredients: recipe.recipeIngredient || [],
              instructions: Array.isArray(recipe.recipeInstructions) 
                ? recipe.recipeInstructions.map((i) => i.text || i.name || i) 
                : [recipe.recipeInstructions],
              image: Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image)
            };
          }
        } catch (e) { continue; }
      }

      // Fallback
      const getList = (selectors) => {
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) return elements.map(el => el.innerText.trim());
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

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipeData);

  } catch (error) {
    console.error('Final Scrape Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    // 1. Determine if we are on Vercel or Local
    const isLocal = process.env.NODE_ENV === 'development';

    // 2. Point to the correct executable path
    const browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: isLocal 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Your local Chrome path
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // 3. Extract the Recipe Data (JSON-LD)
    const recipeData = await page.evaluate(() => {
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const schemas = Array.isArray(data) ? data : [data];
          const recipe = schemas.find(s => s['@type'] === 'Recipe' || s['@graph']?.some((g: any) => g['@type'] === 'Recipe'));
          
          if (recipe) {
            const r = recipe['@graph'] ? recipe['@graph'].find((g: any) => g['@type'] === 'Recipe') : recipe;
            return {
              title: r.name,
              ingredients: r.recipeIngredient,
              instructions: r.recipeInstructions?.map((i: any) => i.text || i)
            };
          }
        } catch (e) { continue; }
      }
      return null;
    });

    await browser.close();

    if (!recipeData) {
      return NextResponse.json({ error: "Could not find recipe data on this page." }, { status: 404 });
    }

    return NextResponse.json(recipeData);
  } catch (error: any) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
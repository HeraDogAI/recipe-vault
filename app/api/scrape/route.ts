import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    // 1. Detect environment
    const isLocal = process.env.NODE_ENV === 'development';

    // 2. Launch with Cloud-Optimized settings
    const browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: isLocal 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Path for Windows
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 3. Extract JSON-LD Recipe Data
    const recipeData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const items = Array.isArray(data) ? data : [data];
          const recipe = items.find(i => i['@type'] === 'Recipe' || i['@graph']?.some((g: any) => g['@type'] === 'Recipe'));
          
          if (recipe) {
            const r = recipe['@graph'] ? recipe['@graph'].find((g: any) => g['@type'] === 'Recipe') : recipe;
            return {
              title: r.name,
              ingredients: r.recipeIngredient,
              instructions: r.recipeInstructions?.map((step: any) => step.text || step)
            };
          }
        } catch (e) { continue; }
      }
      return null;
    });

    await browser.close();

    if (!recipeData) {
      return NextResponse.json({ error: "No recipe found on this page." }, { status: 404 });
    }

    return NextResponse.json(recipeData);
  } catch (error: any) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
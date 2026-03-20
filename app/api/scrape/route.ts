import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    // 1. Detect if we are running on your laptop or on Vercel
    const isLocal = process.env.NODE_ENV === 'development';

    // 2. Launch with the corrected Chromium settings
    const browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      // Fixed: Using a manual object instead of chromium.defaultViewport
      defaultViewport: {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: false,
      },
      executablePath: isLocal 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    // Reduced timeout to help with Vercel's 10-second limit
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 3. The "Brain": Extracting only the recipe data
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
      return NextResponse.json({ error: "No recipe found" }, { status: 404 });
    }

    return NextResponse.json(recipeData);
  } catch (error: any) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
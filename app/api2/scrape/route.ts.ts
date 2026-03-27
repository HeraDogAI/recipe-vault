import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export const maxDuration = 30; // 30 seconds is the max for Vercel Hobby

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const isLocal = process.env.NODE_ENV === 'development';

    // 1. Configure the browser for the Cloud
    const browser = await puppeteer.launch({
      args: isLocal ? [] : [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: isLocal 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
        : await chromium.executablePath('https://github.com/sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'),
      headless: true,
    });

    const page = await browser.newPage();
    
    // 2. Go to the URL with a 15-second limit
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 3. Extract the Recipe
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
              instructions: r.recipeInstructions?.map((s: any) => s.text || s)
            };
          }
        } catch (e) { continue; }
      }
      return null;
    });

    await browser.close();

    if (!recipeData) {
      return NextResponse.json({ error: "Recipe data not found on page" }, { status: 404 });
    }

    return NextResponse.json(recipeData);
  } catch (error: any) {
    console.error("Scrape Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
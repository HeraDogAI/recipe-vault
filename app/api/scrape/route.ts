import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer'; 
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
    let browser;
    try {
        const { url } = await request.json();

        // 1. Launch a standard browser without the extra plugins
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // 2. Use a standard User Agent so you look like a normal visitor
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        // 3. Go to the URL and wait for the content
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        // 4. Extract Data
        const title = $('h1').first().text().trim() || "Untitled Recipe";
        let ingredients: string[] = [];
        let instructions: string[] = [];

        // Look for the "Golden Ticket": JSON-LD data
        const scripts = $('script[type="application/ld+json"]');
        scripts.each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '');
                const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
                const recipeData = items.find((i: any) => 
                    i['@type'] === 'Recipe' || 
                    (Array.isArray(i['@type']) && i['@type'].includes('Recipe'))
                );
                
                if (recipeData) {
                    ingredients = recipeData.recipeIngredient || [];
                    const steps = recipeData.recipeInstructions || [];
                    instructions = steps.map((s: any) => typeof s === 'string' ? s : (s.text || s.name || ""));
                }
            } catch (e) {}
        });

        return NextResponse.json({ title, ingredients, instructions });

    } catch (error: any) {
        console.error("Scraper Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (browser) await browser.close();
    }
}
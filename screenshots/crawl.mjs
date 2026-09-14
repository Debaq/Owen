import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = 'https://tmeduca.org/owen';
const SCREENSHOT_DIR = path.dirname(new URL(import.meta.url).pathname);
const BROWSER_PATH = '/usr/bin/chromium';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name, fullPage = true) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`📸 ${name}.png`);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ============================================
  // PARTE 1: Portal Público
  // ============================================
  console.log('\n=== PORTAL PÚBLICO ===\n');

  // Página principal
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await screenshot(page, '01_public_home');
  } catch (e) {
    console.log('Error en home:', e.message);
  }

  // Intentar encontrar links públicos en la página
  try {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.textContent.trim()
      }));
    });
    console.log('Links encontrados:', JSON.stringify(links, null, 2));
  } catch (e) {
    console.log('Error obteniendo links:', e.message);
  }

  // Mapa público
  try {
    await page.goto(`${BASE}/#/map`, { waitUntil: 'networkidle2' });
    await delay(3000);
    await screenshot(page, '02_public_map');
  } catch (e) {
    console.log('Error en mapa:', e.message);
  }

  // Login page
  try {
    await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle2' });
    await delay(1500);
    await screenshot(page, '03_login_page');
  } catch (e) {
    console.log('Error en login:', e.message);
  }

  // ============================================
  // PARTE 2: Login
  // ============================================
  console.log('\n=== LOGIN ===\n');

  try {
    await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Buscar campos de login
    const inputs = await page.evaluate(() => {
      const all = document.querySelectorAll('input');
      return Array.from(all).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder
      }));
    });
    console.log('Inputs encontrados:', JSON.stringify(inputs, null, 2));

    // Intentar llenar el formulario
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="correo"], input[placeholder*="email"], input[placeholder*="Email"]');
    const passInput = await page.$('input[type="password"]');

    if (emailInput && passInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type('admin@admin.cl');
      await passInput.click({ clickCount: 3 });
      await passInput.type('admin123');
      await screenshot(page, '04_login_filled');

      // Buscar botón submit
      const submitBtn = await page.$('button[type="submit"], button:not([type])');
      if (submitBtn) {
        await submitBtn.click();
        await delay(3000);
        await screenshot(page, '05_after_login');
        console.log('URL después de login:', page.url());
      }
    } else {
      console.log('No se encontraron campos de login estándar, intentando otro approach...');
      // Intentar con selectores más genéricos
      const allInputs = await page.$$('input');
      if (allInputs.length >= 2) {
        await allInputs[0].click({ clickCount: 3 });
        await allInputs[0].type('admin@admin.cl');
        await allInputs[1].click({ clickCount: 3 });
        await allInputs[1].type('admin123');
        await screenshot(page, '04_login_filled');

        const btn = await page.$('button');
        if (btn) {
          await btn.click();
          await delay(3000);
          await screenshot(page, '05_after_login');
        }
      }
    }
  } catch (e) {
    console.log('Error en login:', e.message);
  }

  // ============================================
  // PARTE 3: Panel Autenticado - Navegar secciones
  // ============================================
  console.log('\n=== PANEL AUTENTICADO ===\n');

  const adminRoutes = [
    { path: '/#/dashboard', name: '06_dashboard' },
    { path: '/#/schedules', name: '07_schedules' },
    { path: '/#/rooms', name: '08_rooms' },
    { path: '/#/buildings', name: '09_buildings' },
    { path: '/#/academic', name: '10_academic' },
    { path: '/#/map', name: '11_map_admin' },
    { path: '/#/settings', name: '12_settings' },
    { path: '/#/requests', name: '13_requests' },
    { path: '/#/observations', name: '14_observations' },
    { path: '/#/reports', name: '15_reports' },
    { path: '/#/calendar', name: '16_calendar' },
    { path: '/#/blocks', name: '17_blocks' },
    { path: '/#/public-links', name: '18_public_links' },
  ];

  for (const route of adminRoutes) {
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2' });
      await delay(2000);
      await screenshot(page, route.name);

      // Capturar info de la página
      const pageInfo = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        const navItems = document.querySelectorAll('nav a, [role="navigation"] a, aside a');
        return {
          title: document.title,
          h1: h1 ? h1.textContent.trim() : null,
          h2: h2 ? h2.textContent.trim() : null,
          navCount: navItems.length,
        };
      });
      console.log(`${route.name}: ${JSON.stringify(pageInfo)}`);
    } catch (e) {
      console.log(`Error en ${route.name}:`, e.message);
    }
  }

  // ============================================
  // PARTE 4: Explorar sub-secciones si existen
  // ============================================
  console.log('\n=== EXPLORANDO SUB-SECCIONES ===\n');

  // Volver al dashboard y buscar todos los links de navegación
  try {
    await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'networkidle2' });
    await delay(2000);

    const allNavLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href], button');
      return Array.from(links).map(el => ({
        tag: el.tagName,
        href: el.getAttribute('href'),
        text: el.textContent.trim().substring(0, 80),
        className: el.className.substring(0, 100),
      })).filter(l => l.text.length > 0);
    });
    console.log('Navegación completa:', JSON.stringify(allNavLinks, null, 2));
  } catch (e) {
    console.log('Error explorando navegación:', e.message);
  }

  // Scroll en páginas con contenido largo
  const scrollPages = ['07_schedules', '08_rooms', '10_academic'];
  for (const pageName of scrollPages) {
    const route = adminRoutes.find(r => r.name === pageName);
    if (route) {
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2' });
        await delay(2000);

        // Scroll down
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await delay(1000);
        await screenshot(page, `${pageName}_scrolled`);
      } catch (e) {
        console.log(`Error scroll ${pageName}:`, e.message);
      }
    }
  }

  await browser.close();
  console.log('\n✅ Crawl completo. Screenshots guardados en:', SCREENSHOT_DIR);
}

main().catch(console.error);

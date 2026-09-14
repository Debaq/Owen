import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('/home/nick/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer-core');
import path from 'path';

const BASE = 'https://tmeduca.org/owen';
const DIR = path.dirname(new URL(import.meta.url).pathname);
const wait = ms => new Promise(r => setTimeout(r, ms));
let shotNum = 1;

async function shot(page, name, fullPage = true) {
  const file = path.join(DIR, `${String(shotNum).padStart(2,'0')}_${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`📸 ${shotNum} ${name}`);
  shotNum++;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ===== PÚBLICO =====
  console.log('\n=== PORTAL PÚBLICO ===\n');

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await wait(2000);
  await shot(page, 'home');

  // Buscar sala
  try {
    const searchInput = await page.$('input[placeholder*="Buscar"]');
    if (searchInput) {
      await searchInput.type('Aula');
      await wait(1500);
      await shot(page, 'busqueda_aula');
      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
    }
  } catch(e) { console.log('Search error:', e.message); }

  // Filtro laboratorio
  try {
    const labBtn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Laboratorio')
    );
    if (labBtn) { await labBtn.click(); await wait(1000); }
    const buscarBtn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Buscar')
    );
    if (buscarBtn) { await buscarBtn.click(); await wait(2000); await shot(page, 'resultados_laboratorio'); }
  } catch(e) { console.log('Filter error:', e.message); }

  // Tab Por Carrera
  try {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await wait(1500);
    const tab = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Por Carrera'))
    );
    if (tab) { await tab.click(); await wait(1500); await shot(page, 'tab_por_carrera'); }
  } catch(e) { console.log('Tab error:', e.message); }

  // Explorar Campus
  try {
    const btn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Explorar Campus'))
    );
    if (btn) { await btn.click(); await wait(2000); await shot(page, 'explorar_campus'); }
  } catch(e) { console.log('Explorar error:', e.message); }

  // Reportar observación
  try {
    await page.goto(`${BASE}/report`, { waitUntil: 'networkidle2' });
    await wait(2000);
    await shot(page, 'reportar_observacion');
  } catch(e) { console.log('Report error:', e.message); }

  // ===== LOGIN =====
  console.log('\n=== LOGIN ===\n');

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await wait(2000);
  await shot(page, 'login_page');

  // Inspeccionar qué hay
  const pageContent = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(i => ({
      type: i.type, name: i.name, id: i.id, placeholder: i.placeholder
    }));
    const buttons = [...document.querySelectorAll('button')].map(b => ({
      text: b.textContent.trim(), type: b.type
    }));
    const forms = document.querySelectorAll('form').length;
    return { inputs, buttons, forms };
  });
  console.log('Página de login:', JSON.stringify(pageContent, null, 2));

  // Llenar login
  try {
    const emailField = await page.$('input[type="email"]')
      || await page.$('input[name="email"]')
      || await page.$('input[placeholder*="orreo"]')
      || await page.$('input[placeholder*="mail"]')
      || await page.$('input[placeholder*="Email"]')
      || await page.$('input[type="text"]');

    const passField = await page.$('input[type="password"]');

    if (emailField && passField) {
      await emailField.type('admin@admin.cl', { delay: 30 });
      await passField.type('admin123', { delay: 30 });
      await shot(page, 'login_filled');

      // Submit - intentar Enter primero
      await passField.press('Enter');
      await wait(3000);
      await shot(page, 'after_login');
      console.log('URL:', page.url());
    } else {
      // Listar TODOS los inputs
      const allInputs = await page.$$('input');
      console.log(`Total inputs: ${allInputs.length}`);
      if (allInputs.length >= 2) {
        await allInputs[0].type('admin@admin.cl', { delay: 30 });
        await allInputs[1].type('admin123', { delay: 30 });
        await shot(page, 'login_filled');
        await allInputs[1].press('Enter');
        await wait(3000);
        await shot(page, 'after_login');
      }
    }
  } catch(e) { console.log('Login fill error:', e.message); }

  // ===== VERIFICAR LOGIN =====
  const isLoggedIn = await page.evaluate(() => {
    const text = document.body.textContent;
    return !text.includes('Iniciar Ses') && !text.includes('Ingresar')
      && (text.includes('Dashboard') || text.includes('Gestión') || text.includes('Horarios')
          || text.includes('Cerrar') || text.includes('Logout') || text.includes('Admin'));
  });
  console.log('¿Logueado?:', isLoggedIn);

  // ===== PANEL ADMIN =====
  console.log('\n=== PANEL ADMIN ===\n');

  // Primero capturar el estado actual
  await shot(page, 'panel_actual');

  // Extraer navegación
  const navLinks = await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href], [role="link"], nav *, aside *, [class*="sidebar"] *')];
    return all
      .filter(el => el.textContent.trim().length > 0 && el.textContent.trim().length < 50)
      .map(el => ({ text: el.textContent.trim(), href: el.getAttribute('href'), tag: el.tagName }))
      .filter((v, i, a) => a.findIndex(x => x.text === v.text) === i);
  });
  console.log('Navegación encontrada:', JSON.stringify(navLinks, null, 2));

  // Intentar rutas conocidas del sistema Owen
  const routes = [
    'dashboard', 'schedules', 'rooms', 'buildings', 'academic',
    'academic/careers', 'academic/levels', 'academic/subjects',
    'academic/teachers', 'map', 'settings', 'settings/users',
    'settings/blocks', 'settings/seasons', 'settings/units',
    'requests', 'observations', 'reports', 'calendar', 'public-links'
  ];

  for (const route of routes) {
    try {
      // Intentar ambos formatos de URL
      const urls = [`${BASE}/${route}`, `${BASE}/#/${route}`];

      for (const url of urls) {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await wait(1500);

        const info = await page.evaluate(() => {
          const h1 = document.querySelector('h1, h2');
          const tables = document.querySelectorAll('table').length;
          const cards = document.querySelectorAll('[class*="card"], [class*="Card"]').length;
          const forms = document.querySelectorAll('form').length;
          const isPublic = document.body.textContent.includes('Buscar Salas y Horarios');
          return {
            title: h1 ? h1.textContent.trim().substring(0, 80) : null,
            tables, cards, forms, isPublic,
            bodyPreview: document.body.textContent.substring(0, 200).replace(/\s+/g, ' ')
          };
        });

        // Solo screenshot si no es la página pública genérica
        if (!info.isPublic || info.tables > 0 || info.forms > 0) {
          await shot(page, `admin_${route.replace(/\//g, '_')}`);
          console.log(`✓ ${route}: ${JSON.stringify(info)}`);

          // Si hay tabla, capturar headers
          if (info.tables > 0) {
            const headers = await page.evaluate(() => {
              const ths = document.querySelectorAll('th');
              return [...ths].map(th => th.textContent.trim());
            });
            console.log(`  Headers: ${headers.join(', ')}`);
          }
          break; // No probar la segunda URL
        } else {
          console.log(`✗ ${route} (${url}): redirige a pública`);
        }
      }
    } catch(e) { console.log(`Error ${route}:`, e.message); }
  }

  // Capturar las cookies para debug
  const cookies = await page.cookies();
  console.log('\nCookies:', cookies.map(c => `${c.name}=${c.value.substring(0,20)}...`));

  await browser.close();
  console.log(`\n✅ Total screenshots: ${shotNum - 1}`);
}

main().catch(console.error);

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

  // ===== LOGIN =====
  console.log('=== LOGIN ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await wait(1500);

  await page.type('input#email', 'admin@admin.cl', { delay: 30 });
  await page.type('input#password', 'admin123', { delay: 30 });
  await page.click('button[type="submit"]');
  await wait(3000);
  console.log('URL:', page.url());

  // ===== ADMIN PAGES =====
  console.log('\n=== PANEL ADMIN ===\n');

  const adminRoutes = [
    { path: '/admin/dashboard', name: 'dashboard' },
    { path: '/admin/schedules', name: 'horarios' },
    { path: '/admin/schedule-wizard', name: 'asistente_horarios' },
    { path: '/admin/buildings', name: 'edificios' },
    { path: '/admin/rooms', name: 'salas' },
    { path: '/admin/map', name: 'mapa_admin' },
    { path: '/admin/academic/carreras', name: 'carreras' },
    { path: '/admin/academic/unidades', name: 'unidades' },
    { path: '/admin/academic/docentes', name: 'docentes' },
    { path: '/admin/system/bloques', name: 'bloques_horarios' },
    { path: '/admin/requests', name: 'solicitudes' },
    { path: '/admin/observations', name: 'observaciones' },
    { path: '/admin/reports', name: 'reportes' },
    { path: '/admin/settings', name: 'configuracion' },
  ];

  for (const route of adminRoutes) {
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2' });
      await wait(2000);
      await shot(page, route.name);

      // Info de la página
      const info = await page.evaluate(() => {
        const h1 = document.querySelector('h1, h2, h3');
        const tables = document.querySelectorAll('table').length;
        const cards = document.querySelectorAll('[class*="card"], [class*="Card"]').length;
        const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 40);
        const hasError = document.body.textContent.includes('Unexpected Application Error');
        return { title: h1?.textContent?.trim()?.substring(0, 80), tables, cards, buttons: btns.slice(0, 10), hasError };
      });
      console.log(`  ${route.name}: ${JSON.stringify(info)}`);

      // Si hay tabla, ver headers y filas
      if (info.tables > 0) {
        const tableData = await page.evaluate(() => {
          const table = document.querySelector('table');
          const headers = [...table.querySelectorAll('th')].map(th => th.textContent.trim());
          const rows = [...table.querySelectorAll('tbody tr')].slice(0, 3).map(tr =>
            [...tr.querySelectorAll('td')].map(td => td.textContent.trim().substring(0, 40))
          );
          return { headers, sampleRows: rows, totalRows: table.querySelectorAll('tbody tr').length };
        });
        console.log(`  Tabla: ${JSON.stringify(tableData)}`);
      }

      // Scroll si la página es larga
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      if (bodyHeight > 1200) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await wait(1000);
        await shot(page, `${route.name}_scroll`);
      }
    } catch(e) {
      console.log(`  Error ${route.name}: ${e.message}`);
    }
  }

  // ===== INTERACCIONES ESPECÍFICAS =====
  console.log('\n=== INTERACCIONES ===\n');

  // Edificios: intentar abrir uno
  try {
    await page.goto(`${BASE}/admin/buildings`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const firstRow = await page.$('table tbody tr');
    if (firstRow) {
      await firstRow.click();
      await wait(2000);
      await shot(page, 'edificio_detalle');
    }
    // Buscar botón de crear
    const crearBtn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b =>
        b.textContent.toLowerCase().includes('crear') || b.textContent.toLowerCase().includes('nuevo') || b.textContent.toLowerCase().includes('agregar') || b.textContent.includes('+')
      )
    );
    if (crearBtn) {
      await crearBtn.click();
      await wait(2000);
      await shot(page, 'edificio_crear_form');
      // Cerrar modal si hay
      await page.keyboard.press('Escape');
      await wait(500);
    }
  } catch(e) { console.log('Edificios interact error:', e.message); }

  // Salas: intentar abrir una
  try {
    await page.goto(`${BASE}/admin/rooms`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const firstRow = await page.$('table tbody tr');
    if (firstRow) {
      await firstRow.click();
      await wait(2000);
      await shot(page, 'sala_detalle');
    }
    const crearBtn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b =>
        b.textContent.toLowerCase().includes('crear') || b.textContent.toLowerCase().includes('nueva') || b.textContent.includes('+')
      )
    );
    if (crearBtn) {
      await crearBtn.click();
      await wait(2000);
      await shot(page, 'sala_crear_form');
      await page.keyboard.press('Escape');
      await wait(500);
    }
  } catch(e) { console.log('Salas interact error:', e.message); }

  // Docentes
  try {
    await page.goto(`${BASE}/admin/academic/docentes`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const firstRow = await page.$('table tbody tr');
    if (firstRow) {
      await firstRow.click();
      await wait(2000);
      await shot(page, 'docente_detalle');
    }
  } catch(e) { console.log('Docentes interact error:', e.message); }

  // Carreras
  try {
    await page.goto(`${BASE}/admin/academic/carreras`, { waitUntil: 'networkidle2' });
    await wait(2000);
    const firstRow = await page.$('table tbody tr, [class*="card"]');
    if (firstRow) {
      await firstRow.click();
      await wait(2000);
      await shot(page, 'carrera_detalle');
    }
  } catch(e) { console.log('Carreras interact error:', e.message); }

  // Horarios - grilla
  try {
    await page.goto(`${BASE}/admin/schedules`, { waitUntil: 'networkidle2' });
    await wait(2000);
    // Buscar selects o dropdowns
    const selects = await page.evaluate(() => {
      return [...document.querySelectorAll('select, [role="combobox"], [class*="select"]')].map(s => ({
        tag: s.tagName, id: s.id, options: s.tagName === 'SELECT'
          ? [...s.options].map(o => o.textContent.trim()).slice(0, 5)
          : []
      }));
    });
    console.log('Selects en horarios:', JSON.stringify(selects));
  } catch(e) { console.log('Horarios interact error:', e.message); }

  // Schedule wizard
  try {
    await page.goto(`${BASE}/admin/schedule-wizard`, { waitUntil: 'networkidle2' });
    await wait(2000);
    await shot(page, 'wizard_detalle');
  } catch(e) { console.log('Wizard error:', e.message); }

  // Settings
  try {
    await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle2' });
    await wait(2000);
    // Buscar tabs o secciones
    const tabs = await page.evaluate(() =>
      [...document.querySelectorAll('[role="tab"], [class*="tab"]')].map(t => t.textContent.trim())
    );
    console.log('Tabs settings:', tabs);
  } catch(e) { console.log('Settings error:', e.message); }

  await browser.close();
  console.log(`\n✅ Total screenshots: ${shotNum - 1}`);
}

main().catch(console.error);

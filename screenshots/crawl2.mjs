import puppeteer from 'puppeteer-core';
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
  await shot(page, 'home_public');

  // Buscar una sala
  try {
    const searchInput = await page.$('input[placeholder*="Buscar"]');
    if (searchInput) {
      await searchInput.type('Aula');
      await wait(1500);
      await shot(page, 'search_aula');

      // Limpiar búsqueda
      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
      await wait(500);
    }
  } catch(e) { console.log('Search error:', e.message); }

  // Click en filtro "Laboratorio"
  try {
    const labBtn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.find(b => b.textContent.trim() === 'Laboratorio');
    });
    if (labBtn) {
      await labBtn.click();
      await wait(1500);
      await shot(page, 'filter_laboratorio');
    }
  } catch(e) { console.log('Filter error:', e.message); }

  // Click "Buscar" para ver resultados
  try {
    const buscarBtn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.find(b => b.textContent.trim() === 'Buscar');
    });
    if (buscarBtn) {
      await buscarBtn.click();
      await wait(2000);
      await shot(page, 'search_results');

      // Scroll para ver más resultados
      await page.evaluate(() => window.scrollTo(0, 500));
      await wait(1000);
      await shot(page, 'search_results_scroll');
    }
  } catch(e) { console.log('Buscar error:', e.message); }

  // Click "Por Carrera / Nivel" tab
  try {
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await wait(2000);
    const carreraTab = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.find(b => b.textContent.includes('Por Carrera'));
    });
    if (carreraTab) {
      await carreraTab.click();
      await wait(1500);
      await shot(page, 'tab_carrera_nivel');
    }
  } catch(e) { console.log('Tab error:', e.message); }

  // "Explorar Campus"
  try {
    const explorarBtn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.find(b => b.textContent.includes('Explorar Campus'));
    });
    if (explorarBtn) {
      await explorarBtn.click();
      await wait(2000);
      await shot(page, 'explorar_campus');
    }
  } catch(e) { console.log('Explorar error:', e.message); }

  // Reportar observación
  try {
    await page.goto(`${BASE}/report`, { waitUntil: 'networkidle2' });
    await wait(2000);
    await shot(page, 'report_observacion');
  } catch(e) { console.log('Report error:', e.message); }

  // ===== LOGIN =====
  console.log('\n=== LOGIN ===\n');

  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await wait(2000);

  // Click "Iniciar Sesión"
  try {
    const loginBtn = await page.evaluateHandle(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.find(b => b.textContent.includes('Iniciar Ses'));
    });
    if (loginBtn) {
      await loginBtn.click();
      await wait(2000);
      await shot(page, 'login_modal');

      // Buscar inputs en el modal
      const inputs = await page.evaluate(() => {
        const all = document.querySelectorAll('input');
        return Array.from(all).map(i => ({
          type: i.type, name: i.name, id: i.id,
          placeholder: i.placeholder, visible: i.offsetParent !== null
        }));
      });
      console.log('Inputs después de abrir login:', JSON.stringify(inputs, null, 2));

      // Llenar credenciales
      const emailField = await page.$('input[type="email"]')
        || await page.$('input[name="email"]')
        || await page.$('input[placeholder*="orreo"]')
        || await page.$('input[placeholder*="mail"]');

      const passField = await page.$('input[type="password"]');

      if (emailField && passField) {
        await emailField.type('admin@admin.cl', { delay: 50 });
        await passField.type('admin123', { delay: 50 });
        await shot(page, 'login_filled');

        // Submit
        const submitBtn = await page.evaluateHandle(() => {
          const btns = [...document.querySelectorAll('button')];
          // Buscar botón dentro del modal de login
          return btns.find(b => {
            const text = b.textContent.toLowerCase();
            return text.includes('iniciar') || text.includes('ingresar') || text.includes('entrar') || text.includes('login');
          });
        });

        if (submitBtn) {
          await submitBtn.click();
          await wait(3000);
          await shot(page, 'after_login');
          console.log('URL después de login:', page.url());
        }
      } else {
        // Intentar con todos los inputs visibles
        const visibleInputs = await page.$$('input:not([type="hidden"])');
        console.log(`Inputs visibles: ${visibleInputs.length}`);
        for (const inp of visibleInputs) {
          const type = await inp.evaluate(el => el.type);
          const placeholder = await inp.evaluate(el => el.placeholder);
          console.log(`  - type=${type} placeholder=${placeholder}`);
        }

        // Intentar llenar los últimos inputs (los del modal)
        if (visibleInputs.length >= 2) {
          const lastInputs = visibleInputs.slice(-2);
          await lastInputs[0].type('admin@admin.cl', { delay: 50 });
          await lastInputs[1].type('admin123', { delay: 50 });
          await shot(page, 'login_filled');

          // Enter para submit
          await lastInputs[1].press('Enter');
          await wait(3000);
          await shot(page, 'after_login');
          console.log('URL después de login:', page.url());
        }
      }
    }
  } catch(e) { console.log('Login error:', e.message); }

  // ===== PANEL AUTENTICADO =====
  console.log('\n=== PANEL AUTENTICADO ===\n');

  // Verificar si estamos logueados buscando elementos de admin
  const isLoggedIn = await page.evaluate(() => {
    const body = document.body.textContent;
    return body.includes('Cerrar') || body.includes('Dashboard') || body.includes('Gestión')
           || body.includes('Admin') || !body.includes('Iniciar Ses');
  });
  console.log('¿Logueado?:', isLoggedIn);

  if (isLoggedIn) {
    await shot(page, 'dashboard_admin');

    // Buscar sidebar/nav links
    const navInfo = await page.evaluate(() => {
      const items = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a, a[href*="#/"]');
      return Array.from(items).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim().substring(0, 60)
      }));
    });
    console.log('Nav links:', JSON.stringify(navInfo, null, 2));

    // Buscar todos los links y botones de navegación
    const allClickables = await page.evaluate(() => {
      const els = document.querySelectorAll('a, button, [role="button"], [role="tab"], [role="menuitem"]');
      return Array.from(els)
        .map(el => ({
          tag: el.tagName,
          href: el.getAttribute('href'),
          text: el.textContent.trim().substring(0, 60),
          ariaLabel: el.getAttribute('aria-label'),
        }))
        .filter(e => e.text.length > 0 && e.text.length < 60);
    });
    console.log('Elementos clickeables:', JSON.stringify(allClickables, null, 2));

    // Navegar por las secciones del menú lateral
    const adminPages = [
      'horarios', 'salas', 'edificios', 'docentes', 'asignaturas',
      'carreras', 'niveles', 'bloques', 'temporadas', 'solicitudes',
      'observaciones', 'mapa', 'configuracion', 'usuarios',
      'schedules', 'rooms', 'buildings', 'academic', 'settings',
      'dashboard', 'calendar', 'reports'
    ];

    // Primero, intentar clickear los items del sidebar
    const sidebarItems = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="sidebar"] *, nav *, aside *');
      return Array.from(items)
        .filter(el => el.children.length === 0 || el.querySelector('svg'))
        .map(el => ({
          text: el.textContent.trim(),
          tag: el.tagName,
          className: el.className.toString().substring(0, 80)
        }))
        .filter(e => e.text.length > 1 && e.text.length < 40);
    });
    console.log('Sidebar items:', JSON.stringify(sidebarItems, null, 2));

    // Intentar navegar por hash routes
    for (const pageName of adminPages) {
      try {
        await page.goto(`${BASE}/#/${pageName}`, { waitUntil: 'networkidle2' });
        await wait(1500);

        const pageTitle = await page.evaluate(() => {
          const h1 = document.querySelector('h1, h2, [class*="title"]');
          return h1 ? h1.textContent.trim() : document.title;
        });

        // Solo tomar screenshot si la página es diferente a la pública
        const hasAdminContent = await page.evaluate(() => {
          return !document.body.textContent.includes('Iniciar Ses')
                 || document.querySelectorAll('table, form, [class*="card"]').length > 3;
        });

        if (hasAdminContent) {
          await shot(page, `admin_${pageName}`);
          console.log(`  ${pageName}: ${pageTitle}`);

          // Si hay tablas, capturar info
          const tableInfo = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            return Array.from(tables).map(t => ({
              rows: t.rows.length,
              headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim())
            }));
          });
          if (tableInfo.length > 0) {
            console.log(`  Tablas:`, JSON.stringify(tableInfo));
          }
        }
      } catch(e) { console.log(`Error ${pageName}:`, e.message); }
    }
  } else {
    console.log('No se pudo hacer login. Tomando capturas de lo que hay.');
    await shot(page, 'login_failed');
  }

  await browser.close();
  console.log(`\n✅ Total screenshots: ${shotNum - 1}`);
}

main().catch(console.error);

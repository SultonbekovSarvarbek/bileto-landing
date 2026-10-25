// Собирает сайт из исходников:
//   src/index.html + scripts/i18n.mjs  →  index.html (ru), uz/index.html, en/index.html
//   docs-src/*.md                       →  legal/<doc>.<lang>.html
//   + sitemap.xml, robots.txt
// Запуск: node scripts/build.mjs        (с флагом --og ещё перерисует assets/og-<lang>.png через Chrome)
// Другой адрес сайта (например, для тестового стенда): SITE_URL=https://example.com/ node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DICT } from './i18n.mjs';

const SITE = (process.env.SITE_URL || 'https://bileto.uz/').replace(/\/?$/, '/');
const TELEGRAM = 'https://t.me/bileto_uz';
const LANGS = ['ru', 'uz', 'en'];
const LOCALE = { ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' };
const DOCS = ['terms', 'privacy'];
const today = new Date().toISOString().slice(0, 10);
const year = String(new Date().getFullYear());

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const homePath = (lang) => (lang === 'ru' ? '' : `${lang}/`);
const homeUrl = (lang) => SITE + homePath(lang);

// ---------- главная ----------

const template = readFileSync('src/index.html', 'utf8');

// Русские строки берём прямо из разметки шаблона.
const TEXT_RE = /(data-i18n="(\w+)"[^>]*>)([^<]*)/g;
const HTML_RE = /(data-i18n-html="(\w+)"[^>]*>)(.*?)(<\/h1>)/g;
for (const [, , key, text] of template.matchAll(TEXT_RE)) DICT.ru[key] ??= text;
for (const [, , key, html] of template.matchAll(HTML_RE)) DICT.ru[key] ??= html;

const plain = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function seoHead(lang) {
  const d = DICT[lang];
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${homeUrl(l)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${homeUrl('ru')}">`);
  const faq = [1, 2, 3, 4, 5].map((i) => ({
    '@type': 'Question',
    name: plain(d[`q${i}`]),
    acceptedAnswer: { '@type': 'Answer', text: plain(d[`a${i}`]) },
  }));
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}#org`,
        name: 'Bileto',
        url: SITE,
        logo: `${SITE}assets/icon.png`,
        sameAs: [TELEGRAM],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}#website`,
        name: 'Bileto',
        url: SITE,
        inLanguage: LANGS,
        publisher: { '@id': `${SITE}#org` },
      },
      {
        '@type': 'WebPage',
        url: homeUrl(lang),
        name: d.title,
        description: d.description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}#website` },
      },
      { '@type': 'FAQPage', inLanguage: lang, mainEntity: faq },
    ],
  };
  return [
    `<title>${esc(d.title)}</title>`,
    `<meta name="description" content="${attr(d.description)}">`,
    `<link rel="canonical" href="${homeUrl(lang)}">`,
    ...alternates,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Bileto">`,
    `<meta property="og:url" content="${homeUrl(lang)}">`,
    `<meta property="og:title" content="${attr(d.ogTitle)}">`,
    `<meta property="og:description" content="${attr(d.description)}">`,
    `<meta property="og:image" content="${SITE}assets/og-${lang}.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="${LOCALE[lang]}">`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}">`),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
}

function buildHome(lang) {
  const d = DICT[lang];
  const root = lang === 'ru' ? '' : '../';
  const langs = LANGS.map(
    (l) =>
      `<a href="${root + homePath(l) || './'}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`,
  ).join('');
  let html = template
    .replace(/^<!-- Шаблон.*-->\n/m, '')
    .replace('<!--SEO-->', seoHead(lang))
    .replace('<!--LANGS-->', langs)
    .replaceAll('{{root}}', root)
    .replaceAll('{{lang}}', lang)
    .replaceAll('{{year}}', year);
  if (lang !== 'ru') {
    html = html
      .replace(TEXT_RE, (m, open, key) => (d[key] != null ? open + esc(d[key]) : m))
      .replace(HTML_RE, (m, open, key, _, close) => (d[key] != null ? open + d[key] + close : m));
  }
  const missing = [...template.matchAll(TEXT_RE)].map((m) => m[2]).filter((k) => d[k] == null);
  if (missing.length) console.warn(`[${lang}] нет перевода: ${missing.join(', ')}`);
  mkdirSync(lang === 'ru' ? '.' : lang, { recursive: true });
  writeFileSync(lang === 'ru' ? 'index.html' : `${lang}/index.html`, html);
}

// ---------- юридические страницы ----------

const LEGAL_UI = {
  ru: { back: 'На главную', terms: 'Соглашение', privacy: 'Конфиденциальность' },
  uz: { back: 'Бош саҳифа', terms: 'Келишув', privacy: 'Махфийлик' },
  en: { back: 'Home', terms: 'Terms', privacy: 'Privacy' },
};

const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

// Тексты используют только заголовки, абзацы, маркированные списки и **жирный** — этого достаточно.
function md(src) {
  const out = [];
  let para = [];
  let list = [];
  const flush = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`), (para = []);
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`), (list = []);
  };
  for (const line of src.split('\n')) {
    const h = line.match(/^(#{1,3}) (.*)/);
    const li = line.match(/^- (.*)/);
    if (h) flush(), out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (li) para.length && flush(), list.push(li[1]);
    else if (!line.trim()) flush();
    else list.length && flush(), para.push(line);
  }
  flush();
  return out.join('\n');
}

function buildLegal(doc, lang) {
  const src = readFileSync(`docs-src/${doc}.${lang}.md`, 'utf8').trim();
  const title = src.match(/^# (.*)/)[1];
  const t = LEGAL_UI[lang];
  const url = (l) => `${SITE}legal/${doc}.${l}.html`;
  const home = `../${homePath(lang)}`;
  const nav = DOCS.map((x) => `<a href="${x}.${lang}.html"${x === doc ? ' aria-current="page"' : ''}>${t[x]}</a>`).join('');
  const langs = LANGS.map(
    (l) => `<a href="${doc}.${l}.html" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`,
  ).join('');
  writeFileSync(
    `legal/${doc}.${lang}.html`,
    `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(`${title}. ${DICT[lang].ogTitle}.`)}">
<link rel="canonical" href="${url(lang)}">
${LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${url(l)}">`).join('\n')}
<meta name="theme-color" content="#0e0f13">
<link rel="icon" href="../assets/favicon.png">
<link rel="stylesheet" href="../styles.css">
</head>
<body class="legal">
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="${home}"><img src="../assets/logo-256.png" alt="" width="32" height="32">Bileto</a>
  <nav class="legal-nav">${nav}</nav>
  <nav class="langs" aria-label="Language">${langs}</nav>
</div></header>
<main class="wrap doc">
${md(src)}
<p><a class="btn btn-ghost" href="${home}">← ${t.back}</a></p>
</main>
</body>
</html>
`,
  );
}

// ---------- sitemap / robots ----------

function buildSitemap() {
  const entry = (loc, alts, priority) => `  <url>
    <loc>${loc}</loc>
${alts.map(([l, href]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`).join('\n')}
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
  const homeAlts = [...LANGS.map((l) => [l, homeUrl(l)]), ['x-default', homeUrl('ru')]];
  const urls = [
    ...LANGS.map((l) => entry(homeUrl(l), homeAlts, '1.0')),
    ...DOCS.flatMap((doc) => {
      const alts = LANGS.map((l) => [l, `${SITE}legal/${doc}.${l}.html`]);
      return alts.map(([, href]) => entry(href, alts, '0.3'));
    }),
  ];
  writeFileSync(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`,
  );
  writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
}

// ---------- картинки для соцсетей ----------

function buildOgImages() {
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const dir = join(tmpdir(), 'bileto-og');
  mkdirSync(dir, { recursive: true });
  const a = (p) => 'file://' + resolve(p);
  for (const lang of LANGS) {
    const d = DICT[lang];
    const page = join(dir, `og-${lang}.html`);
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #0e0f13; color: #f4f5f7; font-family: Manrope, sans-serif; overflow: hidden; position: relative; }
  .glow { position: absolute; right: -160px; top: -160px; width: 700px; height: 700px; background: radial-gradient(circle, rgba(255,200,61,.22), transparent 65%); }
  .txt { position: absolute; left: 72px; top: 84px; width: 600px; }
  .brand { display: flex; align-items: center; gap: 20px; font-size: 44px; font-weight: 800; }
  .brand img { width: 84px; height: 84px; border-radius: 20px; }
  h1 { font-size: 60px; line-height: 1.08; letter-spacing: -.02em; margin: 56px 0 24px; color: #ffc83d; }
  p { font-size: 28px; line-height: 1.35; color: #9aa0ad; margin: 0; }
  .pics { position: absolute; right: 56px; top: 64px; width: 420px; display: grid; gap: 16px; transform: rotate(4deg); }
  .pics img { width: 100%; height: 150px; object-fit: cover; border-radius: 22px; border: 1px solid #2a2e38; }
</style>
<div class="glow"></div>
<div class="txt">
  <div class="brand"><img src="${a('assets/icon.png')}">Bileto</div>
  <h1>${esc(d.ogTag)}</h1>
  <p>${esc(d.ogSub)}</p>
</div>
<div class="pics">
  <img src="${a('assets/covers/pop.jpg')}"><img src="${a('assets/covers/theatre.jpg')}"><img src="${a('assets/covers/football.jpg')}">
</div>`,
    );
    execFileSync(chrome, [
      '--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--virtual-time-budget=4000',
      '--window-size=1200,630', `--screenshot=${resolve(`assets/og-${lang}.png`)}`, 'file://' + page,
    ], { stdio: 'ignore' });
  }
  rmSync(dir, { recursive: true, force: true });
}

LANGS.forEach(buildHome);
mkdirSync('legal', { recursive: true });
for (const lang of LANGS) for (const doc of DOCS) buildLegal(doc, lang);
buildSitemap();
if (process.argv.includes('--og')) buildOgImages();
console.log(`built for ${SITE}`);

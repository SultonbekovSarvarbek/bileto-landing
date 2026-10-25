// Собирает docs-src/*.md в статические страницы legal/<doc>.<lang>.html.
// Источник — docs/legal из репозитория приложения; после правок там скопируйте файлы сюда и запустите:
//   node scripts/build-legal.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const langs = ['ru', 'uz', 'en'];
const docs = ['terms', 'privacy'];
const ui = {
  ru: { back: 'На главную', terms: 'Соглашение', privacy: 'Конфиденциальность' },
  uz: { back: 'Бош саҳифа', terms: 'Келишув', privacy: 'Махфийлик' },
  en: { back: 'Home', terms: 'Terms', privacy: 'Privacy' },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

mkdirSync('legal', { recursive: true });
for (const lang of langs) {
  for (const doc of docs) {
    const src = readFileSync(`docs-src/${doc}.${lang}.md`, 'utf8').trim();
    const title = src.match(/^# (.*)/)[1];
    const t = ui[lang];
    const nav = docs
      .map((d) => `<a href="${d}.${lang}.html"${d === doc ? ' aria-current="page"' : ''}>${t[d]}</a>`)
      .join('');
    const langs_ = langs
      .map((l) => `<a href="${doc}.${l}.html"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`)
      .join('');
    writeFileSync(
      `legal/${doc}.${lang}.html`,
      `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="../assets/favicon.png">
<link rel="stylesheet" href="../styles.css">
</head>
<body class="legal">
<header class="nav"><div class="wrap nav-in">
  <a class="brand" href="../index.html?lang=${lang}"><img src="../assets/logo-256.png" alt="" width="32" height="32">Bileto</a>
  <nav class="legal-nav">${nav}</nav>
  <nav class="langs">${langs_}</nav>
</div></header>
<main class="wrap doc">
${md(src)}
<p><a class="btn btn-ghost" href="../index.html?lang=${lang}">← ${t.back}</a></p>
</main>
</body>
</html>
`,
    );
  }
}
console.log('legal pages built');

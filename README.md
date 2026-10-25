# Bileto — лендинг

Статический сайт. Исходники:

- `src/index.html` — шаблон главной (русский текст прямо в разметке);
- `scripts/i18n.mjs` — переводы UZ/EN и мета-теги (title, description) для всех языков;
- `docs-src/*.md` — соглашение и политика (копия `docs/legal` из репозитория приложения);
- `styles.css`, `assets/`.

Готовые страницы (`index.html`, `uz/`, `en/`, `legal/`, `sitemap.xml`, `robots.txt`) генерируются — не правьте их вручную.

## Сборка

```bash
node scripts/build.mjs          # страницы, sitemap, robots
node scripts/build.mjs --og     # + картинки для соцсетей assets/og-*.png (нужен Google Chrome)
```

Адрес сайта для canonical/hreflang/sitemap — по умолчанию GitHub Pages. При переезде на свой домен:

```bash
SITE_URL=https://bileto.uz/ node scripts/build.mjs
```

## Обновить юридические тексты

```bash
cp ../bileto/docs/legal/*.md docs-src/
node scripts/build.mjs
```

## Локальный просмотр

```bash
python3 -m http.server 8080
```

## Деплой

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

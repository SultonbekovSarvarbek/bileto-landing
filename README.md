# Bileto — лендинг

Статический сайт. Исходники:

- `src/index.html` — шаблон главной (русский текст прямо в разметке);
- `scripts/i18n.mjs` — переводы на узбекский (кириллица) и английский, мета-теги (title, description) для всех языков;
- `scripts/translit.mjs` — узбекская латиница (`/uz-latn/`) генерируется из кириллицы автоматически, отдельно её не переводят;
- `docs-src/*.md` — соглашение и политика (копия `docs/legal` из репозитория приложения);
- `styles.css`, `assets/`.

Готовые страницы (`index.html`, `uz-latn/`, `uz/`, `en/`, `legal/`, `sitemap.xml`, `robots.txt`) генерируются — не правьте их вручную.

## Сборка

```bash
node scripts/build.mjs          # страницы, sitemap, robots
node scripts/build.mjs --og     # + картинки для соцсетей assets/og-*.png (нужен Google Chrome)
```

Адрес сайта для canonical/hreflang/sitemap — `https://bileto.uz/`. Для другого адреса (например, тестового стенда):

```bash
SITE_URL=https://example.com/ node scripts/build.mjs
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

Сайт работает на https://bileto.uz. Сервер забирает `main` (`git pull`) и выкладывает готовые файлы без исходников (`src`, `scripts`, `docs-src`). Поэтому после правок не забудьте запустить сборку и закоммитить результат.

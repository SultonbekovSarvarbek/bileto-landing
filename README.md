# Bileto — лендинг

Статический сайт без сборки: `index.html`, `styles.css`, `i18n.js` (RU в разметке, UZ/EN в словаре).

## Локальный просмотр

```bash
python3 -m http.server 8080
```

## Юридические страницы

`legal/*.html` генерируются из `docs-src/*.md` (копия `docs/legal` из репозитория приложения):

```bash
cp ../bileto/docs/legal/*.md docs-src/
node scripts/build-legal.mjs
```

## Деплой

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

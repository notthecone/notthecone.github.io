# Connie Lu, portfolio

Static site, no build step. Open `index.html` through any local server to preview:

```
python3 -m http.server 8000   # then go to http://localhost:8000
```

## Put it online with GitHub Pages

1. On GitHub, create a new **public** repo named exactly `notthecone.github.io`.
2. Upload everything in this folder (drag the files into the repo page, or use git below).
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. In a minute or two the site is live at https://notthecone.github.io

With git instead of dragging files:

```
cd connie-portfolio
git init && git add . && git commit -m "First version of the site"
git branch -M main
git remote add origin https://github.com/notthecone/notthecone.github.io.git
git push -u origin main
```

## Custom domain (optional)

Buy a domain (Cloudflare or Namecheap), then in **Settings → Pages → Custom domain** type it in and follow GitHub's DNS instructions.

## Where things live

- `index.html`: the whole site (layout, styles, die, all four pages)
- `data2.js`: every photo's title, date, place, camera settings and category
- `img/`: photography, `proj/`: project graphics, `art/`: shoe projects and the 3D WaveRunner model (`waverunner-model.js`, plus the raw `waverunner.glb`)
- `lib/`: three.js add-ons for the 3D viewer (three.js itself loads from cdnjs)

## To add later

- Resume PDF: drop it in as `resume.pdf` and add a link in the "Say hi" section of About

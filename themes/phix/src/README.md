# Source of the 3D demos

`phix3d.src.js` is the source of `themes/phix/static/js/phix3d.js`: the WebGL holotomography demo and the 3D
holotomography set-up. It is bundled together with three.js 0.186.1 (MIT licence, see `three.LICENSE`).
The site itself needs no build tools; only rebuild if you change this file:

    npm install three@0.186.1 esbuild
    npx esbuild phix3d.src.js --bundle --minify --format=iife --target=es2019 --outfile=../static/js/phix3d.js

The 2D canvas versions in `assets/js/holo.js` are used automatically when WebGL is not available.

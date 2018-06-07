# Installation standalone
Example: Installing on a Ubuntu 18.04 Desktop Live System:

Open a terminal.

Install system dependencies:
```sh
sudo add-apt-repository universe
sudo apt install git npm
```

Clone code and prepare testing web server:
```sh
git clone https://github.com/plepe/overpass-layer.git
cd overpass-layer
npm install
npm run start
```

Now open a web browser and browse to http://localhost:3000/

You can play with the files `index.html` and `demo/demo*.js` to adapt
the demos to your needs.

If you change anything in the code (`src/*.js`) you need to run `npm run
build` after each change or `npm run watch` which will check for changes
and re-compile automatically. Also, `npm run watch` will include debug
information.

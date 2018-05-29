# Installation standalone
Starting from a plain Ubuntu 18.04 Desktop Live System:

Open a terminal.

```sh
sudo add-apt-repository universe
sudo apt install git npm
git clone https://github.com/plepe/overpass-layer.git
cd overpass-layer
npm install
npm run server
```

Now open a web browser and browse to http://localhost:3000/

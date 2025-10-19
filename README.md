# AeroStream

Real-time, free flight tracking for aircraft in your area and around the world.

Visit [airtraffic.online](https://airtraffic.online/) to check out the site, with beta updates visible at [beta.airtraffic.online](https://beta.airtraffic.online/)

Many thanks to [ADSB.lol](https://adsb.lol/) for live ATC data, as well as [OpenStreetMap](https://www.openstreetmap.org/#map=3/71.34/-96.82) and [Carto Basemaps](https://carto.com/basemaps) for maps with the [Leaflet](https://leafletjs.com/) framework.

## Features

-  **Real-time aircraft tracking** - Live ADS-B data from around the world

-  **Interactive map interface** - Powered by Leaflet with multiple map styles

-  **Aircraft details panel** - Click any aircraft for detailed information including callsign, altitude, speed, and more

-  **Dark/Light mode toggle** - Customizable appearance for different viewing preferences

-  **Keyboard shortcuts** - Quick navigation and control

  

## Controls

### Mouse + Touch Controls

-  **Click and drag** - Pan the map

-  **Mouse wheel** - Zoom in/out

-  **Click aircraft** - Select for detailed information

-  **Click map** - Deselect aircraft

  

### Keyboard Shortcuts

-  **+/-** - Zoom in/out

-  **C** - Center map on your location

-  **R** - Reset map view to default zoom and centering

-  **L** - Toggle map labels

-  **A** - Toggle light/colourfull/dark modes

-  **m** - Hide/show mouse

-  **V** - Cycle through UI panels

-  **P** - Toggle Projector mode

-  **X/Escape** - Close/exit aircraft display panels

-  **T** - Disable website timeout (Please be mindful of your resource usage; be nice to the kind folks at ADSB.lol)

-  **D** - Debug mode (Functuality updates often, check the F12 menu in your browser for more info)

  

## Project Breakdown

  - `/Frontend/` contains all the user facing content. `AerostreamRadar.html` is used as the main page index, with styles from `Styles.css` and using scripts from `Scripts.js`
  - `/Backend/` contains all the server side content. `ProxyServer.js` is used to run the website's proxy for API to get deal with CORS restrictions from ADSB.lol. `update-beta.sh` and `promote-to-main.sh` are helper scripts used to help automate deployment for new versions to the public url.
  - If you decide to self host the proxy server, a directory named `node_modules` will be created by node.js to contain the files it needs to host the proxy.
  - `README.md` and `.gitignore` should be self-explanatory.
  

## Local Setup Guide

### Prerequisites (if hosting proxy)

1. Check your Node.js installation by running `node -v` and `npm -v` in your system's terminal.

- If it's not installed, you can download Node.js from [https://nodejs.org](https://nodejs.org/)

### Quick Start

1. Clone, fork, or otherwise download the content of the AeroStream repository onto your machine

2. If you want to host your own proxy server (to see logs or customize api behaviour), follow the below instructions. Otherwise, just open the AerostreamRadar.html file like normal.

3. Change line #1 of `/Frontend/Scripts.js` to `let publicHost = false;` to let the site know you want to host the API proxy yourself

4. Open a terminal window to the root folder of the repository.

5. Run the following commands to start your own local server:

```bash

# Navigate to the backend directory

cd Backend

# Install required dependencies

npm install express cors node-fetch

# Start the proxy server

node proxy-server.js

```

6. The proxy server will start on port 4027. You should see:

```

Proxy server running at http://localhost:4027

```

7. Note that you can also just open the AerostreamRadar.html file in your browser (instead of starting the web server) like any other HTML page, though most browsers will auto disable location access as part of their safety measures.

8. To host the server on your local network, open a new terminal window and start a local web server for the frontend:

```bash

# Navigate to the frontend directory

cd Frontend

# Start a simple HTTP server (choose  one  option):

# Option 1: Using Python 3

python3 -m http.server 3000

# Option 2: Using Python 2

python -m SimpleHTTPServer 3000

# Option 3: Using Node.js (if you have http-server installed globally)

npx http-server -p 3000

# Option 4: Using PHP

php -S localhost:3000

```

9. Open your web browser and navigate to `http://localhost:3000/AerostreamRadar.html`

10. Allow location access when prompted, or manually enter coordinates to start viewing aircraft in your area.

## API Documentation

AeroStream uses the ADSB.lol API through a proxy server to avoid CORS issues.

### Endpoints

-  `GET /aircraft?lat={latitude}&lon={longitude}&dist={distance}&caller={callerID}`

- Returns aircraft data within the specified radius

- Parameters:

-  `lat`: Latitude (decimal degrees)
-  `lon`: Longitude (decimal degrees)
-  `dist`: Distance radius in nautical miles
-  `caller`: Identifies call source for the proxy server's display. Can be anything, but defaults to the page URL when not locally hosting

### Response Format

```json

{

"ac": [

{

"hex": "a1b2c3",

"flight": "WS123",

"lat": 37.7749,

"lon": -122.4194,

"alt_baro": 35000,

"gs": 450,

"track": 270,

"squawk": "1200",

"t": "B74S"

}

]

}

  

```

Units are those typically used by the aviation industry, like knots for speed and feet for altitude. The actual response usually contain more/varied information; this is just what is used by the website at the moment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request; for major changes, please open an issue first to discuss what you would like to change, otherwise you can fork and host it yourself.

This project is open source and available under the [MIT License](https://claude.ai/chat/LICENSE).

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/Parcley27/AeroStream/issues) page

2. Create a new issue with detailed information about your problem

3. Include your browser, operating system, and any error messages

4. If you think it's something urgent that I should know about, email me at [pierceoxley@icloud.com](mailto:pierceoxley@icloud.com)

## Acknowledgments

-  **[ADSB.lol](https://adsb.lol/)** - Providing free and limitless access to live ADS-B aircraft data (Truely the goats)
-  **[Leaflet](https://leafletjs.com/)** - Interactive maps and easy implementation of custom tiles
-  **[OpenStreetMap](https://www.openstreetmap.org/)** - Open source mapping data and labled map tiles
-  **[Carto](https://carto.com/basemaps)** - Clean basemap tiles
-  **[nginx](https://www.f5.com/go/product/welcome-to-nginx)** -- Server hosting software
-  **[Node.js](https://nodejs.org/)** - JavaScript runtime for the proxy server software
-  **[Let's Encrypt and the ISRG](https://letsencrypt.org/)** -- Free and auto-renewing SSL certificates

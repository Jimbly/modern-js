const argv = require('minimist')(process.argv.slice(2));
const express = require('express');
const express_static_gzip = require('express-static-gzip');
const http = require('http');
const path = require('path');

let app = express();
let server = new http.Server(app);
app.use(express_static_gzip(path.join(__dirname, '../client/'), {
  enableBrotli: true,
  orderPreference: ['br'],
}));

let port = argv.port || process.env.port || 3000;

server.listen(port, () => {
  console.info(`Running server at http://localhost:${port}`);
});

const http = require("http");
const Nim = require("./nim.js");

const server = new Nim.NimServer();

server.init();

http.createServer(server.process).listen(80);

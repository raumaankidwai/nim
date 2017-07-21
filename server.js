const http = require("http");
const Nim = require("./nim.js");

const server = new Nim.Server();

http.createServer(server.process).listen(80);

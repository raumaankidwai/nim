const http = require("http");
const Nim = require("./nim.js");

const parser = new Nim.Parser();

http.createServer(parser).listen(80);

const fs = require("fs");

function setConstProperty (obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		writable: false,
		enumerable: true,
		configurable: true
	});
}

function Server () {
	this.process = function (req, res) {
		res.setHeader("Content-Type", "text/html");
		
		res.write(this.parser.process(fs.readFileSync(this.processURI(req.url)).toString()));
		
		res.end();
	}.bind(this);
	
	this.processURI = function (uri) {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return this.index;
		}
		
		return uri;
	}.bind(this);
	
	this.index = "index.nim";
	
	this.parser = new Parser();
}

function Parser () {
	this.process = function (text) {
		return text;
	};
}

module.exports = {
	Server: Server
};

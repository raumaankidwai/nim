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
		return fs.readFileSync(this.processURI(req.url)).toString();
	};
	
	this.processURI = function (uri) {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return "index.nim";
			//return this.index;
		}
		
		return uri;
	};
	
	this.index = "index.nim";
}

module.exports = {
	Server: Server
};

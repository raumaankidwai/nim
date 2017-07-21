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
	var self = this;
	
	this.process = function (req, res) {
		return fs.readFileSync(self.processURI(req.url)).toString();
	};
	
	this.processURI = function (uri) {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return "index.nim";
			//return self.index;
		}
		
		return uri;
	};
	
	this.index = "index.nim";
}

module.exports = {
	Server: Server
};

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
	setConstProperty(this, "process", function (req, res) {
		return fs.readFileSync(this.processURI(req.url)).toString();
	});
	
	setConstProperty(this, "processURI", function (uri) {
		return url;
	});
}

module.exports = {
	Server: Server
};

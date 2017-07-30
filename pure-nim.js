const Nim = require("./nim.js");

if (process.argv[2]) {
	const fs = require("fs");
	
	fs.readFile(process.argv[2], (e, d) => {
		if (e) {
			throw e;
		}
		
		// Super hacky, bad, all-around horrible
		console.log(new Nim.Parser().process("<!--{" + d.toString() + "}-->"));
	});
} else {
	throw new Error("CLI not supported yet.");
}
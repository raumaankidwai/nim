const Nim = require("./nim.js");

const tokenizer = new Nim.Tokenizer();
const parser = new Nim.Parser();

if (process.argv[2]) {
	const fs = require("fs");
	
	fs.readFile(process.argv[2], (e, d) => {
		if (e) {
			throw e;
		}
		
		console.log(parser.process(d.toString()));
	});
} else {
	throw new Error("CLI not supported yet.");
}
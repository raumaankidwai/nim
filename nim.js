const fs = require("fs");

const default_functions = {
	"print": {
		args: ["string"],
		ret: ["string"],
		run: (a, o) => [a[0], a[0]]
	},
	"epoch": {
		args: [],
		ret: ["int"],
		run: (a, o) => ["", new Date().getTime()]
	}
};

// Level -1       Level 0                         Level 1        Level 2           Level 3

// REQUEST -----> Server.process                  Parser.process                   Parser.parse -----> CLIENT-READY
//                      |                              ^ |                               ^
//                      |-----> Server.processURI -----| |-----> Tokenizer.tokenize -----|

// Server constructor
function Server () {
	// Process requests, level 0
	this.process = (req, res) => {
		res.setHeader("Content-Type", "text/html");
		
		res.write(this.parser.process(fs.readFileSync(this.processURI(req.url)).toString()));
		
		res.end();
	};
	
	// Turn URIs into file locators
	// TODO: Make an htaccess-like format for this
	this.processURI = (uri) => {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return this.index;
		}
		
		return uri;
	};
	
	// Index file
	this.index = "index.nim";
	
	// Moving on to level 1...
	this.parser = new Parser();
}

// Parser constructor
function Parser () {
	// Interprets Nim-coded HTML, level 1
	this.process = (text) => this.parse(this.tokenizer.reset().tokenize(text));
	
	// Parses tokenized Nim, level 3
	this.parse = (tokenizer) => {
		var output = tokenizer.plain[0];
		
		for (var i = 0; i < tokenizer.tokens.length; i ++) {
			var token;

			while (token = tokenizer.get()) {
				var res = this.parseToken(tokenizer.tokens, tokenizer.pointer);
				
				output += res[0];
				tokenizer.pointer = res[2];
			}
			
			tokenizer.bproceed();
			
			output += tokenizer.plain[i + 1];
		}
		
		return output;
	};
	
	this.parseToken = (tokens, pointer) => {
		var output = ["", , pointer];
		var token = tokens[pointer];
		
		if (token[0][1]) {
			var ret;
			
			for (var i = 0; i < token.length; i ++) {
				var res = this.parseToken(token, i);
				
				output[0] += res[0];
				ret = res[1];
				i = res[2];
			}
			
			console.log(ret);
			return output;
		}
		
		var value = token[0];
		var type = token[1];
		
		switch (type) {
			case "function":
				var func = this.functions[value];
				
				if (func) {
					var args = [];
					
					for (var i = 0; i < func.args.length; i ++) {
						output[2] = ++pointer;
						token = tokens[pointer];
						
						if (func.args[i] != token[1]) {
							throw new Error("Argument does not match correct type: `" + token[0] + "` in function `" + value + "` is of type `" + token[1] + "`, expected `" + func.args[i] + "`");
						}
						
						args.push(token[0]);
					}
					
					output[0] = func.run(args)[0];
					output[1] = func.run(args)[1];
				} else {
					throw new Error("Undefined function: " + value);
				}
			break; default:
				throw new Error("Unimplemented token type: " + type);
		}
		
		return output;
	};
	
	// Functions
	this.functions = default_functions;
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text) => {
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = text.match(/<!--{\s+([\W\w]+?)\s+}-->/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		// Plain HTML surrounding Nim blocks, to be interleaved with Nim output
		this.plain = text.match(/(^|}-->)([\W\w]*?)(<!--{|$)/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		for (var i = 0; i < blocks.length; i ++) {
			this.tokenizeBlock(blocks[i]);
		}
		
		console.log("%j", this.tokens);
		
		return this;
	};
	
	this.tokenizeBlock = (block) => {
		var l;
		
		this.tokens.push([]);
		
		// Find the first token in the block, remove it, repeat
		// Notice all the token type regexes start with ^
		// This is to preserve order and prevent inefficient char-by-char scanning
		while (l = block.length) {
			for (var j = 0; j < this.types.length; j ++) {
				block = block.replace(this.types[j][0], (a, token) => {
					this.tokens[this.tokens.length - 1].push([token, this.types[j][1]]);
					return "";
				});
			}
			
			if (block.length == l) {
				throw new Error("Unidentifiable token @ `" + block.slice(0, 20) + "`...");
			}
		}
		
		// TODO: Optimize (so bad)
		for (var i = 0; i < this.tokens.length; i ++) {
			block = this.tokens[i];
			var s = 0;
			
			while (block.map((e) => e[1]).indexOf("subs") > -1) {
				for (var j = 0; j < block.length; j ++) {
					if (block[j][1] == "subs") {
						s ++;
						
						var t = [];
						
						while (s > 0) {
							block.splice(j, 1);
							
							if (block[j][1] == "subs") {
								s ++;
							} else if (block[j][1] == "sube") {
								s --;
								
								if (s < 1) {
									block.splice(j, 1);
								}
							} else {
								t.push(block[j]);
							}
						}
						
						block = block.slice(0, j).concat([t]).concat(block.slice(j, block.length));
					}
				}
			}
			
			this.tokens[i] = block;
		}
	};
	
	// Reset tokenizer, we don't want to create new objects every request
	this.reset = () => {
		this.tokens = [];
		this.pointer = 0;
		this.bpointer = 0;
		
		this.raw = "";
		this.plain = "";
		
		return this;
	};
	
	// Get token pointed to by current pointers
	this.get = () => this.tokens[this.bpointer][this.pointer];
	
	// Get next token
	this.next = () => this.tokens[this.bpointer][this.pointer + 1];
	
	// Get next block
	this.bnext = () => this.tokens[this.bpointer + 1];
	
	// Get last token
	this.last = () => this.tokens[this.bpointer][this.pointer - 1];
	
	// Get last block
	this.blast = () => this.tokens[this.bpointer - 1];
	
	// Increment pointer
	this.proceed = () => ++this.pointer;
	this.bproceed = () => (this.pointer = 0, ++this.bpointer);
	
	// Tokens array, Array of arrays of tuples, each array element is a list of tokens of a block
	this.tokens = [];
	this.pointer = 0;
	this.bpointer = 0;
	
	this.raw = "";
	this.plain = "";
	
	// Token type array
	// Lower index = higher precedence
	this.types = [
		[/^#(.*)[\r\n]+[\s]*/, "comment"],
		[/^({)\s*/, "subs"],
		[/^(})[\s;]*/, "sube"],
		[/^(\d+)[\s;]*/, "int"],
		[/^"([^\\]+?)"[\s;]*/, "string"],
		[/^$([A-Za-z]+)[\s;]*/, "variable"],
		[/^([A-Za-z]+)\(\)[\s;]*/, "function"],
		[/^;\s/, "eol"]
	];
}

module.exports = {
	NimServer: Server,
	NimParser: Parser,
	NimTokenizer: Tokenizer
};

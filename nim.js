const fs = require("fs");

// Functions
// Each function object has an "args" array describing what type the arguments should be,
// a "ret" value set to the type of the return value,
// and a "run" function which returns an array [o, r] where `o` is the printed output and `r` is the return value.
const default_functions = {
	"print": {
		args: 1,
		run: (a, o) => [a[0], a[0]]
	},
	"epoch": {
		args: 0,
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
		
		var uri = this.processURI(req.url);
		
		if (/.nim$/.test(uri)) {
			res.write(this.parser.process((fs.readFileSync(uri).toString())));
		} else {
			res.write(fs.readFileSync(this.processURI(req.url)));
		}
		
		res.end();
	};
	
	// Turn URIs into file locators
	// TODO: Make an htaccess-like format for this
	this.processURI = (uri) => {
		uri = uri.slice(1);
		
		if (!uri.length) {
			uri = this.index;
		}
		
		return "site/" + uri;
	};
	
	// Initialize server
	// Just runs tests to make sure Nim code is valid
	// TODO: have this check all .nim files in server (sub)*dirs
	this.init = () => {
		this.parser.process((fs.readFileSync(this.processURI("/")).toString()));
		
		console.log("Tests succeeded!");
	};
	
	// Index file
	this.index = "index.nim";
	
	// Moving on to level 1...
	this.parser = new Parser();
}

// Parser constructor
function Parser () {
	// Interprets Nim-coded HTML, level 1
	this.process = (text) => this.parse(this.tokenizer.tokenize(text))[0];
	
	// Parses tokenized Nim, level 3
	this.parse = (tokenizer) => {
		var tokens = tokenizer.tokens;
		var plain = tokenizer.plain;
		
		// output[0] is text printed to page
		// output[1] is returned value
		var output = [plain[0], ];
		
		for (var i = 0; i < tokens.length; i ++) {
			for (var j = 0; j < tokens[i].length; j ++) {
				var statement = this.parseStatement(tokens[i][j]);
				
				output[0] += statement[0];
				output[1] = statement[1];
			}
			
			output[0] += plain[i + 1];
		}
		
		return output;
	};
	
	// Parse individual statements
	// VALID STATEMENTS:
	// <function> [arg1] [arg2] [...]
	// <variable> <equals> <int|string|bool>
	this.parseStatement = (statement) => {
		var output = "", ret, k;
		
		statement = statement.map((e) => Array.isArray(e[0]) ? (k = e.map(this.parseStatement).reduce((a, b) => [a[0] + b[0], b[1]]), output += k[0], this.eval(k[1])) : this.eval(e[0]));
		
		switch (statement[0][1]) {
			case "function":
				var name = statement[0][0];
				var func = this.functions[name];
				
				if (func) {
					statement = statement.slice(1);
					
					if (statement.length != func.args) {
						throw new Error("Incorrect number of arguments: Expected " + func.args.length + " arguments for function `" + name + "` but got " + statement.length);
					}
					
					var res = func.run(statement.map((e) => e[0]));
					
					output += res[0];
					ret = res[1];
				} else {
					throw new Error("Undefined function: " + name);
				}
			break; case "variable":
				if (statement[1][1] != "equals") {
					throw new Error("Expected variable assignment: `$" + statement.slice(0, 5).map((e) => "[" + e[1] + "]" + e[0]).join(" "));
				}
				
				this.variables[statement[0][0]] = statement[2][0];
				
				res = statement[2][0];
			break; default:
				throw new Error("Invalid statement beginning: " + statement[0][0] + " (" + statement[0][1] + ")");
		}
		
		return [output, ret];
	};
	
	// Evaluate a value, i.e. turn from string into whatever type it has to be
	this.eval = function (val) {
		var types = this.tokenizer.types, type;
		
		for (var i = 0; i < types.length; i ++) {
			if (types[i][2] && types[i][2].test(val)) {
				type = types[i][1];
				break;
			}
		}
		
		switch (type) {
			case "string":
				val = val.substring(1, val.length - 1);
			break; case "int":
				val = +val;
			break; case "bool":
				val = val == "true";
			break; case "variable":
				val = this.variables[val];
			break; case "function":
				val = val.substring(0, val.length - 2);
			default: break;
		}
		
		return [val, type];
	};
	
	// Functions
	this.functions = default_functions;
	
	// Variables
	this.variables = {};
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text) => {
		this.reset();
		
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = text.match(/<!--{\s+([\W\w]+?)\s+}-->/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		// Plain HTML surrounding Nim blocks, to be interleaved with Nim output
		this.plain = text.match(/(^|}-->)([\W\w]*?)(<!--{|$)/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		for (var i = 0; i < blocks.length; i ++) {
			this.tokens.push(this.tokenizeBlock(blocks[i]));
		}
		
		return this;
	};
	
	this.tokenizeBlock = (block) => {
		var l, tokens = [];
		
		// Find the first token in the block, remove it, repeat
		// Notice all the token type regexes start with ^
		// This is to preserve order and prevent inefficient char-by-char scanning
		while (l = block.length) {
			for (var j = 0; j < this.types.length; j ++) {
				block = block.replace(this.types[j][0], (a, token) => {
					if (this.types[j][1] != "comment") {
						tokens.push([token, this.types[j][1]]);
					}
					
					return "";
				});
			}
			
			if (block.length == l) {
				throw new Error("Unidentifiable token @ `" + block.slice(0, 20) + "`...");
			}
		}
		
		// TODO: Optimize (so bad)
		// Turns [..., [*, "subs"], ..., [*, "sube"], ...] into [..., [...], ...]
		var s = 0;
		
		while (tokens.map((e) => e[1]).indexOf("subs") > -1) {
			for (var j = 0; j < tokens.length; j ++) {
				if (tokens[j][1] == "subs") {
					s ++;
					
					var t = [];
					
					while (s > 0) {
						tokens.splice(j, 1);
						
						if (tokens[j][1] == "subs") {
							s ++;
						} else if (tokens[j][1] == "sube") {
							s --;
							
							if (s < 1) {
								tokens.splice(j, 1);
							}
						} else {
							t.push(tokens[j]);
						}
					}
					
					tokens = tokens.slice(0, j).concat([t]).concat(tokens.slice(j, tokens.length));
				}
			}
		}
		
		// Split code blocks on EOL
		for (var i = 0; i < tokens.length; i ++) {
			if (Array.isArray(tokens[i][0])) {
				var t = [];
				
				for (var j = 0; j < tokens[i].length; j ++) {
					t.push([]);
					
					while (tokens[i][j][1] != "eol") {
						t[t.length - 1].push(tokens[i][j]);
						j ++;
						
						if (j >= tokens.length) {
							console.log("%j", tokens);
							throw new Error("Code block does not end in semicolon.");
						}
					}
				}
				
				tokens[i] = t;
			}
		}
		
		// Split tokens on EOL
		var t = [];
		
		for (var i = 0; i < tokens.length; i ++) {
			t.push([]);
			
			while (tokens[i][1] != "eol") {
				t[t.length - 1].push(tokens[i]);
				i ++;
				
				if (i >= tokens.length) {
					throw new Error("Code block does not end in semicolon.");
				}
			}
		}
		
		tokens = t;
		
		return tokens;
	};
	
	// Reset tokenizer, we don't want to create new objects every request
	this.reset = () => {
		this.tokens = [];
		
		this.raw = "";
		this.plain = "";
		
		return this;
	};
	
	// Tokens array, Array of arrays of arrays of (tuples or arrays of tuples)
	// Each tuple is a token, each array of tuples at this level is a code block {...}
	// Each array of tuples is a statement ...;
	// Each array of statements is a Nim block <!--{...}-->
	// The array of Nim blocks is this.tokens
	this.tokens = [];
	
	this.raw = "";
	this.plain = "";
	
	// Token type array
	// Lower index = higher precedence
	// 0th element: regex to match type and no types below it in Nim
	// 1st element: name of type
	// 2nd element: regex to match type and no types below it in tokenized Nim (for Parser.eval)
	
	// Ex:
	// if the "comment" regex was /^./, it would match every type below it
	// also, it would make everything not work
	// hence, the rule "match no types below"
	this.types = [
		// Comments
		[/^#(.*)[\r\n]+[\s]*/, "comment"],
		
		// Blocks/Syntax
		[/^({)\s*/, "subs"],
		[/^(})\s*/, "sube"],
		[/^(;)\s*/, "eol"],
		[/^(=)\s*/, "equals", /^=$/],
		
		// Types
		[/^(\d+)\s*/, "int", /^\d+$/],
		[/^(".+?[^\\]")\s*/, "string", /^".+?[^\\]"$/],
		[/^(true|false)\s*/, "bool", /^(true|false)$/],
		[/^(\$[A-Za-z]+)\s*/, "variable", /^\$[A-Za-z]+$/],
		
		// Functions
		[/^([A-Za-z]+\(\))\s*/, "function", /^[A-Za-z]+\(\)$/]
	];
}

module.exports = {
	NimServer: Server,
	NimParser: Parser,
	NimTokenizer: Tokenizer
};

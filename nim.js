const fs = require("fs");
const path = require("path");

// Functions
// Each function object has an "args" array describing the number of arguments and a "run" function which returns an array [o, r] where `o` is the printed output and `r` is the return value.
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

// Utility functions for Server/Parser/Tokenizer that shouldn't be in prototypes
const utils = {
	getErrorResponse: function (code) {
		return code.toString();
	},
};

// Level -1       Level 0                         Level 1        Level 2           Level 3

// REQUEST -----> Server.process                  Parser.process                   Parser.parse -----> CLIENT-READY
//                      |                              ^ |                               ^
//                      |-----> Server.processURI -----| |-----> Tokenizer.tokenize -----|

// Server constructor
function Server () {
	// Absolute directory
	this.absolute = "/";
	
	// Index file
	this.index = "index.nim";
	
	// Level 1
	this.parser = new Parser();
}

// Process requests, level 0
Server.prototype.process = (req, res) => {
	var output = "";
	var code = 200;
	
	var uri = this.processURI(req.url);
	
	if (+uri) {
		code = +uri;
	} else if (/.nim$/.test(uri)) {
		// TODO: better error throwing in Parser
		try {
			output = this.processFile(uri);
		} catch (e) {
			code = 500;
			
			console.log(e.message);
		}
	} else {
		output = fs.readFileSync(this.processURI(req.url));
	}
	
	if (code > 399) {
		output = this.getErrorResponse(code);
	}
	
	res.writeHead(code, {
		"Content-Length": output.length,
		"Content-Type": "text/html"
	});
	
	res.write(output);
	
	res.end();
};

// Process individual files
Server.prototype.processFile = (file) => {
	return this.parser.process(fs.readFileSync(uri).toString());
};

// Initialize server
// Initializes configs and nothing else
Server.prototype.init = (config) => {
	for (var i in config) {
		this[i] = config[i];
	}
};

// Turn URIs into file locators
// TODO: Make an htaccess-like format for this
Server.prototype.processURI = (uri) => {
	// Index file
	if (uri[uri.length - 1] == "/") {
		uri += this.index;
	}
	
	// Truncates first /
	// GET /a/b/c => GET a/b/c
	uri = uri.slice(1);
	
	// This. Module. Is. Amazing.
	// at least it seems so after 5 hours of not knowing about it
	uri = path.format({
		dir: this.absolute,
		base: uri
	});
	
	var pathObj = path.parse(uri);
	
	// Check if no extension
	if (!pathObj.ext) {
		var files = fs.readdirSync(pathObj.dir).filter((e) => !e.indexOf(pathObj.name));
		
		if (files.length > 1) {
			return 416; // 416 Range Not Satisfiable, bends the definition a little bit to use "range" as "range of files" and not "range of bytes of file"
		} else if (files.length < 1) {
			return 404; // Obv
		} else {
			uri = path.format({
				dir: pathObj.dir,
				base: files[0]
			});
		}
	}
	
	return uri;
};

// Parser constructor
function Parser () {
	// Functions
	this.functions = default_functions;
	
	// Variables
	this.variables = {};
	
	// Level 2
	this.tokenizer = new Tokenizer();
}

// Interprets Nim-coded HTML, level 1
Parser.prototype.process = (text) => this.parse(this.tokenizer.tokenize(text))[0];

// Parses tokenized Nim, level 3
Parser.prototype.parse = (tokenizer) => {
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
// <value> <operation> <value>
Parser.prototype.parseStatement = (statement) => {
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
		break; case "variableSet":
			this.variables[statement[0][0]] = statement[1][0];
			
			res = statement[1][0];
		break; case "int":
			case "string":
			case "bool":
			if (this.tokenizer.operations.map((e) => e[1]).indexOf(statement[1][1]) > -1) {
				switch (statement[1][1]) {
					case "plus":
						ret = statement[0][0] + statement[2][0];
					break; case "minus":
						ret = statement[0][0] - statement[2][0];
					break; case "times":
						ret = statement[0][0] * statement[2][0];
					break; case "div":
						ret = statement[0][0] / statement[2][0];
					break; case "mod":
						ret = statement[0][0] % statement[2][0];
					break; default:
						throw new Error("Unimplemented operation: " + statement[1][1]);
				}
			} else if (statement[1]) {
				throw new Error("Expected operation on " + statement[0][1]);
			} else {
				res = statement[0];
			}
		break; default:
			throw new Error("Invalid statement beginning: " + statement[0][0] + " (" + statement[0][1] + ")");
	}
	
	return [output, ret];
};

// Evaluate a value, i.e. turn from string into whatever type it has to be (guesses the type)
Parser.prototype.eval = function (val) {
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
		break; case "variableSet":
			val = val.replace(/\s*=\s*/, "").slice(1);
		break; case "variableGet":
			val = this.variables[val.slice(1)];
		break; case "function":
			val = val.substring(0, val.length - 2);
		default: break;
	}
	
	return [val, type];
};

// Tokenizer constructor
function Tokenizer () {
	// Tokens array, Array of arrays of arrays of (tuples or arrays of tuples)
	// Each tuple is a token, each array of tuples at this level is a code block {...}
	// Each array of tuples is a statement ...;
	// Each array of statements is a Nim block <!--{...}-->
	// The array of Nim blocks is this.tokens
	this.tokens = [];
	
	this.raw = "";
	this.plain = [];
	
	// Token type arrays
	var comments = [
		[/^#(.*)[\r\n]+[\s]*/, "comment"]
	];
	
	var syntax = [
		[/^({)\s*/, "subs"],
		[/^(})\s*/, "sube"],
		[/^(;)\s*/, "eol"],
		[/^(=)\s*/, "equals", /^=$/]
	];
	
	var operations = [
		[/^(\+)\s*/, "plus", /^\+$/],
		[/^(-)\s*/, "minus", /^-$/],
		[/^(\*)\s*/, "times", /^\*$/],
		[/^(\/)\s*/, "div", /^\/$/],
		[/^%\s*/, "mod", /^%$/]
	];
	
	var datatypes = [
		[/^(\d+)\s*/, "int", /^\d+$/],
		[/^(".+?[^\\]")\s*/, "string", /^".+?[^\\]"$/],
		[/^(true|false)\s*/, "bool", /^(true|false)$/],
		[/^(\$[A-Za-z]+)\s*/, "variableGet", /^\$[A-Za-z]+$/]
	];
	
	var variables = [
		[/^(\$[A-Za-z]+\s*=)\s*/, "variableSet", /^\$[A-Za-z]+\s*=$/]
	];
	
	var functions = [
		[/^([A-Za-z]+\(\))\s*/, "function", /^[A-Za-z]+\(\)$/]
	];
	
	this.types = comments.concat(syntax)
		.concat(operations)
		.concat(datatypes)
		.concat(variables)
		.concat(functions);
}

// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
Tokenizer.prototype.tokenize = (text) => {
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

Tokenizer.prototype.tokenizeBlock = (block) => {
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
					
					if (j >= tokens[i].length) {
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
Tokenizer.prototype.reset = () => {
	this.tokens = [];
	
	this.raw = "";
	this.plain = [];
	
	return this;
};

module.exports = {
	Server: Server,
	Parser: Parser,
	Tokenizer: Tokenizer
};

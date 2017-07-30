# Nim in HTML

Nim is and was originally meant for being embedded in HTML and preprocessed as a server-side scripting language. Therefore, Nim has start and end tags (`<!--{` and `}-->`) that indicate when Nim code starts and HTML ends, and vice versa. However, unlike most or potentially all similar languages, Nim start and end tags also function as HTML comments, meaning that in the case of the interpreter failing and defaulting to a static HTML page, no code will be shown to the user. This is probably bad. Maybe. I don't know.

Note: A program like so:

	<!--{
		print() "Hello }--> world <!--{";
	}-->

will **NOT** succeed, due to it being parsed like so:

	<!--{
		print() "Hello
	}-->
	world
	<!--{ "; }-->

### Next: [Statements](STATEMENTS.md)

# Code blocks

Code blocks are the recursive method to nest code within more code. (Code-ception!) Much like parentheses or blocks in other languages, though sometimes more akin to immediately-run anonymous lambdas, Nim code blocks execute all the statements within them and return the result. This result can then be used as inputs to other statements.

For example:

	print() { epoch(); };

will print the server epoch time as the code block, after returning the numerical epoch time, will be effectively replaced with the returned value.
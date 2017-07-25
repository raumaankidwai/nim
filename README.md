# nim
Server-side language, actually working kinda in 3 days :D.

Not related to *that* Nim.

# Theoretical v1 Syntax

```
<!DOCTYPE HTML>
<HTML stuff>

<!-- Nim start and end tags work as HTML comments because that's useful -->
<!--{
# comment

# this is Nim
# Nim has functions and strings and stuff

# print() is a function with 1 argument
# functions have arguments outside of parentheses
# strings are bounded by double-quotes only
# semicolons end all statements
# functions can be named any alphabetic string as long as the string isn't all uppercase (reserved for keywords)
print() "Hello there!";

# define functions with `DEF`
# each argument is put between the function name and the block (which uses [] instead of {})
# oh yeah and variables are like PHP
DEF add $a $b {
	# Addition is + obviously
	# Functions automatically return the value of the last statement executed
	$a + $b;
};

# Yay nested functions
print() {add() 2 3;};

# Oh wait I forgot setting variables
$a = 3

# functions with 0 arguments work too

DEF incr {
	$a = {$a + 1;};
}

print() {incr() $a;}; # prints 4
print() $a       # also prints 4

}-->
```

A fibonacci program (without open/close tags), showcasing while loops and bools

```
# First two variables
$a = 1
$b = 1

# Loop infinitely
# 1 can't be used here, so we have `true` and `false`
while true {
	# Print
	print() $a;

	# Increment/swap/thing that you need to do
	$c = $b;
	$b = { $a + $b; };
	$a = $c;

	# Deletion is available since all vars are global, prob not necessary I dunno
	DEL $c;
}
```

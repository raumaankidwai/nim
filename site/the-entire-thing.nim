<!--{
	$time = { epoch(); };
	print() "If you're seeing this, that means Raumaan didn't *fully* give up :D, otherwise";
}--> Raumaan gave up >:(<br/><br/>

Current server time: <!--{ print() { epoch(); }; }--><br/><br/>

7 + 3 = <!--{ print(){ 7 + 3; }; }--><br/>
7 - 3 = <!--{ print(){ 7 - 3; }; }--><br/>
7 * 3 = <!--{ print(){ 7 * 3; }; }--><br/>
7 / 3 = <!--{ print(){ 7 / 3; }; }--><br/>
7 % 3 = <!--{ print(){ 7 % 3; }; }--><br/>
7 %/ 3 = <!--{ print(){ 7 %/ 3; }; }--><br/><br/>

$a = <!--{ print(){ $a = 3; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
++$a = <!--{ print(){ $a = {$a + 1;}; }; }--><br/>
$a %/ 4 = <!--{ print(){ $a %/ 4; }; }--><br/><br/>

110 = <!--{ print() 110; }--><br/>
0b110 = <!--{ print() 0b110; }--><br/>
0o110 = <!--{ print() 0o110; }--><br/>
0x110 = <!--{ print() 0x110; }--><br/>
110.347 = <!--{ print() 110.347; }--><br/>
0x1A3F950CD + 0x129E3744 = <!--{ print() { 0x1A3F950CD + 0x129E3744; }; }--><br/><br/>

<!--{
	$sec = { { epoch(); } %/ 1000; };
	$oddeven = { $sec % 2; };
	
	print() "This second is ";
	
	if $oddeven {
		print() "odd";
	}; else {
		print() "even";
	};
	
	print() { " (" + $sec; };
	print() ")<br/>";
	
	$lastdigit = { $sec % 10; };
	
	if { $lastdigit == 7; } {
		print() "The last digit of this second IS EQUAL TO 7.";
	}; elseif { $lastdigit == 4; } {
		print() "The last digit of this second IS NOT EQUAL TO 7 and IS EQUAL TO 4.";
	}; else {
		print() "The last digit of this second IS NOT EQUAL TO 7 and IS NOT EQUAL TO 4.";
	};
	
	print() "<br/>";
	
	if { $lastdigit > 8; } {
		print() "The last digit of this second IS GREATER THAN 8.";
	}; elseif { $lastdigit >= 8; } {
		print() "The last digit of this second IS NOT GREATER THAN 8 but IS GREATER THAN OR EQUAL TO 8.";
	}; elseif { $lastdigit <= 8; } {
		print() "The last digit of this second IS LESS THAN OR EQUAL TO 8.";
	}; else {
		# ;)
		print() "The last digit of this second DOE̿S̈́ N̜̣̰̝͂ͥ̏̓̂O̦͖ͥͅT̜͈͐͆ E̡͎͍̝͚̻̙͉̩͇͂ͩ͛̅͑̎̚X̂̒̿̾͟͞҉̯̙̼̩͔̙̲̱̹̜͓̦̜ͅI̵̧̛̪̮͙̻̹̗ͤ̿͑̈̒ͫͫ͆ͬ̊ͮͧ̌ͪ͘͢S̴̡̜̼̠̗͚̱̝̬͚̣̗̺̯͉̝̠̓ͬ̒͟Ṯ̴̴̝̭̼̝͍͙̤͔̳̻̇̽͐";
	};
}--><br/><br/>

<!--{
	print() { { epoch(); } - $time; };
}--> ms have elapsed since parser started. <br/><br/>

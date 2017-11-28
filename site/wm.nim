<!--{

cursor() $ARROW;

model "EventHandler" {
	cons "you should not be using the return value of this function" $events {
		$$events = [];
		
		for $i 0 { len $events; } {
			$$events[$events[$i]] = [];
		};
	};
	
	method "dispatchEvent" "you should not be using the return value of this function" $event $args {
		$callbacks = $$events[$event];
		
		for $i 0 { len $callbacks; } {
			$callbacks[$i]->apply() $args;
		}
	};
	
	method "on" "you should not be using the return value of this function" $event $callback {
		$$events[$event]->push() $callback;
	};
};

$windows = [];
$focusedWindow = -1;

extend "EventHandler" "Window" {
	cons "you should not be using the return value of this function" $app $x $y $w $h {
		$$events = [];

		for $i 0 { $i < $$model->eventsList->length; } { $i += 1; } {
			$$events[$$model->eventsList[i]] = [];
		}

		$$zindex = 0;
		
		$$x = { $x ?? 100; };
		$$y = { $y ?? 100; };
		$$w = { $w ?? 200; };
		$$h = { $h ?? 200; };
		
		$$app = $app;
	};
};

}-->

# useful-Observer

  useful Observer pattern implementation

## Installation

  Install with [component(1)](http://component.io):

    $ component install muigui/useful-Observer

  Install with npm:

    $ npm install useful-Observer

## API

Observer provides the core functionality required to create event-driven applications by allowing you to observe and broadcast custom events within the JavaScript space.

Observer is best utilised as a base class you can extend your own classes with or as a mixin.

### configuration options

#### observers:Object
An Object of `observers` to observe. See the `observe` instance method for details on adding event listeners.

### instance properties

#### broadcasting:Boolean|String
Returns `false` if no event is currently being broadcast, otherwise it will be set to the name of the event currently being broadcast.

#### destroyed:Boolean
Returns `true` if the Observer instance was destroyed, `false` otherwise.

#### destroying:Boolean
Returns `true` if the Observer instance is currently being destroyed, `false` otherwise.

#### listeners:Object
The Observer's event listener store.

#### observer_suspended:Boolean
Returns `true` if the Observer has been suspended from broadcasting events, `false` otherwise.

### instance methods

#### broadcast( event:String[, arg1:Mixed, arg2:Mixed, ..., argN:Mixed] ):this
Broadcasts the passed `event` – firing any event listener callbacks observing the `event` being `broadcast` – and passes any extra arguments to the callback Functions.

**IMPORTANT:** The Observer instance broadcasting the event will always be the first argument passed to each callback Function; **UNLESS** The callback Function is a method on the Observer instance.

##### Example:

```javascript

	var Observer = require( 'useful-Observer' );

    function log() { console.log( 'log function: ', arguments ); }

    var observer = new Observer();

    observer.log = function() { console.log( 'log method:   ', arguments ); }

    observer.observe( 'foo', log )
            .observe( 'foo', observer.log, observer )
            .broadcast( 'foo', 1, 2, 3 );

    // logs => log function: [observer, 1, 2, 3]; <- Observer instance that broadcast the event is the first argument as log function does not exist on observer
    // logs => log method:   [1, 2, 3];           <- Observer instance omitted, as log method exists on observer

```

#### destroy():Boolean
Destroys the Observer instance, purging all event listeners and disabling the Observer instance from broadcasting any more events.

Returns `true` if the Observer instance is successfully destroyed, `false` otherwise.

**IMPORTANT:** If you are extending `Observer` it is **best practice** to override the `_destroy` method rather than the `destroy` method, to ensure the `before:destroy` & `destroy` events are broadcast at the correct times.

##### Example:

```javascript

	var Observer = require( 'useful-Observer' );

    function log() { console.log( arguments ); }

    var observer = new Observer( { foo : log } );

    observer.broadcast( 'foo', 1, 2, 3 ); // logs    => log function: [observer, 1, 2, 3];

    observer.destory();                   // returns => true

    observer.broadcast( 'foo', 1, 2, 3 ); // does nothing, observer is destoryed

    observer.observe( 'foo', log );            // throws  => TypeError: this.listeners is undefined.

```

#### ignore( event:String, callback:Function[, context:Object] ):this
Removes the passed `callback' Function from the listener queue, so that it is no longer fired when the Observer broadcasts the passed `event`.

##### Example:

```javascript

	var Observer = require( 'useful-Observer' );

    function log() { console.log( arguments ); }

    var observer = new Observer( { foo : log } );

    observer.broadcast( 'foo', 1, 2, 3 ); // logs => [observer, 1, 2, 3];

    observer.ignore( 'foo', log );

    observer.broadcast( 'foo', 1, 2, 3 ); // does nothing, the observer was removed;

```

#### off( event:String, callback:Function[, context:Object] ):this
An alias for `ignore` above.

#### observe( event:Object|String[, callback:Function|Function\[\]|String|String\[\], context:Object, options:Boolean|Number|Object] ):this
Observes the Observer instance based on the passed parameters.

Allows you to add a single event listener callback – or multiple callbacks – for a single event; or an Object containing a number of event listeners for multiple events and multiple event listener callbacks.

When adding event listeners you can also give an optional `options` Object, the **optional** parameters it accepts are:

<table border="0" cellpadding="0" cellspacing="0">
	<thead><tr><th>option</th><th>type</th><th>description</th></tr></thead>
	<tbody>
		<tr><td>args</td><td>Array</td><td>If supplied, these arguments will be prepended to the arguments passed to each event listener callback.</td></tr>
		<tr><td>buffer</td><td>Number</td><td>If supplied, the event listener callback will only be executed once during the specified number of milliseconds.<br />
        This is handy for events that could fire hundreds or thousands of times in a second – but do not need to be executed each time – ensuring your application's performance does not suffer because of this.</td></tr>
		<tr><td>delay</td><td>Number</td><td>If supplied, the event listener will be executed after being delayed by the specified number of milliseconds.</td></tr>
		<tr><td>single</td><td>Boolean</td><td>If supplied, the event listener callbackk will only be executed once and then removed.</td></tr>
	</tbody>
</table>

This is all best explained by examples. First let us define an example Observer class and a couple of instances:

```javascript

	var Class    = require( 'useful-Class' ),
		Observer = require( 'useful-Observer' );

    Class( 'ObserverExample', {
       constructor : function( id, observers ) {
          this.id = id;
          this.parent( observers );
       },
       extend      : Observer,
       log         : function() { console.log( this.id, ': ', arguments ); },
       foo         : function() { console.log( this.id, ': foo' ); },
       bar         : function() { console.log( this.id, ': bar' ); }
    } );

    var observer_1 = Class.new( 'ObserverExample' ),
        observer_2 = ObserverExample.create();

```

Now let's observe an event:

```javascript

// adding a single event listener and maintaining the correct context
    observer_1.observe( 'foo', observer_2.log );             // <- WRONG: context (this) Object of observer_2.log will be observer_1

    observer_1.observe( 'foo', observer_2.log, observer_2 ); // <- RIGHT: context (this) Object of observer_2.log will be observer_2

```

A little bit smarter, observing an event with multiple listeners:

```javascript

// add multiple event listener callbacks for one event
    observer_1.observe( 'foo', [observer_2.log, observer_2.foo, observer_2.bar], observer_2 );

    observer_1.observe( 'foo', ['log', 'foo', 'bar'], observer_2 );             // <- same as above

```

Adding options into the mix:

```javascript

// fire an event listener once only
    observer_1.observe( 'foo', 'log', observer_2, true );                       // <- can simply pass true if there are no other options
    observer_1.observe( 'foo', observer_2.log, observer_2, { single : true } ); // <- will do same as above

// delay the event listener from firing by the specified number of milliseconds
    observer_1.observe( 'foo', 'log', observer_2, 500 );                        // <- can simply pass the number of milliseconds if there are no other options
    observer_1.observe( 'foo', observer_2.log, observer_2, { delay : 500 } );   // <- will do the same as above

// buffer an event listener to only fire once during the specified number of milliseconds
    observer_1.observe( 'foo', observer_2.log, observer_2, { buffer : 500 } );  // <- only one way to do this one, sorry.

```

Adding event listeners for multiple events using an Object, and whole lot more!

```javascript

// add multiple event listener callbacks for multiple events
    observer_1.observe( {
       foo        : {
          fn      : 'foo',
          ctx     : observer_2,                                      // <- overrides the top level ctx
          options : { args : [1, 2, 3], delay : 250, single : true } // <- overrides the top level options
       },
       bar        : [observer_2.bar, 'log'],                         // <- can still add multiple callbacks for one event
       log        : observer_2.log,
       ctx        : observer_2,                                      // <- top level ctx for all callbacks which don't have one specified
       options    : { args : [4, 5, 6 ] }                            // <- top level options for all callbacks which don't have any specified
    } );

```

**NOTE:** you can also supply wildcard (*) event listeners:

```javascript

   observer_1.observe( '*foo*', console.log, console );

   observer_1.broadcast( 'foo', 1, 2, 3 );          // <= fires *foo* listener callback

   observer_1.broadcast( 'ipitythefool', 1, 2, 3 ); // <= fires *foo* listener callback

   observer_1.broadcast( 'foomanchu', 1, 2, 3 );    // <= fires *foo* listener callback

   observer_1.broadcast( 'foomanchu', 1, 2, 3 );    // <= fires *foo* listener callback

   observer_1.broadcast( 'boofuu', 1, 2, 3 );       // <= DOES NOT fire *foo* listener callback

```

#### on( event:Object|String[, callback:Function|Function\[\]|String|String\[\], context:Object, options:Boolean|Number|Object] ):this
An alias for `observe` above.

#### purgeObservers( [event:String] ):this
Removes all an Observer instance's event listeners. If an `event` is passed, only the event listeners for that `event` will be removed.

#### relayEvents( observer:Observer, event1:String[, event2:String, ..., eventN:String] ):this
Relays the passed `event`s from the Observer instance to the passed `observer`, as if the events are also being broadcast by the passed `observer`.

Handy for implementing "event bubbling" like functionality.

#### resumeEvents():this
Enables the Observer instance's ability to `broadcast` events.

See `suspendEvent` example below.

#### suspendEvents():this
Disables the Observer instance's ability to `broadcast` events.

##### Example:

```javascript

	var Observer = require( 'useful-Observer' );

    function log() { console.log( arguments ); }

    var observer = new Observer( { foo : log } );

    observer.broadcast( 'foo', 1, 2, 3 ); // logs => [observer, 1, 2, 3];

    observer.suspendEvents();

    observer.broadcast( 'foo', 1, 2, 3 ); // does nothing, events are suspended

    observer.resumeEvents();

    observer.broadcast( 'foo', 1, 2, 3 ); // logs => [observer, 1, 2, 3];

```

## License

(The MIT License)

Copyright (c) 2011 christos "constantology" constandinou http://muigui.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

![Analytics](https://ga-beacon.appspot.com/UA-15072756-2/muigui/useful-Observer/readme)

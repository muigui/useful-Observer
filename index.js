	var copy  = require( 'useful-copy' ),

		UNDEF;

// class Observer
	function Observer( observers ) {
		this.event_queue = [];
		this.listeners   = Object.create( null );

		if ( !observers )
			observers = this.observers;

		delete this.observers;

		if ( observers && typeof observers == 'object' )
			this.observe( typeof observers.observers == 'object' ? observers.observers : observers );
	}

	Observer.prototype     = {
		constructor          : Observer,
// public properties
		broadcasting         : false,
		destroyed            : false,
		destroying           : false,
		event_queue          : null,
		listeners            : null,
		observer_suspended   : false,

// public methods
		broadcast            : function( event ) {
			if ( this.destroyed || this.observer_suspended || !event )
				return this;

			event     = String( event ).toLowerCase();

			var queue = this.getListeners( event ); // in any case will return a different array to the queue to ensure
													// any listeners added or removed during broadcast don't affect the
												    // current broadcast

			if ( !queue.length )  	                // if no event queue, then don't even bother
				return this;

			this.event_queue.unshift( this.broadcasting );
			this.broadcasting = event;

// if a callback returns false then we want to stop broadcasting, every will do this, forEach won't!
			queue.every( this.fireEventCallback.bind( this, Array.prototype.slice.call( arguments, 1 ) ) );

			this.broadcasting = this.event_queue.shift();

			return this;
		},
		buffer               : function( ms, evt, fn, ctx, options ) {
			if ( !options || typeof options != 'object' )
				options = Object.create( null );

			options.buffer = Number( ms );

			return this.observe( evt, fn, ctx, options );
		},
		delay                : function( ms, evt, fn, ctx, options ) {
			if ( !options || typeof options != 'object' )
				options = Object.create( null );

			options.delay = Number( ms );

			return this.observe( evt, fn, ctx, options );
		},
		destroy              : function() {
			if ( this.destroyed )
				return true;

			if ( this.broadcast( 'before:destroy' ) === false )
				return false;

			this.destroying         = true;

			this.onDestroy();

			this.broadcast( 'destroy' );

			this.observer_suspended = true;

			this.destroying         = false;

			this.destroyed          = true;

			delete this.event_queue;
			delete this.listeners;

			this.afterDestroy();

			return true;
		},
		ignore               : function( event, fn, ctx ) {
			event = wildCardEsc( String( event ).toLowerCase() );

			var queue = this.listeners[event], index;

			if ( Array.isArray( queue ) && queue.length ) {
				index = findIndex( this, queue, fn, ctx );

				!~index || queue.splice( index, 1 );
			}

			return this;
		},
		observe              : function( event, fn, ctx, config ) {
			if ( event && typeof event == 'object' )
				return observe( this, event );

			event = wildCardEsc( String( event ).toLowerCase() );

			var cb, internal,
				queue   = this.listeners[event],
				type_fn = Object.prototype.toString.call( fn );

			if ( !Array.isArray( queue ) )
				this.listeners[event] = queue = [];

			if ( type_fn == '[object Array]' )
				fn.map( observe_multi( event, ctx, config ), this );
			else {
				switch( type_fn ) {
					case '[object Object]' :
						if ( 'handleEvent' in fn ) {
							if ( ctx && typeof ctx == 'object' && config === UNDEF )
								config = ctx;
							ctx = fn;
							fn  = handleEvent( fn );
						}
						break;

					case '[object String]' :
						if ( ctx && typeof ctx == 'object' ) {
							fn  = ctx[fn];
							if ( ctx === this && typeof fn === 'function' )
								internal = true;
						}
						else if ( typeof this[fn] == 'function' ) {
							fn       = this[fn];
							ctx      = this;
							internal = true;
						}
						break;
				}

				if ( typeof fn == 'function' )
					queue.push( new Callback( fn, this.createCallbackConfig( config, ctx || this, internal ) ) );
			}

			return this;
		},
		once                 : function( evt, fn, ctx, options ) {
			if ( !options || typeof options != 'object' )
				options = Object.create( null );

			options.single = true;

			return this.observe( evt, fn, ctx, options );
		},
		purgeObservers       : function( event ) {
			if ( event ) {
				var queue = this.listeners[wildCardEsc( event )];

				if ( Array.isArray( queue ) )
					queue.length = 0;
			}
			else
				this.listeners = Object.create( null );

			return this;
		},
		relayEvents          : function( target_observer ) {
			var e = Array.prototype.slice.call( arguments, 1 ), evt;

			while ( evt = e.shift() )
				this.observe( evt, createRelayCallback( this, target_observer, evt ), target_observer );

			return this;
		},
		resumeEvents         : function() {
			if ( this.observer_suspended ) {
				this.observer_suspended = false;

				this.broadcast( 'observer:resumed' );
			}

			return this;
		},
		suspendEvents        : function() {
			if ( !this.observer_suspended ) {
				this.broadcast( 'observer:suspended' );

				this.observer_suspended = true;
			}

			return this;
		},
// internal methods
		afterDestroy         : function() { return this; },
		createCallbackConfig : function( config, ctx, internal ) {
			switch( Object.prototype.toString.call( config ) ) {
				case '[object Boolean]' : config = { single : !!config };                       break;
				case '[object Number]'  : config = { delay  :   config };                       break;
				case '[object Object]'  : config = copy.merge( Object.create( null ), config ); break;
				default        : config = Object.create( null );
			}

			if ( !Array.isArray( config.args ) )
				config.args = [];

			config.ctx = ctx || this;

			if ( internal === true )
				config.internal = true;

			return config;
		},
		fireEventCallback    : function( args, cb ) {
			if ( typeof cb.handleEvent != 'function' )
				return true;

			args = args.slice( 0 );

			if ( cb.internal || ( typeof cb.internal !== 'boolean' && !!key( this, cb.fn ) ) ) {
													                   // if the original callback function is a method on this
				args[0] !== this || args.shift();                      // Observer then if the first argument is the Observer
				cb.internal = true;                                    // remove it, as it's an internal event listener.
			}                                                          // otherwise, if the Observer is not the
			else if ( args[0] !== this )                               // first argument, then add it, so the callback has
				args.unshift( this );                                  // reference to which Observer fired the event

			var return_value = ( cb.handleEvent( args ) !== false );   // if a callback explicitly returns false, then we want to stop broadcasting

			if ( cb.single === true )
				this.ignore( this.broadcasting, cb.fn, cb.ctx );

			return return_value;
		},
		getListeners         : function( event ) {
			return Object.keys( this.listeners ).reduce( getListener.bind( this.listeners, event ), [] );
		},
		onDestroy            : function() { return this; }
	};

	Observer.prototype.on      = Observer.prototype.observe;
	Observer.prototype.off     = Observer.prototype.ignore;
	Observer.prototype.trigger = Observer.prototype.broadcast;

// class Callback
	function Callback( fn, config ) {
		this.stopBuffer_ = this.stopBuffer.bind( this );

		if ( typeof fn == 'function' )
			this.fn         = fn;

		if ( config && typeof config == 'object' ) {
			this.args       = Array.isArray( config.args ) ? config.args : null;
			this.ctx        = config.ctx || null;
			this.single     = !!config.single;

			if ( config.internal === true )
				this.internal = true;

			if ( !isNaN( config.buffer ) )
				this.buffer = config.buffer;

			if ( !isNaN( config.delay ) )
				this.delay  = config.delay;
		}
	}

	Callback.prototype     = {
		constructor        : Callback,
// instance configuration properties
		args               : null,
		buffer             : 0,
		ctx                : null,
		delay              : 0,
		fn                 : function() {},
		single             : false,

// public properties
		disabled           : false,
		internal           : null,

// internal properties
		bufferId           : null,
		delayId            : null,
		fired              : 0,

// public methods
		handleEvent        : function( args ) {
			if ( !this.disabled ) {
				!Array.isArray( this.args ) || args.unshift.apply( args, this.args );

				if ( this.delay > 0 )
					this.delayId = setTimeout( this.fire.bind( this, args ), this.delay );
				else
					return this.fire( args );
			}

			return null;
		},
// internal methods
		fire               : function( args ) {
			clearTimeout( this.delayId ); delete this.delayId;

			if ( this.disabled )
				return null;

			++this.fired;

			if ( this.single && this.fired >= 1 )
				this.disabled = true;
			else if ( this.buffer > 0 )
				this.startBuffer();

			return this.fn.apply( this.ctx, args );
		},
		startBuffer        : function() {
			this.disabled = true;

			this.bufferId = setTimeout( this.stopBuffer_, this.buffer );

			return this;
		},
		stopBuffer         : function() {
			clearTimeout( this.bufferId ); delete this.bufferId;

			this.disabled = false;

			return this;
		}
	};

// internal methods
	function createRelayCallback( ctxr, ctx, evt ) {
		return function Observer_relayedCallback() {
			var args = Array.prototype.slice.call( arguments );

			!( args[0] === ctxr ) || args.shift(); // switch the context to the object relaying the event instead of the object that relayed it

			args.unshift( evt, ctx );

			return relay.apply( ctx, args );
		};
	}

	function findIndex( observer, queue, fn, ctx ) {
		if ( !ctx )
			ctx = observer;

		var cb, i = -1;

		if ( typeof fn == 'string' )
			fn = ctx[fn];

		while ( cb = queue[++i] )
			if ( cb === fn || ( cb.fn === fn && cb.ctx === ctx ) )
				return i;

		return -1;
	}

	function getListener( firing_event, listeners, event ) {
		var add   = event === firing_event, match;

		if ( !add ) {
			match = firing_event.match( event );

			add   = Array.isArray( match ) && match[0] === firing_event;
		}

		!add || listeners.push.apply( listeners, this[event] );

		return listeners;
	}

	function handleEvent( cb ) {
		return function handleEvent() {
			return typeof cb.handleEvent == 'function' ? cb.handleEvent.apply( cb, arguments ) : UNDEF;
		};
	}

	function key( item, val ) {
		var keys = Object.keys( item = Object( item ) ), i = -1, l = keys.length;

		while ( ++i < l )
			if ( item[key] === val )
				return key;

		return null;
	}

	function observe( observer, listeners ) {
		listeners = copy( Object.create( null ), listeners );

		if ( !listeners.ctx )
			listeners.ctx = observer;

		if ( 'options' in listeners )
			listeners.options = observer.createCallbackConfig( listeners.options );

		Object.keys( listeners ).reduce( observe_type.bind( listeners ), observer );

		return observer;
	}

	function observe_multi( event, ctx, options ) {
		return function _observe( fn ) {
			this.observe( event, fn, ctx, options );
		};
	}

	function observe_type( observer, event, index ) {
		if ( event == 'ctx' || event == 'options' )
			return observer;

		var ctx           = this.ctx, fn,
			listener      = this[event],
			options       = this.options,
			type_listener = Object.prototype.toString.call( listener );

		switch ( type_listener ) {
			case '[object Function]' : case '[object Array]' : case '[object String]' :
				fn      = listener;
				break;

			case '[object Object]'   :
				fn      = listener.fn;
				ctx     = 'ctx' in listener ? listener.ctx : ctx;
				options = 'options' in listener ? observer.createCallbackConfig( listener.options ) : options;
				break;
		}

		!fn || observer.observe( event, fn, ctx, options );

		return observer;
	}

	function relay() {
		return this.broadcast.apply( this, arguments );
	}

	function wildCardEsc( evt ) {
		return String( evt ).toLowerCase().replace( /\*/g, '.*' );
	}

// exposing
	Observer.Callback      = Callback;
	module.exports         = Observer;

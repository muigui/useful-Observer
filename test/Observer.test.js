suite( 'muigui/useful-Observer', function() {
	function testCallback( obs, success, fn ) { fn.call( this, obs, success ); }

	var ctx      = { foo : 'bar' },
		observer = new Observer( {
			'test:config:object'  : { fn : testCallback, ctx : ctx },
			'test:config:array'   : [testCallback],
			 ctx                  : ctx
		} );

	observer.observe( 'test:config:default', testCallback, ctx );

	function createExpectations( done ) {
		return function( observer, success ) {
			var scope = this;

			expect( success ).to.be.true;
			expect( observer ).to.equal( observer );
			expect( scope ).to.equal( ctx );

			typeof done != 'function' || done();
		};
	}

	test( 'adding and removing observer callbacks', function( done ) {
		var cb = createExpectations( done );
		observer.observe( 'test:addobserver', cb, ctx );

		observer.broadcast( 'test:addobserver', true );

		expect( Object.keys( observer.listeners ).length ).to.equal( 4 );
		expect( observer.listeners['test:addobserver'] ).to.be.an( 'array' );
		expect( observer.listeners['test:addobserver'].length ).to.equal( 1 );

		observer.ignore( 'test:addobserver', cb, ctx ); // if the observer is not removed a multiple claim error will be thrown.
		observer.broadcast( 'test:addobserver', false );
	} );

	test( 'broadcasting observer callbacks added with a configuration Object', function( done ) {
		observer.broadcast( 'test:config:object', true, createExpectations( done ) );
	} );

	test( 'broadcasting observer callbacks added with an Array', function( done ) {
		observer.broadcast( 'test:config:array', true, createExpectations( done ) );
	} );

	test( 'broadcasting observer callbacks added with the default configuration', function( done ) {
		observer.broadcast( 'test:config:default', true, createExpectations( done ) );
	} );

	test( 'using wildcard events', function( done ) {
		var cb = createExpectations();

		observer.observe( 'foo*bar*', cb, ctx );
		observer.broadcast( 'foolishbarfly', true );

		observer.ignore( 'foo*bar*', cb, ctx );

		observer.broadcast( 'foolishbarfly', false );
		observer.broadcast( 'foo*bar*', false );

		done();
	} );

	test( 'delayed firing of an observer callback — delay is 250ms', function( done ) {
		function cb( obs, success ) {
			var scope = this, time = Date.now() - ms;
			expect( time ).to.be.within( 220, 280 );
			expect( success ).to.be.true;
			expect( obs ).to.equal( observer );
			expect( scope ).to.equal( ctx );

			observer.ignore( 'test:delayed', cb, ctx );

			done();
		}

		observer.delay( 250, 'test:delayed', cb, ctx );

		var ms = Date.now();

		observer.broadcast( 'test:delayed', true );
	} );

	test( 'buffering an observer callback — should only be called once every 50ms', function( done ) {
		function cb( obs, success ) {
			expect( success ).to.be.true;
			expect( obs ).to.equal( observer );
			expect( this ).to.equal( ctx );
		}

		observer.buffer( 50, 'test:buffering', cb, ctx );
		observer.broadcast(  'test:buffering', true );
		observer.broadcast(  'test:buffering', false  );

		setTimeout( function() {
			observer.broadcast( 'test:buffering', true );

			done();

			observer.ignore( 'test:buffering', cb );
		}, 50 );
	} );

	test( 'firing an observer callback only once', function( done ) {
		observer.once( 'test:single', createExpectations( done ), ctx );
		observer.broadcast( 'test:single', true );
		observer.broadcast( 'test:single', false );
		observer.broadcast( 'test:single', false );
	} );

	test( 'suspending and resuming observers', function( done ) {
		var suspended = true;

		observer.once( 'test:suspendresume', function( obs, success ) {
			var scope = this;

			expect( suspended ).to.be.false;
			expect( success ).to.be.true;
			expect( obs ).to.equal( observer );
			expect( scope ).to.equal( ctx );

			done();
		}, ctx );

		observer.suspendEvents()
				.broadcast( 'test:suspendresume', false );

		expect( observer.observer_suspended ).to.be.true;

		suspended = false;

		observer.resumeEvents()
				.broadcast( 'test:suspendresume', true );

		expect( observer.observer_suspended ).to.be.false;
	} );

	test( 'relaying observers', function( done ) {
		var observer2 = new Observer();

		observer.relayEvents( observer2, 'test:relay1', 'test:relay2' );

		function cb( obs, success ) {
			expect( success ).to.be.true;
			expect( obs ).to.equal( observer2 );
			expect( this ).to.equal( ctx );
		}

		observer2.observe( {
			'test:relay1' : cb,
			'test:relay2' : cb,
			 ctx          : ctx
		} );

		observer.broadcast( 'test:relay1', true );
		observer.broadcast( 'test:relay2', true );

		done();
	} );

	test( 'purgeObservers', function( done ) {
		var observer = new Observer( {
			event1 : { fn : [util.noop, util.k], ctx : this },
			event2 : { fn :  util.noop,      ctx : this },
			event3 : util.noop,
			event4 : util.k,
			ctx    : this
		} );

		expect( observer.listeners['event1'].length ).to.eql( 2 );

		observer.purgeObservers( 'event1' );

		expect( observer.listeners['event1'].length ).to.eql( 0 );
		expect( observer.listeners['event4'].length ).to.eql( 1 );

		observer.purgeObservers( 'event4' );

		expect( observer.listeners['event4'].length ).to.eql( 0 );
		expect( Object.keys( observer.listeners ).length ).to.eql( 4 );

		observer.purgeObservers();

		expect( Object.keys( observer.listeners ).length ).to.eql( 0 );

		done();
	} );

	test( 'destroy', function( done ) {
		var o = new Observer( {
			event1 : { fn : [util.noop, util.k], ctx : this },
			event2 : { fn : util.noop, ctx : this },
			event3 : util.noop,
			event4 : util.k,
			ctx    : this
		} );

		expect( o.destroy() ).to.be.true;
		expect( !o.listeners ).to.be.true;
		expect( o.destroyed ).to.be.true;

		done();
	} );
} );

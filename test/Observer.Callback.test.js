suite( 'muigui/useful-Observer.Callback', function() {
	this.timeout( 350 );

	test( 'args', function( done ) {
		var cb = new Observer.Callback( function() {
					var a = Array.prototype.slice.call( arguments );
					expect( a ).to.eql( [1, 2, 3, 4, 5, 6] );
					done();
				}, { args : [1, 2, 3] } );

		cb.handleEvent( [4, 5, 6] );
	} );

	test( 'buffer', function( done ) {
		var cb = new Observer.Callback( function() {
				var time = Date.now() - ms;
					if ( i > - 1 ) {
						if ( time < 200 )
							expect( 'buffering refuted' ).to.eql( 'buffering verified' );
						expect( time ).to.be.within( 200, 350 );
					}
					else expect( 'buffering verified' ).to.be.ok;

				ms = Date.now();
				++i < 1 || cb.handleEvent();

				done();
			}, { buffer : 250 } ),
			i  = -1,
			ms = Date.now();

		cb.handleEvent();
		setTimeout( function() { cb.handleEvent(); }, 50 );
	} );

	test( 'ctx', function( done ) {
		var ctx = { foo : 'bar' },
			cb  = new Observer.Callback( function() {
					var me = this;
					expect( me ).to.equal( ctx );
					done();
				}, { ctx : ctx } );

		cb.handleEvent();
	} );

	test( 'delay — delay is 100ms', function( done ) {
		var cb = new Observer.Callback( function() {
					var time = Date.now() - ms;
					expect( time ).to.be.above( 90 );
					done();
				}, { delay : 100 } ),
			ms = Date.now();

		cb.handleEvent();
	} );

	test( 'single', function( done ) {
		var cb = new Observer.Callback( function() {
					expect( ++i ).to.be.equal( 1 );
				}, { single : true } ),
			i  = 0;

		cb.handleEvent(); cb.handleEvent(); cb.handleEvent();
		cb.handleEvent(); cb.handleEvent(); cb.handleEvent();

		done();
	} );
} );

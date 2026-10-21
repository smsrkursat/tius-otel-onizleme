/**
 * Başa dön düğmesi: sayfa biraz kaydıktan sonra belirir, çevresindeki halka
 * sayfada inildikçe dolar.
 */
( function () {
	'use strict';

	var button = document.querySelector( '.otel-top' );
	if ( ! button ) {
		return;
	}

	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var waiting = false;

	function update() {
		waiting = false;
		button.classList.toggle( 'is-visible', window.pageYOffset > window.innerHeight * 0.6 );

		// Halka: sayfanın kaydırılabilir boyunun ne kadarı geride kaldı, 0-1.
		var room = document.documentElement.scrollHeight - window.innerHeight;
		var done = room > 0 ? Math.min( 1, Math.max( 0, window.pageYOffset / room ) ) : 0;
		button.style.setProperty( '--otel-progress', done.toFixed( 4 ) );

		// Sayfanın en altında düğme telif satırının sağ ucundaki yazının üstüne
		// biner; oraya varınca satırın üstüne çıkar.
		button.classList.toggle( 'is-lifted', room > 0 && room - window.pageYOffset < 80 );
	}

	window.addEventListener( 'resize', update );
	window.addEventListener( 'scroll', function () {
		if ( ! waiting ) {
			waiting = true;
			window.requestAnimationFrame( update );
		}
	}, { passive: true } );

	button.addEventListener( 'click', function () {
		window.scrollTo( { top: 0, behavior: reduced ? 'auto' : 'smooth' } );
	} );

	button.hidden = false;
	update();
}() );

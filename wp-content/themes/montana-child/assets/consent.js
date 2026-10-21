/**
 * Çerez onayı (inc/consent.php).
 *
 * Seçim tarayıcıda 'otel-consent' adıyla saklanır: granted ya da denied.
 * Onay varsa Google Analytics yüklenir ve haritalar açılır; yoksa hiçbiri
 * Google'a bağlanmaz. Haritanın önündeki düğme yalnızca o haritayı, seçimi
 * kaydetmeden açar. Analytics yüklüyken WhatsApp, telefon ve e-posta
 * bağlantıları ile rezervasyon formu birer olay olarak ölçülür.
 */
( function () {
	'use strict';

	var KEY = 'otel-consent';
	var config = window.otelConsent || {};
	var banner = document.querySelector( '.otel-consent' );

	function read() {
		try {
			return window.localStorage.getItem( KEY );
		} catch ( e ) {
			return null;
		}
	}

	function save( value ) {
		try {
			window.localStorage.setItem( KEY, value );
		} catch ( e ) {}
	}

	function showMap( wrap ) {
		var frame = wrap.querySelector( 'iframe[data-src]' );
		if ( frame ) {
			frame.src = frame.getAttribute( 'data-src' );
			frame.removeAttribute( 'data-src' );
		}
		wrap.classList.add( 'is-loaded' );
	}

	function loadAnalytics() {
		if ( ! config.ga || window.gtag ) {
			return;
		}
		window.dataLayer = window.dataLayer || [];
		window.gtag = function () {
			window.dataLayer.push( arguments );
		};
		window.gtag( 'js', new Date() );
		window.gtag( 'config', config.ga );
		var script = document.createElement( 'script' );
		script.async = true;
		script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent( config.ga );
		document.head.appendChild( script );
	}

	// Onay geri alınınca Analytics çerezleri silinir.
	function clearAnalytics() {
		var host = window.location.hostname.split( '.' );
		document.cookie.split( ';' ).forEach( function ( part ) {
			var name = part.split( '=' )[ 0 ].trim();
			if ( 0 !== name.indexOf( '_ga' ) ) {
				return;
			}
			for ( var i = 0; i < host.length - 1 || i === 0; i++ ) {
				var domain = host.slice( i ).join( '.' );
				document.cookie = name + '=; Max-Age=0; path=/; domain=' + domain;
			}
			document.cookie = name + '=; Max-Age=0; path=/';
		} );
	}

	function apply( value ) {
		if ( 'granted' === value ) {
			loadAnalytics();
			document.querySelectorAll( '.otel-map' ).forEach( showMap );
		}
	}

	function open() {
		if ( ! banner ) {
			return;
		}
		banner.hidden = false;
		window.requestAnimationFrame( function () {
			banner.classList.add( 'is-open' );
		} );
	}

	function close() {
		if ( banner ) {
			banner.classList.remove( 'is-open' );
			banner.hidden = true;
		}
	}

	if ( banner ) {
		banner.addEventListener( 'click', function ( event ) {
			var button = event.target.closest( '[data-consent]' );
			if ( ! button ) {
				return;
			}
			var value = button.getAttribute( 'data-consent' );
			var before = read();
			save( value );
			close();
			if ( 'denied' === value && 'granted' === before ) {
				clearAnalytics();
				window.location.reload();
				return;
			}
			apply( value );
		} );
	}

	document.addEventListener( 'click', function ( event ) {
		var opener = event.target.closest( '[data-consent-open]' );
		if ( opener ) {
			event.preventDefault();
			open();
			return;
		}

		var load = event.target.closest( '.otel-map__load' );
		if ( load ) {
			showMap( load.closest( '.otel-map' ) );
			return;
		}

		var link = event.target.closest( 'a[href]' );
		if ( ! link || ! window.gtag ) {
			return;
		}
		var href = link.getAttribute( 'href' );
		var method = /wa\.me|whatsapp/i.test( href ) ? 'whatsapp' : 0 === href.indexOf( 'tel:' ) ? 'phone' : 0 === href.indexOf( 'mailto:' ) ? 'email' : '';
		if ( method ) {
			window.gtag( 'event', 'whatsapp' === method ? 'generate_lead' : 'contact', {
				method: method,
				link_url: href,
				transport_type: 'beacon',
			} );
		}
	} );

	// Rezervasyon formu WhatsApp'a gönderir; gönderim bir talep olarak sayılır.
	document.addEventListener( 'submit', function ( event ) {
		if ( window.gtag && event.target.matches( '.montana-form--booking' ) ) {
			window.gtag( 'event', 'generate_lead', { method: 'booking_form', transport_type: 'beacon' } );
		}
	} );

	var choice = read();
	if ( choice ) {
		apply( choice );
	} else {
		open();
	}
} )();

/**
 * Statik sitenin formları: sunucu olmadığı için rezervasyon talebi ve
 * iletişim mesajı, ziyaretçinin kendi WhatsApp'ında hazır yazılmış bir
 * mesaj olarak açılır; göndermek ziyaretçiye kalır.
 *
 * Rezervasyon mesajı, eski WordPress sürümündeki mesajla aynı biçimdedir.
 * Tarih alanlarının en erken günü sayfa açıldığı gün olarak ayarlanır.
 */
( function () {
	'use strict';

	var WHATSAPP = '905428122211';
	var SITE = 'Çukurova Tius Otel';
	var tr = 0 === ( document.documentElement.lang || 'tr' ).toLowerCase().indexOf( 'tr' );

	function iso( d ) {
		return d.getFullYear() + '-' + String( d.getMonth() + 1 ).padStart( 2, '0' ) + '-' + String( d.getDate() ).padStart( 2, '0' );
	}
	function parse( value ) {
		var p = String( value || '' ).split( '-' );
		return 3 === p.length ? new Date( +p[ 0 ], +p[ 1 ] - 1, +p[ 2 ] ) : null;
	}
	function show( d ) {
		return String( d.getDate() ).padStart( 2, '0' ) + '.' + String( d.getMonth() + 1 ).padStart( 2, '0' ) + '.' + d.getFullYear();
	}
	function field( form, name ) {
		var el = form.querySelector( '[name="' + name + '"]' );
		return el ? String( el.value || '' ).trim() : '';
	}
	function open( lines ) {
		var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent( lines.join( '\n' ) );
		window.location.href = url;
	}

	// Tarih alanları: bugünden önce seçilemez, çıkış girişten en az bir gün sonradır.
	var today = new Date();
	today.setHours( 0, 0, 0, 0 );
	var tomorrow = new Date( today.getTime() + 864e5 );
	document.querySelectorAll( 'input[name="checkin"]' ).forEach( function ( el ) {
		el.min = iso( today );
	} );
	document.querySelectorAll( 'input[name="checkout"]' ).forEach( function ( el ) {
		el.min = iso( tomorrow );
	} );

	document.querySelectorAll( 'form.montana-form--booking' ).forEach( function ( form ) {
		form.addEventListener( 'submit', function ( event ) {
			event.preventDefault();
			var checkout = form.querySelector( '[name="checkout"]' );
			var a = parse( field( form, 'checkin' ) ), b = parse( field( form, 'checkout' ) );
			if ( checkout ) {
				checkout.setCustomValidity( a && b && b <= a ? ( tr ? 'Çıkış tarihi girişten sonra olmalı.' : 'Check-out must be after check-in.' ) : '' );
			}
			if ( ! form.reportValidity() || ! a || ! b ) {
				return;
			}
			var nights = Math.round( ( b - a ) / 864e5 );
			var lines = [
				tr ? 'Merhaba, ' + SITE + ' için rezervasyon talebim var.' : 'Hello, I would like to request a reservation at ' + SITE + '.',
				'',
				( tr ? 'Giriş: ' : 'Check-in: ' ) + show( a ),
				( tr ? 'Çıkış: ' : 'Check-out: ' ) + show( b ) + ' (' + nights + ( tr ? ' gece' : ( 1 === nights ? ' night' : ' nights' ) ) + ')',
				( tr ? 'Kişi sayısı: ' : 'Guests: ' ) + field( form, 'guests' ),
			];
			var room = form.querySelector( '[name="room"]' );
			if ( room && room.value ) {
				lines.push( ( tr ? 'Oda: ' : 'Room: ' ) + room.options[ room.selectedIndex ].text.trim() );
			}
			lines.push( ( tr ? 'Ad Soyad: ' : 'Name: ' ) + field( form, 'name' ) );
			if ( field( form, 'message' ) ) {
				lines.push( ( tr ? 'Not: ' : 'Note: ' ) + field( form, 'message' ) );
			}
			if ( window.gtag ) {
				window.gtag( 'event', 'generate_lead', { method: 'booking_form', transport_type: 'beacon' } );
			}
			open( lines );
		} );
		form.querySelectorAll( '[name="checkin"], [name="checkout"]' ).forEach( function ( el ) {
			el.addEventListener( 'change', function () {
				var c = form.querySelector( '[name="checkout"]' );
				if ( c ) {
					c.setCustomValidity( '' );
				}
			} );
		} );
	} );

	document.querySelectorAll( 'form.montana-form--contact' ).forEach( function ( form ) {
		var email = form.querySelector( '[name="email"]' );
		if ( email ) {
			email.required = false;
			email.placeholder = tr ? 'E-posta adresiniz (isteğe bağlı)' : 'Your e-mail (optional)';
		}
		var button = form.querySelector( 'button[type="submit"]' );
		if ( button ) {
			button.textContent = tr ? 'WhatsApp ile gönder' : 'Send on WhatsApp';
		}
		form.addEventListener( 'submit', function ( event ) {
			event.preventDefault();
			if ( ! form.reportValidity() ) {
				return;
			}
			var lines = [ tr ? 'Merhaba, ' + SITE + ' web sitesinden yazıyorum.' : 'Hello, I am writing from the ' + SITE + ' website.', '' ];
			if ( field( form, 'subject' ) ) {
				lines.push( ( tr ? 'Konu: ' : 'Subject: ' ) + field( form, 'subject' ) );
			}
			lines.push( field( form, 'message' ), '' );
			lines.push( ( tr ? 'Ad Soyad: ' : 'Name: ' ) + field( form, 'name' ) );
			if ( field( form, 'email' ) ) {
				lines.push( ( tr ? 'E-posta: ' : 'E-mail: ' ) + field( form, 'email' ) );
			}
			if ( window.gtag ) {
				window.gtag( 'event', 'contact', { method: 'contact_form', transport_type: 'beacon' } );
			}
			open( lines );
		} );
	} );
} )();

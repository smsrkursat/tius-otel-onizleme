/**
 * Misafir yorumları: yorumlar birer birer gezilir, uzun metin "Devamını oku" ile açılır.
 *
 * İkisi de iyileştirme: betik çalışmazsa bütün yorumlar tam metinle alt alta görünür.
 */
( function () {
	'use strict';

	document.querySelectorAll( '.otel-reviews' ).forEach( function ( root ) {
		var items = Array.prototype.slice.call( root.querySelectorAll( '.otel-review' ) );
		var nav = root.querySelector( '.otel-reviews__nav' );
		var labels = nav ? nav.dataset : { more: 'Devamını oku', less: 'Daha az göster' };
		var current = 0;

		// Kısaltma: yalnızca gerçekten taşan metne düğme eklenir. Gizli bir
		// öğenin yüksekliği ölçülemediği için yorum her açıldığında bakılır.
		function clamp( item ) {
			item.querySelectorAll( '.otel-review__text' ).forEach( function ( text ) {
				if ( text.dataset.checked ) {
					return;
				}
				text.dataset.checked = '1';
				text.style.setProperty( '--otel-lines', text.dataset.lines || '6' );
				text.classList.add( 'is-clamped' );
				if ( text.scrollHeight <= text.clientHeight + 1 ) {
					text.classList.remove( 'is-clamped' );
					return;
				}

				var button = document.createElement( 'button' );
				button.type = 'button';
				button.className = 'otel-review__more';
				button.textContent = labels.more;
				button.setAttribute( 'aria-expanded', 'false' );
				button.addEventListener( 'click', function () {
					var open = text.classList.toggle( 'is-clamped' ) === false;
					button.textContent = open ? labels.less : labels.more;
					button.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
				} );
				text.after( button );
			} );
		}

		function show( index ) {
			current = ( index + items.length ) % items.length;
			items.forEach( function ( item, i ) {
				item.hidden = i !== current;
			} );
			clamp( items[ current ] );
			nav.querySelector( '.otel-reviews__counter' ).textContent = ( current + 1 ) + ' / ' + items.length;
		}

		if ( ! nav || items.length < 2 ) {
			items.forEach( clamp );
			return;
		}

		root.classList.add( 'is-paged' );
		nav.hidden = false;
		nav.querySelectorAll( '.otel-reviews__arrow' ).forEach( function ( arrow ) {
			arrow.addEventListener( 'click', function () {
				show( current + parseInt( arrow.dataset.step, 10 ) );
			} );
		} );
		show( 0 );
	} );
}() );

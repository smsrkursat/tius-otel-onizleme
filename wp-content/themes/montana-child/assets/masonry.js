/**
 * Galeri sayfasının fotoğraf duvarı.
 *
 * React Bits'teki Masonry bileşeninin (reactbits.dev) düz JavaScript
 * karşılığı: fotoğraflar kendi oranlarıyla, her biri o an en kısa sütuna
 * yerleşir; ekrana girdikçe aşağıdan, bulanıktan netleşerek sırayla gelir;
 * tıklanınca yerinden büyüyerek açılır, oklarla ya da kaydırarak gezilir.
 * Asıl bileşendeki sürükleyip yeniden sıralama, ziyaretçiye bir şey
 * kazandırmadığı için alınmadı.
 */
( function () {
	'use strict';

	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';

	document.querySelectorAll( '.otel-masonry' ).forEach( function ( root ) {
		var tiles = Array.prototype.slice.call( root.querySelectorAll( '.otel-masonry__tile' ) );
		if ( ! tiles.length ) {
			return;
		}
		var gap = 12;
		var columnWidth = 280;
		// Süzgeçten geçen fotoğraflar; yerleşim de büyük görünüm de yalnızca bunlarla çalışır.
		var visible = tiles.slice();

		root.classList.add( 'is-ready' );

		// Yerleşim: sütun sayısı genişliğe göre, her fotoğraf en kısa sütunun altına.
		function layout() {
			var width = root.clientWidth;
			var count = Math.max( width < 600 ? 2 : 1, Math.floor( ( width + gap ) / ( columnWidth + gap ) ) );
			var size = ( width - gap * ( count - 1 ) ) / count;
			var heights = [];
			for ( var c = 0; c < count; c++ ) {
				heights.push( 0 );
			}
			visible.forEach( function ( tile ) {
				var column = heights.indexOf( Math.min.apply( null, heights ) );
				var height = size * parseFloat( tile.style.getPropertyValue( '--ratio' ) || 1 );
				tile.style.width = size + 'px';
				tile.style.height = height + 'px';
				tile.style.left = Math.round( column * ( size + gap ) ) + 'px';
				tile.style.top = Math.round( heights[ column ] ) + 'px';
				heights[ column ] += height + gap;
			} );
			root.style.height = Math.max( 0, Math.max.apply( null, heights ) - gap ) + 'px';
		}

		layout();
		var resizeTimer = 0;
		new ResizeObserver( function () {
			clearTimeout( resizeTimer );
			resizeTimer = setTimeout( layout, 60 );
		} ).observe( root );

		// Belirme: ekrana giren fotoğraflar yukarıdan aşağı, soldan sağa sırayla.
		if ( reduced || ! ( 'IntersectionObserver' in window ) ) {
			tiles.forEach( function ( tile ) {
				tile.classList.add( 'is-shown' );
			} );
		} else {
			var batch = [];
			var flush = 0;
			var observer = new IntersectionObserver( function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						observer.unobserve( entry.target );
						batch.push( entry.target );
					}
				} );
				if ( batch.length && ! flush ) {
					flush = window.requestAnimationFrame( function () {
						batch.sort( function ( a, b ) {
							return ( parseFloat( a.style.top ) - parseFloat( b.style.top ) ) || ( parseFloat( a.style.left ) - parseFloat( b.style.left ) );
						} );
						batch.forEach( function ( tile, i ) {
							tile.style.setProperty( '--delay', ( i * 60 ) + 'ms' );
							tile.classList.add( 'is-shown' );
						} );
						batch = [];
						flush = 0;
					} );
				}
			}, { rootMargin: '0px 0px -6% 0px' } );
			tiles.forEach( function ( tile ) {
				observer.observe( tile );
			} );
		}

		// Büyük görünüm.
		var box = null;
		var image = null;
		var counter = null;
		var current = -1;
		var opener = null;

		function frameFor( tile ) {
			var ratio = parseFloat( tile.style.getPropertyValue( '--ratio' ) || 1 );
			var pad = window.innerWidth < 640 ? 16 : 80;
			var maxW = window.innerWidth - pad * 2;
			var maxH = window.innerHeight - pad * 2 - 40;
			var w = maxW;
			var h = w * ratio;
			if ( h > maxH ) {
				h = maxH;
				w = h / ratio;
			}
			return { left: ( window.innerWidth - w ) / 2, top: ( window.innerHeight - 40 - h ) / 2, width: w, height: h };
		}

		function place( tile ) {
			var f = frameFor( tile );
			image.style.left = f.left + 'px';
			image.style.top = f.top + 'px';
			image.style.width = f.width + 'px';
			image.style.height = f.height + 'px';
			counter.style.top = ( f.top + f.height + 16 ) + 'px';
			return f;
		}

		// Fotoğrafın duvardaki yerinden büyük görünüme (ya da tersine) uçuşu.
		function flight( tile, f ) {
			var r = tile.getBoundingClientRect();
			var s = r.width / f.width;
			return 'translate(' + ( r.left - f.left ) + 'px, ' + ( r.top - f.top ) + 'px) scale(' + s + ', ' + ( r.height / f.height ) + ')';
		}

		function build() {
			box = document.createElement( 'div' );
			box.className = 'otel-lightbox';
			box.setAttribute( 'role', 'dialog' );
			box.setAttribute( 'aria-modal', 'true' );
			box.innerHTML =
				'<div class="otel-lightbox__backdrop"></div>' +
				'<img class="otel-lightbox__image" alt="" />' +
				'<p class="otel-lightbox__counter"></p>' +
				'<button type="button" class="otel-lightbox__button otel-lightbox__close"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /></svg></button>' +
				'<button type="button" class="otel-lightbox__button otel-lightbox__prev"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 6l-6 6l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg></button>' +
				'<button type="button" class="otel-lightbox__button otel-lightbox__next"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg></button>';
			image = box.querySelector( '.otel-lightbox__image' );
			counter = box.querySelector( '.otel-lightbox__counter' );
			box.querySelector( '.otel-lightbox__close' ).setAttribute( 'aria-label', root.dataset.close || 'Close' );
			box.querySelector( '.otel-lightbox__prev' ).setAttribute( 'aria-label', root.dataset.prev || 'Previous' );
			box.querySelector( '.otel-lightbox__next' ).setAttribute( 'aria-label', root.dataset.next || 'Next' );
			box.querySelector( '.otel-lightbox__backdrop' ).addEventListener( 'click', close );
			image.addEventListener( 'click', close );
			box.querySelector( '.otel-lightbox__close' ).addEventListener( 'click', close );
			box.querySelector( '.otel-lightbox__prev' ).addEventListener( 'click', function () {
				step( -1 );
			} );
			box.querySelector( '.otel-lightbox__next' ).addEventListener( 'click', function () {
				step( 1 );
			} );

			// Telefonda sola, sağa kaydırarak gezinme.
			var startX = null;
			box.addEventListener( 'touchstart', function ( e ) {
				startX = e.touches[ 0 ].clientX;
			}, { passive: true } );
			box.addEventListener( 'touchend', function ( e ) {
				if ( null === startX ) {
					return;
				}
				var dx = e.changedTouches[ 0 ].clientX - startX;
				startX = null;
				if ( Math.abs( dx ) > 50 ) {
					step( dx < 0 ? 1 : -1 );
				}
			} );
		}

		function show( index ) {
			current = ( index + visible.length ) % visible.length;
			var tile = visible[ current ];
			image.src = tile.getAttribute( 'href' );
			image.alt = tile.querySelector( 'img' ).alt;
			counter.textContent = ( tile.dataset.title ? tile.dataset.title + '  ·  ' : '' ) + ( current + 1 ) + ' / ' + visible.length;
			box.setAttribute( 'aria-label', tile.getAttribute( 'aria-label' ) || '' );
			tiles.forEach( function ( t ) {
				t.classList.toggle( 'is-open', t === tile );
			} );
			return place( tile );
		}

		function open( index ) {
			if ( ! box ) {
				build();
			}
			opener = document.activeElement;
			document.body.appendChild( box );
			document.documentElement.classList.add( 'otel-lightbox-open' );
			var f = show( index );
			box.querySelector( '.otel-lightbox__close' ).focus( { preventScroll: true } );
			if ( ! reduced ) {
				image.animate( [ { transform: flight( visible[ current ], f ) }, { transform: 'none' } ], { duration: 520, easing: EASE } );
				box.querySelector( '.otel-lightbox__backdrop' ).animate( [ { opacity: 0 }, { opacity: 1 } ], { duration: 360, easing: 'ease' } );
				box.querySelectorAll( '.otel-lightbox__button, .otel-lightbox__counter' ).forEach( function ( el ) {
					el.animate( [ { opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 } ], { duration: 560 } );
				} );
			}
			document.addEventListener( 'keydown', onKey );
			window.addEventListener( 'resize', onResize );
		}

		function finish() {
			if ( current < 0 ) {
				return;
			}
			if ( box && box.parentNode ) {
				box.parentNode.removeChild( box );
			}
			tiles.forEach( function ( t ) {
				t.classList.remove( 'is-open' );
			} );
			document.documentElement.classList.remove( 'otel-lightbox-open' );
			document.removeEventListener( 'keydown', onKey );
			window.removeEventListener( 'resize', onResize );
			var back = visible[ current ] || opener;
			if ( back ) {
				back.focus( { preventScroll: true } );
			}
			current = -1;
		}

		function close() {
			if ( current < 0 ) {
				return;
			}
			var tile = visible[ current ];
			var r = tile.getBoundingClientRect();
			var onScreen = r.bottom > 0 && r.top < window.innerHeight;
			if ( reduced || ! onScreen ) {
				finish();
				return;
			}
			var f = frameFor( tile );
			box.querySelector( '.otel-lightbox__backdrop' ).animate( [ { opacity: 1 }, { opacity: 0 } ], { duration: 300, fill: 'forwards' } );
			box.querySelectorAll( '.otel-lightbox__button, .otel-lightbox__counter' ).forEach( function ( el ) {
				el.animate( [ { opacity: 1 }, { opacity: 0 } ], { duration: 160, fill: 'forwards' } );
			} );
			var done = function () {
				image.getAnimations().forEach( function ( a ) {
					a.cancel();
				} );
				box.getAnimations( { subtree: true } ).forEach( function ( a ) {
					a.cancel();
				} );
				finish();
			};
			image.animate( [ { transform: 'none' }, { transform: flight( tile, f ) } ], { duration: 380, easing: EASE, fill: 'forwards' } ).finished.then( done, done );
			// Sekme arka plandayken animasyonlar durabilir; pencere yine de kapanır.
			setTimeout( done, 600 );
		}

		function step( direction ) {
			if ( current < 0 ) {
				return;
			}
			show( current + direction );
			if ( ! reduced ) {
				image.animate( [ { opacity: 0, transform: 'translateX(' + ( direction * 24 ) + 'px) scale(0.98)' }, { opacity: 1, transform: 'none' } ], { duration: 320, easing: EASE } );
			}
		}

		function onKey( e ) {
			if ( 'Escape' === e.key ) {
				close();
			} else if ( 'ArrowRight' === e.key ) {
				step( 1 );
			} else if ( 'ArrowLeft' === e.key ) {
				step( -1 );
			} else if ( 'Tab' === e.key ) {
				// Odak pencerenin içinde kalır.
				var buttons = box.querySelectorAll( 'button' );
				var first = buttons[ 0 ];
				var last = buttons[ buttons.length - 1 ];
				if ( e.shiftKey && document.activeElement === first ) {
					e.preventDefault();
					last.focus();
				} else if ( ! e.shiftKey && document.activeElement === last ) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		function onResize() {
			if ( current >= 0 ) {
				place( visible[ current ] );
			}
		}

		tiles.forEach( function ( tile ) {
			tile.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				open( visible.indexOf( tile ) );
			} );
		} );

		// Kategori düğmeleri: seçilen kategorinin fotoğrafları yerlerine kayar,
		// yeni gelenler yeniden sırayla belirir.
		var filters = root.previousElementSibling && root.previousElementSibling.classList.contains( 'otel-filters' ) ? root.previousElementSibling : null;
		if ( filters ) {
			filters.addEventListener( 'click', function ( e ) {
				var button = e.target.closest( '.otel-filter' );
				if ( ! button || button.classList.contains( 'is-active' ) ) {
					return;
				}
				var cat = button.dataset.filter;
				filters.querySelectorAll( '.otel-filter' ).forEach( function ( b ) {
					var on = b === button;
					b.classList.toggle( 'is-active', on );
					b.setAttribute( 'aria-pressed', on ? 'true' : 'false' );
				} );
				visible = tiles.filter( function ( tile ) {
					return ! cat || tile.dataset.cat === cat;
				} );
				tiles.forEach( function ( tile, i ) {
					var show = visible.indexOf( tile ) !== -1;
					tile.hidden = ! show;
					if ( show && ! reduced ) {
						tile.classList.remove( 'is-shown' );
					}
				} );
				layout();
				if ( ! reduced ) {
					void root.offsetWidth;
					visible.forEach( function ( tile, i ) {
						tile.style.setProperty( '--delay', Math.min( i, 12 ) * 40 + 'ms' );
						tile.classList.add( 'is-shown' );
					} );
				}
			} );
		}

		// Adres #odalar gibi bir kategoriyle gelirse (sayfa sonundaki şeritten), o kategori seçili açılır.
		if ( filters && window.location.hash ) {
			var wanted = filters.querySelector( '.otel-filter[data-filter="' + window.location.hash.slice( 1 ).replace( /[^a-z0-9-]/gi, '' ) + '"]' );
			if ( wanted ) {
				wanted.click();
			}
		}
	} );
}() );

/**
 * Ana sayfa açılışındaki drone videosu (inc/hero-video.php).
 *
 * Videonun hangi sürümü oynayacağına burada karar verilir: ekran telefon
 * genişliğindeyse (781px ve altı) dikey sürüm, değilse yatay sürüm yüklenir;
 * genişlik bu sınırı geçerse sürüm değişir. Video varken açılış slaytları
 * kendiliğinden geçmez: ana temanın slayt betiği, ziyaretçi slayta dokununca
 * otomatik geçişi bırakır; aynı işaret burada sayfa açılınca verilir.
 * Hareketi azaltmış ziyaretçide video yüklenmez, ilk karesi görünür. Video
 * ekrandan çıkınca ya da sekme gizlenince durur, geri gelince devam eder.
 */
( function () {
	'use strict';

	function start() {
		var video = document.querySelector( '.otel-hero-video' );
		if ( ! video ) {
			return;
		}
		var strip = video.closest( '.montana-carousel' );
		if ( strip ) {
			strip.dispatchEvent( new Event( 'pointerdown' ) );
		}
		if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
			return;
		}

		video.muted = true;
		var narrow = window.matchMedia( '(max-width: 781px)' );
		var current = '';
		var visible = true;

		function play() {
			if ( ! current || ! visible || document.hidden ) {
				return;
			}
			var p = video.play();
			if ( p && p.catch ) {
				p.catch( function () {} );
			}
		}

		function pick() {
			var want = narrow.matches ? video.getAttribute( 'data-mobile' ) : video.getAttribute( 'data-desktop' );
			if ( ! want || want === current ) {
				return;
			}
			current = want;
			video.classList.remove( 'is-playing' );
			video.preload = 'auto';
			video.src = want;
			video.load();
			play();
		}

		video.addEventListener( 'playing', function () {
			video.classList.add( 'is-playing' );
		} );

		if ( narrow.addEventListener ) {
			narrow.addEventListener( 'change', pick );
		} else if ( narrow.addListener ) {
			narrow.addListener( pick );
		}
		var resizing = null;
		window.addEventListener( 'resize', function () {
			window.clearTimeout( resizing );
			resizing = window.setTimeout( pick, 250 );
		} );

		if ( 'IntersectionObserver' in window ) {
			new IntersectionObserver( function ( entries ) {
				visible = entries[ 0 ].isIntersecting;
				if ( visible ) {
					play();
				} else {
					video.pause();
				}
			} ).observe( video );
		}
		document.addEventListener( 'visibilitychange', function () {
			if ( document.hidden ) {
				video.pause();
			} else {
				play();
			}
		} );

		pick();
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', start );
	} else {
		start();
	}
} )();

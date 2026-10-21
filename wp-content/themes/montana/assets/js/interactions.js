/**
 * Montana: scroll reveals, the photograph sliders, the booking form's dates,
 * the video popup and the header that turns black once the page has scrolled.
 *
 * All of them are enhancements. Without this file every section is visible,
 * the slides scroll sideways on their own, the server checks the dates, and
 * the play button is a link to the film, so nothing depends on it running.
 *
 * Reveals are skipped for a visitor who asks the system for reduced motion,
 * and a site owner can switch them off with the
 * `montana_enable_scroll_animations` filter, which sets
 * `window.montanaMotion.enabled` to false.
 */
( function () {
	'use strict';

	var settings = window.montanaMotion || {};
	var reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var motion = settings.enabled !== false && ! reduced && 'IntersectionObserver' in window;

	/*
	 * Only what is below the first screen is ever hidden. Anything a visitor can
	 * already see stays where it is: hiding the opening screen is what makes
	 * PageSpeed report no first contentful paint, and it flashes on load besides.
	 */
	function belowTheFold( el ) {
		return el.getBoundingClientRect().top > window.innerHeight * 0.92;
	}

	function reveals() {
		if ( ! motion ) {
			return;
		}

		var candidates = Array.prototype.slice.call( document.querySelectorAll( [
			'main .montana-section-head',
			'main .wp-block-columns > .wp-block-column',
			'main .wp-block-post-template > .wp-block-post'
		].join( ',' ) ) );

		// Animate the innermost element, so a row of cards arrives one card at a
		// time rather than as one block. Nothing inside a slider: its slides
		// sit side by side off screen and would never be seen to arrive.
		var targets = candidates.filter( function ( el ) {
			return ! el.closest( '.montana-carousel' ) && ! candidates.some( function ( other ) {
				return other !== el && el.contains( other );
			} );
		} ).filter( belowTheFold );

		if ( ! targets.length ) {
			return;
		}

		var rows = new Map();
		targets.forEach( function ( el ) {
			var row = rows.get( el.parentElement ) || [];
			row.push( el );
			rows.set( el.parentElement, row );
		} );
		rows.forEach( function ( row ) {
			row.forEach( function ( el, i ) {
				el.style.setProperty( '--montana-reveal-delay', Math.min( i, 5 ) * 110 + 'ms' );
				el.classList.add( 'montana-reveal' );
			} );
		} );

		document.documentElement.classList.add( 'montana-motion' );

		var observer = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'is-revealed' );
					observer.unobserve( entry.target );
				}
			} );
		}, { rootMargin: '0px 0px -8% 0px' } );

		targets.forEach( function ( el ) {
			observer.observe( el );
		} );
	}

	/*
	 * The photograph sliders: the hero and the about page's wide photographs.
	 * The slides are a horizontal scroll-snap strip already (style.css), so a
	 * finger or a trackpad moves them with or without this. The script adds
	 * the template's round arrows and turns the pages every six seconds --
	 * never for a visitor who asks for reduced motion, never while a pointer or
	 * the keyboard is on the slider, and never again once someone has used an
	 * arrow.
	 */
	function carousels() {
		Array.prototype.forEach.call( document.querySelectorAll( '.montana-carousel' ), function ( strip ) {
			var slides = Array.prototype.filter.call( strip.children, function ( el ) {
				return el.classList.contains( 'montana-slide' );
			} );
			if ( slides.length < 2 ) {
				return;
			}

			var frame = strip.closest( '.montana-carousel-frame' ) || strip.parentElement;
			strip.setAttribute( 'role', 'region' );
			strip.setAttribute( 'aria-roledescription', 'carousel' );
			strip.setAttribute( 'aria-label', settings.sliderLabel || 'Photographs' );

			function current() {
				return Math.max( 0, Math.min( slides.length - 1, Math.round( strip.scrollLeft / Math.max( 1, strip.clientWidth ) ) ) );
			}

			function go( index ) {
				var target = ( index + slides.length ) % slides.length;
				strip.scrollTo( { left: slides[ target ].offsetLeft - strip.offsetLeft, behavior: reduced ? 'auto' : 'smooth' } );
			}

			var stopped = false;
			[ [ 'prev', -1, settings.prevLabel || 'Previous photograph' ], [ 'next', 1, settings.nextLabel || 'Next photograph' ] ].forEach( function ( spec ) {
				var arrow = document.createElement( 'button' );
				arrow.type = 'button';
				arrow.className = 'montana-carousel__arrow montana-carousel__arrow--' + spec[ 0 ];
				arrow.setAttribute( 'aria-label', spec[ 2 ] );
				arrow.addEventListener( 'click', function () {
					stopped = true;
					go( current() + spec[ 1 ] );
				} );
				frame.appendChild( arrow );
			} );

			// Slides out of view are hidden from assistive technology.
			function mark() {
				var index = current();
				slides.forEach( function ( slide, i ) {
					if ( i === index ) {
						slide.removeAttribute( 'aria-hidden' );
					} else {
						slide.setAttribute( 'aria-hidden', 'true' );
					}
				} );
			}

			var pending = null;
			strip.addEventListener( 'scroll', function () {
				window.cancelAnimationFrame( pending );
				pending = window.requestAnimationFrame( mark );
			}, { passive: true } );
			mark();

			if ( ! motion ) {
				return;
			}

			var paused = false;
			frame.addEventListener( 'mouseenter', function () {
				paused = true;
			} );
			frame.addEventListener( 'mouseleave', function () {
				paused = false;
			} );
			frame.addEventListener( 'focusin', function () {
				paused = true;
			} );
			frame.addEventListener( 'focusout', function () {
				paused = false;
			} );
			strip.addEventListener( 'pointerdown', function () {
				stopped = true;
			} );

			window.setInterval( function () {
				if ( ! stopped && ! paused && ! document.hidden ) {
					go( current() + 1 );
				}
			}, 6000 );
		} );
	}

	/*
	 * The booking request's two dates. The browser already refuses a
	 * check-in before today (the `min` attribute); this keeps check-out at
	 * least a night after whatever check-in says. The server checks both again.
	 */
	function bookingDates() {
		Array.prototype.forEach.call( document.querySelectorAll( '.montana-form--booking' ), function ( form ) {
			var checkin = form.querySelector( 'input[name="checkin"]' );
			var checkout = form.querySelector( 'input[name="checkout"]' );
			if ( ! checkin || ! checkout ) {
				return;
			}
			checkin.addEventListener( 'change', function () {
				if ( ! checkin.value ) {
					return;
				}
				var next = new Date( checkin.value + 'T00:00:00Z' );
				next.setUTCDate( next.getUTCDate() + 1 );
				var min = next.toISOString().slice( 0, 10 );
				checkout.min = min;
				if ( checkout.value && checkout.value < min ) {
					checkout.value = min;
				}
			} );
		} );
	}

	function youtubeId( url ) {
		var match = url.match( /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/ );
		return match ? match[ 1 ] : null;
	}

	function video() {
		var links = document.querySelectorAll( '.montana-video a[href]' );
		if ( ! links.length || 'undefined' === typeof window.HTMLDialogElement ) {
			return;
		}

		var dialog = null;
		var frame = null;

		function build() {
			dialog = document.createElement( 'dialog' );
			dialog.className = 'montana-video-dialog';
			dialog.setAttribute( 'aria-label', settings.videoLabel || 'Video' );

			var close = document.createElement( 'button' );
			close.type = 'button';
			close.className = 'montana-video-dialog__close';
			close.setAttribute( 'aria-label', settings.closeLabel || 'Close video' );
			close.textContent = '×';
			close.addEventListener( 'click', function () {
				dialog.close();
			} );

			frame = document.createElement( 'iframe' );
			frame.title = settings.videoLabel || 'Video';
			frame.setAttribute( 'allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen' );
			frame.setAttribute( 'allowfullscreen', '' );

			dialog.appendChild( close );
			dialog.appendChild( frame );

			// A click on the backdrop lands on the dialog itself, never on its contents.
			dialog.addEventListener( 'click', function ( event ) {
				if ( event.target === dialog ) {
					dialog.close();
				}
			} );

			// However it closes — button, backdrop or Escape — the video stops.
			dialog.addEventListener( 'close', function () {
				frame.src = 'about:blank';
			} );

			document.body.appendChild( dialog );
		}

		Array.prototype.forEach.call( links, function ( link ) {
			var id = youtubeId( link.href );
			if ( ! id ) {
				return;
			}
			link.addEventListener( 'click', function ( event ) {
				event.preventDefault();
				if ( ! dialog ) {
					build();
				}
				frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
				dialog.showModal();
			} );
		} );
	}

	/*
	 * The header lies over the first photograph. Past it, the template brings
	 * it back as a black bar fixed to the top; `is-stuck` does that in CSS.
	 */
	function header() {
		var bar = document.querySelector( '.wp-site-blocks > header .montana-header' );
		if ( ! bar ) {
			return;
		}
		var pending = null;
		function update() {
			bar.classList.toggle( 'is-stuck', window.scrollY > 200 );
		}
		window.addEventListener( 'scroll', function () {
			window.cancelAnimationFrame( pending );
			pending = window.requestAnimationFrame( update );
		}, { passive: true } );
		update();
	}

	function init() {
		header();
		reveals();
		carousels();
		bookingDates();
		video();
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );

/**
 * Oda videoları: karttaki görsele tıklanınca video, sayfanın üstünde açılan
 * bir pencerede oynar. Sessiz başlar; sesi oynatıcının düğmesinden açılır.
 * Pencere kapatılınca video durur ve indirilmesi bırakılır.
 */
( function () {
	'use strict';

	var links = document.querySelectorAll( '[data-room-video]' );
	if ( ! links.length || 'undefined' === typeof window.HTMLDialogElement ) {
		return;
	}

	var list = document.querySelector( '.otel-rooms' );
	var closeLabel = ( list && list.dataset.closeLabel ) || 'Close';
	var bookLabel = ( list && list.dataset.bookLabel ) || 'Request a stay';

	var dialog = document.createElement( 'dialog' );
	dialog.className = 'otel-video';
	dialog.innerHTML =
		'<div class="otel-video__frame">' +
			'<video class="otel-video__player" controls playsinline muted preload="none"></video>' +
			'<div class="otel-video__bar">' +
				'<p class="otel-video__title"></p>' +
				'<a class="otel-video__book wp-element-button" href="#"></a>' +
			'</div>' +
		'</div>' +
		'<button type="button" class="otel-video__close"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /></svg></button>';
	document.body.appendChild( dialog );

	var video = dialog.querySelector( 'video' );
	var title = dialog.querySelector( '.otel-video__title' );
	var book = dialog.querySelector( '.otel-video__book' );
	var close = dialog.querySelector( '.otel-video__close' );
	close.setAttribute( 'aria-label', closeLabel );
	book.textContent = bookLabel;

	function open( link ) {
		title.textContent = link.dataset.roomTitle || '';
		dialog.setAttribute( 'aria-label', link.dataset.roomTitle || '' );
		book.href = link.dataset.roomBook || '#';
		video.poster = link.dataset.roomPoster || '';
		video.src = link.dataset.roomVideo;
		video.muted = true;
		dialog.showModal();
		document.documentElement.classList.add( 'otel-video-open' );
		var playing = video.play();
		if ( playing && playing.catch ) {
			playing.catch( function () {} );
		}
	}

	function shut() {
		video.pause();
		video.removeAttribute( 'src' );
		video.load();
		document.documentElement.classList.remove( 'otel-video-open' );
	}

	links.forEach( function ( link ) {
		link.addEventListener( 'click', function ( event ) {
			event.preventDefault();
			open( link );
		} );
	} );

	close.addEventListener( 'click', function () {
		dialog.close();
	} );
	// Videonun dışına (karartılmış alana) tıklamak da kapatır.
	dialog.addEventListener( 'click', function ( event ) {
		if ( event.target === dialog ) {
			dialog.close();
		}
	} );
	dialog.addEventListener( 'close', shut );
}() );

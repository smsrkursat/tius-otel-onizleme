/**
 * Rezervasyon formunun tarih seçicisi.
 *
 * Tarayıcının kendi tarih kutusunun yerine, alanın altında açılan bir takvim
 * koyar (uiarc.dev'deki Date picker bileşeninin davranışı örnek alındı; bu,
 * onun düz JavaScript ile yazılmış karşılığıdır). Asıl <input> formda kalır
 * ve değeri yıl-ay-gün olarak taşımaya devam eder; ana temanın "çıkış, girişten
 * en az bir gece sonra" kuralı da onun `min` niteliği üzerinden çalışır.
 * Betik çalışmazsa tarayıcının kendi tarih kutusu görünür.
 */
( function () {
	'use strict';

	var lang = ( document.documentElement.lang || 'tr' ).toLowerCase();
	var tr = 0 === lang.indexOf( 'tr' );
	var locale = tr ? 'tr-TR' : 'en-GB';
	var text = tr
		? { placeholder: 'Tarih seçin', today: 'Bugün', prev: 'Önceki ay', next: 'Sonraki ay', calendar: 'takvimi', required: 'Lütfen bir tarih seçin.' }
		: { placeholder: 'Select a date', today: 'Today', prev: 'Previous month', next: 'Next month', calendar: 'calendar', required: 'Please select a date.' };
	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	var valueFormat = new Intl.DateTimeFormat( locale, { day: 'numeric', month: 'short', year: 'numeric' } );
	var monthFormat = new Intl.DateTimeFormat( locale, { month: 'long', year: 'numeric' } );
	var dayFormat = new Intl.DateTimeFormat( locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } );
	var weekdayFormat = new Intl.DateTimeFormat( locale, { weekday: 'short' } );

	// Tarihler yerel gün olarak tutulur; saat dilimi kaymasın diye öğlene sabitlenir.
	function parse( iso ) {
		var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec( iso || '' );
		return m ? new Date( +m[ 1 ], +m[ 2 ] - 1, +m[ 3 ], 12 ) : null;
	}

	function iso( date ) {
		return date.getFullYear() + '-' + String( date.getMonth() + 1 ).padStart( 2, '0' ) + '-' + String( date.getDate() ).padStart( 2, '0' );
	}

	function addDays( date, days ) {
		return new Date( date.getFullYear(), date.getMonth(), date.getDate() + days, 12 );
	}

	function addMonths( date, months ) {
		var day = date.getDate();
		var next = new Date( date.getFullYear(), date.getMonth() + months, 1, 12 );
		var last = new Date( next.getFullYear(), next.getMonth() + 1, 0, 12 ).getDate();
		next.setDate( Math.min( day, last ) );
		return next;
	}

	function el( tag, className, content ) {
		var node = document.createElement( tag );
		if ( className ) {
			node.className = className;
		}
		if ( content ) {
			node.textContent = content;
		}
		return node;
	}

	var icons = {
		calendar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>',
		prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>',
		next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>'
	};

	var pickers = [];
	var openPicker = null;
	var uid = 0;

	function create( input ) {
		var form = input.form;
		var field = input.closest( '.montana-field' ) || input.parentNode;
		var label = form ? form.querySelector( 'label[for="' + input.id + '"]' ) : null;
		var labelText = label ? label.textContent.replace( /\*/g, '' ).trim() : '';
		var id = 'otel-date-' + ( ++uid );
		var required = input.required;
		var view = parse( input.value ) || parse( input.min ) || new Date();
		var focused = null;
		var closeTimer = 0;

		var root = el( 'span', 'otel-date' );
		var trigger = el( 'button', 'otel-date__trigger montana-field__control' );
		trigger.type = 'button';
		trigger.id = id;
		trigger.setAttribute( 'aria-haspopup', 'dialog' );
		trigger.setAttribute( 'aria-expanded', 'false' );
		var valueBox = el( 'span', 'otel-date__value' );
		var icon = el( 'span', 'otel-date__icon' );
		icon.innerHTML = icons.calendar;
		trigger.append( valueBox, icon );

		var popover = el( 'div', 'otel-date__popover' );
		popover.setAttribute( 'role', 'dialog' );
		popover.setAttribute( 'aria-label', labelText + ' ' + text.calendar );
		popover.hidden = true;

		var header = el( 'div', 'otel-date__header' );
		var title = el( 'p', 'otel-date__title' );
		title.setAttribute( 'aria-live', 'polite' );
		var todayButton = el( 'button', 'otel-date__today', text.today );
		todayButton.type = 'button';
		var prev = el( 'button', 'otel-date__nav' );
		prev.type = 'button';
		prev.innerHTML = icons.prev;
		prev.setAttribute( 'aria-label', text.prev );
		var next = el( 'button', 'otel-date__nav' );
		next.type = 'button';
		next.innerHTML = icons.next;
		next.setAttribute( 'aria-label', text.next );
		header.append( title, todayButton, prev, next );

		var weekdays = el( 'div', 'otel-date__weekdays' );
		weekdays.setAttribute( 'aria-hidden', 'true' );
		// 5 Ocak 2026 bir pazartesi: hafta pazartesiden başlar.
		for ( var w = 0; w < 7; w++ ) {
			weekdays.appendChild( el( 'span', '', weekdayFormat.format( new Date( 2026, 0, 5 + w, 12 ) ) ) );
		}
		var grid = el( 'div', 'otel-date__grid' );
		grid.setAttribute( 'role', 'grid' );
		popover.append( header, weekdays, grid );

		// Asıl alan formda gizli olarak kalır; boş bırakılmışsa uyarıyı
		// tarayıcı değil bu betik verir, çünkü gizli alana odaklanılamaz.
		input.type = 'hidden';
		input.required = false;
		input.classList.remove( 'montana-field__control' );
		input.before( root );
		root.append( trigger, popover );
		if ( label ) {
			label.htmlFor = id;
		}

		function min() {
			return parse( input.min );
		}

		function disabled( date ) {
			var lower = min();
			return !! lower && iso( date ) < iso( lower );
		}

		// Çıkış takviminde giriş günü ve aradaki geceler işaretlenir.
		function rangeStart() {
			if ( 'checkout' !== input.name || ! form ) {
				return null;
			}
			var other = form.querySelector( 'input[name="checkin"]' );
			return other ? parse( other.value ) : null;
		}

		function sync( direction ) {
			var date = parse( input.value );
			var shown = date ? valueFormat.format( date ) : text.placeholder;
			trigger.classList.toggle( 'is-empty', ! date );
			if ( valueBox.textContent === shown ) {
				return;
			}
			valueBox.textContent = shown;
			trigger.setAttribute( 'aria-label', labelText + ': ' + ( date ? dayFormat.format( date ) : text.placeholder ) );
			if ( direction && ! reduced ) {
				valueBox.classList.remove( 'is-up', 'is-down' );
				void valueBox.offsetWidth;
				valueBox.classList.add( direction > 0 ? 'is-up' : 'is-down' );
			}
		}

		function render() {
			var selected = input.value;
			var today = iso( new Date() );
			var start = rangeStart();
			var startIso = start ? iso( start ) : '';
			var first = new Date( view.getFullYear(), view.getMonth(), 1, 12 );
			var offset = ( first.getDay() + 6 ) % 7;
			var days = new Date( view.getFullYear(), view.getMonth() + 1, 0, 12 ).getDate();
			var lower = min();

			title.textContent = monthFormat.format( first );
			prev.disabled = !! lower && ( first.getFullYear() * 12 + first.getMonth() ) <= ( lower.getFullYear() * 12 + lower.getMonth() );
			todayButton.disabled = disabled( new Date() );

			grid.textContent = '';
			for ( var blank = 0; blank < offset; blank++ ) {
				grid.appendChild( el( 'span', 'otel-date__blank' ) );
			}
			for ( var d = 1; d <= days; d++ ) {
				var date = new Date( view.getFullYear(), view.getMonth(), d, 12 );
				var key = iso( date );
				var button = el( 'button', 'otel-date__day', String( d ) );
				button.type = 'button';
				button.dataset.date = key;
				button.setAttribute( 'aria-label', dayFormat.format( date ) );
				button.tabIndex = -1;
				if ( disabled( date ) ) {
					button.disabled = true;
				}
				if ( key === today ) {
					button.classList.add( 'is-today' );
				}
				if ( key === selected ) {
					button.classList.add( 'is-selected' );
					button.setAttribute( 'aria-pressed', 'true' );
				}
				if ( startIso && key === startIso ) {
					button.classList.add( 'is-range-start' );
				}
				if ( startIso && selected && key > startIso && key < selected ) {
					button.classList.add( 'is-in-range' );
				}
				grid.appendChild( button );
			}

			var target = focused && grid.querySelector( '[data-date="' + iso( focused ) + '"]:not(:disabled)' );
			target = target || grid.querySelector( '.is-selected:not(:disabled)' ) || grid.querySelector( '.is-today:not(:disabled)' ) || grid.querySelector( '.otel-date__day:not(:disabled)' );
			if ( target ) {
				target.tabIndex = 0;
			}
			return target;
		}

		function place() {
			// Takvim alanın sol kenarına yaslanır; sağdan taşacaksa sağ kenara.
			popover.classList.remove( 'is-end' );
			var rect = popover.getBoundingClientRect();
			if ( rect.right > document.documentElement.clientWidth - 8 ) {
				popover.classList.add( 'is-end' );
			}
		}

		function open( focusGrid ) {
			if ( openPicker && openPicker !== api ) {
				openPicker.close( false );
			}
			clearTimeout( closeTimer );
			openPicker = api;
			view = parse( input.value ) || min() || new Date();
			var lower = min();
			if ( lower && iso( view ) < iso( lower ) ) {
				view = lower;
			}
			focused = view;
			popover.hidden = false;
			trigger.setAttribute( 'aria-expanded', 'true' );
			trigger.classList.remove( 'is-invalid' );
			var target = render();
			place();
			if ( ! reduced ) {
				popover.classList.remove( 'is-open' );
				void popover.offsetWidth;
			}
			popover.classList.add( 'is-open' );
			if ( false !== focusGrid && target ) {
				target.focus( { preventScroll: true } );
			}
		}

		function close( returnFocus ) {
			if ( popover.hidden ) {
				return;
			}
			var inside = popover.contains( document.activeElement );
			popover.hidden = true;
			popover.classList.remove( 'is-open' );
			trigger.setAttribute( 'aria-expanded', 'false' );
			if ( openPicker === api ) {
				openPicker = null;
			}
			if ( false !== returnFocus && inside ) {
				trigger.focus( { preventScroll: true } );
			}
		}

		function pick( date ) {
			if ( disabled( date ) ) {
				return;
			}
			var before = parse( input.value );
			input.value = iso( date );
			focused = date;
			sync( ! before ? 1 : ( date > before ? 1 : -1 ) );
			render();
			// Ana temanın çıkış tarihini ileri alan kuralı bu olayı dinler;
			// o kural kardeş alanı sessizce değiştirdiği için hepsi yeniden okunur.
			input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
			pickers.forEach( function ( other ) {
				if ( other !== api ) {
					other.sync();
				}
			} );

			var follow = 'checkin' === input.name && form ? pickers.filter( function ( other ) {
				return other.form === form && 'checkout' === other.name;
			} )[ 0 ] : null;
			var finish = function () {
				close( ! follow );
				// Giriş seçilince sıradaki adım çıkış: takvimi kendiliğinden açılır.
				if ( follow ) {
					follow.open();
				}
			};
			clearTimeout( closeTimer );
			if ( reduced ) {
				finish();
			} else {
				closeTimer = setTimeout( finish, 240 );
			}
		}

		function move( date ) {
			var lower = min();
			if ( lower && iso( date ) < iso( lower ) ) {
				date = lower;
			}
			focused = date;
			view = date;
			var target = render();
			if ( target ) {
				target.focus( { preventScroll: true } );
			}
		}

		trigger.addEventListener( 'click', function () {
			if ( popover.hidden ) {
				open();
			} else {
				close();
			}
		} );
		trigger.addEventListener( 'keydown', function ( event ) {
			if ( 'ArrowDown' === event.key && popover.hidden ) {
				event.preventDefault();
				open();
			}
		} );
		prev.addEventListener( 'click', function () {
			view = addMonths( new Date( view.getFullYear(), view.getMonth(), 1, 12 ), -1 );
			focused = null;
			render();
		} );
		next.addEventListener( 'click', function () {
			view = addMonths( new Date( view.getFullYear(), view.getMonth(), 1, 12 ), 1 );
			focused = null;
			render();
		} );
		todayButton.addEventListener( 'click', function () {
			pick( new Date( new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12 ) );
		} );
		grid.addEventListener( 'click', function ( event ) {
			var button = event.target.closest( '.otel-date__day' );
			if ( button && ! button.disabled ) {
				pick( parse( button.dataset.date ) );
			}
		} );
		grid.addEventListener( 'keydown', function ( event ) {
			var button = event.target.closest( '.otel-date__day' );
			if ( ! button ) {
				return;
			}
			var date = parse( button.dataset.date );
			var steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
			if ( steps[ event.key ] ) {
				event.preventDefault();
				move( addDays( date, steps[ event.key ] ) );
			} else if ( 'Home' === event.key ) {
				event.preventDefault();
				move( addDays( date, -( ( date.getDay() + 6 ) % 7 ) ) );
			} else if ( 'End' === event.key ) {
				event.preventDefault();
				move( addDays( date, 6 - ( ( date.getDay() + 6 ) % 7 ) ) );
			} else if ( 'PageUp' === event.key ) {
				event.preventDefault();
				move( addMonths( date, -1 ) );
			} else if ( 'PageDown' === event.key ) {
				event.preventDefault();
				move( addMonths( date, 1 ) );
			}
		} );
		popover.addEventListener( 'keydown', function ( event ) {
			if ( 'Escape' === event.key ) {
				event.preventDefault();
				event.stopPropagation();
				close();
			}
		} );
		root.addEventListener( 'focusout', function ( event ) {
			// Sekmeyle dışarı çıkınca kapanır.
			if ( event.relatedTarget && ! root.contains( event.relatedTarget ) ) {
				close( false );
			}
		} );

		var api = {
			form: form,
			name: input.name,
			root: root,
			open: open,
			close: close,
			sync: function () {
				sync( 0 );
				if ( ! popover.hidden ) {
					render();
				}
			},
			validate: function () {
				if ( ! required || input.value ) {
					return true;
				}
				trigger.classList.add( 'is-invalid' );
				trigger.setAttribute( 'aria-invalid', 'true' );
				return false;
			}
		};
		sync( 0 );
		pickers.push( api );
		return api;
	}

	// Bir odanın "Rezervasyon talebi" bağlantısı adrese ?oda=kısa-ad ekler;
	// formun oda listesinde o oda seçili gelir.
	var room = new URLSearchParams( window.location.search ).get( 'oda' );
	if ( room ) {
		document.querySelectorAll( '.montana-form--booking select[name="room"]' ).forEach( function ( select ) {
			if ( select.querySelector( 'option[value="' + room.replace( /[^a-z0-9-]/gi, '' ) + '"]' ) ) {
				select.value = room;
			}
		} );
	}

	document.querySelectorAll( '.montana-form--booking input[type="date"]' ).forEach( create );
	if ( ! pickers.length ) {
		return;
	}

	// Dışarı dokunmak açık takvimi kapatır.
	document.addEventListener( 'pointerdown', function ( event ) {
		if ( openPicker && ! openPicker.root.contains( event.target ) ) {
			openPicker.close( false );
		}
	} );

	// Zorunlu tarih boşsa form gönderilmez; ilk boş alanın takvimi açılır.
	document.querySelectorAll( '.montana-form--booking' ).forEach( function ( form ) {
		form.addEventListener( 'submit', function ( event ) {
			var missing = pickers.filter( function ( picker ) {
				return picker.form === form && ! picker.validate();
			} );
			if ( missing.length ) {
				event.preventDefault();
				missing[ 0 ].root.scrollIntoView( { block: 'center', behavior: reduced ? 'auto' : 'smooth' } );
				missing[ 0 ].open();
			}
		} );
	} );
}() );

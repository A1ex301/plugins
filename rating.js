(function () {
    'use strict';

    function RTRatings() {}

    RTRatings.prototype.start = function () {
        // Добавляем иконку томата к карточкам фильмов
        Lampa.Template.add('rt_icon_style', "<style>.icon--rt-rating{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiw0IEM3LjU4LDQgNCw3LjU4IDQsMTIgQzQsMTYuNDIgNy41OCwyMCAxMiwyMCBDMTYuNDIsMjAgMjAsMTYuNDIgMjAsMTIgQzIwLDcuNTggMTYuNDIsNCAxMiw0IFogTTEyLDE4IEM4LjY5LDE4IDYsMTUuMzEgNiwxMiBDNiw4LjY5IDguNjksNiAxMiw2IEMxNS4zMSw2IDE4LDguNjkgMTgsMTIgQzE4LDE1LjMxIDE1LjMxLDE4IDEyLDE4IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOSBMOC41LDEyIEwxMCwxNSBMMTQsMTUgTDE1LjUsMTIgTDE0LDkgWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==);background-position:50% 50%;background-repeat:no-repeat;background-size:70%;border-radius:.3em;backdrop-filter:blur(.5em);-webkit-backdrop-filter:blur(.5em);color:hsla(0,0%,100%,.875);display:inline-flex;align-items:center;justify-content:center;background-color:hsla(0,0%,32.2%,.5);position:absolute;right:.3em;bottom:.3em;width:1.8em;height:1.8em;margin-left:.5em}</style>");
        $('body').append(Lampa.Template.get('rt_icon_style', {}, true));

        // Слушаем события карточек
        Lampa.Listener.follow('card', function(e) {
            var card = e.card;
            var cardEl = e.element;

            if (!cardEl) return;

            var categoryEl = cardEl.find('.card--category');
            if (!categoryEl.length) return;

            // Добавляем иконку рейтинга
            categoryEl.append('<div class="card__icon icon--rt-rating"></div>');
        });

        // Добавляем кнопку RT в полное описание фильма
        Lampa.Listener.follow('full', function(e) {
            var card = e.card;
            var button = $('<div class="full-start__button selector">RT</div>');
            
            $('.full-start__buttons .full-start__button', Lampa.Activity.active().activity.render()).last().after(button);
            
            button.on('click', function() {
                // Получаем данные о фильме с OMDB
                var title = card.title || card.name;
                var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&apikey=e0a2c76f';
                
                // Показываем нотификацию о загрузке
                Lampa.Noty.show('Loading RT ratings...');
                
                $.ajax({
                    url: url,
                    dataType: 'json',
                    success: function(data) {
                        var rtRating = '';
                        
                        if (data.Ratings) {
                            for (var i = 0; i < data.Ratings.length; i++) {
                                if (data.Ratings[i].Source === 'Rotten Tomatoes') {
                                    rtRating = data.Ratings[i].Value;
                                    break;
                                }
                            }
                        }
                        
                        var message = rtRating ? 'Rotten Tomatoes: ' + rtRating : 'No RT rating found';
                        Lampa.Noty.show(message);
                    },
                    error: function() {
                        Lampa.Noty.show('Error loading RT ratings');
                    }
                });
            });
        });
    };

    var rtRatings = new RTRatings();
    Lampa.Plugins.add('rt_ratings', rtRatings);

    if (window.lampa_settings) {
        window.lampa_settings.plugins_add({
            id: 'rt_ratings',
            title: 'Rotten Tomatoes',
            subtitle: 'Show RT ratings',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#fa320a"/><path d="M12,4 C7.58,4 4,7.58 4,12 C4,16.42 7.58,20 12,20 C16.42,20 20,16.42 20,12 C20,7.58 16.42,4 12,4 Z M12,18 C8.69,18 6,15.31 6,12 C6,8.69 8.69,6 12,6 C15.31,6 18,8.69 18,12 C18,15.31 15.31,18 12,18 Z" fill="#ffffff"/><path d="M10,9 L8.5,12 L10,15 L14,15 L15.5,12 L14,9 Z" fill="#ffffff"/></svg>',
            visible: true
        });
    }
})();

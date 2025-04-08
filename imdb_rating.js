
(function() {
    'use strict';

    function addRatings(card) {
        var network = new Lampa.Reguest();
        var clean_title = card.title || card.name;
        var search_date = card.release_date || card.first_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));

        var params = {
            url: 'https://www.omdbapi.com/',
            api_key: 'e0a2c76f', // Replace with your API key
            cache_time: 60 * 60 * 24 * 1000 // 24 hours cache
        };

        if ($('.card-rating', card.element).length) return;

        var cache = _getCache(card.id);
        if (cache) {
            _showRating(cache);
        } else {
            network.silent(params.url + '?t=' + encodeURIComponent(clean_title) + '&y=' + search_year + '&apikey=' + params.api_key, function(json) {
                if (json && json.Response === 'True' && json.imdbRating && json.imdbRating !== 'N/A') {
                    var data = {
                        imdb: json.imdbRating,
                        tmdb: card.vote_average ? parseFloat(card.vote_average).toFixed(1) : '',
                        timestamp: new Date().getTime()
                    };
                    _setCache(card.id, data);
                    _showRating(data);
                }
            }, function() {});
        }

        function _showRating(data) {
            var div = $('<div class="card-rating"></div>');
            if (data.imdb) {
                div.append('<div class="rating-item imdb"><div class="rating-value">' + data.imdb + '</div><div class="rating-label">IMDB</div></div>');
            }
            if (data.tmdb) {
                div.append('<div class="rating-item tmdb"><div class="rating-value">' + data.tmdb + '</div><div class="rating-label">TMDB</div></div>');
            }
            card.element.find('.card__view').append(div);
        }

        function _getCache(id) {
            var cache = Lampa.Storage.cache('imdb_rating', 500, {});
            var timestamp = new Date().getTime();
            
            if (cache[id]) {
                if ((timestamp - cache[id].timestamp) > params.cache_time) {
                    delete cache[id];
                    Lampa.Storage.set('imdb_rating', cache);
                    return false;
                }
                return cache[id];
            }
            return false;
        }

        function _setCache(id, data) {
            var cache = Lampa.Storage.cache('imdb_rating', 500, {});
            cache[id] = data;
            Lampa.Storage.set('imdb_rating', cache);
            return data;
        }
    }

    function startPlugin() {
        var plugins = window.lampa_settings.plugins;
        
        if (!plugins) {
            plugins = [];
            window.lampa_settings.plugins = plugins;
        }

        plugins.push({
            name: 'IMDB Ratings',
            version: '1.0.0',
            description: 'Display IMDB and TMDB ratings on movie cards',
            status: true
        });

        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                var items = e.object.activity.render().find('.items-line > div');
                if (items.length) {
                    items.each(function() {
                        var card = $(this)[0].card;
                        if (card && card.id) addRatings(card);
                    });
                }
            }
        });

        // Show notification on successful load
        Lampa.Noty.show('IMDB Ratings plugin activated');
    }

    var style = document.createElement('style');
    style.textContent = `
        .card-rating {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.75);
            padding: 8px;
            display: flex;
            justify-content: center;
            gap: 16px;
            z-index: 2;
        }
        .rating-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
        }
        .rating-value {
            font-size: 16px;
            font-weight: 600;
            line-height: 1;
        }
        .rating-label {
            font-size: 12px;
            opacity: 0.7;
            margin-top: 2px;
        }
        .imdb .rating-label {
            color: #f5c518;
        }
        .tmdb .rating-label {
            color: #01b4e4;
        }
    `;
    document.head.appendChild(style);

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }
})();

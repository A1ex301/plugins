(function () {
    'use strict';

    function imdb_rating(card) {
        var network = new Lampa.Reguest();
        var clean_title = cleanTitle(card.title);
        var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
        var search_year = parseInt((search_date + '').slice(0, 4));
        var orig = card.original_title || card.original_name;

        var params = {
            id: card.id,
            cache_time: 60 * 60 * 24 * 1000 // 1 день в миллисекундах
        };

        getRating();

        function getRating() {
            var movieRating = _getCache(params.id);
            if (movieRating) {
                return _showRating(movieRating[params.id]);
            } else {
                if (card.imdb_id) {
                    // Если у нас есть IMDb ID, просто сохраняем рейтинг
                    saveRating();
                } else {
                    // Иначе, пробуем найти рейтинг IMDb по API OMDb
                    searchFilm();
                }
            }
        }

        function searchFilm() {
            var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(clean_title) + '&y=' + search_year + '&apikey=e0a2c76f';
            
            network.clear();
            network.timeout(15000);
            network.silent(url, function (json) {
                if (json && json.Response === 'True' && json.imdbRating) {
                    saveRating(parseFloat(json.imdbRating));
                } else {
                    saveRating(0);
                }
            }, function (a, c) {
                saveRating(0);
            });
        }

        function saveRating(imdbRating) {
            var movieRating = _setCache(params.id, {
                imdb: imdbRating || 0,
                timestamp: new Date().getTime()
            });
            return _showRating(movieRating);
        }

        function cleanTitle(str) {
            return (str || '').replace(/[\s.,:;''`!?]+/g, ' ').trim();
        }

        function _getCache(movie) {
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache('imdb_rating', 500, {}); // лимит 500 ключей
            if (cache[movie]) {
                if ((timestamp - cache[movie].timestamp) > params.cache_time) {
                    // Если кеш истёк, чистим его
                    delete cache[movie];
                    Lampa.Storage.set('imdb_rating', cache);
                    return false;
                }
            } else return false;
            return cache;
        }

        function _setCache(movie, data) {
            var timestamp = new Date().getTime();
            var cache = Lampa.Storage.cache('imdb_rating', 500, {}); // лимит 500 ключей
            if (!cache[movie]) {
                cache[movie] = data;
                Lampa.Storage.set('imdb_rating', cache);
            } else {
                if ((timestamp - cache[movie].timestamp) > params.cache_time) {
                    data.timestamp = timestamp;
                    cache[movie] = data;
                    Lampa.Storage.set('imdb_rating', cache);
                } else data = cache[movie];
            }
            return data;
        }

        function _showRating(data) {
            if (data) {
                var imdb_rating = !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : '0.0';
                var render = Lampa.Activity.active().activity.render();
                $('.wait_rating', render).remove();
                $('.rate--imdb', render).removeClass('hide').find('> div').eq(0).text(imdb_rating);
                // Скрываем оценку Кинопоиска
                $('.rate--kp', render).addClass('hide');
            }
        }
    }

    function startPlugin() {
        window.rating_plugin = true;
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                if ($('.rate--imdb', render).hasClass('hide') && !$('.wait_rating', render).length) {
                    $('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
                    imdb_rating(e.data.movie);
                }
            }
        });
    }

    if (!window.rating_plugin) startPlugin();
})();

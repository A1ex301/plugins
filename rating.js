(function () {
'use strict';

function rating_rt(card) {
    var network = new Lampa.Reguest();
    var clean_title = cleanTitle(card.title);
    var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
    var search_year = parseInt((search_date + '').slice(0, 4));
    var orig = card.original_title || card.original_name;
    
    var params = {
        id: card.id,
        cache_time: 60 * 60 * 24 * 1000, // 1 день
        api_key: 'e0a2c76f'
    };
    
    getRating();

    function getRating() {
        var movieRating = _getCache(params.id);
        if (movieRating) {
            return _showRating(movieRating[params.id]);
        } else {
            if (card.imdb_id) {
                // Если у нас есть IMDb ID, используем его
                var url = 'https://www.omdbapi.com/?i=' + card.imdb_id + '&apikey=' + params.api_key;
                getData(url);
            } else {
                // Иначе, ищем по названию
                var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(clean_title) + '&y=' + search_year + '&apikey=' + params.api_key;
                getData(url);
            }
        }
    }
    
    function getData(url) {
        network.clear();
        network.timeout(15000);
        network.silent(url, function (json) {
            if (json && json.Response === 'True') {
                var imdbRating = json.imdbRating ? parseFloat(json.imdbRating) : 0;
                var rtRating = 0;
                
                // Ищем рейтинг Rotten Tomatoes
                if (json.Ratings && json.Ratings.length > 0) {
                    for (var i = 0; i < json.Ratings.length; i++) {
                        if (json.Ratings[i].Source === 'Rotten Tomatoes') {
                            // Извлекаем только числа из строки типа "75%"
                            var rtStr = json.Ratings[i].Value || '0%';
                            rtRating = parseInt(rtStr.replace(/[^0-9]/g, '')) || 0;
                            break;
                        }
                    }
                }
                
                saveRating(imdbRating, rtRating);
            } else {
                saveRating(0, 0);
            }
        }, function (a, c) {
            saveRating(0, 0);
        });
    }

    function saveRating(imdbRating, rtRating) {
        var movieRating = _setCache(params.id, {
            imdb: imdbRating || 0,
            rt: rtRating || 0,
            timestamp: new Date().getTime()
        });
        return _showRating(movieRating);
    }

    function cleanTitle(str) {
        return (str || '').replace(/[\s.,:;''`!?]+/g, ' ').trim();
    }

    function _getCache(movie) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache('rt_rating', 500, {}); // лимит 500 ключей
        if (cache[movie]) {
            if ((timestamp - cache[movie].timestamp) > params.cache_time) {
                delete cache[movie];
                Lampa.Storage.set('rt_rating', cache);
                return false;
            }
        } else return false;
        return cache;
    }

    function _setCache(movie, data) {
        var timestamp = new Date().getTime();
        var cache = Lampa.Storage.cache('rt_rating', 500, {}); // лимит 500 ключей
        if (!cache[movie]) {
            cache[movie] = data;
            Lampa.Storage.set('rt_rating', cache);
        } else {
            if ((timestamp - cache[movie].timestamp) > params.cache_time) {
                data.timestamp = timestamp;
                cache[movie] = data;
                Lampa.Storage.set('rt_rating', cache);
            } else data = cache[movie];
        }
        return data;
    }

    function _showRating(data) {
        if (data) {
            var imdb_rating = !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : '0.0';
            var rt_rating = !isNaN(data.rt) && data.rt !== null ? data.rt + '%' : '0%';
            
            var render = Lampa.Activity.active().activity.render();
            $('.wait_rating', render).remove();
            
            // Показываем IMDb рейтинг
            $('.rate--imdb', render).removeClass('hide').find('> div').eq(0).text(imdb_rating);
            
            // Заменяем KP рейтинг на Rotten Tomatoes
            var $kp = $('.rate--kp', render).removeClass('hide');
            $kp.find('>div').eq(0).text(rt_rating);
            
            // Пробуем использовать локальную иконку или запасную из GitHub
            var baseUrl = window.location.origin;
            var iconUrl = baseUrl + '/tomato_icon.svg';
            
            // Проверяем доступность иконки
            var img = new Image();
            img.onload = function() {
                $kp.find('img').attr('src', iconUrl);
            };
            img.onerror = function() {
                // Запасной вариант если локальная иконка недоступна
                $kp.find('img').attr('src', 'https://raw.githubusercontent.com/nb557/plugins/main/rating_icons/rt.png');
            };
            img.src = iconUrl;
        }
    }
}

function startPlugin() {
    window.rt_rating_plugin = true;
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            var render = e.object.activity.render();
            if ($('.rate--kp', render).hasClass('hide') && !$('.wait_rating', render).length) {
                $('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
                rating_rt(e.data.movie);
            }
        }
    });
}

if (!window.rt_rating_plugin) startPlugin();
})();

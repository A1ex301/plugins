(function () {
    'use strict';

    function RTRatings() {}

    var params = {
        cache_time: 60 * 60 * 24 * 1000, // 1 день в мс
        api_key: 'e0a2c76f'
    };

    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            var render = e.object.activity.render();
            var movie = e.data.movie;
            
            // Изначально меняем KP на RT
            $('.rate--kp', render).find('.rate__type').text('RT');
            
            // Если рейтинги скрыты, показываем анимацию загрузки и запрашиваем данные
            if ($('.rate--kp', render).hasClass('hide') && !$('.wait_rating', render).length) {
                $('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
                
                // Проверяем кеш
                var cache = getCache(movie.id);
                if (cache) {
                    showRatings(cache, render);
                } else {
                    // Поиск по IMDb ID
                    if (movie.imdb_id) {
                        var url = 'https://www.omdbapi.com/?i=' + movie.imdb_id + '&apikey=' + params.api_key;
                        getData(url, movie.id, render);
                    } else {
                        // Поиск по названию и году
                        var title = movie.original_title || movie.original_name || movie.title || '';
                        var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
                        
                        title = cleanTitle(title);
                        var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + (year ? '&y=' + year : '') + '&apikey=' + params.api_key;
                        
                        getData(url, movie.id, render);
                    }
                }
            }
        }
    });
    
    function getData(url, movie_id, render) {
        var network = new Lampa.Reguest();
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
                            var rtStr = json.Ratings[i].Value || '0%';
                            rtRating = parseInt(rtStr.replace(/[^0-9]/g, '')) || 0;
                            break;
                        }
                    }
                }
                
                var data = {
                    imdb: imdbRating,
                    rt: rtRating,
                    timestamp: new Date().getTime()
                };
                
                setCache(movie_id, data);
                showRatings(data, render);
            } else {
                // Если не нашли, пробуем поиск без года
                if (url.indexOf('&y=') > -1) {
                    var url_no_year = url.replace(/&y=\d+/, '');
                    getData(url_no_year, movie_id, render);
                } else {
                    // Если все методы не сработали, показываем стандартные рейтинги
                    $('.wait_rating', render).remove();
                    $('.rate--imdb', render).removeClass('hide');
                    $('.rate--kp', render).addClass('hide');
                }
            }
        }, function (a, c) {
            // В случае ошибки
            $('.wait_rating', render).remove();
            $('.rate--imdb', render).removeClass('hide');
            $('.rate--kp', render).addClass('hide');
        });
    }
    
    function showRatings(data, render) {
        $('.wait_rating', render).remove();
        
        // IMDb рейтинг
        var imdb_rating = !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : '0.0';
        $('.rate--imdb', render).removeClass('hide').find('> div').eq(0).text(imdb_rating);
        
        // RT рейтинг вместо KP
        if (data.rt && data.rt > 0) {
            var $kp = $('.rate--kp', render).removeClass('hide');
            $kp.find('> div').eq(0).text(data.rt + '%');
            $kp.find('.rate__type').text('RT');
            
            // Устанавливаем иконку помидора
            var baseUrl = window.location.origin;
            var iconUrl = baseUrl + '/tomato_icon.svg';
            
            var img = new Image();
            img.onload = function() {
                $kp.find('img').attr('src', iconUrl);
            };
            img.onerror = function() {
                // Резервная иконка
                $kp.find('img').attr('src', 'https://raw.githubusercontent.com/nb557/plugins/main/rating_icons/rt.png');
            };
            img.src = iconUrl;
        } else {
            $('.rate--kp', render).addClass('hide');
        }
    }
    
    // Очистка названия фильма
    function cleanTitle(title) {
        if (!title) return '';
        title = title.toLowerCase();
        // Удаляем год в скобках
        title = title.replace(/\(\d{4}\)/, '');
        // Удаляем слова "фильм" и т.п.
        title = title.replace(/\b(film|фильм|movie|series|сериал)\b/gi, '');
        // Удаляем специальные символы
        title = title.replace(/[\s.,:;''`~!@#$%^&*()_+=\[\]{}<>\/\\|?-]+/g, ' ');
        // Удаляем двойные пробелы
        return title.replace(/\s+/g, ' ').trim();
    }
    
    // Работа с кешем
    function getCache(movie_id) {
        var cache = Lampa.Storage.cache('rt_rating_data', 500, {});
        var timestamp = new Date().getTime();
        
        if (cache[movie_id]) {
            if ((timestamp - cache[movie_id].timestamp) < params.cache_time) {
                return cache[movie_id];
            } else {
                delete cache[movie_id];
                Lampa.Storage.set('rt_rating_data', cache);
            }
        }
        return false;
    }
    
    function setCache(movie_id, data) {
        var cache = Lampa.Storage.cache('rt_rating_data', 500, {});
        cache[movie_id] = data;
        Lampa.Storage.set('rt_rating_data', cache);
        return data;
    }

    window.rating_rt_tomato = true;
})();

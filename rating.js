(function () {
'use strict';

function RTPlugin(object) {
    var plugin = this;
    this.object = object;
    
    // Стили для оформления рейтинга
    var customCSS = `
        .rotten-tomato {
            background-color: #FA320A;
            color: white;
            border-radius: 3px;
            padding: 0px 4px;
        }
        .rt-icon {
            height: 18px;
            width: 18px;
            vertical-align: middle;
            margin-right: 5px;
            margin-left: -1px;
        }
    `;
    
    // Добавляем стили на страницу
    $('head').append('<style>' + customCSS + '</style>');
    
    // Настройки плагина
    this.params = {
        cache_time: 60 * 60 * 24 * 1000, // 1 день в мс
        api_key: 'e0a2c76f'
    };
    
    // Подключаемся к событию показа карточки фильма
    this.start = function () {
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                var movie = e.data.movie;
                
                // Если рейтинги скрыты, показываем анимацию загрузки
                if ($('.rate--kp', render).hasClass('hide') && !$('.rt_rating_load', render).length) {
                    $('.info__rate', render).after('<div class="rt_rating_load" style="width:2em;margin-top:1em;margin-right:1em"><div class="broadcast__scan"><div></div></div><div>');
                    plugin.getRatings(movie, render);
                }
                
                // Заменяем все надписи KP на RT
                setTimeout(function() {
                    $('.rate--kp', render).find('.rate__type').text('RT');
                }, 100);
            }
        });
    };
    
    // Получение рейтингов
    this.getRatings = function (movie, render) {
        var network = new Lampa.Reguest();
        var cache = this.getCache(movie.id);
        
        if (cache) {
            this.showRatings(cache, render);
        } else {
            var searchByImdbId = function() {
                if (movie.imdb_id) {
                    var url = 'https://www.omdbapi.com/?i=' + movie.imdb_id + '&apikey=' + plugin.params.api_key;
                    network.silent(url, function (json) {
                        if (json && json.Response === 'True') {
                            plugin.saveAndShowRatings(json, movie.id, render);
                        } else {
                            searchByTitle();
                        }
                    }, function() {
                        searchByTitle();
                    });
                } else {
                    searchByTitle();
                }
            };
            
            var searchByTitle = function() {
                var title = movie.original_title || movie.original_name || movie.title || '';
                var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
                title = plugin.cleanTitle(title);
                
                var url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + (year ? '&y=' + year : '') + '&apikey=' + plugin.params.api_key;
                
                network.silent(url, function (json) {
                    if (json && json.Response === 'True') {
                        plugin.saveAndShowRatings(json, movie.id, render);
                    } else {
                        // Пробуем второй поиск без года
                        var url2 = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&apikey=' + plugin.params.api_key;
                        network.silent(url2, function (json2) {
                            if (json2 && json2.Response === 'True') {
                                plugin.saveAndShowRatings(json2, movie.id, render);
                            } else {
                                plugin.setDefaultRatings(render);
                            }
                        }, function() {
                            plugin.setDefaultRatings(render);
                        });
                    }
                }, function() {
                    plugin.setDefaultRatings(render);
                });
            };
            
            searchByImdbId();
        }
    };
    
    // Отображение рейтингов по умолчанию (если не найдены)
    this.setDefaultRatings = function(render) {
        $('.rt_rating_load', render).remove();
        $('.rate--imdb', render).removeClass('hide');
        $('.rate--kp', render).addClass('hide');
    };
    
    // Сохранение и отображение рейтингов
    this.saveAndShowRatings = function(json, movie_id, render) {
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
        
        this.setCache(movie_id, data);
        this.showRatings(data, render);
    };
    
    // Отображение рейтингов
    this.showRatings = function(data, render) {
        $('.rt_rating_load', render).remove();
        
        // IMDb рейтинг
        var imdb_rating = !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : '0.0';
        $('.rate--imdb', render).removeClass('hide').find('> div').eq(0).text(imdb_rating);
        
        // RT рейтинг
        if (data.rt && data.rt > 0) {
            var $kp = $('.rate--kp', render).removeClass('hide');
            $kp.find('> div').eq(0).text(data.rt + '%');
            $kp.find('.rate__type').text('RT');
            
            // Устанавливаем иконку
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
    };
    
    // Работа с кешем
    this.getCache = function(movie_id) {
        var cache = Lampa.Storage.cache('rt_rating_data', 500, {});
        var timestamp = new Date().getTime();
        
        if (cache[movie_id]) {
            if ((timestamp - cache[movie_id].timestamp) < this.params.cache_time) {
                return cache[movie_id];
            } else {
                delete cache[movie_id];
                Lampa.Storage.set('rt_rating_data', cache);
            }
        }
        return false;
    };
    
    this.setCache = function(movie_id, data) {
        var cache = Lampa.Storage.cache('rt_rating_data', 500, {});
        cache[movie_id] = data;
        Lampa.Storage.set('rt_rating_data', cache);
        return data;
    };
    
    // Очистка названия фильма
    this.cleanTitle = function(title) {
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
    };
}

var rt_plugin = new RTPlugin({});
Lampa.Plugins.add('rt_rating', rt_plugin);

})();

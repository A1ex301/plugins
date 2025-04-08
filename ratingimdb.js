(function () {
	'use strict';

	function rating_imdb(card) {
		var network = new Lampa.Reguest();
		var clean_title = kpCleanTitle(card.title);
		var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
		var search_year = parseInt((search_date + '').slice(0, 4));
		var orig = card.original_title || card.original_name;
		var imdb_prox = 'https://www.omdbapi.com/';
		var params = {
			id: card.id,
			url: imdb_prox,
			headers: {
				'X-API-KEY': 'e0a2c76f' // Замініть на ваш ключ API OMDb
			},
			cache_time: 60 * 60 * 24 * 1000 //86400000 сек = 1 день Время кэша в секундах
		};
		getRating();

		function getRating() {
			var movieRating = _getCache(params.id);
			if (movieRating) {
				return _showRating(movieRating[params.id]);
			} else {
				searchFilm();
			}
		}

		function searchFilm() {
			var url = Lampa.Utils.addUrlComponent(params.url, 't=' + encodeURIComponent(clean_title) + '&apikey=' + params.headers['X-API-KEY']);
			network.clear();
			network.timeout(15000);
			network.silent(url, function (json) {
				if (json.Response === "True") {
					_setCache(params.id, {
						imdb: json.imdbRating,
						timestamp: new Date().getTime()
					}); // Кешуємо рейтинг IMDb
					return _showRating({ imdb: json.imdbRating });
				} else {
					showError('Не вдалося знайти фільм на OMDb API');
				}
			}, function (a, c) {
				showError(network.errorDecode(a, c));
			}, false);
		}

		function _showRating(data) {
			if (data) {
				var imdb_rating = !isNaN(data.imdb) && data.imdb !== null ? parseFloat(data.imdb).toFixed(1) : '0.0';
				var render = Lampa.Activity.active().activity.render();
				$('.wait_rating', render).remove();
				$('.rate--imdb', render).removeClass('hide').find('> div').eq(0).text(imdb_rating);
			}
		}

		function _getCache(movie) {
			var timestamp = new Date().getTime();
			var cache = Lampa.Storage.cache('imdb_rating', 500, {}); //500 це ліміт ключів
			if (cache[movie]) {
				if ((timestamp - cache[movie].timestamp) > params.cache_time) {
					// Якщо кеш вийшов, чистимо його
					delete cache[movie];
					Lampa.Storage.set('imdb_rating', cache);
					return false;
				}
			} else return false;
			return cache;
		}

		function _setCache(movie, data) {
			var timestamp = new Date().getTime();
			var cache = Lampa.Storage.cache('imdb_rating', 500, {}); //500 це ліміт ключів
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

		function showError(error) {
			Lampa.Noty.show('Рейтинг IMDb: ' + error);
		}

		function kpCleanTitle(str) {
			return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
		}
	}

	function startPlugin() {
		window.rating_plugin = true;
		Lampa.Listener.follow('full', function (e) {
			if (e.type == 'complite') {
				var render = e.object.activity.render();
				if ($('.rate--imdb', render).hasClass('hide') && !$('.wait_rating', render).length) {
					$('.info__rate', render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div><div>');
					rating_imdb(e.data.movie);
				}
			}
		});
	}

	if (!window.rating_plugin) startPlugin();
})();

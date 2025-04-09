(function () {
    'use strict';

    function Rating(object) {
        this.object = object;
        this.omdb_api_key = 'e0a2c76f';
        this.build = this.build.bind(this);
        this.background = this.background.bind(this);
        this.start = this.start.bind(this);
        this.enable = false;
    }

    Rating.prototype.start = function () {
        if (Lampa.Storage.field('rating_plugin') === false) return;

        this.enable = true;
        
        Lampa.Template.add('rating_style', this.getStyle());
        $('body').append(Lampa.Template.get('rating_style', {}, true));

        Lampa.Listener.follow('full', this.build);
        Lampa.Listener.follow('background', this.background);
    };

    Rating.prototype.build = function (e) {
        if (!this.enable) return;

        this.render(e.card);
    };

    Rating.prototype.background = function (e) {
        if (e.background) {
            $('.rating--open').remove();
        }
    };

    Rating.prototype.render = function (card) {
        if (!card.cardid) return;

        $('.card--category', card.render()).append('<div class="card__icon icon--rt-rating"></div>');

        card.render().on('hover:enter', function () {
            this.openDetails(card);
        }.bind(this));
    };

    Rating.prototype.openDetails = function (card) {
        $('.rating--open').remove();

        var network = $('<div class="rating-loading"></div>');
        var body = $('<div class="rating-body"></div>');
        var loading = $('<div class="rating__loading"><div class="broadcast__scan"><div></div></div></div>');
        var container = $('<div class="rating rating--open"></div>');

        body.append(loading);
        container.append(body);
        
        $('body').append(container);

        this.getRatings({
            card: card.card
        }, function (data) {
            container.addClass('rating--loaded');
            loading.remove();
            
            if (data) {
                var html = '<div class="rating__header">' +
                    '<div class="rating__title">' + data.title + '</div>' +
                    '<div class="rating__year">' + data.year + (data.runtime ? ' • ' + data.runtime : '') + '</div>' +
                '</div>';
                
                if (data.rt) {
                    var rtValue = parseInt(data.rt);
                    var rtIconClass = 'rotten';
                    
                    if (isNaN(rtValue)) {
                        var match = data.rt.match(/(\d+)%/);
                        if (match && match[1]) {
                            rtValue = parseInt(match[1]);
                        }
                    }
                    
                    if (rtValue >= 60) {
                        rtIconClass = 'fresh';
                    } else if (rtValue < 0) {
                        rtIconClass = 'unknown';
                    }
                    
                    html += '<div class="rating__rt rating__rt--' + rtIconClass + '">' +
                        '<div class="rating__rt-icon"></div>' +
                        '<div class="rating__rt-score">' + data.rt + '</div>' +
                    '</div>';
                }
                
                html += '<div class="rating__other-scores">';
                
                if (data.imdb && data.imdb !== 'N/A') {
                    html += '<div class="rating__stat rating__stat--imdb">' +
                        '<span>IMDb</span>' + data.imdb +
                    '</div>';
                }
                
                if (data.metascore && data.metascore !== 'N/A') {
                    var metacolorClass = 'average';
                    var metacritic = parseInt(data.metascore);
                    
                    if (!isNaN(metacritic)) {
                        if (metacritic >= 75) metacolorClass = 'good';
                        else if (metacritic < 50) metacolorClass = 'bad';
                    }
                    
                    html += '<div class="rating__stat rating__stat--meta rating__stat--' + metacolorClass + '">' +
                        '<span>META</span>' + data.metascore +
                    '</div>';
                }
                
                html += '</div>';
                
                if (data.director && data.director !== 'N/A') {
                    html += '<div class="rating__credit"><span>Director:</span> ' + data.director + '</div>';
                }
                
                if (data.actors && data.actors !== 'N/A') {
                    html += '<div class="rating__credit"><span>Cast:</span> ' + data.actors + '</div>';
                }
                
                if (data.plot && data.plot !== 'N/A') {
                    html += '<div class="rating__descr">' + data.plot + '</div>';
                }
                
                if (data.poster && data.poster !== 'N/A') {
                    html += '<div class="rating__img"><img src="' + data.poster + '" alt="' + data.title + '" /></div>';
                }
                
                body.html(html);
            } else {
                body.html('<div class="rating__error">' +
                    '<div class="rating__error-icon">!</div>' +
                    '<div class="rating__error-message">No Rotten Tomatoes ratings found</div>' +
                '</div>');
            }
        });

        $(window).on('keydown', function (e) {
            if (e.keyCode === 8 || e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009) {
                container.remove();
            }
        });
    };

    Rating.prototype.getRatings = function (data, call) {
        var url;
        var title = data.card.title || data.card.name;
        
        if (data.card.imdb_id) {
            url = 'https://www.omdbapi.com/?i=' + data.card.imdb_id + '&apikey=' + this.omdb_api_key;
        } else {
            var year = data.card.release_date || data.card.first_air_date || '';
            year = year ? (new Date(year)).getFullYear() : '';
            
            url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + this.omdb_api_key;
        }

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function (response) {
                if (response && response.Response === 'True') {
                    call(this.extractRatings(response));
                } else {
                    call(null);
                }
            }.bind(this),
            error: function () {
                call(null);
            }
        });
    };
    
    Rating.prototype.extractRatings = function (response) {
        var rtRating = '';
        
        if (response.Ratings && Array.isArray(response.Ratings)) {
            for (var i = 0; i < response.Ratings.length; i++) {
                if (response.Ratings[i].Source === 'Rotten Tomatoes') {
                    rtRating = response.Ratings[i].Value;
                    break;
                }
            }
        }
        
        return {
            title: response.Title,
            year: response.Year,
            rt: rtRating,
            imdb: response.imdbRating,
            metascore: response.Metascore,
            plot: response.Plot,
            poster: response.Poster,
            director: response.Director,
            actors: response.Actors,
            runtime: response.Runtime
        };
    };

    Rating.prototype.getStyle = function () {
        return '<style>' +
            '.icon--rt-rating {' +
                'background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiw0IEM3LjU4LDQgNCw3LjU4IDQsMTIgQzQsMTYuNDIgNy41OCwyMCAxMiwyMCBDMTYuNDIsMjAgMjAsMTYuNDIgMjAsMTIgQzIwLDcuNTggMTYuNDIsNCAxMiw0IFogTTEyLDE4IEM4LjY5LDE4IDYsMTUuMzEgNiwxMiBDNiw4LjY5IDguNjksNiAxMiw2IEMxNS4zMSw2IDE4LDguNjkgMTgsMTIgQzE4LDE1LjMxIDE1LjMxLDE4IDEyLDE4IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOSBMOC41LDEyIEwxMCwxNSBMMTQsMTUgTDE1LjUsMTIgTDE0LDkgWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==");' +
                'background-position: 50% 50%;' +
                'background-repeat: no-repeat;' +
                'background-size: 70%;' +
                'border-radius: 0.3em;' +
                'backdrop-filter: blur(0.5em);' +
                '-webkit-backdrop-filter: blur(0.5em);' +
                'color: rgba(255, 255, 255, 0.875);' +
                'display: inline-flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'background-color: rgba(82, 82, 82, 0.5);' +
                'position: absolute;' +
                'right: 0.3em;' +
                'bottom: 0.3em;' +
                'width: 1.8em;' +
                'height: 1.8em;' +
                'margin-left: 0.5em;' +
            '}' +
            '.rating {' +
                'position: fixed;' +
                'left: 50%;' +
                'top: 50%;' +
                'transform: translate(-50%, -50%);' +
                'z-index: 999;' +
                'width: 30vw;' +
                'max-width: 35em;' +
                'padding: 1.5em;' +
                'background-color: rgba(0,0,0,0.9);' +
                'border-radius: 0.5em;' +
                'box-shadow: 0 0 20px rgba(0,0,0,0.5);' +
            '}' +
            '.rating--loaded .rating-body {' +
                'padding: 0 1em 1.5em 1em;' +
            '}' +
            '.rating-loading {' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'padding: 1.5em;' +
                'font-size: 1.2em;' +
            '}' +
            '.rating__loading {' +
                'padding: 2em;' +
                'display: flex;' +
                'justify-content: center;' +
            '}' +
            '.rating__header {' +
                'margin-bottom: 1em;' +
            '}' +
            '.rating__title {' +
                'font-size: 1.8em;' +
                'font-weight: 600;' +
                'padding-bottom: 0.2em;' +
            '}' +
            '.rating__year {' +
                'font-size: 1.1em;' +
                'font-weight: 300;' +
                'opacity: 0.7;' +
            '}' +
            '.rating__rt {' +
                'display: flex;' +
                'align-items: center;' +
                'margin: 1em 0;' +
                'padding: 0.8em;' +
                'border-radius: 0.4em;' +
                'background-color: rgba(255,255,255,0.1);' +
            '}' +
            '.rating__rt-icon {' +
                'width: 2.5em;' +
                'height: 2.5em;' +
                'margin-right: 0.8em;' +
                'background-size: contain;' +
                'background-repeat: no-repeat;' +
                'background-position: center;' +
            '}' +
            '.rating__rt--fresh .rating__rt-icon {' +
                'background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzAwRTQwMCIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOCBMOSwxMiBMMTEsMTYgTDE1LDE1IEwxNiwxMiBMMTMsOCBaIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+");' +
            '}' +
            '.rating__rt--rotten .rating__rt-icon {' +
                'background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOCBMOCwxMiBMMTAsMTYgTDE1LDE2IEwxNiwxMiBMMTMsOCBaIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+");' +
            '}' +
            '.rating__rt--unknown .rating__rt-icon {' +
                'background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2FhYWFhYSIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTIsMTcgTDEyLDE3IEwxMiwxMSBMMTIsMTEiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSIxIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+");' +
            '}' +
            '.rating__rt-score {' +
                'font-size: 1.5em;' +
                'font-weight: 700;' +
                'line-height: 1;' +
            '}' +
            '.rating__other-scores {' +
                'display: flex;' +
                'gap: 1em;' +
                'margin-bottom: 1em;' +
            '}' +
            '.rating__stat {' +
                'flex: 1;' +
                'display: flex;' +
                'flex-direction: column;' +
                'align-items: center;' +
                'padding: 0.6em 0.8em;' +
                'border-radius: 0.3em;' +
                'font-weight: 700;' +
                'font-size: 1.1em;' +
            '}' +
            '.rating__stat span {' +
                'font-size: 0.7em;' +
                'margin-bottom: 0.4em;' +
                'opacity: 0.8;' +
                'font-weight: 400;' +
            '}' +
            '.rating__stat--imdb {' +
                'background-color: #f5c518;' +
                'color: #000;' +
            '}' +
            '.rating__stat--meta {' +
                'color: #fff;' +
            '}' +
            '.rating__stat--good {' +
                'background-color: #529e3d;' +
            '}' +
            '.rating__stat--average {' +
                'background-color: #f5b50f;' +
            '}' +
            '.rating__stat--bad {' +
                'background-color: #cb2525;' +
            '}' +
            '.rating__credit {' +
                'margin: 0.5em 0;' +
                'font-size: 1em;' +
                'line-height: 1.4;' +
            '}' +
            '.rating__credit span {' +
                'opacity: 0.7;' +
                'font-weight: 300;' +
            '}' +
            '.rating__descr {' +
                'margin-top: 1em;' +
                'font-weight: 300;' +
                'opacity: 0.9;' +
                'font-size: 1.05em;' +
                'line-height: 1.5;' +
            '}' +
            '.rating__img {' +
                'margin-top: 1.5em;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
            '}' +
            '.rating__img img {' +
                'max-width: 100%;' +
                'border-radius: 0.3em;' +
                'box-shadow: 0 5px 15px rgba(0,0,0,0.3);' +
            '}' +
            '.rating__error {' +
                'display: flex;' +
                'flex-direction: column;' +
                'align-items: center;' +
                'justify-content: center;' +
                'padding: 2em 1em;' +
                'text-align: center;' +
            '}' +
            '.rating__error-icon {' +
                'font-size: 2em;' +
                'width: 1.5em;' +
                'height: 1.5em;' +
                'line-height: 1.5em;' +
                'text-align: center;' +
                'background-color: #fa320a;' +
                'color: #fff;' +
                'border-radius: 50%;' +
                'margin-bottom: 0.5em;' +
                'font-weight: 700;' +
            '}' +
            '.rating__error-message {' +
                'font-size: 1.1em;' +
                'opacity: 0.8;' +
            '}' +
            '@media screen and (max-width: 767px) {' +
                '.rating {' +
                    'width: 85vw;' +
                '}' +
                '.rating__other-scores {' +
                    'flex-direction: column;' +
                    'gap: 0.5em;' +
                '}' +
            '}' +
        '</style>';
    };

    var rating = new Rating({});
    Lampa.Plugins.add('rating', rating);

    if (window.lampa_settings) {
        window.lampa_settings.plugins_add({
            id: 'rating_plugin',
            title: 'Rotten Tomatoes Ratings',
            subtitle: 'Show RT ratings for movies',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#fa320a"/><path d="M12,4 C7.58,4 4,7.58 4,12 C4,16.42 7.58,20 12,20 C16.42,20 20,16.42 20,12 C20,7.58 16.42,4 12,4 Z M12,18 C8.69,18 6,15.31 6,12 C6,8.69 8.69,6 12,6 C15.31,6 18,8.69 18,12 C18,15.31 15.31,18 12,18 Z" fill="#ffffff"/><path d="M10,9 L8.5,12 L10,15 L14,15 L15.5,12 L14,9 Z" fill="#ffffff"/></svg>',
            visible: true
        });
    }
})();

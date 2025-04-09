(function () {
    'use strict';

    /**
     * Plugin for Lampa - displays Rotten Tomatoes ratings using OMDB API
     * Replaces the original Kinopoisk ratings plugin with Rotten Tomatoes informationф
     */
    function Rating(object) {
        this.object = object;
        this.omdb_api_key = 'e0a2c76f'; // OMDB API key (provided)
        this.build = this.build.bind(this);
        this.openDetails = this.openDetails.bind(this);
        this.background = this.background.bind(this);
        this.start = this.start.bind(this);
        this.enable = false;
    }

    /**
     * Initialize the plugin and set up listeners
     */
    Rating.prototype.start = function () {
        if (Lampa.Storage.field('rating_plugin') === false) return;

        this.enable = true;
        
        Lampa.Template.add('rating_style', this.getStyle());
        Lampa.Utils.append(Lampa.Template.get('rating_style', {}, true), document.body);

        Lampa.Listener.follow('full', this.build);
        Lampa.Listener.follow('background', this.background);
    };

    /**
     * Build the rating display
     * @param {Object} e - Event object
     */
    Rating.prototype.build = function (e) {
        if (!this.enable) return;

        this.render(e.card);
    };

    /**
     * Handle background event
     * @param {Object} e - Event object
     */
    Rating.prototype.background = function (e) {
        if (e.background && e.background.indexOf('mb_bg') !== -1) {
            const ratingsOpen = document.querySelector('.rating--open');
            if (ratingsOpen) ratingsOpen.remove();
        }
    };

    /**
     * Fetch ratings from OMDB API
     * @param {Object} data - Movie/Show data
     * @param {Function} call - Callback function
     */
    Rating.prototype.getRatings = function (data, call) {
        let url;
        let title = data.card.title || data.card.name;
        
        // Use imdb ID if available
        if (data.card.imdb_id) {
            url = 'https://www.omdbapi.com/?i=' + data.card.imdb_id + '&apikey=' + this.omdb_api_key;
        } else {
            // If no IMDb ID, search by title
            let year = data.card.release_date || data.card.first_air_date || '';
            year = year ? (new Date(year)).getFullYear() : '';
            
            url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(title) + '&y=' + year + '&apikey=' + this.omdb_api_key;
        }

        // Make API request
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 400) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response && response.Response === 'True') {
                        const ratingsData = this.extractRatings(response);
                        call(ratingsData);
                    } else {
                        call(null);
                    }
                } catch (e) {
                    call(null);
                }
            } else {
                call(null);
            }
        }.bind(this);
        xhr.onerror = function() {
            call(null);
        };
        xhr.send();
    };
    
    /**
     * Extract Rotten Tomatoes ratings from OMDB response
     * @param {Object} response - OMDB API response
     * @returns {Object} Extracted ratings data
     */
    Rating.prototype.extractRatings = function (response) {
        let rtRating = '';
        
        // Find Rotten Tomatoes rating in the Ratings array
        if (response.Ratings && Array.isArray(response.Ratings)) {
            for (let i = 0; i < response.Ratings.length; i++) {
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

    /**
     * Render the rating button
     * @param {Object} card - Card data
     */
    Rating.prototype.render = function (card) {
        if (!card.cardid) return;

        // Add the tomato icon to the movie card
        const cardElement = card.render();
        const categoryElement = cardElement.querySelector('.card--category');
        
        if (categoryElement) {
            const rtIcon = document.createElement('div');
            rtIcon.className = 'card__icon icon--rt-rating';
            categoryElement.appendChild(rtIcon);
            
            cardElement.addEventListener('hover:enter', this.openDetails.bind(this, card));
        }
    };

    /**
     * Open detailed ratings view
     * @param {Object} card - Card data
     */
    Rating.prototype.openDetails = function (card) {
        const existingRating = document.querySelector('.rating--open');
        if (existingRating) existingRating.remove();

        // Create UI components
        const body = document.createElement('div');
        body.className = 'rating-body';
        
        const loading = document.createElement('div');
        loading.className = 'rating__loading';
        loading.innerHTML = '<div class="broadcast__scan"><div></div></div>';
        
        const container = document.createElement('div');
        container.className = 'rating rating--open';
        
        body.appendChild(loading);
        container.appendChild(body);
        document.body.appendChild(container);

        // Load the data
        this.getRatings({
            card: card.card
        }, function (data) {
            container.classList.add('rating--loaded');
            loading.remove();
            
            if (data) {
                let html = '<div class="rating__header">' +
                    '<div class="rating__title">' + data.title + '</div>' +
                    '<div class="rating__year">' + data.year + (data.runtime ? ' • ' + data.runtime : '') + '</div>' +
                '</div>';
                
                // Display Rotten Tomatoes score with tomato icon
                if (data.rt) {
                    let rtValue = parseInt(data.rt);
                    let rtIconClass = 'rotten';
                    
                    // Change icon based on the score
                    if (!isNaN(rtValue)) {
                        if (rtValue >= 60) {
                            rtIconClass = 'fresh';
                        } else if (rtValue < 0) {
                            rtIconClass = 'unknown';
                        }
                    } else {
                        // Try to extract the number if it's in format "93%"
                        const match = data.rt.match(/(\d+)%/);
                        if (match && match[1]) {
                            rtValue = parseInt(match[1]);
                            if (rtValue >= 60) {
                                rtIconClass = 'fresh';
                            }
                        }
                    }
                    
                    html += '<div class="rating__rt rating__rt--' + rtIconClass + '">' +
                        '<div class="rating__rt-icon"></div>' +
                        '<div class="rating__rt-score">' + data.rt + '</div>' +
                    '</div>';
                }
                
                html += '<div class="rating__other-scores">';
                
                // Display IMDb score
                if (data.imdb) {
                    html += '<div class="rating__stat rating__stat--imdb">' +
                        '<span>IMDb</span>' + data.imdb +
                    '</div>';
                }
                
                // Display Metascore
                if (data.metascore && data.metascore !== 'N/A') {
                    // Determine color based on score
                    let metacolorClass = 'average';
                    const metacritic = parseInt(data.metascore);
                    
                    if (metacritic >= 75) metacolorClass = 'good';
                    else if (metacritic < 50) metacolorClass = 'bad';
                    
                    html += '<div class="rating__stat rating__stat--meta rating__stat--' + metacolorClass + '">' +
                        '<span>META</span>' + data.metascore +
                    '</div>';
                }
                
                html += '</div>';
                
                // Add director and actors if available
                if (data.director && data.director !== 'N/A') {
                    html += '<div class="rating__credit"><span>Director:</span> ' + data.director + '</div>';
                }
                
                if (data.actors && data.actors !== 'N/A') {
                    html += '<div class="rating__credit"><span>Cast:</span> ' + data.actors + '</div>';
                }
                
                // Add plot description
                if (data.plot && data.plot !== 'N/A') {
                    html += '<div class="rating__descr">' + data.plot + '</div>';
                }
                
                // Add movie poster if available
                if (data.poster && data.poster !== 'N/A') {
                    html += '<div class="rating__img"><img src="' + data.poster + '" alt="' + data.title + '" /></div>';
                }
                
                body.innerHTML = html;
            } else {
                body.innerHTML = '<div class="rating__error">' +
                    '<div class="rating__error-icon">!</div>' +
                    '<div class="rating__error-message">No Rotten Tomatoes ratings found</div>' +
                '</div>';
            }
        });

        // Handle button press
        const keydownHandler = function(e) {
            if (e.keyCode === 8 || e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009) {
                container.remove();
                document.removeEventListener('keydown', keydownHandler);
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
    };

    /**
     * Define CSS styles for ratings display
     * @returns {String} CSS styles
     */
    Rating.prototype.getStyle = function () {
        return `<style>
        /* RT icon in movie card */
        .icon--rt-rating {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiw0IEM3LjU4LDQgNCw3LjU4IDQsMTIgQzQsMTYuNDIgNy41OCwyMCAxMiwyMCBDMTYuNDIsMjAgMjAsMTYuNDIgMjAsMTIgQzIwLDcuNTggMTYuNDIsNCAxMiw0IFogTTEyLDE4IEM4LjY5LDE4IDYsMTUuMzEgNiwxMiBDNiw4LjY5IDguNjksNiAxMiw2IEMxNS4zMSw2IDE4LDguNjkgMTgsMTIgQzE4LDE1LjMxIDE1LjMxLDE4IDEyLDE4IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOSBMOC41LDEyIEwxMCwxNSBMMTQsMTUgTDE1LjUsMTIgTDE0LDkgWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==');
            background-position: 50% 50%;
            background-repeat: no-repeat;
            background-size: 70%;
            border-radius: 0.3em;
            backdrop-filter: blur(0.5em);
            -webkit-backdrop-filter: blur(0.5em);
            color: rgba(255, 255, 255, 0.875);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(82, 82, 82, 0.5);
            position: absolute;
            right: 0.3em;
            bottom: 0.3em;
            width: 1.8em;
            height: 1.8em;
            margin-left: 0.5em;
        }
        
        /* Rating modal styles */
        .rating {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 999;
            width: 30vw;
            max-width: 35em;
            padding: 1.5em;
            background-color: rgba(0,0,0,0.9);
            border-radius: 0.5em;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        
        .rating--loaded .rating-body {
            padding: 0 1em 1.5em 1em;
        }
        
        .rating-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5em;
            font-size: 1.2em;
        }
        
        .rating__loading {
            padding: 2em;
            display: flex;
            justify-content: center;
        }
        
        .rating__header {
            margin-bottom: 1em;
        }
        
        .rating__title {
            font-size: 1.8em;
            font-weight: 600;
            padding-bottom: 0.2em;
        }
        
        .rating__year {
            font-size: 1.1em;
            font-weight: 300;
            opacity: 0.7;
        }
        
        /* RT rating display */
        .rating__rt {
            display: flex;
            align-items: center;
            margin: 1em 0;
            padding: 0.8em;
            border-radius: 0.4em;
            background-color: rgba(255,255,255,0.1);
        }
        
        .rating__rt-icon {
            width: 2.5em;
            height: 2.5em;
            margin-right: 0.8em;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }
        
        .rating__rt--fresh .rating__rt-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzAwRTQwMCIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOCBMOSwxMiBMMTEsMTYgTDE1LDE1IEwxNiwxMiBMMTMsOCBaIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+');
        }
        
        .rating__rt--rotten .rating__rt-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2ZhMzIwYSIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTAsOCBMOCwxMiBMMTAsMTYgTDE1LDE2IEwxNiwxMiBMMTMsOCBaIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+');
        }
        
        .rating__rt--unknown .rating__rt-icon {
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iI2FhYWFhYSIvPjxwYXRoIGQ9Ik0xMiwyIEM2LjQ4LDIgMiw2LjQ4IDIsMTIgQzIsMTcuNTIgNi40OCwyMiAxMiwyMiBDMTcuNTIsMjIgMjIsMTcuNTIgMjIsMTIgQzIyLDYuNDggMTcuNTIsMiAxMiwyIFogTTEyLDE5IEM4LjEzLDE5IDUsMTUuODcgNSwxMiBDNSw4LjEzIDguMTMsNSAxMiw1IEMxNS44Nyw1IDE5LDguMTMgMTksMTIgQzE5LDE1Ljg3IDE1Ljg3LDE5IDEyLDE5IFoiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMTIsMTcgTDEyLDE3IEwxMiwxMSBMMTIsMTEiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSIxIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+');
        }
        
        .rating__rt-score {
            font-size: 1.5em;
            font-weight: 700;
            line-height: 1;
        }
        
        /* IMDb and Metascore display */
        .rating__other-scores {
            display: flex;
            gap: 1em;
            margin-bottom: 1em;
        }
        
        .rating__stat {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.6em 0.8em;
            border-radius: 0.3em;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        .rating__stat span {
            font-size: 0.7em;
            margin-bottom: 0.4em;
            opacity: 0.8;
            font-weight: 400;
        }
        
        .rating__stat--imdb {
            background-color: #f5c518;
            color: #000;
        }
        
        .rating__stat--meta {
            color: #fff;
        }
        
        .rating__stat--good {
            background-color: #529e3d;
        }
        
        .rating__stat--average {
            background-color: #f5b50f;
        }
        
        .rating__stat--bad {
            background-color: #cb2525;
        }
        
        /* Credits and plot */
        .rating__credit {
            margin: 0.5em 0;
            font-size: 1em;
            line-height: 1.4;
        }
        
        .rating__credit span {
            opacity: 0.7;
            font-weight: 300;
        }
        
        .rating__descr {
            margin-top: 1em;
            font-weight: 300;
            opacity: 0.9;
            font-size: 1.05em;
            line-height: 1.5;
        }
        
        /* Poster image */
        .rating__img {
            margin-top: 1.5em;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .rating__img img {
            max-width: 100%;
            border-radius: 0.3em;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        /* Error state */
        .rating__error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2em 1em;
            text-align: center;
        }
        
        .rating__error-icon {
            font-size: 2em;
            width: 1.5em;
            height: 1.5em;
            line-height: 1.5em;
            text-align: center;
            background-color: #fa320a;
            color: #fff;
            border-radius: 50%;
            margin-bottom: 0.5em;
            font-weight: 700;
        }
        
        .rating__error-message {
            font-size: 1.1em;
            opacity: 0.8;
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 767px) {
            .rating {
                width: 85vw;
            }
            
            .rating__other-scores {
                flex-direction: column;
                gap: 0.5em;
            }
        }
        </style>`;
    };

    // Create an instance of the plugin
    var rating = new Rating({});
    
    // Define the plugin
    Lampa.Plugins.add('rating', rating);

    // Initialize options storage with default value
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

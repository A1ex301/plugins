(function(plugin_path){
    var network = new Lampa.Reguest();

    function imdbRating(title, year, callback){
        let url = `https://www.omdbapi.com/?apikey=e0a2c76f&t=${encodeURIComponent(title)}&y=${year}`;

        network.silent(url, function(data){
            if (data && data.imdbRating && data.imdbRating !== 'N/A'){
                callback({
                    imdb: {
                        vote: data.imdbRating,
                        full: `https://www.imdb.com/title/${data.imdbID}/`
                    }
                });
            } else {
                callback(false);
            }
        }, function(){
            callback(false);
        });
    }

    Lampa.Listener.follow('full', function(e){
        if (e.type === 'complite' && e.data){
            var item = e.data;
            var title = item.name || item.original_name;
            var year = item.release_date ? item.release_date.slice(0, 4) : '';

            imdbRating(title, year, function(ratings){
                if (ratings && ratings.imdb){
                    item.rating = item.rating || {};
                    item.rating.imdb = ratings.imdb.vote;

                    Lampa.Activity.active().update(item);
                }
            });
        }
    });

})(Lampa.Plugin.getPath() + '/ratingimdb.js');

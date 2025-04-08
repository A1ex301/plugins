(() => {
    const apiKey = 'e0a2c76f';

    function fetchIMDbRating(title, year, callback) {
        const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&apikey=${apiKey}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.imdbRating && data.imdbRating !== 'N/A') {
                    callback(data.imdbRating);
                } else {
                    callback(null);
                }
            })
            .catch(() => callback(null));
    }

    function renderIMDb(rating) {
        return `
        <div class="imdb-rating" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 4px;
            font-size: 14px;
            font-weight: bold;
            background: #f5c518;
            color: black;
            padding: 2px 6px;
            border-radius: 4px;
            width: fit-content;
        ">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg" alt="IMDb" style="height: 16px;">
            <span>${rating}</span>
        </div>`;
    }

    function appendRating(element, rating) {
        const existing = element.querySelector('.imdb-rating');
        if (!existing) {
            element.insertAdjacentHTML('beforeend', renderIMDb(rating));
        }
    }

    function processItem(element) {
        const title = element.querySelector('.card__title, .folder__title');
        const year = element.querySelector('.card__info, .folder__info');
        if (!title) return;

        const name = title.textContent.trim();
        const yearText = year ? year.textContent.match(/\d{4}/) : null;
        const yearNum = yearText ? yearText[0] : '';

        fetchIMDbRating(name, yearNum, (rating) => {
            if (rating) appendRating(element, rating);
        });
    }

    function observeNewItems() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches('.card, .folder')) {
                            processItem(node);
                        } else {
                            node.querySelectorAll('.card, .folder').forEach(processItem);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function init() {
        document.querySelectorAll('.card, .folder').forEach(processItem);
        observeNewItems();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

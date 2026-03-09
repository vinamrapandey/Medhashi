/* ============================================
   AS WEDDING — Loader Component
   ============================================ */

let loaderTimeout = null;

function showLoader() {
    const loader = document.getElementById('loader-overlay');
    if (!loader) return;

    loader.classList.remove('hidden');

    // Clear any existing timeout
    if (loaderTimeout) clearTimeout(loaderTimeout);
}

function hideLoader(delay = 700) {
    return new Promise((resolve) => {
        if (loaderTimeout) clearTimeout(loaderTimeout);

        loaderTimeout = setTimeout(() => {
            const loader = document.getElementById('loader-overlay');
            if (loader) {
                loader.classList.add('hidden');
            }
            resolve();
        }, delay);
    });
}

function showLoaderThen(callback, delay = 700) {
    showLoader();
    return hideLoader(delay).then(() => {
        if (callback) callback();
    });
}

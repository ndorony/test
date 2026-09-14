// Google Analytics is the one third-party dependency deliberately NOT vendored:
// it is a reporting beacon, not a library the app runs on, and a box with no
// internet is a supported state rather than an error. So the gtag() shim is
// defined unconditionally — tester.js and adventure.js call gtag() directly at
// five sites and would throw ReferenceError without it — and the remote tag is
// appended from script instead of sitting in index.html. Appending it means its
// failure is an ignored load error on an async element rather than anything the
// parser or the page can trip over, and it keeps index.html free of inline
// <script>, which is what a future script-src 'self' policy for this origin
// would require.
(function () {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };

    gtag('js', new Date());
    gtag('config', 'G-2T1G2WVRMD', {
        'send_page_view': false
    });

    try {
        var tag = document.createElement('script');
        tag.async = true;
        tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-2T1G2WVRMD';
        // Offline this never resolves; the queued events simply stay in
        // dataLayer and are dropped on unload. That is the intended outcome.
        tag.onerror = function () {};
        document.head.appendChild(tag);
    } catch (e) {
        // Analytics must never be the reason a child cannot start a lesson.
    }
})();

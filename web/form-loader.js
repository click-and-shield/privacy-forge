// Direct file opening uses the same standalone bundles as the distribution.
// Vite replaces this tag with the TypeScript entry during development/build.
(function () {
    const loader = document.currentScript;
    const script = document.createElement('script');
    script.src = loader.dataset.bundle;
    script.onerror = function () {
        const message = document.createElement('p');
        message.className = 'alert alert-danger m-3';
        message.setAttribute('role', 'alert');
        message.textContent = 'Unable to load the application. Run npm run build, then reopen this page, or open dist/index.html from a complete distribution.';
        document.body.prepend(message);
    };
    document.body.appendChild(script);
})();

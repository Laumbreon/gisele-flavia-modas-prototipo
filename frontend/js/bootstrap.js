await (window.GiseleShoppingReady || Promise.resolve());

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const scrollPageToTop = () => {
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" })));
};

const observeNavigation = method => {
  const original = history[method];
  history[method] = function (...args) {
    const previousUrl = location.pathname + location.search;
    const result = original.apply(this, args);
    if (previousUrl !== location.pathname + location.search) scrollPageToTop();
    return result;
  };
};

observeNavigation("pushState");
observeNavigation("replaceState");
addEventListener("popstate", scrollPageToTop);
scrollPageToTop();

await import("/js/app.js?v=20260801-lowercase-delivery-status");

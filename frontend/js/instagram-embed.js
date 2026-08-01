(() => {
  const embedSelector = "blockquote.instagram-media[data-instgrm-permalink]";
  let scriptLoading = false;

  function processEmbeds() {
    const embed = document.querySelector(embedSelector);
    if (!embed) return;

    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
      observer.disconnect();
      return;
    }

    if (scriptLoading) return;
    scriptLoading = true;

    const existingScript = document.querySelector(
      'script[src="https://www.instagram.com/embed.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", processEmbeds, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    script.onload = processEmbeds;
    document.head.appendChild(script);
  }

  const observer = new MutationObserver(processEmbeds);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processEmbeds, { once: true });
  } else {
    processEmbeds();
  }
})();

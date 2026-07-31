(() => {
  const cache = new Map();

  function createFallback(label) {
    const safeLabel = String(label || "Produto").trim() || "Produto";
    const initial = Array.from(safeLabel)[0].toUpperCase();

    if (cache.has(initial)) return cache.get(initial);

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;

    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fe0182");
    gradient.addColorStop(0.55, "#ad0257");
    gradient.addColorStop(1, "#1a1a1a");

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.beginPath();
    context.arc(690, 240, 310, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffffff";
    context.font = "500 360px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initial, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL("image/png");
    cache.set(initial, dataUrl);
    return dataUrl;
  }

  document.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) return;

      image.dataset.fallbackApplied = "true";
      image.src = createFallback(image.alt);
      image.style.objectFit = "cover";
    },
    true
  );
})();

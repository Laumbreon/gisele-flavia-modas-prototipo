(function () {
  window.GiseleEmailReceiptOptIn = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("/api/public/checkout") && String(init?.method || "GET").toUpperCase() === "POST" && typeof init?.body === "string") {
      try {
        const payload = JSON.parse(init.body);
        payload.enviar_comprovante_email = window.GiseleEmailReceiptOptIn !== false;
        init = { ...init, body:JSON.stringify(payload) };
      } catch (_) {}
    }
    return originalFetch(input, init);
  };

  function installOption() {
    if (!location.pathname.startsWith("/checkout") || document.getElementById("emailReceiptPreference")) return;
    const paymentHeading = [...document.querySelectorAll("h1,h2,h3,p")].find(element => /forma de pagamento/i.test(element.textContent || ""));
    const form = paymentHeading?.closest("form") || document.querySelector("form");
    const submit = form?.querySelector('button[type="submit"]') || [...document.querySelectorAll("button")].find(button => /finalizar|pedido|continuar/i.test(button.textContent || ""));
    if (!submit) return;
    const wrapper = document.createElement("label");
    wrapper.id = "emailReceiptPreference";
    wrapper.style.cssText = "display:flex;gap:10px;align-items:flex-start;margin:18px 0;padding:14px;background:#fff0f8;border:1px solid #f7c8df;font-size:14px;line-height:1.4";
    wrapper.innerHTML = '<input type="checkbox" checked style="width:18px;height:18px;margin-top:1px;accent-color:#FE0182"><span>Quero receber por e-mail o comprovante da compra após a confirmação do pagamento.</span>';
    wrapper.querySelector("input").addEventListener("change", event => { window.GiseleEmailReceiptOptIn = event.target.checked; });
    submit.parentElement?.insertBefore(wrapper, submit);
  }

  new MutationObserver(installOption).observe(document.documentElement, { childList:true, subtree:true });
  addEventListener("popstate", () => setTimeout(installOption));
  setTimeout(installOption);
})();

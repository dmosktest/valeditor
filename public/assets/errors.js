(function () {
  function highlightTarget() {
    var prev = document.querySelector(".rule.is-target");
    if (prev) prev.classList.remove("is-target");
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el || !el.classList.contains("rule")) return;
    el.classList.add("is-target");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  window.addEventListener("DOMContentLoaded", highlightTarget);
  window.addEventListener("hashchange", highlightTarget);
})();

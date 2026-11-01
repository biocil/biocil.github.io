/* Phi-X site behaviour: publication filters, BibTeX copy, and reduced-motion handling for videos. */
(function(){
  "use strict";

  // Copy BibTeX
  document.addEventListener("click", function(e){
    var b = e.target.closest ? e.target.closest("button.copy") : null;
    if(!b) return;
    var pre = b.parentNode.querySelector("pre");
    if(!pre || !navigator.clipboard) return;
    navigator.clipboard.writeText(pre.textContent).then(function(){
      var t = b.textContent; b.textContent = b.getAttribute("data-done") || "Copied"; setTimeout(function(){ b.textContent = t; }, 1600);
    });
  });

  // Publication filters and search
  var list = document.querySelectorAll(".pub-tools .chip");
  var q = document.getElementById("pubq");
  if(list.length && q){
    var current = "all";
    var rows = Array.prototype.slice.call(document.querySelectorAll(".pub-row"));
    var groups = Array.prototype.slice.call(document.querySelectorAll(".year-group"));
    var count = document.getElementById("pubcount");
    var apply = function(){
      var term = q.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function(r){
        var ok = (current === "all" || r.getAttribute("data-type") === current) && (!term || r.getAttribute("data-text").indexOf(term) !== -1);
        r.hidden = !ok; if(ok) shown++;
      });
      groups.forEach(function(g){ g.hidden = !g.querySelector(".pub-row:not([hidden])"); });
      count.textContent = (current === "all" && !term) ? "" : (shown === 1 ? (q.getAttribute("data-one") || "1 result") : (q.getAttribute("data-many") || "%d results").replace("%d", shown));
    };
    list.forEach(function(btn){
      btn.addEventListener("click", function(){
        current = btn.getAttribute("data-filter");
        list.forEach(function(b){ b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        apply();
      });
    });
    q.addEventListener("input", apply);
  }

  // Respect reduced motion for autoplaying videos
  if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    document.querySelectorAll("video[data-autoplay]").forEach(function(v){ v.removeAttribute("autoplay"); v.pause(); v.controls = true; });
  }
})();

/* Colour scheme switcher: remembers the choice and tells the demos to repaint. */
(function(){
  var btn = document.getElementById("pal-btn"), menu = document.getElementById("pal-menu");
  if(!btn || !menu) return;
  var root = document.documentElement;
  function mark(){ var cur = root.getAttribute("data-palette"); menu.querySelectorAll("[data-pal]").forEach(function(b){ b.setAttribute("aria-checked", b.getAttribute("data-pal") === cur ? "true" : "false"); }); }
  function open(o){ menu.hidden = !o; btn.setAttribute("aria-expanded", o ? "true" : "false"); if(o){ mark(); var c = menu.querySelector("[aria-checked=true]") || menu.querySelector("[data-pal]"); c.focus(); } }
  btn.addEventListener("click", function(e){ e.stopPropagation(); open(menu.hidden); });
  menu.addEventListener("click", function(e){
    var b = e.target.closest("[data-pal]"); if(!b) return;
    var p = b.getAttribute("data-pal"); root.setAttribute("data-palette", p);
    try{ localStorage.setItem("phix-palette", p); }catch(err){}
    mark(); open(false); btn.focus();
    document.dispatchEvent(new CustomEvent("phix:palette", { detail: p }));
  });
  menu.addEventListener("keydown", function(e){
    var items = Array.prototype.slice.call(menu.querySelectorAll("[data-pal]")), i = items.indexOf(document.activeElement);
    if(e.key === "ArrowDown"){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if(e.key === "Escape"){ open(false); btn.focus(); }
  });
  document.addEventListener("click", function(e){ if(!menu.hidden && !menu.contains(e.target)) open(false); });
})();

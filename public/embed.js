(function () {
  var script = document.currentScript;
  if (!script) return;
  var roomId = script.getAttribute("data-room");
  if (!roomId) {
    console.warn("[salesailab] data-room attribute is required");
    return;
  }

  var origin = new URL(script.src).origin;
  var meetUrl = origin + "/meet/" + roomId;

  function injectStyles() {
    var css =
      ".salab-btn{position:fixed;right:20px;bottom:20px;z-index:2147483646;background:#c060ff;color:#04000b;border:0;border-radius:9999px;padding:14px 22px;font-family:system-ui,'Space Grotesk',sans-serif;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 8px 32px rgba(192,96,255,.45);transition:transform .15s,background .15s}" +
      ".salab-btn:hover{background:#e070ff;transform:translateY(-2px)}" +
      ".salab-btn:before{content:'\\1F3AD';margin-right:8px;font-size:16px}";
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectButton() {
    var btn = document.createElement("button");
    btn.className = "salab-btn";
    btn.type = "button";
    btn.innerText = "AIと商談する";
    btn.addEventListener("click", function () {
      window.open(meetUrl, "_blank", "noopener");
    });
    document.body.appendChild(btn);
  }

  function init() {
    injectStyles();
    injectButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

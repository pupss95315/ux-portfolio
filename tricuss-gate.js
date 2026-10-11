/* ============================================================
   TRICUSS CASE STUDY · PASSWORD GATE
   ------------------------------------------------------------
   目前密碼：tricuss2026

   要換密碼：在瀏覽器 console 執行 btoa('新密碼')，
   把結果貼到下面的 PASSWORD_B64 即可。
   換密碼後，舊的解鎖記錄會自動失效，所有人都要重新輸入。

   行為：輸過一次就記住。密碼正確時把解鎖記錄寫進 localStorage，
   之後重新整理、關掉瀏覽器再回來，都不用再輸入；
   密碼頁也會直接跳轉到案例頁。
   （同一台裝置、同一個瀏覽器有效；換裝置或清除瀏覽資料要再輸一次。）

   要手動解除鎖定，在 console 執行：TricussGate.forget()

   注意：這是純前端的保護，只擋一般訪客，
   有心人打開原始碼仍可看到。不要放真正機密的內容。
   ============================================================ */
(function () {
  var PASSWORD_B64 = 'dHJpY3VzczIwMjY=';   // btoa('tricuss2026')
  var UNLOCK_KEY   = 'tricuss-unlocked';
  var CASE_URL     = 'case-tricuss.html';
  var GATE_URL     = 'tricuss-password.html';

  /* localStorage 優先（跨分頁、跨次瀏覽都記得）；
     隱私模式等情況下退回 sessionStorage，至少同一個分頁不用重輸。 */
  function store() {
    try {
      var s = window.localStorage;
      s.setItem('tricuss-probe', '1');
      s.removeItem('tricuss-probe');
      return s;
    } catch (e) {}
    try { return window.sessionStorage; } catch (e) { return null; }
  }

  function decode(b64) {
    try { return decodeURIComponent(escape(window.atob(b64))); }
    catch (e) { return ''; }
  }

  window.TricussGate = {
    CASE_URL: CASE_URL,
    GATE_URL: GATE_URL,

    check: function (value) {
      return String(value || '').trim() === decode(PASSWORD_B64);
    },

    /* 密碼正確後記住解鎖狀態。存的是當下的密碼標記，
       所以換了密碼舊記錄就對不上，會自動失效。 */
    unlock: function () {
      var s = store();
      if (!s) return false;
      try { s.setItem(UNLOCK_KEY, PASSWORD_B64); return true; }
      catch (e) { return false; }
    },

    isUnlocked: function () {
      var s = store();
      if (!s) return false;
      try { return s.getItem(UNLOCK_KEY) === PASSWORD_B64; }
      catch (e) { return false; }
    },

    forget: function () {
      var s = store();
      if (!s) return;
      try { s.removeItem(UNLOCK_KEY); } catch (e) {}
    }
  };
})();

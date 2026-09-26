(function () {
  const LETTERS = ["A", "B", "C", "D"];
  const STORAGE = "cigen-chuan-v1";
  const PUBLIC_URL = "https://fy7sd429vh-tech.github.io/cigen-chuan/";
  const TOTAL_TIME = 15;

  const $ = (sel) => document.querySelector(sel);
  const state = {
    view: "home",
    stringIndex: 0,
    wordIndex: 0,
    locked: false,
    picked: -1,
    remain: TOTAL_TIME,
    timer: null,
    auto: null,
    audio: null,
    stats: loadStats(),
    installEvent: null,
  };

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STORAGE)) || { done: {}, correct: 0, wrong: 0, seen: 0 }; }
    catch { return { done: {}, correct: 0, wrong: 0, seen: 0 }; }
  }
  function saveStats() { localStorage.setItem(STORAGE, JSON.stringify(state.stats)); }

  function highlight(word, bit) {
    if (!bit) return escapeHtml(word);
    const i = word.toLowerCase().indexOf(bit.toLowerCase());
    if (i < 0) return escapeHtml(word);
    return escapeHtml(word.slice(0, i)) + '<span class="h">' + escapeHtml(word.slice(i, i + bit.length)) + "</span>" + escapeHtml(word.slice(i + bit.length));
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function speak(word, lang) {
    stopAudio();
    if (!word) return;
    if (lang !== "zh") {
      const url = "https://dict.youdao.com/dictvoice?audio=" + encodeURIComponent(word) + "&type=2";
      const audio = new Audio(url);
      state.audio = audio;
      audio.play().catch(() => synth(word, "en-US"));
      return;
    }
    synth(word, "zh-CN");
  }
  function synth(text, lang) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = lang.startsWith("zh") ? 1 : 0.92;
      window.speechSynthesis.speak(u);
    } catch {}
  }
  function stopAudio() {
    if (state.audio) { try { state.audio.pause(); } catch {} state.audio = null; }
    try { window.speechSynthesis.cancel(); } catch {}
  }

  function doneCount(id) {
    const d = state.stats.done[id] || [];
    return d.filter(Boolean).length;
  }
  function mastered() {
    return STRINGS.reduce((n, s) => n + doneCount(s.id), 0);
  }

  function totalOf(s) {
    return s.words.length;
  }
  function isJunior(s) {
    return s.source === "junior" || String(s.id).indexOf("jh-") === 0;
  }
  function coreStrings() {
    const core = STRINGS.filter((s) => !isJunior(s));
    return core.length ? core : STRINGS;
  }
  function speakRootName(s) {
    return String(s.root || "").replace(/-/g, "");
  }
  function countLabel(s) {
    const n = totalOf(s);
    return s.single || n === 1 ? "1 个词" : n + " 个词";
  }

  function renderHome() {
    state.view = "home";
    $("#home").classList.remove("hidden");
    $("#learn").classList.remove("on");
    $("#summary").classList.remove("on");
    const core = coreStrings();
    const today = core[new Date().getDate() % core.length];
    $("#today-root").innerHTML = today.root + ' <span class="eq">= ' + today.meaning + "</span>";
    $("#today-tip").textContent = today.tip;
    $("#today-dots").innerHTML = today.words.map((_, i) => {
      const on = (state.stats.done[today.id] || [])[i];
      return '<span class="dot' + (on ? " on" : "") + '"></span>';
    }).join("");
    $("#btn-today").onclick = () => startString(STRINGS.indexOf(today));
    $("#stat-words").textContent = mastered();
    $("#stat-correct").textContent = state.stats.correct;
    $("#stat-strings").textContent = STRINGS.filter((s) => doneCount(s.id) === totalOf(s)).length;
    $("#grid").innerHTML = STRINGS.map((s, idx) => {
      const n = doneCount(s.id);
      const total = totalOf(s);
      const tag = s.single ? "单记" : (isJunior(s) ? "初中" : "");
      return `<button class="string-card" data-i="${idx}">
        <div class="no">第 ${s.no} 串${tag ? " · " + tag : ""}</div>
        <div class="root-line">${escapeHtml(s.root)} <em>= ${escapeHtml(s.meaning)}</em></div>
        <div class="tip">${escapeHtml(s.tip)}</div>
        <div class="progress-mini"><i style="width:${(n / total) * 100}%"></i></div>
        <div class="sub">${n}/${total} 个词已串上${s.also ? " · 也写作 " + s.also : ""}</div>
      </button>`;
    }).join("");
    $("#grid").querySelectorAll(".string-card").forEach((el) => {
      el.onclick = () => startString(Number(el.dataset.i));
    });
    const totalWords = STRINGS.reduce((n, s) => n + s.words.length, 0);
    const bank = document.getElementById("bank-count");
    const juniorN = STRINGS.filter(isJunior).length;
    if (bank) bank.textContent = STRINGS.length + " 串 · " + totalWords + " 词 · 四六级 " + core.length + " 串 + 初中 " + juniorN + " 串";
  }

  function startString(index, fromWord) {
    state.stringIndex = index;
    state.wordIndex = fromWord || 0;
    $("#home").classList.add("hidden");
    $("#summary").classList.remove("on");
    $("#learn").classList.add("on");
    if (fromWord) {
      state.view = "learn";
      showWord();
    } else {
      showIntro();
    }
  }

  function fillHead(s) {
    $("#learn-root").innerHTML = s.root + " <em>= " + s.meaning + "</em>";
    $("#learn-sub").textContent = (s.single ? "单记 · " : "词根 · ") + (s.also ? "也写作 " + s.also + " · " : "") + (isJunior(s) ? "初中词库 · " : "") + "词根串串香 · 每天来一串";
    $("#serial").innerHTML = "第 <b>" + (3960 + s.no) + "</b> 串";
    $("#dots-head").innerHTML = s.words.map((_, i) => {
      const on = (state.stats.done[s.id] || [])[i];
      return '<span class="dot' + (on ? " on" : "") + '"></span>';
    }).join("");
    $("#done-head").textContent = doneCount(s.id) + "/" + totalOf(s) + " 个词已串上";
  }

  function speakRoot(s) {
    speak(speakRootName(s));
    setTimeout(() => speak(s.meaning, "zh"), 1100);
  }

  function showIntro() {
    const s = STRINGS[state.stringIndex];
    state.view = "intro";
    state.locked = true;
    clearInterval(state.timer);
    clearTimeout(state.auto);
    fillHead(s);
    $("#badge").textContent = "先学词根 · 再串词";
    $("#timer").textContent = "听";
    $("#timer").classList.remove("warn");
    const bar = $("#bar-fill");
    bar.style.transition = "none";
    bar.style.transform = "scaleX(1)";
    bar.classList.remove("warn");
    bar.classList.add("ok");
    const letters = s.words.map((w) => w.letters + "字母").join(" · ");
    $("#prompt").innerHTML = `
      <div class="intro-box">
        <div class="intro-kicker">WORD ROOT</div>
        <p class="intro-root">${escapeHtml(s.root)}</p>
        <p class="intro-eq">= ${escapeHtml(s.meaning)}</p>
        <p class="intro-ipa">${escapeHtml(s.ipa || "")}${s.also ? " · 也写作 " + escapeHtml(s.also) : ""}</p>
        <p class="intro-tip">${escapeHtml(s.tip)}</p>
        <div class="sound-row">
          <button class="sound-btn" id="btn-root-en">听词根 ${escapeHtml(s.root)}</button>
          <button class="sound-btn" id="btn-root-zh">听中文 ${escapeHtml(s.meaning)}</button>
        </div>
        <p class="preview-letters">接下来串 ${countLabel(s)}：<b>${escapeHtml(letters)}</b></p>
      </div>`;
    $("#reveal").innerHTML = `<div class="next-row"><button class="big-btn gold" id="btn-begin">${s.single || totalOf(s) === 1 ? "开始学这个词" : "开始串这 " + totalOf(s) + " 个词"}</button></div>`;
    $("#options").innerHTML = "";
    $("#options").style.display = "none";
    $("#foot-note").textContent = "先听词根，再记意思，然后才猜词";
    $("#btn-root-en").onclick = () => speak(speakRootName(s));
    $("#btn-root-zh").onclick = () => speak(s.meaning, "zh");
    $("#btn-begin").onclick = beginWords;
    renderIntroSkewer(s);
    speakRoot(s);
  }

  function renderIntroSkewer(s) {
    $("#skewer").innerHTML = s.words.map((w, i) => {
      return `<div class="kebab"><span class="idx">${i + 1}</span><div><div class="kw">? ${w.letters}字母</div></div></div>`;
    }).join("");
  }

  function beginWords() {
    state.wordIndex = 0;
    state.view = "learn";
    $("#options").style.display = "";
    showWord();
  }

  function current() {
    const s = STRINGS[state.stringIndex];
    return { s, w: s.words[state.wordIndex] };
  }

  function renderSkewer() {
    const { s } = current();
    const done = state.stats.done[s.id] || [];
    $("#skewer").innerHTML = s.words.map((w, i) => {
      const cls = i === state.wordIndex ? " now" : done[i] ? " done" : "";
      let body = "";
      if (done[i] || (i === state.wordIndex && state.locked)) {
        body = `<div><div class="kw">${highlight(w.word, w.highlight)}</div><div class="km">${escapeHtml(w.meaning)}</div></div>`;
      } else if (i === state.wordIndex) {
        const mode = w.mode === "meaning" ? "看词猜意思" : "看意思猜词";
        body = `<div><div class="kw">${i + 1} ${mode}${w.letters}字母</div></div>`;
      } else {
        body = `<div><div class="kw">? ${w.letters}字母</div></div>`;
      }
      return `<div class="kebab${cls}"><span class="idx">${i + 1}</span>${body}</div>`;
    }).join("");
  }

  function showWord() {
    const { s, w } = current();
    state.view = "learn";
    state.locked = false;
    state.picked = -1;
    clearInterval(state.timer);
    clearTimeout(state.auto);
    $("#options").style.display = "";
    $("#learn-root").innerHTML = s.root + " <em>= " + s.meaning + "</em>";
    $("#learn-sub").textContent = (s.single ? "单记 · " : "词根 · ") + (s.also ? "也写作 " + s.also + " · " : "") + (isJunior(s) ? "初中词库 · " : "") + "词根串串香 · 每天来一串";
    $("#serial").innerHTML = "第 <b>" + (3960 + s.no) + "</b> 串";
    $("#dots-head").innerHTML = s.words.map((_, i) => {
      const on = (state.stats.done[s.id] || [])[i];
      const now = i === state.wordIndex;
      return '<span class="dot' + (on ? " on" : "") + (now ? " now" : "") + '"></span>';
    }).join("");
    $("#done-head").textContent = doneCount(s.id) + "/" + totalOf(s) + " 个词已串上";
    const modeName = w.mode === "meaning" ? "猜意思" : "猜拼写";
    $("#badge").textContent = "第 " + (state.wordIndex + 1) + " / " + totalOf(s) + " 词 · " + modeName;
    $("#reveal").innerHTML = "";
    $("#foot-note").textContent = "点选项或键盘 A B C D · 自动发音";

    if (w.mode === "meaning") {
      $("#prompt").innerHTML = `
        <div>
          <p class="word">${highlight(w.word, w.highlight)}</p>
          <p class="ipa">${escapeHtml(w.ipa)}</p>
          <p class="ask">什么意思？</p>
          <button class="sound-btn" id="btn-sound">听发音</button>
        </div>`;
      speak(w.word);
    } else {
      $("#prompt").innerHTML = `
        <div>
          <p class="root-hint">${escapeHtml(s.root)} <span>${escapeHtml(s.meaning)} →</span></p>
          <p class="ask">${escapeHtml(w.promptZh || w.meaning)}</p>
          <p class="ask small">是哪个词？</p>
          <button class="sound-btn" id="btn-sound">听中文</button>
        </div>`;
      speak(w.promptZh || w.meaning, "zh");
    }
    const sound = $("#btn-sound");
    if (sound) sound.onclick = () => {
      if (w.mode === "meaning") speak(w.word);
      else speak(w.promptZh || w.meaning, "zh");
    };

    $("#options").innerHTML = w.options.map((opt, i) => {
      return `<button class="opt" data-i="${i}"><span class="mark">${LETTERS[i]}</span><span>${escapeHtml(opt)}</span></button>`;
    }).join("");
    $("#options").querySelectorAll(".opt").forEach((el) => {
      el.onclick = () => pick(Number(el.dataset.i));
    });
    renderSkewer();
    startTimer();
  }

  function startTimer() {
    state.remain = TOTAL_TIME;
    $("#timer").textContent = state.remain;
    $("#timer").classList.remove("warn");
    const bar = $("#bar-fill");
    bar.classList.remove("warn", "ok");
    bar.style.transition = "none";
    bar.style.transform = "scaleX(1)";
    requestAnimationFrame(() => {
      bar.style.transition = "transform " + TOTAL_TIME + "s linear";
      bar.style.transform = "scaleX(0)";
    });
    state.timer = setInterval(() => {
      state.remain -= 1;
      $("#timer").textContent = Math.max(state.remain, 0);
      if (state.remain <= 5) {
        $("#timer").classList.add("warn");
        bar.classList.add("warn");
      }
      if (state.remain <= 0) pick(-1);
    }, 1000);
  }

  function pick(i) {
    if (state.locked) return;
    state.locked = true;
    state.picked = i;
    clearInterval(state.timer);
    const { s, w } = current();
    const ok = i === w.answer;
    state.stats.seen += 1;
    if (ok) state.stats.correct += 1;
    else state.stats.wrong += 1;
    const arr = state.stats.done[s.id] || Array(totalOf(s)).fill(false);
    if (ok) arr[state.wordIndex] = true;
    state.stats.done[s.id] = arr;
    saveStats();

    $("#options").querySelectorAll(".opt").forEach((el) => {
      const n = Number(el.dataset.i);
      el.disabled = true;
      if (n === w.answer) el.classList.add("correct");
      else if (n === i) el.classList.add("wrong");
      else el.classList.add("dim");
    });
    const bar = $("#bar-fill");
    bar.style.transition = "transform .3s ease";
    bar.style.transform = "scaleX(1)";
    bar.classList.remove("warn");
    bar.classList.add("ok");
    $("#timer").classList.remove("warn");
    $("#timer").textContent = "";
    $("#badge").textContent = (ok ? "答对了 · " : "看答案 · ") + "下一词";

    const pickedLabel = i >= 0 ? LETTERS[i] : "超时";
    const ansText = w.mode === "meaning" ? w.meaning : w.word;
    $("#reveal").innerHTML = `
      <div class="reveal">
        <div class="ans-line">${LETTERS[w.answer]} ${escapeHtml(w.word)} · ${escapeHtml(w.meaning)}</div>
        <div class="formula">${escapeHtml(w.formula)}</div>
        <div class="example">${escapeHtml(w.example)}<br>${escapeHtml(w.exampleZh)}</div>
        <div class="note">${escapeHtml(w.note || "")}</div>
        <div class="next-row">
          <button class="sound-btn" id="btn-again">再听一遍</button>
          <button class="big-btn gold" id="btn-next">${state.wordIndex >= totalOf(s) - 1 ? "串好啦" : "下一词"}</button>
        </div>
      </div>`;
    $("#btn-again").onclick = () => speak(w.word);
    $("#btn-next").onclick = next;
    $("#foot-note").textContent = (ok ? "答对" : (i < 0 ? "超时，正确答案是 " + LETTERS[w.answer] : "你选了 " + pickedLabel)) + " · 词根拆解已给出";
    renderSkewer();
    speak(w.word);
    state.auto = setTimeout(next, 9000);
  }

  function next() {
    clearTimeout(state.auto);
    if (state.wordIndex >= totalOf(STRINGS[state.stringIndex]) - 1) showSummary();
    else {
      state.wordIndex += 1;
      showWord();
    }
  }

  function showSummary() {
    state.view = "summary";
    const s = STRINGS[state.stringIndex];
    $("#learn").classList.remove("on");
    $("#summary").classList.add("on");
    const n = doneCount(s.id);
    $("#sum-title").innerHTML = "<b>" + escapeHtml(s.root) + "</b> " + escapeHtml(s.meaning) + " · 这 " + totalOf(s) + " 个词都带它";
    $("#sum-skewer").innerHTML = s.words.map((w) => {
      const pre = w.prefix ? `<div class="pre"><b>${escapeHtml(w.prefix.t)}</b> ${escapeHtml(w.prefix.m)}</div>` : "<div></div>";
      return `<div class="srow">${pre}<div></div>
        <div class="wordcard">${highlight(w.word, w.highlight)}<span>${escapeHtml(w.meaning)}</span></div>
      </div>`;
    }).join("");
    $("#sum-score").textContent = "本串串上 " + n + "/" + totalOf(s) + " 个词 · 可再练一次或换一串";
    $("#btn-retry").onclick = () => startString(state.stringIndex);
    $("#btn-home").onclick = renderHome;
    const nextIdx = (state.stringIndex + 1) % STRINGS.length;
    $("#btn-next-string").onclick = () => startString(nextIdx, 0);
    $("#btn-next-string").textContent = "下一串 " + STRINGS[nextIdx].root;
    speak(s.words.map((w) => w.word).join(", "));
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 2200);
  }

  function bindGlobal() {
    document.addEventListener("keydown", (e) => {
      if (state.view === "intro") {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          beginWords();
        }
        return;
      }
      if (state.view !== "learn") return;
      const k = e.key.toUpperCase();
      const i = LETTERS.indexOf(k);
      if (i >= 0) pick(i);
      if (e.key === "Enter" && state.locked) next();
      if (e.code === "Space") {
        e.preventDefault();
        const { w } = current();
        speak(w.word);
      }
    });
    $("#btn-back").onclick = renderHome;
    $("#btn-install").onclick = installApp;
    $("#btn-share").onclick = shareApp;
    $("#btn-how").onclick = () => $("#modal").classList.add("on");
    $("#btn-close-modal").onclick = () => $("#modal").classList.remove("on");
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.installEvent = e;
      $("#btn-install").style.display = "inline-flex";
    });
    setupShareUrl();
  }

  async function setupShareUrl() {
    let url = PUBLIC_URL;
    if (location.protocol === "https:" && location.hostname !== "127.0.0.1") {
      url = location.href.split("#")[0];
    }
    state.shareUrl = url;
    if (url.startsWith("http")) {
      $("#qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=" + encodeURIComponent(url);
      $("#share-url").textContent = url;
    } else {
      $("#share-url").textContent = "请先用「打开学习」启动本地服务，再扫码装到手机。";
    }
  }

  async function installApp() {
    if (state.installEvent) {
      state.installEvent.prompt();
      const res = await state.installEvent.userChoice;
      if (res.outcome === "accepted") toast("已添加到桌面");
      state.installEvent = null;
      return;
    }
    $("#modal").classList.add("on");
  }

  async function shareApp() {
    const url = state.shareUrl || location.href.split("#")[0];
    const data = { title: "词根串串香", text: "用词根一串串学单词，带发音和答案。", url };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url || "把「词根串串香」文件夹发给好友，双击 打开学习.command");
      toast("已复制说明，可发给好友");
    } catch {
      $("#modal").classList.add("on");
    }
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  if (/MicroMessenger/i.test(navigator.userAgent)) {
    const tip = document.getElementById("wechat-tip");
    if (tip) { tip.hidden = false; tip.classList.add("show"); }
  }
  bindGlobal();
  renderHome();
  const hash = location.hash.replace("#", "");
  if (hash) {
    const id = hash.split("/")[0];
    const i = STRINGS.findIndex((s) => s.id === id);
    if (i >= 0) startString(i, 0);
  }
})();

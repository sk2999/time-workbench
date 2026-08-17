(function setupCloud() {
  const config = window.TIME_BOARD_SUPABASE;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient || !window.TimeBoardApp) return;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  const q = (selector) => document.querySelector(selector);
  const ui = {
    state: q("#cloudState"), auth: q("#authForm"), email: q("#authEmail"), password: q("#authPassword"), signUp: q("#signUpBtn"),
    account: q("#cloudAccount"), accountEmail: q("#cloudEmail"), signOut: q("#signOutBtn"), choice: q("#migrationChoice"),
    upload: q("#uploadLocalBtn"), download: q("#useCloudBtn"), preferences: q("#reportPreferences"), enabled: q("#reportEnabled"),
    day: q("#reportDay"), hour: q("#reportHour"), message: q("#cloudMessage"),
  };
  let user = null;
  let cloudReady = false;
  let saveTimer;

  function showMessage(text, error = false) {
    ui.message.textContent = text;
    ui.message.classList.toggle("error-text", error);
  }
  const readyKey = () => `time-board-cloud-ready:${user.id}`;

  async function readWorkspace() {
    const result = await client.from("user_workspaces").select("state").eq("user_id", user.id).maybeSingle();
    if (result.error) throw result.error;
    return result.data?.state || { projects: [], goals: [], entries: [], activeEntry: null };
  }
  async function uploadWorkspace() {
    const result = await client.from("user_workspaces").upsert({ user_id: user.id, state: window.TimeBoardApp.getState() });
    if (result.error) throw result.error;
  }
  async function chooseInitialSync(direction) {
    try {
      showMessage("正在同步…");
      if (direction === "upload") await uploadWorkspace();
      else window.TimeBoardApp.replaceState(await readWorkspace());
      localStorage.setItem(readyKey(), "1");
      cloudReady = true;
      ui.choice.hidden = true;
      ui.preferences.hidden = false;
      showMessage("云端同步已开启");
    } catch (error) { showMessage(`同步失败：${error.message}`, true); }
  }
  async function loadPreferences() {
    const result = await client.from("weekly_report_preferences").select("enabled,send_day,send_hour").eq("user_id", user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return;
    ui.enabled.checked = result.data.enabled;
    ui.day.value = String(result.data.send_day);
    ui.hour.value = String(result.data.send_hour);
  }
  async function applySession(session) {
    user = session?.user || null;
    cloudReady = false;
    ui.auth.hidden = Boolean(user);
    ui.account.hidden = !user;
    ui.state.textContent = user ? "已登录" : "未登录";
    if (!user) return;
    ui.accountEmail.textContent = `登录邮箱：${user.email}`;
    try {
      await loadPreferences();
      cloudReady = localStorage.getItem(readyKey()) === "1";
      ui.choice.hidden = cloudReady;
      ui.preferences.hidden = !cloudReady;
      if (cloudReady) {
        window.TimeBoardApp.replaceState(await readWorkspace());
        showMessage("已从云端同步");
      } else showMessage("请选择第一次同步方式");
    } catch (error) { showMessage(`云端尚未配置：${error.message}`, true); }
  }

  ui.auth.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await client.auth.signInWithPassword({ email: ui.email.value.trim(), password: ui.password.value });
    if (result.error) showMessage(`登录失败：${result.error.message}`, true);
  });
  ui.signUp.addEventListener("click", async () => {
    const result = await client.auth.signUp({ email: ui.email.value.trim(), password: ui.password.value });
    showMessage(result.error ? `注册失败：${result.error.message}` : "注册成功，请检查邮箱中的确认邮件", Boolean(result.error));
  });
  ui.signOut.addEventListener("click", () => client.auth.signOut());
  ui.upload.addEventListener("click", () => chooseInitialSync("upload"));
  ui.download.addEventListener("click", () => chooseInitialSync("download"));
  ui.preferences.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await client.from("weekly_report_preferences").upsert({ user_id: user.id, enabled: ui.enabled.checked, send_day: Number(ui.day.value), send_hour: Number(ui.hour.value), timezone: "Asia/Shanghai" });
    showMessage(result.error ? `保存失败：${result.error.message}` : "周报设置已保存", Boolean(result.error));
  });
  window.addEventListener("time-board-state-saved", () => {
    if (!user || !cloudReady) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => uploadWorkspace().catch((error) => showMessage(`自动同步失败：${error.message}`, true)), 900);
  });
  client.auth.onAuthStateChange((_event, session) => setTimeout(() => applySession(session), 0));
  client.auth.getSession().then(({ data }) => applySession(data.session));
  window.TimeBoardCloud = Object.freeze({ client });
})();

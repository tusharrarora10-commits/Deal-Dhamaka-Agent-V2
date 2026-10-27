/* Supabase connection + explicit, non-destructive first migration tools.
   This phase intentionally does not replace local save() with automatic cloud writes. */
(function () {
  const cfg = window.DEAL_DHAMAKA_SUPABASE_CONFIG || {};
  const PLACEHOLDER = "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE";
  let client = null, workspaceId = null, user = null, busy = false;
  const TABLES = {
    contacts: "dd_contacts",
    products: "dd_products",
    shares: "dd_shares",
    activity: "dd_activity",
    templates: "dd_templates"
  };
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function setStatus(message, type) {
    const el = $("ddCloudStatus");
    if (el) { el.textContent = message; el.dataset.type = type || "info"; }
  }
  function setBusy(value) {
    busy = value;
    ["ddCloudSignIn", "ddCloudSignOut", "ddCloudBackup", "ddCloudImport", "ddCloudRefresh"].forEach(id => { const el=$(id); if(el) el.disabled=value; });
  }
  function getLocalState() {
    try { return JSON.parse(localStorage.getItem("dealDhamakaAgentV2") || "{}"); }
    catch (_) { return {}; }
  }
  function normalizeState(x) {
    return {
      contacts: Array.isArray(x.contacts) ? x.contacts : [],
      products: Array.isArray(x.products) ? x.products : [],
      shares: Array.isArray(x.shares) ? x.shares : [],
      activity: Array.isArray(x.activity) ? x.activity : [],
      templates: Array.isArray(x.templates) ? x.templates : []
    };
  }
  function recordId(row, prefix, i) {
    if (row && row.id != null && String(row.id).trim()) return String(row.id);
    return prefix + "-migration-" + i + "-" + btoa(unescape(encodeURIComponent(JSON.stringify(row || {})))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  }
  function getWhatsAppTemplates() {
    try { const x=JSON.parse(localStorage.getItem("dealDhamakaWhatsAppTemplatesV1") || "[]"); return Array.isArray(x) ? x : []; }
    catch (_) { return []; }
  }
  function rowCount(x) { return Object.values(normalizeState(x)).reduce((n,a)=>n+a.length,0) + getWhatsAppTemplates().length; }
  async function ensureClient() {
    if (!cfg.url || !cfg.publishableKey || cfg.publishableKey === PLACEHOLDER) throw new Error("Add your Supabase publishable key in supabase-config.js first.");
    if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client library did not load. Check your internet connection and reload the app.");
    if (!client) client = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return client;
  }
  async function findWorkspace() {
    const { data, error } = await client.from("dd_workspace_members").select("workspace_id,role").eq("user_id", user.id);
    if (error) throw error;
    if (!data || !data.length) throw new Error("This account is not a member of the Deal Dhamaka workspace. Check dd_workspace_members.");
    if (data.length > 1) throw new Error("This account belongs to more than one workspace. Ask the administrator to select the correct workspace.");
    workspaceId = data[0].workspace_id;
    return data[0];
  }
  async function countCloudRecords() {
    let total = 0;
    for (const table of Object.values(TABLES)) {
      const { count, error } = await client.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
      if (error) throw error;
      total += count || 0;
    }
    return total;
  }
  async function backupLocal() {
    const data = getLocalState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), localStorageKey: "dealDhamakaAgentV2", data }, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="deal-dhamaka-local-backup-"+new Date().toISOString().slice(0,10)+".json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    return data;
  }
  async function migrateLocal() {
    if (busy || !client || !user || !workspaceId) return;
    setBusy(true);
    try {
      const local = normalizeState(getLocalState());
      const localCount = rowCount(local);
      if (!localCount) throw new Error("No local records were found under dealDhamakaAgentV2 on this browser.");
      const cloudCount = await countCloudRecords();
      if (cloudCount > 0) throw new Error("Cloud tables already contain " + cloudCount + " records. Automatic migration is blocked to avoid duplicates or overwriting shared data.");
      if (!confirm("Before migration, a local JSON backup will download. Then " + localCount + " local records will be copied to the shared workspace. Continue?")) return;
      await backupLocal();
      let written = 0;
      for (const [stateKey, table] of Object.entries(TABLES)) {
        const rows = local[stateKey];
        for (let i=0; i<rows.length; i++) {
          const item = rows[i];
          const id = recordId(item, stateKey.slice(0,-1) || stateKey, i);
          const { error } = await client.from(table).upsert({ workspace_id: workspaceId, id, payload: item, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "workspace_id,id" });
          if (error) throw new Error(table + " migration stopped after " + written + " records: " + error.message);
          written++;
        }
      }
      // The WhatsApp message templates use a separate legacy localStorage key.
      const waTemplates = getWhatsAppTemplates();
      for (let i=0; i<waTemplates.length; i++) {
        const item = waTemplates[i];
        const id = "whatsapp-template-" + recordId(item, "template", i);
        const { error } = await client.from(TABLES.templates).upsert({ workspace_id: workspaceId, id, payload: { ...item, _source: "dealDhamakaWhatsAppTemplatesV1" }, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "workspace_id,id" });
        if (error) throw new Error("WhatsApp template migration stopped after " + written + " records: " + error.message);
        written++;
      }
      setStatus("Migration completed: " + written + " records copied. Local data remains intact. Verify counts before enabling ongoing sync.", "success");
      alert("Migration completed: " + written + " records copied. Your local data was not deleted.");
    } catch (e) {
      setStatus(e.message || String(e), "error");
      alert("Migration did not complete: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }
  async function inspectCloud() {
    if (busy || !client || !user || !workspaceId) return;
    setBusy(true);
    try {
      const counts = {};
      for (const [key, table] of Object.entries(TABLES)) {
        const { count, error } = await client.from(table).select("id", {count:"exact", head:true}).eq("workspace_id", workspaceId);
        if (error) throw error;
        counts[key] = count || 0;
      }
      setStatus("Connected. Cloud record counts — " + Object.entries(counts).map(([k,v])=>k+": "+v).join(" · ") + ". Ongoing real-time sync is not enabled in this setup phase.", "success");
    } catch(e) { setStatus(e.message || String(e), "error"); }
    finally { setBusy(false); }
  }
  async function signIn(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true);
    try {
      await ensureClient();
      const email = $("ddCloudEmail").value.trim();
      const password = $("ddCloudPassword").value;
      const { data, error } = await client.auth.signInWithPassword({email, password});
      if (error) throw error;
      user = data.user;
      await findWorkspace();
      $("ddCloudIdentity").textContent = "Signed in as " + user.email + " · workspace verified";
      $("ddCloudLoginForm").hidden = true;
      $("ddCloudActions").hidden = false;
      await inspectCloud();
    } catch (e2) {
      setStatus(e2.message || String(e2), "error");
    } finally { setBusy(false); }
  }
  async function signOut() {
    if (!client) return;
    setBusy(true);
    try { await client.auth.signOut(); user=null; workspaceId=null; $("ddCloudLoginForm").hidden=false; $("ddCloudActions").hidden=true; $("ddCloudIdentity").textContent="Not signed in"; setStatus("Signed out. Local app data remains on this device.","info"); }
    catch(e){setStatus(e.message||String(e),"error");}
    finally{setBusy(false);}
  }
  function mount() {
    const settings = $("settings");
    if (!settings || $("ddCloudCard")) return;
    const card = document.createElement("div"); card.className="card"; card.id="ddCloudCard";
    card.innerHTML = '<h3>Shared Cloud (Setup)</h3><p class="hint">Sign in to verify workspace access and inspect the cloud database. Local data stays on this device until you explicitly migrate it.</p><p id="ddCloudIdentity">Not signed in</p><div id="ddCloudStatus" role="status" aria-live="polite">Add the publishable key in supabase-config.js, then sign in.</div><form id="ddCloudLoginForm"><label>Email<input id="ddCloudEmail" type="email" autocomplete="username" required></label><label>Password<input id="ddCloudPassword" type="password" autocomplete="current-password" required></label><button class="primary full" id="ddCloudSignIn" type="submit">Sign in to Supabase</button></form><div id="ddCloudActions" hidden><button class="secondary full" id="ddCloudBackup" type="button">Download local backup</button><button class="primary full" id="ddCloudImport" type="button">Migrate local data to empty cloud</button><button class="secondary full" id="ddCloudRefresh" type="button">Check cloud record counts</button><button class="secondary full" id="ddCloudSignOut" type="button">Sign out</button></div><p class="hint">This is a staged setup utility. It does not enable continuous real-time sync or change the existing local save behavior. Do not deploy as a completed cloud-sync release yet.</p>';
    settings.appendChild(card);
    $("ddCloudLoginForm").addEventListener("submit", signIn);
    $("ddCloudSignOut").addEventListener("click", signOut);
    $("ddCloudBackup").addEventListener("click", async()=>{try{await backupLocal();setStatus("Local backup download started.","success");}catch(e){setStatus(e.message||String(e),"error");}});
    $("ddCloudImport").addEventListener("click", migrateLocal);
    $("ddCloudRefresh").addEventListener("click", inspectCloud);
  }
  window.addEventListener("DOMContentLoaded", mount);
  if (document.readyState !== "loading") mount();
})();

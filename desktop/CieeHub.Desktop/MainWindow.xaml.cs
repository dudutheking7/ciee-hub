using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace CieeHub.Desktop;

public partial class MainWindow : Window
{
    private const string KairosUrl = "https://web.ciee.org.br/";
    private const string ZendeskUrl = "https://cieebr.zendesk.com/agent";
    private const string TalentosUrl = "https://talentos.cieerj.org.br/";

    private CoreWebView2Environment? _env;
    private readonly Dictionary<int, BrowserTab> _tabs = new();
    private readonly Dictionary<string, PendingRoute> _routes = new();
    private int _nextTabId = 1;
    private string _shim = "";
    private string _jspdf = "";
    private readonly List<string> _contentScripts = new();
    private string _themeCss = "";

    private readonly string _appRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CIEE-Hub-Desktop");
    private string StoragePath => Path.Combine(_appRoot, "storage.json");
    private string DownloadsPath => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "CIEE Hub");
    private readonly Dictionary<string, JsonElement> _localStore = new();
    private readonly Dictionary<string, JsonElement> _syncStore = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Closing += (_, _) => SaveStorage();
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(_appRoot);
            Directory.CreateDirectory(DownloadsPath);
            LoadStorage();
            LoadAssets();

            var userData = Path.Combine(_appRoot, "WebView2Profile");
            _env = await CoreWebView2Environment.CreateAsync(null, userData);

            await InitHubAsync();
            await AddBrowserTabAsync(KairosUrl, true, "Kairós");
            HubStatus.Text = "Pronto";
            Log("BOOT", "Hub Desktop iniciado em modo compatibilidade 4.1.4.");
            Log("BOOT", $"Downloads: {DownloadsPath}");
        }
        catch (Exception ex)
        {
            HubStatus.Text = "Erro de inicialização";
            Log("ERRO", ex.ToString());
            MessageBox.Show("Não foi possível iniciar o CIEE Hub Desktop. O Microsoft Edge WebView2 Runtime precisa estar disponível.\n\n" + ex.Message,
                "CIEE Hub Desktop", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadAssets()
    {
        string root = AppContext.BaseDirectory;
        _shim = File.ReadAllText(Path.Combine(root, "Scripts", "desktop-shim.js"));
        string ext = Path.Combine(root, "Assets", "Extension");
        _jspdf = File.ReadAllText(Path.Combine(ext, "js", "libs", "jspdf.umd.min.js"));
        _themeCss = File.ReadAllText(Path.Combine(ext, "css", "theme.css"));
        foreach (var rel in new[] {
            @"js\content\mod-menu.js",
            @"js\content\zendesk-injector.js",
            @"js\content\airtable-scraper.js",
            @"js\content\sharepoint-sniper.js",
            @"js\content\kairos-automations.js",
            @"js\content\talentos-automations.js"
        }) _contentScripts.Add(File.ReadAllText(Path.Combine(ext, rel)));
    }

    private async Task InitHubAsync()
    {
        if (_env is null) return;
        await HubView.EnsureCoreWebView2Async(_env);
        ConfigureCore(HubView.CoreWebView2, null, true);
        HubView.CoreWebView2.SetVirtualHostNameToFolderMapping("app.cieehub.local",
            Path.Combine(AppContext.BaseDirectory, "Assets", "Extension"), CoreWebView2HostResourceAccessKind.Allow);
        await HubView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
            $"window.__CIEE_DESKTOP_CONTEXT__={{kind:'hub',tabId:null}};\n{_shim}");
        HubView.CoreWebView2.Navigate("https://app.cieehub.local/hub.html");
    }

    private async Task<BrowserTab> AddBrowserTabAsync(string url, bool active, string? title = null)
    {
        if (_env is null) throw new InvalidOperationException("WebView2 ainda não inicializado.");
        int id = _nextTabId++;
        var view = new WebView2();
        var item = new TabItem { Header = title ?? $"Aba {id}", Content = view, Tag = id };
        BrowserTabs.Items.Add(item);
        var tab = new BrowserTab(id, view, item);
        _tabs[id] = tab;

        await view.EnsureCoreWebView2Async(_env);
        ConfigureCore(view.CoreWebView2, tab, false);
        await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
            $"window.__CIEE_DESKTOP_CONTEXT__={{kind:'tab',tabId:{id}}};\n{_shim}");
        await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(_jspdf);
        foreach (var script in _contentScripts)
            await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
        var cssJson = JsonSerializer.Serialize(_themeCss);
        await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
            $"(()=>{{const s=document.createElement('style');s.textContent={cssJson};(document.head||document.documentElement).appendChild(s);}})();");

        view.CoreWebView2.Navigate(url);
        if (active) BrowserTabs.SelectedItem = item;
        return tab;
    }

    private void ConfigureCore(CoreWebView2 core, BrowserTab? tab, bool isHub)
    {
        core.Settings.AreDevToolsEnabled = true;
        core.Settings.AreDefaultContextMenusEnabled = true;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsPasswordAutosaveEnabled = true;
        core.WebMessageReceived += async (_, e) => await HandleWebMessageAsync(core, tab, isHub, e);
        core.NewWindowRequested += async (_, e) => {
            e.Handled = true;
            try { await AddBrowserTabAsync(e.Uri, true); } catch (Exception ex) { Log("TAB", ex.Message); }
        };
        core.DownloadStarting += (_, e) => {
            try
            {
                string name = Path.GetFileName(e.ResultFilePath);
                if (string.IsNullOrWhiteSpace(name)) name = $"download-{DateTime.Now:yyyyMMdd-HHmmss}";
                e.ResultFilePath = UniquePath(Path.Combine(DownloadsPath, name));
                Log("DOWNLOAD", $"{e.ResultFilePath}");
            }
            catch (Exception ex) { Log("DOWNLOAD", ex.Message); }
        };
        core.ProcessFailed += (_, e) => Log("WEBVIEW", $"ProcessFailed: {e.ProcessFailedKind}");
        core.NavigationStarting += (_, e) => {
            if (tab != null) { tab.Url = e.Uri; if (BrowserTabs.SelectedItem == tab.Item) AddressBox.Text = e.Uri; }
            Log(isHub ? "HUB-NAV" : $"TAB {tab?.Id}", "→ " + e.Uri);
        };
        core.NavigationCompleted += (_, e) => {
            if (tab != null)
            {
                tab.Url = core.Source;
                var host = Uri.TryCreate(tab.Url, UriKind.Absolute, out var u) ? u.Host : $"Aba {tab.Id}";
                tab.Item.Header = FriendlyTitle(host, tab.Id);
                if (BrowserTabs.SelectedItem == tab.Item) AddressBox.Text = tab.Url;
            }
        };
        core.DocumentTitleChanged += (_, _) => {
            if (tab != null && !string.IsNullOrWhiteSpace(core.DocumentTitle))
                tab.Item.ToolTip = core.DocumentTitle;
        };
    }

    private static string FriendlyTitle(string host, int id)
    {
        if (host.Contains("zendesk", StringComparison.OrdinalIgnoreCase)) return "Zendesk";
        if (host.Contains("talentos", StringComparison.OrdinalIgnoreCase)) return "Talentos";
        if (host.Contains("ciee", StringComparison.OrdinalIgnoreCase) || host.Contains("kairos", StringComparison.OrdinalIgnoreCase)) return "Kairós";
        return $"Aba {id}";
    }

    private async Task HandleWebMessageAsync(CoreWebView2 source, BrowserTab? sourceTab, bool sourceIsHub, CoreWebView2WebMessageReceivedEventArgs e)
    {
        JsonDocument? doc = null;
        try
        {
            doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (!root.TryGetProperty("bridge", out var b) || b.GetString() != "ciee-desktop") return;
            string op = root.GetProperty("op").GetString() ?? "";
            string requestId = root.TryGetProperty("requestId", out var rid) ? rid.GetString() ?? "" : "";
            JsonElement payload = root.TryGetProperty("payload", out var p) ? p.Clone() : JsonDocument.Parse("null").RootElement.Clone();

            switch (op)
            {
                case "log": Log(sourceIsHub ? "HUB" : $"TAB {sourceTab?.Id}", payload.ToString()); return;
                case "storage.get": await ResolveAsync(source, requestId, StorageGet(payload)); return;
                case "storage.set": StorageSet(payload); SaveStorage(); await ResolveAsync(source, requestId, null); return;
                case "storage.remove": StorageRemove(payload); SaveStorage(); await ResolveAsync(source, requestId, null); return;
                case "storage.clear": StorageClear(payload); SaveStorage(); await ResolveAsync(source, requestId, null); return;
                case "tabs.query": await ResolveAsync(source, requestId, TabsQuery(payload)); return;
                case "tabs.get": await ResolveAsync(source, requestId, TabObject(GetTab(payload.GetProperty("tabId").GetInt32()))); return;
                case "tabs.create":
                {
                    string url = payload.TryGetProperty("url", out var u) ? u.GetString() ?? "about:blank" : "about:blank";
                    bool active = !payload.TryGetProperty("active", out var a) || a.ValueKind != JsonValueKind.False;
                    var tab = await AddBrowserTabAsync(url, active);
                    await ResolveAsync(source, requestId, TabObject(tab)); return;
                }
                case "tabs.update": await HandleTabUpdateAsync(source, requestId, payload); return;
                case "tabs.sendMessage": await RouteTabMessageAsync(source, sourceTab, requestId, payload); return;
                case "runtime.sendMessage": await RouteRuntimeMessageAsync(source, sourceTab, sourceIsHub, requestId, payload); return;
                case "runtimeResponse": HandleRuntimeResponse(requestId, payload); return;
                case "debugger.sendCommand": await HandleDebuggerCommandAsync(source, sourceTab, requestId, payload); return;
            }
            await ResolveAsync(source, requestId, null, "Operação Desktop não suportada: " + op);
        }
        catch (Exception ex)
        {
            Log("BRIDGE", ex.ToString());
            try
            {
                if (doc != null && doc.RootElement.TryGetProperty("requestId", out var rid))
                    await ResolveAsync(source, rid.GetString() ?? "", null, ex.Message);
            }
            catch { }
        }
        finally { doc?.Dispose(); }
    }

    private Dictionary<string, JsonElement> StoreFor(string area) => area == "sync" ? _syncStore : _localStore;

    private object StorageGet(JsonElement payload)
    {
        string area = payload.TryGetProperty("area", out var ae) ? ae.GetString() ?? "local" : "local";
        var store = StoreFor(area); var result = new Dictionary<string, object?>();
        var keys = payload.TryGetProperty("keys", out var ke) ? ke : default;
        if (keys.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) foreach (var kv in store) result[kv.Key] = kv.Value;
        else if (keys.ValueKind == JsonValueKind.String) { string k = keys.GetString()!; if (store.TryGetValue(k, out var v)) result[k] = v; }
        else if (keys.ValueKind == JsonValueKind.Array) foreach (var x in keys.EnumerateArray()) { var k=x.GetString(); if(k!=null && store.TryGetValue(k,out var v)) result[k]=v; }
        else if (keys.ValueKind == JsonValueKind.Object) foreach (var prop in keys.EnumerateObject()) result[prop.Name] = store.TryGetValue(prop.Name, out var v) ? v : prop.Value.Clone();
        return result;
    }

    private void StorageSet(JsonElement payload)
    {
        string area = payload.TryGetProperty("area", out var ae) ? ae.GetString() ?? "local" : "local"; var store = StoreFor(area);
        if (!payload.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Object) return;
        foreach (var prop in items.EnumerateObject()) store[prop.Name] = prop.Value.Clone();
    }
    private void StorageRemove(JsonElement payload)
    {
        string area = payload.TryGetProperty("area", out var ae) ? ae.GetString() ?? "local" : "local"; var store = StoreFor(area);
        if (!payload.TryGetProperty("keys", out var keys)) return;
        if (keys.ValueKind == JsonValueKind.String) store.Remove(keys.GetString()!);
        else if (keys.ValueKind == JsonValueKind.Array) foreach(var k in keys.EnumerateArray()) if(k.GetString() is string s) store.Remove(s);
    }
    private void StorageClear(JsonElement payload)
    {
        string area = payload.TryGetProperty("area", out var ae) ? ae.GetString() ?? "local" : "local"; StoreFor(area).Clear();
    }

    private object TabsQuery(JsonElement q)
    {
        IEnumerable<BrowserTab> list = _tabs.Values;
        if (q.TryGetProperty("active", out var active) && active.ValueKind == JsonValueKind.True)
        {
            int? selected = (BrowserTabs.SelectedItem as TabItem)?.Tag is int sid ? sid : null; list = list.Where(t => selected == t.Id);
        }
        if (q.TryGetProperty("url", out var urlq))
        {
            var patterns = urlq.ValueKind == JsonValueKind.Array ? urlq.EnumerateArray().Select(x=>x.GetString()??"").ToArray() : new[]{urlq.GetString()??""};
            list = list.Where(t => patterns.Any(p => WildcardMatch(t.Url, p)));
        }
        return list.Select(TabObject).ToArray();
    }

    private static bool WildcardMatch(string text, string pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern)) return true;
        var regex = "^" + Regex.Escape(pattern).Replace("\\*", ".*") + "$";
        return Regex.IsMatch(text ?? "", regex, RegexOptions.IgnoreCase);
    }

    private BrowserTab? GetTab(int id) => _tabs.TryGetValue(id, out var t) ? t : null;
    private object? TabObject(BrowserTab? t) => t == null ? null : new { id=t.Id, url=t.Url, active=BrowserTabs.SelectedItem==t.Item, title=t.View.CoreWebView2?.DocumentTitle ?? "" };

    private async Task HandleTabUpdateAsync(CoreWebView2 source, string requestId, JsonElement payload)
    {
        BrowserTab? tab = null;
        if (payload.TryGetProperty("tabId", out var idEl) && idEl.ValueKind == JsonValueKind.Number) tab = GetTab(idEl.GetInt32());
        tab ??= CurrentTab(); if (tab == null) { await ResolveAsync(source,requestId,null,"Aba não encontrada"); return; }
        if (payload.TryGetProperty("updateProperties", out var up))
        {
            if (up.TryGetProperty("url", out var u) && u.GetString() is string url && !string.IsNullOrWhiteSpace(url)) tab.View.CoreWebView2.Navigate(url);
            if (up.TryGetProperty("active", out var a) && a.ValueKind == JsonValueKind.True) BrowserTabs.SelectedItem = tab.Item;
        }
        await ResolveAsync(source, requestId, TabObject(tab));
    }

    private async Task RouteTabMessageAsync(CoreWebView2 source, BrowserTab? sourceTab, string requestId, JsonElement payload)
    {
        int id = payload.GetProperty("tabId").GetInt32(); var target = GetTab(id);
        if (target == null) { await ResolveAsync(source,requestId,null,"Aba destino não encontrada"); return; }
        await BeginRouteAsync(source, requestId, new[]{target.View.CoreWebView2}, payload.GetProperty("message").Clone(), SenderObject(sourceTab));
    }

    private async Task RouteRuntimeMessageAsync(CoreWebView2 source, BrowserTab? sourceTab, bool sourceIsHub, string requestId, JsonElement payload)
    {
        var message = payload.GetProperty("message").Clone();
        if (sourceTab != null && message.ValueKind == JsonValueKind.Object && message.TryGetProperty("acao",out var acaoEl))
        {
            var acao=acaoEl.GetString();
            if (acao is "cieeCliqueHumano" or "cieeTeclaHumana" or "cieeSequenciaTeclasHumanas")
            {
                try { await ExecuteHumanInputAsync(sourceTab, message); await ResolveAsync(source,requestId,new{sucesso=true}); }
                catch(Exception ex){ await ResolveAsync(source,requestId,new{sucesso=false,erro=ex.Message}); }
                return;
            }
        }
        var targets = new List<CoreWebView2>();
        if (!sourceIsHub && HubView.CoreWebView2 != null) targets.Add(HubView.CoreWebView2);
        if (sourceIsHub) targets.AddRange(_tabs.Values.Select(t=>t.View.CoreWebView2).Where(x=>x is not null).Cast<CoreWebView2>());
        else targets.AddRange(_tabs.Values.Where(t=>t.Id!=sourceTab?.Id).Select(t=>t.View.CoreWebView2).Where(x=>x is not null).Cast<CoreWebView2>());
        await BeginRouteAsync(source, requestId, targets, message, SenderObject(sourceTab));
    }

    private object SenderObject(BrowserTab? sourceTab) => sourceTab == null ? new { } : new { tab = TabObject(sourceTab) };

    private async Task BeginRouteAsync(CoreWebView2 source, string requestId, IEnumerable<CoreWebView2> targets, JsonElement message, object sender)
    {
        var list = targets.Distinct().ToList(); if (list.Count == 0) { await ResolveAsync(source, requestId, null); return; }
        _routes[requestId] = new PendingRoute(source, requestId);
        string msgJson = message.GetRawText(), senderJson = JsonSerializer.Serialize(sender), reqJson = JsonSerializer.Serialize(requestId);
        foreach (var target in list) try { await target.ExecuteScriptAsync($"window.__cieeDesktopReceiveMessage?.({msgJson},{senderJson},{reqJson})"); } catch { }
        _ = Task.Run(async () => { await Task.Delay(1500); await Dispatcher.InvokeAsync(async () => { if (_routes.Remove(requestId, out var route)) await ResolveAsync(route.Source, route.RequestId, null); }); });
    }

    private async void HandleRuntimeResponse(string requestId, JsonElement payload)
    {
        if (_routes.Remove(requestId, out var route)) await ResolveAsync(route.Source, route.RequestId, payload);
    }

    private async Task HandleDebuggerCommandAsync(CoreWebView2 source, BrowserTab? sourceTab, string requestId, JsonElement payload)
    {
        BrowserTab? tab=sourceTab;
        if(payload.TryGetProperty("target",out var te) && te.TryGetProperty("tabId",out var tid) && tid.ValueKind==JsonValueKind.Number) tab=GetTab(tid.GetInt32());
        if(tab==null){await ResolveAsync(source,requestId,null,"Aba debugger não encontrada");return;}
        string method=payload.GetProperty("method").GetString()??"", pars=payload.TryGetProperty("params",out var pe)?pe.GetRawText():"{}";
        var result=await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync(method,pars); object? parsed=null; try{parsed=JsonSerializer.Deserialize<object>(result);}catch{parsed=result;}
        await ResolveAsync(source,requestId,parsed);
    }

    private async Task ExecuteHumanInputAsync(BrowserTab tab, JsonElement m)
    {
        string acao=m.GetProperty("acao").GetString()!;
        if(acao=="cieeCliqueHumano")
        {
            double x=m.GetProperty("x").GetDouble(), y=m.GetProperty("y").GetDouble();
            foreach(var pair in new[]{("mouseMoved",0),("mousePressed",1),("mouseReleased",0)})
                await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchMouseEvent",JsonSerializer.Serialize(new{type=pair.Item1,x,y,button="left",buttons=pair.Item2,clickCount=1}));
        }
        else if(acao=="cieeSequenciaTeclasHumanas" && m.TryGetProperty("teclas",out var teclas))
        {
            foreach(var t in teclas.EnumerateArray())
            {
                string key=t.TryGetProperty("key",out var k)?k.GetString()??"":"", code=t.TryGetProperty("code",out var c)?c.GetString()??"":""; int vk=t.TryGetProperty("keyCode",out var v)?v.GetInt32():0;
                await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchKeyEvent",JsonSerializer.Serialize(new{type="keyDown",key,code,windowsVirtualKeyCode=vk}));
                await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchKeyEvent",JsonSerializer.Serialize(new{type="keyUp",key,code,windowsVirtualKeyCode=vk})); await Task.Delay(35);
            }
        }
        else
        {
            string key=m.TryGetProperty("tecla",out var k)?k.GetString()??" ":" ", code=m.TryGetProperty("codigo",out var c)?c.GetString()??"Space":"Space"; int vk=m.TryGetProperty("keyCode",out var v)?v.GetInt32():32;
            await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchKeyEvent",JsonSerializer.Serialize(new{type="keyDown",key,code,windowsVirtualKeyCode=vk}));
            await tab.View.CoreWebView2.CallDevToolsProtocolMethodAsync("Input.dispatchKeyEvent",JsonSerializer.Serialize(new{type="keyUp",key,code,windowsVirtualKeyCode=vk}));
        }
    }

    private static async Task ResolveAsync(CoreWebView2 source, string requestId, object? data, string? error=null)
    {
        if (string.IsNullOrWhiteSpace(requestId)) return;
        string r=JsonSerializer.Serialize(requestId), d=JsonSerializer.Serialize(data), er=JsonSerializer.Serialize(error);
        await source.ExecuteScriptAsync($"window.__cieeDesktopResolve?.({r},{d},{er})");
    }

    private void LoadStorage()
    {
        if(!File.Exists(StoragePath)) return;
        try
        {
            using var doc=JsonDocument.Parse(File.ReadAllText(StoragePath));
            if(doc.RootElement.TryGetProperty("local",out var l)) foreach(var p in l.EnumerateObject()) _localStore[p.Name]=p.Value.Clone();
            if(doc.RootElement.TryGetProperty("sync",out var s)) foreach(var p in s.EnumerateObject()) _syncStore[p.Name]=p.Value.Clone();
        } catch(Exception ex){Log("STORAGE","Falha ao carregar: "+ex.Message);}
    }
    private void SaveStorage()
    {
        try { Directory.CreateDirectory(_appRoot); File.WriteAllText(StoragePath,JsonSerializer.Serialize(new{local=_localStore,sync=_syncStore},new JsonSerializerOptions{WriteIndented=true})); }
        catch(Exception ex){Log("STORAGE","Falha ao salvar: "+ex.Message);}
    }

    private BrowserTab? CurrentTab()
    {
        if(BrowserTabs.SelectedItem is TabItem item && item.Tag is int id) return GetTab(id); return null;
    }
    private async void Kairos_Click(object sender,RoutedEventArgs e)=>await OpenOrCreateAsync(KairosUrl,"ciee.org.br");
    private async void Zendesk_Click(object sender,RoutedEventArgs e)=>await OpenOrCreateAsync(ZendeskUrl,"zendesk.com");
    private async void Talentos_Click(object sender,RoutedEventArgs e)=>await OpenOrCreateAsync(TalentosUrl,"talentos.cieerj.org.br");
    private async Task OpenOrCreateAsync(string url,string hostMatch)
    {
        var tab=_tabs.Values.FirstOrDefault(t=>t.Url.Contains(hostMatch,StringComparison.OrdinalIgnoreCase));
        if(tab!=null){BrowserTabs.SelectedItem=tab.Item;if(string.IsNullOrWhiteSpace(tab.Url))tab.View.CoreWebView2.Navigate(url);return;} await AddBrowserTabAsync(url,true);
    }
    private void Go_Click(object sender,RoutedEventArgs e)=>NavigateCurrent(AddressBox.Text);
    private void AddressBox_KeyDown(object sender,KeyEventArgs e){if(e.Key==Key.Enter)NavigateCurrent(AddressBox.Text);}
    private void NavigateCurrent(string raw)
    {
        var tab=CurrentTab(); if(tab==null)return; var url=(raw??"").Trim(); if(string.IsNullOrEmpty(url))return; if(!url.Contains("://"))url="https://"+url; tab.View.CoreWebView2.Navigate(url);
    }
    private void BrowserTabs_SelectionChanged(object sender,SelectionChangedEventArgs e){var t=CurrentTab();if(t!=null)AddressBox.Text=t.Url;}
    private void ClearLog_Click(object sender,RoutedEventArgs e)=>LogBox.Clear();

    private static string UniquePath(string path)
    {
        if(!File.Exists(path))return path; string dir=Path.GetDirectoryName(path)!,name=Path.GetFileNameWithoutExtension(path),ext=Path.GetExtension(path);int i=2;string p;do{p=Path.Combine(dir,$"{name} ({i++}){ext}");}while(File.Exists(p));return p;
    }
    private void Log(string source,string text)
    {
        if(!Dispatcher.CheckAccess()){Dispatcher.Invoke(()=>Log(source,text));return;} LogBox.AppendText($"[{DateTime.Now:HH:mm:ss}] [{source}] {text}\r\n");LogBox.ScrollToEnd();
    }

    private sealed class BrowserTab
    {
        public int Id {get;} public WebView2 View {get;} public TabItem Item {get;} public string Url {get;set;}="";
        public BrowserTab(int id,WebView2 view,TabItem item){Id=id;View=view;Item=item;}
    }
    private sealed record PendingRoute(CoreWebView2 Source,string RequestId);
}

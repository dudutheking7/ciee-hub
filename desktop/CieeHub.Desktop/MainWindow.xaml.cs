using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;

namespace CieeHub.Desktop;

public partial class MainWindow : Window
{
    private const string KairosUrl = "https://web.ciee.org.br/";
    private const string ZendeskUrl = "https://cieebr.zendesk.com/agent";
    private const string TalentosUrl = "about:blank";

    private string? _bridgeScript;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            SetStatus("Inicializando WebView2...");
            await Browser.EnsureCoreWebView2Async();

            Browser.CoreWebView2.Settings.AreDevToolsEnabled = true;
            Browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            Browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;

            Browser.CoreWebView2.NavigationStarting += CoreWebView2_NavigationStarting;
            Browser.CoreWebView2.NavigationCompleted += CoreWebView2_NavigationCompleted;
            Browser.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            Browser.CoreWebView2.DownloadStarting += CoreWebView2_DownloadStarting;
            Browser.CoreWebView2.ProcessFailed += CoreWebView2_ProcessFailed;

            _bridgeScript = await LoadBridgeScriptAsync();
            await Browser.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(_bridgeScript);

            SetStatus("WebView2 conectado. Ponte JS registrada.");
            Log("BOOT", "WebView2 inicializado com sucesso.");
            Navigate(KairosUrl);
        }
        catch (Exception ex)
        {
            SetStatus("Falha ao iniciar WebView2.");
            Log("ERRO", ex.ToString());
            MessageBox.Show(
                "Não foi possível inicializar o WebView2. Verifique se o Microsoft Edge WebView2 Runtime está disponível nesta máquina.\n\n" + ex.Message,
                "CIEE Hub Desktop",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private static async Task<string> LoadBridgeScriptAsync()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Scripts", "hub-bridge.js");
        if (!File.Exists(path))
            throw new FileNotFoundException("Script da ponte não encontrado.", path);

        return await File.ReadAllTextAsync(path);
    }

    private void Navigate(string? rawUrl)
    {
        if (Browser.CoreWebView2 is null) return;

        var url = (rawUrl ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(url)) return;

        if (!url.Contains("://", StringComparison.Ordinal) && !url.StartsWith("about:", StringComparison.OrdinalIgnoreCase))
            url = "https://" + url;

        try
        {
            Browser.CoreWebView2.Navigate(url);
        }
        catch (Exception ex)
        {
            Log("NAV", $"Falha ao navegar para {url}: {ex.Message}");
        }
    }

    private void OpenKairosButton_Click(object sender, RoutedEventArgs e) => Navigate(KairosUrl);
    private void OpenZendeskButton_Click(object sender, RoutedEventArgs e) => Navigate(ZendeskUrl);

    private void OpenTalentosButton_Click(object sender, RoutedEventArgs e)
    {
        Log("TALENTOS", "URL canônica ainda não fixada no MVP. Use a barra de endereço para abrir o Portal de Talentos.");
        Navigate(TalentosUrl);
    }

    private async void InjectBridgeButton_Click(object sender, RoutedEventArgs e)
    {
        if (Browser.CoreWebView2 is null || string.IsNullOrWhiteSpace(_bridgeScript)) return;

        try
        {
            await Browser.CoreWebView2.ExecuteScriptAsync(_bridgeScript);
            Log("BRIDGE", "Ponte reinjetada manualmente na página atual.");
        }
        catch (Exception ex)
        {
            Log("BRIDGE", "Falha na reinjeção: " + ex.Message);
        }
    }

    private async void ProbePageButton_Click(object sender, RoutedEventArgs e)
    {
        if (Browser.CoreWebView2 is null) return;

        const string script = "window.CieeHubBridge ? window.CieeHubBridge.probe() : ({ok:false,error:'bridge-ausente'})";
        try
        {
            var json = await Browser.CoreWebView2.ExecuteScriptAsync(script);
            Log("PROBE", json);
        }
        catch (Exception ex)
        {
            Log("PROBE", "Erro: " + ex.Message);
        }
    }

    private async void StopAutomationButton_Click(object sender, RoutedEventArgs e)
    {
        if (Browser.CoreWebView2 is null) return;

        try
        {
            await Browser.CoreWebView2.ExecuteScriptAsync("window.__CIEE_HUB_STOP__ = true; window.isRoboCVParado = true;");
            SetStatus("Parada solicitada pelo operador.");
            Log("STOP", "Flags de parada enviadas à página atual.");
        }
        catch (Exception ex)
        {
            Log("STOP", ex.Message);
        }
    }

    private void GoButton_Click(object sender, RoutedEventArgs e) => Navigate(AddressBox.Text);

    private void AddressBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
            Navigate(AddressBox.Text);
    }

    private void CoreWebView2_NavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        SetStatus("Navegando...");
        AddressBox.Text = e.Uri;
        Log("NAV", "→ " + e.Uri);
    }

    private void CoreWebView2_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess)
        {
            SetStatus("Página carregada. Ponte aguardando comandos.");
            AddressBox.Text = Browser.Source?.ToString() ?? AddressBox.Text;
            Log("NAV", "Página carregada.");
        }
        else
        {
            SetStatus("Falha de navegação.");
            Log("NAV", $"Erro WebView2: {e.WebErrorStatus}");
        }
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var raw = e.WebMessageAsJson;
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeProp) ? typeProp.GetString() ?? "PAGE" : "PAGE";
            var message = root.TryGetProperty("message", out var messageProp) ? messageProp.ToString() : raw;
            Log(type.ToUpperInvariant(), message);
        }
        catch
        {
            Log("PAGE", e.TryGetWebMessageAsString());
        }
    }

    private void CoreWebView2_DownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs e)
    {
        Log("DOWNLOAD", $"Iniciado: {e.DownloadOperation.Uri}");
        e.DownloadOperation.StateChanged += (_, _) =>
        {
            Dispatcher.Invoke(() => Log("DOWNLOAD", $"Estado: {e.DownloadOperation.State} | {e.DownloadOperation.ResultFilePath}"));
        };
    }

    private void CoreWebView2_ProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
    {
        SetStatus("Processo do navegador falhou.");
        Log("WEBVIEW", $"ProcessFailed: {e.ProcessFailedKind}");
    }

    private void SetStatus(string text) => StatusText.Text = text;

    private void Log(string source, string text)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] [{source}] {text}";
        LogBox.AppendText(line + Environment.NewLine);
        LogBox.ScrollToEnd();
    }
}

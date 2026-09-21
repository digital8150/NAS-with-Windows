using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Windows.Forms;
using Microsoft.Win32;

namespace ReelDriveTray
{
    static class Program
    {
        private static System.Threading.Mutex _appMutex;

        [STAThread]
        static void Main()
        {
            bool createdNew;
            _appMutex = new System.Threading.Mutex(true, "UniversalReactNASEngineTrayMutex_Art", out createdNew);
            if (!createdNew)
            {
                return;
            }

            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new TrayAppContext());
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tray_error.log"),
                        DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "\n" + ex.ToString() + "\n\n");
                }
                catch { }
            }
            finally
            {
                if (_appMutex != null)
                {
                    try { _appMutex.ReleaseMutex(); } catch { }
                    _appMutex.Dispose();
                }
            }
        }
    }

    public class TrayAppContext : ApplicationContext
    {
        [System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern bool DestroyIcon(IntPtr handle);

        private NotifyIcon _notifyIcon;
        private ContextMenuStrip _contextMenu;
        private ToolStripMenuItem _menuStatus;
        private ToolStripMenuItem _menuAutoStart;
        private ToolStripMenuItem _menuToggleService;
        private Timer _healthTimer;
        private bool _isServicesRunning = false;

        private Icon _iconActive;
        private Icon _iconInactive;

        private readonly string _repoDir;
        private readonly string _nginxExe = @"C:\nginx\nginx.exe";
        private readonly string _nginxDir = @"C:\nginx";
        private const string DomainUrl = "https://pc.codingbot.kr";
        private const string LocalUrl = "http://localhost";
        private const string HealthUrl = "http://127.0.0.1:3001/api/health";
        private const string StartupRegKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        private const string AppName = "ReelDriveNAS";
        private static readonly string HostName = Environment.MachineName.Length > 20 ? Environment.MachineName.Substring(0, 20) : Environment.MachineName;

        public TrayAppContext()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Directory.Exists(Path.Combine(baseDir, "server")))
            {
                _repoDir = baseDir;
            }
            else if (Directory.Exists(Path.Combine(baseDir, "..", "server")))
            {
                _repoDir = Path.GetFullPath(Path.Combine(baseDir, ".."));
            }
            else if (Directory.Exists(@"F:\repos\NAS-with-Windows\server"))
            {
                _repoDir = @"F:\repos\NAS-with-Windows";
            }
            else
            {
                _repoDir = baseDir;
            }

            _iconActive = CreateAppIcon(true);
            _iconInactive = CreateAppIcon(false);

            InitializeComponents();
            StartServices();

            // 10초마다 서비스 상태 점검
            _healthTimer = new Timer();
            _healthTimer.Interval = 10000;
            _healthTimer.Tick += (s, e) => CheckHealth();
            _healthTimer.Start();

            CheckHealth();

            // 시작 안내 풍선 알림
            _notifyIcon.ShowBalloonTip(3000, HostName + " 개인 저장소", "서버가 정상적으로 시작되었습니다.\n트레이 아이콘을 더블클릭하면 웹 저장소가 열립니다.", ToolTipIcon.Info);
        }

        private void InitializeComponents()
        {
            _contextMenu = new ContextMenuStrip();

            var menuOpenWeb = new ToolStripMenuItem("🌐 웹 저장소 열기 (pc.codingbot.kr)", null, (s, e) => OpenBrowser(DomainUrl));
            menuOpenWeb.Font = new Font(menuOpenWeb.Font, FontStyle.Bold);

            var menuOpenLocal = new ToolStripMenuItem("🖥️ 로컬 주소로 열기 (localhost)", null, (s, e) => OpenBrowser(LocalUrl));

            _menuStatus = new ToolStripMenuItem("● 상태 확인 중...") { Enabled = false };

            var menuRestart = new ToolStripMenuItem("🔄 서버 재시작", null, (s, e) => RestartServices());
            _menuToggleService = new ToolStripMenuItem("🛑 서버 일시 중지", null, (s, e) => ToggleServices());

            _menuAutoStart = new ToolStripMenuItem("⚙️ Windows 시작 시 자동 실행", null, (s, e) => ToggleAutoStart());
            _menuAutoStart.Checked = IsAutoStartEnabled();

            var menuOpenFolder = new ToolStripMenuItem("📁 저장소 폴더 열기", null, (s, e) => OpenFolder(_repoDir));

            var menuExit = new ToolStripMenuItem("❌ 종료", null, (s, e) => ExitApp());

            _contextMenu.Items.Add(menuOpenWeb);
            _contextMenu.Items.Add(menuOpenLocal);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(_menuStatus);
            _contextMenu.Items.Add(menuRestart);
            _contextMenu.Items.Add(_menuToggleService);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(_menuAutoStart);
            _contextMenu.Items.Add(menuOpenFolder);
            _contextMenu.Items.Add(new ToolStripSeparator());
            _contextMenu.Items.Add(menuExit);

            _notifyIcon = new NotifyIcon
            {
                Icon = _iconActive,
                ContextMenuStrip = _contextMenu,
                Text = HostName + " 개인 저장소",
                Visible = true
            };

            _notifyIcon.DoubleClick += (s, e) => OpenBrowser(DomainUrl);
        }

        private Icon CreateAppIcon(bool active)
        {
            try
            {
                using (var bmp = new Bitmap(32, 32))
                {
                    using (var g = Graphics.FromImage(bmp))
                    {
                        g.SmoothingMode = SmoothingMode.AntiAlias;
                        g.Clear(Color.Transparent);

                        // 보라/인디고 그라디언트 배경
                        Color bgGrad1 = active ? Color.FromArgb(127, 109, 242) : Color.FromArgb(120, 120, 120);
                        Color bgGrad2 = active ? Color.FromArgb(90, 70, 200) : Color.FromArgb(80, 80, 80);

                        using (var brush = new LinearGradientBrush(new Rectangle(0, 0, 32, 32), bgGrad1, bgGrad2, 45f))
                        {
                            g.FillEllipse(brush, 1, 1, 30, 30);
                        }

                        // 서버/스토리지 기호
                        using (var pen = new Pen(Color.White, 2f))
                        {
                            g.DrawRectangle(pen, 7, 9, 18, 6);
                            g.DrawRectangle(pen, 7, 17, 18, 6);

                            using (var dotBrush = new SolidBrush(active ? Color.FromArgb(90, 240, 140) : Color.LightGray))
                            {
                                g.FillEllipse(dotBrush, 20, 11, 2, 2);
                                g.FillEllipse(dotBrush, 20, 19, 2, 2);
                            }
                        }
                    }

                    IntPtr hIcon = bmp.GetHicon();
                    try
                    {
                        using (var temp = Icon.FromHandle(hIcon))
                        {
                            return (Icon)temp.Clone();
                        }
                    }
                    finally
                    {
                        DestroyIcon(hIcon);
                    }
                }
            }
            catch
            {
                return SystemIcons.Application;
            }
        }

        private void StartServices()
        {
            try
            {
                // 1. Nginx 확인 및 시작
                if (Process.GetProcessesByName("nginx").Length == 0)
                {
                    if (File.Exists(_nginxExe))
                    {
                        var nginxPsi = new ProcessStartInfo
                        {
                            FileName = _nginxExe,
                            Arguments = "-p " + _nginxDir,
                            WorkingDirectory = _nginxDir,
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = false
                        };
                        Process.Start(nginxPsi);
                    }
                }

                // 2. Node 백엔드 확인 및 시작
                if (!IsBackendPortListening())
                {
                    string indexPath = Path.Combine(_repoDir, "server", "src", "index.js");
                    if (File.Exists(indexPath))
                    {
                        string nodeBin = File.Exists(@"C:\Program Files\nodejs\node.exe") ? @"C:\Program Files\nodejs\node.exe" : "node.exe";
                        var nodePsi = new ProcessStartInfo
                        {
                            FileName = nodeBin,
                            Arguments = "server/src/index.js",
                            WorkingDirectory = _repoDir,
                            WindowStyle = ProcessWindowStyle.Hidden,
                            CreateNoWindow = true,
                            UseShellExecute = false
                        };
                        Process.Start(nodePsi);
                    }
                }

                _isServicesRunning = true;
                _menuToggleService.Text = "🛑 서버 일시 중지";
            }
            catch (Exception ex)
            {
                _notifyIcon.ShowBalloonTip(3000, HostName, "서버 시작 중 오류: " + ex.Message, ToolTipIcon.Warning);
            }
        }

        private void StopServices()
        {
            try
            {
                // Nginx 중지
                if (File.Exists(_nginxExe))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = _nginxExe,
                        Arguments = "-s stop -p " + _nginxDir,
                        WorkingDirectory = _nginxDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    var p = Process.Start(psi);
                    if (p != null) p.WaitForExit(3000);
                }

                foreach (var proc in Process.GetProcessesByName("nginx"))
                {
                    try { proc.Kill(); } catch { }
                }

                // 포트 3001 점유 프로세스(Node) 종료
                StopProcessOnPort(3001);

                _isServicesRunning = false;
                _menuToggleService.Text = "▶️ 서버 시작";
                _menuStatus.Text = "● 서비스 중지됨";
                _menuStatus.ForeColor = Color.Gray;
                _notifyIcon.Icon = _iconInactive;
                _notifyIcon.Text = HostName + " 저장소 (중지됨)";
            }
            catch { }
        }

        private void RestartServices()
        {
            _notifyIcon.ShowBalloonTip(2000, HostName, "서버를 재시작하는 중입니다...", ToolTipIcon.Info);
            StopServices();
            System.Threading.Thread.Sleep(1000);
            StartServices();
            CheckHealth();
        }

        private void ToggleServices()
        {
            if (_isServicesRunning)
            {
                StopServices();
                _notifyIcon.ShowBalloonTip(2000, HostName, "저장소 서버가 중지되었습니다.", ToolTipIcon.Info);
            }
            else
            {
                StartServices();
                _notifyIcon.ShowBalloonTip(2000, HostName, "저장소 서버가 시작되었습니다.", ToolTipIcon.Info);
                CheckHealth();
            }
        }

        private void CheckHealth()
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(HealthUrl);
                req.Timeout = 3000;
                req.Method = "GET";

                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    if (res.StatusCode == HttpStatusCode.OK)
                    {
                        _isServicesRunning = true;
                        _menuStatus.Text = "● 정상 작동 중";
                        _menuStatus.ForeColor = Color.DarkGreen;
                        _notifyIcon.Text = HostName + " 개인 저장소 (정상 작동 중)";
                        _notifyIcon.Icon = _iconActive;
                        _menuToggleService.Text = "🛑 서버 일시 중지";
                        return;
                    }
                }
            }
            catch { }

            if (_isServicesRunning)
            {
                _menuStatus.Text = "● 응답 대기 중...";
                _menuStatus.ForeColor = Color.DarkOrange;
                _notifyIcon.Text = HostName + " 개인 저장소 (연결 중...)";
            }
            else
            {
                _menuStatus.Text = "● 서비스 중지됨";
                _menuStatus.ForeColor = Color.Gray;
                _notifyIcon.Text = HostName + " 개인 저장소 (중지됨)";
                _notifyIcon.Icon = _iconInactive;
            }
        }

        private bool IsBackendPortListening()
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(HealthUrl);
                req.Timeout = 1000;
                req.Method = "GET";
                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void StopProcessOnPort(int port)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr \":{0}\" ^| findstr \"LISTENING\"') do taskkill /F /PID %a", port),
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                var p = Process.Start(psi);
                if (p != null) p.WaitForExit(3000);
            }
            catch { }
        }

        private void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("브라우저를 열 수 없습니다: " + ex.Message, HostName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OpenFolder(string folder)
        {
            try
            {
                if (Directory.Exists(folder))
                {
                    Process.Start(new ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
                }
            }
            catch { }
        }

        private bool IsAutoStartEnabled()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(StartupRegKey, false))
                {
                    return key != null && key.GetValue(AppName) != null;
                }
            }
            catch
            {
                return false;
            }
        }

        private void ToggleAutoStart()
        {
            try
            {
                bool currentState = IsAutoStartEnabled();
                using (var key = Registry.CurrentUser.OpenSubKey(StartupRegKey, true))
                {
                    if (key != null)
                    {
                        if (currentState)
                        {
                            key.DeleteValue(AppName, false);
                            _menuAutoStart.Checked = false;
                            _notifyIcon.ShowBalloonTip(2000, HostName, "Windows 시작 시 자동 실행이 해제되었습니다.", ToolTipIcon.Info);
                        }
                        else
                        {
                            string exePath = Application.ExecutablePath;
                            key.SetValue(AppName, "\"" + exePath + "\"");
                            _menuAutoStart.Checked = true;
                            _notifyIcon.ShowBalloonTip(2000, HostName, "Windows 시작 시 자동 실행되도록 설정되었습니다.", ToolTipIcon.Info);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("자동 실행 설정을 변경할 수 없습니다: " + ex.Message, HostName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ExitApp()
        {
            var result = MessageBox.Show(
                HostName + " 저장소 트레이 앱을 종료하시겠습니까?\n\n'예'를 누르면 백그라운드 서버도 함께 안전하게 종료됩니다.\n'아니오'를 누르면 서버는 유지하고 트레이만 닫습니다.",
                HostName + " 종료 확인",
                MessageBoxButtons.YesNoCancel,
                MessageBoxIcon.Question);

            if (result == DialogResult.Cancel)
            {
                return;
            }

            if (result == DialogResult.Yes)
            {
                StopServices();
            }

            if (_healthTimer != null)
            {
                _healthTimer.Stop();
                _healthTimer.Dispose();
            }

            if (_notifyIcon != null)
            {
                _notifyIcon.Visible = false;
                _notifyIcon.Dispose();
            }

            if (_iconActive != null) _iconActive.Dispose();
            if (_iconInactive != null) _iconInactive.Dispose();

            ExitThread();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (_healthTimer != null) _healthTimer.Dispose();
                if (_notifyIcon != null) _notifyIcon.Dispose();
                if (_contextMenu != null) _contextMenu.Dispose();
                if (_iconActive != null) _iconActive.Dispose();
                if (_iconInactive != null) _iconInactive.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

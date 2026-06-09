/// Comprueba si el proceso actual tiene privilegios elevados.
///
/// - Windows: lee el token del proceso y comprueba `TokenElevation`.
/// - Unix:    comprueba `getuid() == 0`.
pub fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::HANDLE;
        use windows::Win32::Security::{
            GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
        };
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        unsafe {
            let mut token = HANDLE::default();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
                return false;
            }
            let mut elevation = TOKEN_ELEVATION::default();
            let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
            GetTokenInformation(
                token,
                TokenElevation,
                Some(&mut elevation as *mut _ as *mut std::ffi::c_void),
                size,
                &mut size,
            )
            .map(|_| elevation.TokenIsElevated != 0)
            .unwrap_or(false)
        }
    }

    #[cfg(target_os = "macos")]
    {
        // En macOS comprobamos con `id -u`
        std::process::Command::new("id")
            .arg("-u")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "0")
            .unwrap_or(false)
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("id")
            .arg("-u")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "0")
            .unwrap_or(false)
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        false
    }
}

/// Relanza la app con privilegios elevados y cierra la instancia actual.
///
/// - Windows: `Start-Process -Verb RunAs` vía PowerShell (dispara el diálogo UAC).
/// - macOS:   `osascript` con `do shell script ... with administrator privileges`.
/// - Linux:   `pkexec` (PolicyKit).
pub fn relaunch_as_admin() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_path = exe.to_string_lossy().to_string();

    #[cfg(windows)]
    {
        std::process::Command::new("powershell")
            .args([
                "-WindowStyle", "Hidden",
                "-Command",
                &format!("Start-Process -FilePath '{}' -Verb RunAs", exe_path),
            ])
            .spawn()
            .map_err(|e| format!("No se pudo elevar el proceso: {}", e))?;

        std::process::exit(0);
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "do shell script \"'{}' &\" with administrator privileges",
                    exe_path
                ),
            ])
            .spawn()
            .map_err(|e| format!("No se pudo elevar el proceso: {}", e))?;

        std::process::exit(0);
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("pkexec")
            .arg(&exe_path)
            .spawn()
            .map_err(|e| format!("pkexec falló: {}. Intenta: sudo portview", e))?;

        std::process::exit(0);
    }

    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        let _ = exe_path;
        Err("Elevación no implementada en este SO".to_string())
    }
}

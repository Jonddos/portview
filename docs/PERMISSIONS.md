# Permisos y privilegios

PortView necesita permisos elevados para ver **todos** los procesos del sistema (no solo los del usuario que lanzó la app). Este documento explica el comportamiento en cada SO.

---

## Comportamiento sin privilegios

| Acción | Sin privilegios | Con privilegios |
|---|---|---|
| Ver puertos propios | ✅ | ✅ |
| Ver puertos de otros usuarios | ❌ | ✅ |
| Ver puertos del sistema | ❌ | ✅ |
| Matar proceso propio | ✅ | ✅ |
| Matar proceso de otro usuario | ❌ | ✅ |
| Ver ruta del ejecutable de procesos del sistema | ❌ (parcial) | ✅ |

La app siempre arranca sin privilegios, muestra lo que puede y ofrece un botón **"Obtener más información (elevar privilegios)"**.

---

## Windows

### Modo normal (sin UAC)
- La app ve todos los puertos TCP/UDP (las APIs `GetExtendedTcpTable` / `GetExtendedUdpTable` devuelven el PID incluso sin admin).
- Puede **no** ver la ruta del ejecutable para procesos del sistema (`PID 4`, `svchost.exe` de sesiones de otro usuario).
- Puede **no** matar procesos del sistema o de otros usuarios.

### Modo administrador (con UAC)
- Visibilidad y control total.
- **Cómo elevar**: botón en la UI → la app llama a `ShellExecuteEx` con `runas` para relanzarse elevada.

### Manifiesto
```xml
<!-- src-tauri/src/main.manifest -->
<requestedExecutionLevel level="asInvoker" uiAccess="false"/>
```
El relanzamiento elevado es explícito (el usuario acepta el diálogo UAC).

---

## macOS

### Modo normal
- `lsof` y las APIs de `netstat2` devuelven puertos pero pueden omitir el PID de procesos de sistema.
- Sin root no se puede obtener info de procesos de otros usuarios.

### Modo con privilegios
- Relanzar con `sudo` o con `AuthorizationExecuteWithPrivileges` (deprecated en macOS 13+, pero funciona).
- Plan recomendado: detectar si corremos como root (`getuid() == 0`), y si no, ofrecer relanzar con `osascript -e 'do shell script "..." with administrator privileges'`.

### SIP (System Integrity Protection)
- SIP **no** bloquea la lectura de sockets de red.
- SIP **sí** bloquea matar ciertos procesos del sistema (com.apple.*, launchd) aunque seas root → la app debe manejar este error gracefully.

---

## Linux

### Modo normal
- `/proc/net/tcp` es legible por cualquier usuario pero los inodos no siempre mapean a un PID de otro usuario.
- `ss` y `netstat` muestran puertos pero no el proceso si no eres root.

### Modo root
- Lectura completa de `/proc/<pid>/` de todos los procesos.
- Kill de cualquier proceso (con las limitaciones normales del kernel).

### Cómo elevar en Linux
La app intentará (en orden):
1. `pkexec portview` — gráfico, integrado con PolicyKit.
2. `sudo -A portview` — si hay `SUDO_ASKPASS` configurado.
3. Mostrar instrucción manual: `sudo portview`.

---

## Indicador visual de privilegios

En la barra superior de la UI:

- 🔵 **Vista parcial** — viendo solo procesos del usuario actual.
- 🟢 **Vista completa** — ejecutando con privilegios de administrador/root.
- Botón ⬆ **Elevar** siempre visible en modo parcial.

---

## Seguridad

- La app **nunca** persiste ni registra credenciales.
- El kill de un proceso siempre pasa por un diálogo de confirmación que muestra claramente el nombre, PID y puerto afectado.
- En macOS/Linux, el proceso elevado y el UI pueden correr en procesos separados conectados por socket local (Fase 5).

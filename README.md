# v4lt3s · MVP local

Prototipo frontend sin dependencias para explorar una consola de secretos en español.

## Ejecutar

```bash
npm start
```

Después abre http://localhost:4174.

## Aplicación de escritorio

Instala dependencias una vez y arranca el vault persistente:

```bash
npm install
En Linux, si Electron no puede configurar su helper SUID, el script de desarrollo usa `--no-sandbox` para arrancar el prototipo. Para producción debe configurarse `node_modules/electron/dist/chrome-sandbox` como root:root con permisos 4755.
npm run desktop
```

La aplicación guarda el vault en el directorio privado de datos de Electron, cifrado con AES-256-GCM. La clave de cifrado se protege mediante el llavero del sistema usando `safeStorage`; si el llavero no está disponible, v4lt3s no guarda el vault. No uses datos reales hasta instalar y probar el llavero de tu sistema.

## Estado actual

- Navegación, dashboard, secretos recientes y búsqueda.
- Generador criptográficamente aleatorio mediante `crypto.getRandomValues`.
- Generador de frases seguras.
- Importación de imagen con revisión manual (la integración OCR real aún debe añadirse).
- Flujo de exposición simulado para probar la interfaz.
- Flujo de rotación en bloque con confirmación pendiente.
- Datos de demo guardados únicamente en `localStorage`; no usar en producción.

## Próxima integración segura

El backend debe usar una cuenta de servicio de 1Password con mínimo privilegio, el CLI `op` o Connect/SDK, y nunca persistir secretos en logs. La integración de Watchtower/HIBP debe conservar el modelo de hash parcial y no enviar contraseñas completas.

## Puente experimental con 1Password CLI

Con `op` instalado y autenticado, el puente consulta solo metadatos:

```bash
OP_VAULT=Personal node onepassword-bridge.mjs list
node onepassword-bridge.mjs ref "Stripe · Producción" password
```

La segunda orden devuelve una referencia `op://...`, no el secreto. Antes de exponer operaciones desde la interfaz habrá que añadir autorización de usuario, control de vaults y auditoría.

## Have I Been Pwned

El puente `hibp-bridge.mjs` añade comprobaciones reales:

```bash
node hibp-bridge.mjs password 'contraseña-a-comprobar'
HIBP_API_KEY='tu-clave-HIBP' node hibp-bridge.mjs email usuario@dominio.com
HIBP_API_KEY='tu-clave-HIBP' node hibp-bridge.mjs stealer usuario@dominio.com
```

La comprobación de contraseña envía únicamente el prefijo de 5 caracteres del hash SHA-1, nunca la contraseña ni el hash completo. La consulta de correo requiere una suscripción/API key y debe ejecutarse solo desde backend. HIBP exige un `user-agent` identificable y documenta ambos modelos en su [API v3](https://haveibeenpwned.com/API/v3).

La consulta `stealer` devuelve únicamente dominios afectados, nunca las contraseñas capturadas. Requiere acceso autorizado a la función de stealer logs. Mozilla Monitor se mostrará como enlace complementario porque no se integra como API pública; Mozilla indica que sus alertas usan datos de Monitor y bases de filtraciones conocidas.

## Analizar exportaciones de navegadores

Selecciona manualmente el CSV exportado desde Chrome o Firefox y ejecuta:

```bash
node browser-import.mjs /ruta/al/export.csv
```

El script detecta cuentas repetidas usando una huella SHA-256 local y solo devuelve URL/usuario; no imprime ni conserva las contraseñas. El CSV exportado sigue siendo texto legible: elimínalo manualmente después de terminar la migración.

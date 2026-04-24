/* eslint-disable sonarjs/no-hardcoded-passwords -- tutorial examples */
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { IntegrationStatus } from "../../api/status/route";
import type { StatusMap, TabKey } from "./utils/types";
import "./integrations-guide.css";

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: IntegrationStatus }): ReactNode  => {
  if (status.connected === null) {
    return <span className="int-status int-status--unconfigured">Sin configurar</span>;
  }
  if (status.connected) {
    return <span className="int-status int-status--connected">Conectado</span>;
  }
  return (
    <span className="int-status int-status--error" title={status.error}>
      Error de conexión
    </span>
  );
}

const CodeBlock = ({ children }: { children: string }): ReactNode  => {
  return <pre className="code-block"><code>{children}</code></pre>;
}

const EnvNote = ({ vars }: { vars: string[] }): ReactNode  => {
  return (
    <div className="env-note">
      <span className="env-note__label">Variables de entorno requeridas:</span>
      <ul className="env-note__list">
        {vars.map((v) => <li key={v}><code>{v}</code></li>)}
      </ul>
    </div>
  );
}

const DocLink = ({ href, label }: { href: string; label: string }): ReactNode  => {
  return (
    <a className="doc-link" href={href} target="_blank" rel="noopener noreferrer">
      <span className="material-symbols-outlined">open_in_new</span> {label}
    </a>
  );
}

const EnvTabs = ({ local, prod }: { local: ReactNode; prod: ReactNode }): ReactNode  => {
  const [tab, setTab] = useState<TabKey>("local");

  return (
    <div className="env-tabs">
      <div className="env-tabs__bar" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "local"}
          className={`env-tabs__btn${tab === "local" ? " env-tabs__btn--active" : ""}`}
          onClick={() => setTab("local")}
        >
          Local / desarrollo
        </button>
        <button
          role="tab"
          aria-selected={tab === "prod"}
          className={`env-tabs__btn${tab === "prod" ? " env-tabs__btn--active" : ""}`}
          onClick={() => setTab("prod")}
        >
          Producción / VPS
        </button>
      </div>
      <div className="env-tabs__content">{tab === "local" ? local : prod}</div>
    </div>
  );
}

// ─── Paperless section ────────────────────────────────────────────────────────

const PaperlessSection = ({ status }: { status: IntegrationStatus | undefined }): ReactNode  => {
  return (
    <section className="integration-section" id="paperless">
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">description</span>
        <div className="integration-section__title-group">
          <div className="integration-section__title-row">
            <h2 className="integration-section__title">Paperless-ngx</h2>
            {status && <StatusPill status={status} />}
          </div>
          <p className="integration-section__desc">
            Paperless-ngx es una aplicación de gestión documental que guarda, indexa y hace buscables tus documentos escaneados y PDFs.
            Naberza puede leer tu biblioteca de documentos y traer metadatos (título, fecha, tipo) al inbox automáticamente.
          </p>
          <div className="integration-section__links">
            <DocLink href="https://docs.paperless-ngx.com/" label="Documentación oficial" />
            <DocLink href="https://github.com/paperless-ngx/paperless-ngx" label="GitHub" />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">1</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Instala Paperless-ngx</h3>
          <div className="step-card__content">
            <p>
              Paperless-ngx se ejecuta como un servicio independiente en tu red local o en un servidor.
              <strong> No es parte de Naberza</strong> — es una aplicación separada con su propia base de datos y interfaz web.
              Naberza se conecta a ella vía API para leer documentos.
            </p>
            <EnvTabs
              local={
                <>
                  <p>Para desarrollo local, levanta Paperless con Docker Compose.
                  Esto crea un Paperless completo corriendo en tu máquina en el puerto 8000:</p>
                  <CodeBlock>{`mkdir ~/paperless && cd ~/paperless
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres.yml
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/.env.example
cp .env.example .env
# Edita .env si quieres cambiar contraseñas o puertos
docker compose -f docker-compose.postgres.yml up -d`}</CodeBlock>
                  <p>Abre <code>http://localhost:8000</code> y completa el asistente de configuración inicial.
                  El usuario por defecto es <code>admin</code> (configurable en <code>.env</code>).</p>
                  <p><strong>¿Para qué sirve esto?</strong> Puedes subir documentos a Paperless y que aparezcan automáticamente en Naberza como items del inbox.
                  Es útil para tener digitalizado en un solo sitio facturas, contratos, manuales, etc.</p>
                </>
              }
              prod={
                <>
                  <p>En producción instala Paperless en un VPS o servidor doméstico (Raspberry Pi, NAS, etc.).
                  La URL de Paperless debe ser accesible desde donde corra Naberza.</p>
                  <CodeBlock>{`# En el VPS o servidor:
mkdir ~/paperless && cd ~/paperless
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres.yml
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/.env.example
cp .env.example .env
# Configura PAPERLESS_URL en .env con tu dominio o IP
docker compose -f docker-compose.postgres.yml up -d`}</CodeBlock>
                  <p>Asegúrate de que Paperless está detrás de un proxy inverso (Nginx, Caddy) con HTTPS si va a ser accesible desde internet.</p>
                </>
              }
            />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">2</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Crea un API token en Paperless</h3>
          <div className="step-card__content">
            <p>Paperless usa tokens de API para autenticar peticiones externas. Naberza necesita uno para poder leer tu biblioteca.</p>
            <p>Tienes dos opciones para crearlo:</p>
            <p><strong>Opción A — Desde la interfaz web:</strong></p>
            <ol>
              <li>Inicia sesión en Paperless (<code>http://localhost:8000</code> o tu URL)</li>
              <li>Ve a <strong>Settings → API Tokens</strong> (o <strong>Administración → Tokens</strong>)</li>
              <li>Haz clic en <strong>Add token</strong> y selecciona tu usuario</li>
              <li>Copia el token generado</li>
            </ol>
            <p><strong>Opción B — Desde la terminal:</strong></p>
            <CodeBlock>{`docker exec -it paperless-webserver python manage.py drf_create_token <tu_usuario_admin>`}</CodeBlock>
            <p>El token es una cadena larga de letras y números. No se puede recuperar después, así que guárdalo en un lugar seguro.</p>
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">3</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Conecta Naberza con Paperless</h3>
          <div className="step-card__content">
            <EnvTabs
              local={
                <>
                  <p>Añade estas líneas a <code>code/.env.local</code> (el archivo de variables para desarrollo local):</p>
                  <CodeBlock>{`PAPERLESS_URL=http://localhost:8000
PAPERLESS_TOKEN=pega-aqui-el-token-que-copiaste`}</CodeBlock>
                  <p>Después reinicia el servidor de desarrollo (<code>docker compose restart</code> o para y arranca <code>npm run dev</code>).</p>
                </>
              }
              prod={
                <>
                  <p>En producción configura estas variables de entorno en tu servidor (fichero <code>.env</code>, panel de Vercel, Railway, etc.):</p>
                  <CodeBlock>{`PAPERLESS_URL=https://tu-paperless.tudominio.com
PAPERLESS_TOKEN=pega-aqui-el-token-que-copiaste`}</CodeBlock>
                  <p>La URL debe ser accesible desde el servidor donde corre Naberza. Si ambos están en la misma red local, puedes usar la IP interna.</p>
                </>
              }
            />
            <EnvNote vars={["PAPERLESS_URL", "PAPERLESS_TOKEN"]} />
            <p>Una vez configurado, el piloto de arriba pasará a verde. Puedes verificar también en <code>GET /api/health</code>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Home Assistant section ───────────────────────────────────────────────────

const HomeAssistantSection = ({ status }: { status: IntegrationStatus | undefined }): ReactNode  => {
  return (
    <section className="integration-section" id="home-assistant">
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">home</span>
        <div className="integration-section__title-group">
          <div className="integration-section__title-row">
            <h2 className="integration-section__title">Home Assistant</h2>
            {status && <StatusPill status={status} />}
          </div>
          <p className="integration-section__desc">
            Home Assistant es una plataforma de domótica de código abierto que controla dispositivos inteligentes del hogar.
            Naberza puede leer el estado de entidades (sensores, alarmas, luces) y convertir alertas en items del inbox.
            También puedes controlar dispositivos directamente desde Naberza.
          </p>
          <div className="integration-section__links">
            <DocLink href="https://www.home-assistant.io/docs/" label="Documentación oficial" />
            <DocLink href="https://developers.home-assistant.io/docs/api/rest/" label="API REST" />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">1</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Instala Home Assistant</h3>
          <div className="step-card__content">
            <p>
              Al igual que Paperless, Home Assistant es una aplicación independiente.
              <strong> La forma recomendada</strong> es instalarlo en hardware dedicado (Raspberry Pi, NUC, etc.) con Home Assistant OS.
              Para pruebas locales puedes usar Docker:
            </p>
            <EnvTabs
              local={
                <>
                  <CodeBlock>{`docker run -d --name homeassistant \\
  --privileged \\
  --restart=unless-stopped \\
  -e TZ=Europe/Madrid \\
  -v ./ha-config:/config \\
  -p 8123:8123 \\
  ghcr.io/home-assistant/home-assistant:stable`}</CodeBlock>
                  <p>La interfaz estará en <code>http://localhost:8123</code>. El asistente de configuración te pedirá crear una cuenta y detectará dispositivos en tu red local.</p>
                </>
              }
              prod={
                <>
                  <p>Para producción, la instalación recomendada es <strong>Home Assistant OS</strong> en una Raspberry Pi 4/5 o similar.
                  Descarga la imagen desde <a href="https://www.home-assistant.io/installation/" target="_blank" rel="noopener noreferrer">home-assistant.io/installation</a> y síguelas.</p>
                  <p>Anota la URL local de tu HA (normalmente <code>http://homeassistant.local:8123</code>) — la necesitarás más adelante.</p>
                </>
              }
            />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">2</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Genera un Long-Lived Access Token</h3>
          <div className="step-card__content">
            <p>Home Assistant usa tokens de larga duración para autenticar aplicaciones externas como Naberza.</p>
            <ol>
              <li>Inicia sesión en Home Assistant</li>
              <li>Haz clic en tu <strong>perfil de usuario</strong> (icono abajo a la izquierda)</li>
              <li>Baja hasta la sección <strong>Long-Lived Access Tokens</strong></li>
              <li>Haz clic en <strong>Create Token</strong></li>
              <li>Ponle un nombre descriptivo (por ejemplo: <code>naberza</code>) y haz clic en <strong>OK</strong></li>
              <li>Copia el token inmediatamente — no se vuelve a mostrar</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">3</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Conecta Naberza con Home Assistant</h3>
          <div className="step-card__content">
            <EnvTabs
              local={
                <>
                  <p>En <code>code/.env.local</code>:</p>
                  <CodeBlock>{`HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=pega-aqui-el-token`}</CodeBlock>
                </>
              }
              prod={
                <>
                  <p>Usa la URL interna de tu Home Assistant (no es necesario exponerlo a internet si Naberza está en la misma red):</p>
                  <CodeBlock>{`HOME_ASSISTANT_URL=http://homeassistant.local:8123
HOME_ASSISTANT_TOKEN=pega-aqui-el-token`}</CodeBlock>
                  <p>Si Naberza corre en un VPS fuera de tu red local, necesitarás exponer HA via Nabu Casa, Cloudflare Tunnel o un dominio propio.</p>
                </>
              }
            />
            <EnvNote vars={["HOME_ASSISTANT_URL", "HOME_ASSISTANT_TOKEN"]} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Mail section ─────────────────────────────────────────────────────────────

const MailSection = ({ status }: { status: IntegrationStatus | undefined }): ReactNode  => {
  return (
    <section className="integration-section" id="mail">
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">mail</span>
        <div className="integration-section__title-group">
          <div className="integration-section__title-row">
            <h2 className="integration-section__title">Correo IMAP</h2>
            {status && <StatusPill status={status} />}
          </div>
          <p className="integration-section__desc">
            Naberza puede leer una cuenta de correo vía IMAP y convertir emails importantes en items del inbox.
            También detecta automáticamente emails que parecen facturas o documentos y los clasifica.
          </p>
          <div className="integration-section__links">
            <DocLink href="https://support.google.com/mail/answer/7126229" label="Gmail: activar IMAP" />
            <DocLink href="https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-for-outlook-com-d088b986-291d-42b8-9564-9c414e2aa040" label="Outlook: configuración IMAP" />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">1</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Prepara la cuenta de correo</h3>
          <div className="step-card__content">
            <p>
              <strong>Recomendamos usar una cuenta dedicada o un alias</strong>, no tu correo principal.
              El adaptador necesita acceso de lectura permanente y no quieres que cualquier problema afecte a tu buzón personal.
            </p>
            <p>Según tu proveedor:</p>
            <ul>
              <li>
                <strong>Gmail:</strong> Activa IMAP en <em>Configuración → Ver todos los ajustes → Reenvío y correo POP/IMAP</em>.
                Luego genera una <strong>App Password</strong> en <em>Gestión de cuenta Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicación</em>.
                <strong> No uses tu contraseña normal de Gmail</strong> — Google lo bloquea.
              </li>
              <li>
                <strong>Outlook / Microsoft 365:</strong> IMAP suele estar habilitado por defecto.
                Si usas autenticación moderna necesitas generar un token de aplicación desde el portal de Microsoft.
              </li>
              <li>
                <strong>Fastmail, ProtonMail, etc.:</strong> Sigue las instrucciones específicas de tu proveedor para generar una contraseña de aplicación IMAP.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">2</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Configura las credenciales IMAP</h3>
          <div className="step-card__content">
            <CodeBlock>{`# Gmail
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_IMAP_USER=tu@gmail.com
MAIL_IMAP_PASSWORD=tu-app-password-de-google

# Outlook / Microsoft 365
MAIL_IMAP_HOST=outlook.office365.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_IMAP_USER=tu@outlook.com
MAIL_IMAP_PASSWORD=tu-contraseña-o-app-token

# Fastmail
MAIL_IMAP_HOST=imap.fastmail.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_IMAP_USER=tu@fastmail.com
MAIL_IMAP_PASSWORD=tu-app-password-de-fastmail`}</CodeBlock>
            <p>Por defecto Naberza monitoriza <code>INBOX</code>. Puedes cambiarlo:</p>
            <CodeBlock>{`MAIL_IMAP_MAILBOX=INBOX   # nombre exacto de la carpeta`}</CodeBlock>
            <EnvNote vars={["MAIL_IMAP_HOST", "MAIL_IMAP_PORT", "MAIL_IMAP_SECURE", "MAIL_IMAP_USER", "MAIL_IMAP_PASSWORD"]} />
            <p>Los emails procesados se marcan como leídos pero <strong>no se eliminan</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Notifications section ────────────────────────────────────────────────────

const NotificationsSection = ({ telegramStatus, smtpStatus }: {
  telegramStatus: IntegrationStatus | undefined;
  smtpStatus: IntegrationStatus | undefined;
}): ReactNode  => {
  return (
    <section className="integration-section" id="notifications">
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">notifications</span>
        <div className="integration-section__title-group">
          <div className="integration-section__title-row">
            <h2 className="integration-section__title">Notificaciones</h2>
            <div className="integration-section__multi-status">
              {telegramStatus && <><span className="int-status-label">Telegram</span><StatusPill status={telegramStatus} /></>}
              {smtpStatus && <><span className="int-status-label">Email</span><StatusPill status={smtpStatus} /></>}
            </div>
          </div>
          <p className="integration-section__desc">
            Las automatizaciones de Naberza pueden enviarte alertas cuando algo requiere tu atención.
            Configura Telegram y/o email de salida según prefieras.
          </p>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">1</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Telegram — Crea un bot</h3>
          <div className="step-card__content">
            <p>Telegram permite crear bots que pueden enviar mensajes. Naberza usará un bot tuyo para mandarte notificaciones:</p>
            <ol>
              <li>Abre Telegram y busca <strong>@BotFather</strong></li>
              <li>Envía <code>/newbot</code> y sigue las instrucciones (nombre del bot, username)</li>
              <li>BotFather te dará el <strong>token</strong> del bot (formato: <code>123456:ABC-DEF...</code>)</li>
              <li>Inicia una conversación con tu nuevo bot (búscalo por su username y envíale cualquier mensaje)</li>
              <li>Abre en el navegador: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
              <li>Busca el campo <code>chat.id</code> en la respuesta JSON — ese es tu <code>chat_id</code></li>
            </ol>
            <CodeBlock>{`TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNOpqrSTUVwxyz
TELEGRAM_DEFAULT_CHAT_ID=987654321`}</CodeBlock>
            <EnvNote vars={["TELEGRAM_BOT_TOKEN", "TELEGRAM_DEFAULT_CHAT_ID"]} />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">2</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Email de salida — Configura SMTP</h3>
          <div className="step-card__content">
            <p>Para notificaciones por email necesitas un servidor SMTP de salida. Algunos proveedores:</p>
            <CodeBlock>{`# Gmail (usa App Password, no tu contraseña normal)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=tu@gmail.com
SMTP_DEFAULT_TO=tu@gmail.com

# Resend / Postmark / SendGrid (recomendado en producción)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASSWORD=tu-api-key-de-resend
SMTP_FROM=naberza@tudominio.com
SMTP_DEFAULT_TO=tu@gmail.com`}</CodeBlock>
            <EnvNote vars={["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_DEFAULT_TO"]} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Webhooks section ─────────────────────────────────────────────────────────

const WebhooksSection = ({ status }: { status: IntegrationStatus | undefined }): ReactNode  => {
  return (
    <section className="integration-section" id="webhooks">
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">webhook</span>
        <div className="integration-section__title-group">
          <div className="integration-section__title-row">
            <h2 className="integration-section__title">Webhooks entrantes</h2>
            {status && <StatusPill status={status} />}
          </div>
          <p className="integration-section__desc">
            Naberza acepta webhooks HTTP de cualquier servicio externo: Zapier, n8n, GitHub Actions, scripts propios...
            Cada petición se convierte en un inbox item clasificado como <code>API</code>.
          </p>
          <div className="integration-section__links">
            <DocLink href="https://zapier.com/blog/what-are-webhooks/" label="¿Qué es un webhook?" />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">1</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Configura el secret</h3>
          <div className="step-card__content">
            <p>
              El endpoint de webhooks es <code>POST /webhooks/api/&lt;token&gt;</code>.
              El token actúa como contraseña — cualquiera que lo tenga puede crear items en tu inbox.
              Genera uno seguro:
            </p>
            <CodeBlock>{`# En la terminal (macOS/Linux):
openssl rand -hex 32

# O con Node:
node -e "const {randomBytes}=require('crypto'); process.stdout.write(randomBytes(32).toString('hex'))"`}</CodeBlock>
            <p>Añade el token a tus variables de entorno:</p>
            <CodeBlock>{`WEBHOOK_SECRET=pega-aqui-el-token-generado`}</CodeBlock>
            <EnvNote vars={["WEBHOOK_SECRET"]} />
          </div>
        </div>
      </div>

      <div className="step-card">
        <div className="step-card__number">2</div>
        <div className="step-card__body">
          <h3 className="step-card__title">Configura el endpoint en tu servicio externo</h3>
          <div className="step-card__content">
            <EnvTabs
              local={
                <>
                  <p>Para probar en local usa <code>http://localhost:3000/webhooks/api/TU_TOKEN</code>:</p>
                  <CodeBlock>{`curl -X POST http://localhost:3000/webhooks/api/TU_TOKEN_AQUI \\
  -H "Content-Type: application/json" \\
  -d '{"event": "test", "message": "hola desde webhook"}'`}</CodeBlock>
                  <p>Si usas n8n o Zapier en local, necesitarán acceso a tu máquina. Herramientas como <code>ngrok</code> o <code>localtunnel</code> pueden exponerte temporalmente.</p>
                </>
              }
              prod={
                <>
                  <p>En producción usa tu dominio real:</p>
                  <CodeBlock>{`https://naberza.tudominio.com/webhooks/api/TU_TOKEN_AQUI`}</CodeBlock>
                  <p>Pega esta URL en el campo &quot;Webhook URL&quot; del servicio que quieras conectar (Zapier, n8n, GitHub, etc.).</p>
                </>
              }
            />
            <p>El payload puede ser cualquier JSON. El campo <code>message</code> o <code>event</code> se usa como título del inbox item.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const IntegrationsView = (): ReactNode  => {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetch("/integrations/api/status")
      .then((response) => response.json() as Promise<{ statuses: IntegrationStatus[] }>)
      .then(({ statuses }) => {
        const map: StatusMap = {};

        for (const status of statuses) {
          map[status.id] = status;
        }

        setStatusMap(map);
      })
      .catch(() => {
        // status unavailable — show guide without pills
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  return (
    <div className="integrations-guide">
      <div className="integrations-guide__header">
        <h1 className="integrations-guide__title">Integraciones</h1>
        <p className="integrations-guide__subtitle">
          Conecta tus herramientas a Naberza. Cada integración es opcional e independiente.
          {loadingStatus && <span className="int-loading"> Comprobando conexiones...</span>}
        </p>
      </div>

      <nav className="integrations-guide__nav">
        {[
          { id: "paperless", icon: "description", label: "Paperless-ngx" },
          { id: "home-assistant", icon: "home", label: "Home Assistant" },
          { id: "mail", icon: "mail", label: "Correo IMAP" },
          { id: "notifications", icon: "notifications", label: "Notificaciones" },
          { id: "webhooks", icon: "webhook", label: "Webhooks" },
        ].map(({ id, icon, label }) => {
          const status = id === "notifications" ? (statusMap.telegram ?? statusMap.smtp) : statusMap[id];
          let dot: string | null = null;

          if (status) {
            if (status.connected === null) dot = "unconfigured";
            else if (status.connected) dot = "connected";
            else dot = "error";
          }

          return (
            <a key={id} href={`#${id}`} className="int-nav-link">
              <span className="material-symbols-outlined">{icon}</span>
              {label}
              {dot && <span className={`int-nav-dot int-nav-dot--${dot}`} />}
            </a>
          );
        })}
      </nav>

      <PaperlessSection status={statusMap.paperless} />
      <HomeAssistantSection status={statusMap["home-assistant"]} />
      <MailSection status={statusMap.mail} />
      <NotificationsSection telegramStatus={statusMap.telegram} smtpStatus={statusMap.smtp} />
      <WebhooksSection status={statusMap.webhooks} />
    </div>
  );
}

export default IntegrationsView;

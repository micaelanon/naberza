/* eslint-disable sonarjs/no-hardcoded-passwords -- tutorial examples */
import type { ReactNode } from "react";
import "./integrations-guide.css";
import "./integrations-guide.css";

interface Step {
  number: number;
  title: string;
  content: ReactNode;
}

function StepCard({ step }: { step: Step }): ReactNode {
  return (
    <div className="step-card">
      <div className="step-card__number">{step.number}</div>
      <div className="step-card__body">
        <h3 className="step-card__title">{step.title}</h3>
        <div className="step-card__content">{step.content}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }): ReactNode {
  return <pre className="code-block"><code>{children}</code></pre>;
}

function EnvNote({ vars }: { vars: string[] }): ReactNode {
  return (
    <div className="env-note">
      <span className="env-note__label">Variables de entorno requeridas:</span>
      <ul className="env-note__list">
        {vars.map((v) => <li key={v}><code>{v}</code></li>)}
      </ul>
    </div>
  );
}

// ─── Paperless steps ──────────────────────────────────────────────────────────

const paperlessSteps: Step[] = [
  {
    number: 1,
    title: "Instala Paperless-ngx",
    content: (
      <>
        <p>La forma más rápida es con Docker Compose. Crea un directorio y descarga el compose oficial:</p>
        <CodeBlock>{`mkdir paperless && cd paperless
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/docker-compose.postgres.yml
curl -O https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/main/docker/compose/.env.example
cp .env.example .env
docker compose -f docker-compose.postgres.yml up -d`}</CodeBlock>
        <p>Paperless estará disponible en <code>http://localhost:8000</code> por defecto.</p>
      </>
    ),
  },
  {
    number: 2,
    title: "Crea un API token en Paperless",
    content: (
      <>
        <p>Ve a <strong>Settings → API Tokens</strong> en la interfaz de Paperless, o créalo desde la línea de comandos:</p>
        <CodeBlock>{`# Dentro del contenedor:
docker exec -it paperless-webserver python manage.py drf_create_token <usuario>`}</CodeBlock>
        <p>Copia el token generado.</p>
      </>
    ),
  },
  {
    number: 3,
    title: "Configura Naberza",
    content: (
      <>
        <p>Añade estas variables a tu <code>.env</code> (o <code>.env.local</code> en desarrollo):</p>
        <CodeBlock>{`PAPERLESS_URL=http://localhost:8000
PAPERLESS_TOKEN=tu-token-aqui`}</CodeBlock>
        <EnvNote vars={["PAPERLESS_URL", "PAPERLESS_TOKEN"]} />
        <p>Reinicia el servidor para que tome los cambios. Puedes verificar la conexión en <code>GET /api/health</code>.</p>
      </>
    ),
  },
];

// ─── Home Assistant steps ─────────────────────────────────────────────────────

const haSteps: Step[] = [
  {
    number: 1,
    title: "Instala Home Assistant",
    content: (
      <>
        <p>Si no tienes HA instalado, la forma más sencilla para desarrollo es con Docker:</p>
        <CodeBlock>{`docker run -d --name homeassistant \
  --privileged \
  --restart=unless-stopped \
  -e TZ=Europe/Madrid \
  -v ./ha-config:/config \
  -p 8123:8123 \
  ghcr.io/home-assistant/home-assistant:stable`}</CodeBlock>
        <p>La interfaz estará en <code>http://localhost:8123</code>.</p>
      </>
    ),
  },
  {
    number: 2,
    title: "Genera un Long-Lived Access Token",
    content: (
      <>
        <p>En Home Assistant:</p>
        <ol>
          <li>Ve a tu perfil de usuario (abajo a la izquierda)</li>
          <li>Baja hasta <strong>Long-Lived Access Tokens</strong></li>
          <li>Haz clic en <strong>Create Token</strong>, ponle nombre (ej: &quot;naberza&quot;) y cópialo</li>
        </ol>
        <p>Este token no se vuelve a mostrar, así que guárdalo bien.</p>
      </>
    ),
  },
  {
    number: 3,
    title: "Configura Naberza",
    content: (
      <>
        <CodeBlock>{`HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=tu-long-lived-token-aqui`}</CodeBlock>
        <EnvNote vars={["HOME_ASSISTANT_URL", "HOME_ASSISTANT_TOKEN"]} />
        <p>El adaptador de Home Assistant sincroniza alertas y estados al inbox automáticamente cuando se detectan entidades en estado de alerta.</p>
      </>
    ),
  },
];

// ─── Mail IMAP steps ──────────────────────────────────────────────────────────

const mailSteps: Step[] = [
  {
    number: 1,
    title: "Prepara una cuenta de correo dedicada",
    content: (
      <>
        <p>Recomendamos usar una cuenta específica para Naberza (puede ser un alias), no tu correo principal. El adaptador accede por IMAP con permisos de lectura.</p>
        <p>Si usas Gmail, necesitas activar el acceso IMAP en la configuración de la cuenta y generar una <strong>App Password</strong> en tu cuenta de Google (Seguridad → Verificación en dos pasos → Contraseñas de aplicación).</p>
      </>
    ),
  },
  {
    number: 2,
    title: "Configura las credenciales IMAP",
    content: (
      <>
        <p>Valores típicos por proveedor:</p>
        <CodeBlock>{`# Gmail
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_IMAP_USER=tu@gmail.com
MAIL_IMAP_PASSWORD=tu-app-password

# Outlook / Microsoft 365
MAIL_IMAP_HOST=outlook.office365.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true

# Fastmail
MAIL_IMAP_HOST=imap.fastmail.com
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true`}</CodeBlock>
        <EnvNote vars={["MAIL_IMAP_HOST", "MAIL_IMAP_PORT", "MAIL_IMAP_SECURE", "MAIL_IMAP_USER", "MAIL_IMAP_PASSWORD"]} />
      </>
    ),
  },
  {
    number: 3,
    title: "Configura detección de facturas y documentos (opcional)",
    content: (
      <>
        <p>Naberza puede detectar automáticamente emails que parecen facturas o documentos y crear inbox items clasificados. Esto ocurre en la fase de sync.</p>
        <p>Los correos procesados se marcan como leídos pero no se eliminan. Puedes configurar la carpeta a monitorizar:</p>
        <CodeBlock>{`MAIL_IMAP_MAILBOX=INBOX   # carpeta por defecto`}</CodeBlock>
      </>
    ),
  },
];

// ─── Notifications steps ──────────────────────────────────────────────────────

const notifSteps: Step[] = [
  {
    number: 1,
    title: "Telegram — Crea un bot",
    content: (
      <>
        <p>Habla con <strong>@BotFather</strong> en Telegram:</p>
        <ol>
          <li>Envía <code>/newbot</code></li>
          <li>Sigue las instrucciones y copia el token</li>
          <li>Inicia una conversación con tu bot y envía un mensaje</li>
          <li>Abre <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> para obtener tu <code>chat_id</code></li>
        </ol>
        <CodeBlock>{`TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNO
TELEGRAM_DEFAULT_CHAT_ID=987654321`}</CodeBlock>
        <EnvNote vars={["TELEGRAM_BOT_TOKEN", "TELEGRAM_DEFAULT_CHAT_ID"]} />
      </>
    ),
  },
  {
    number: 2,
    title: "Email de salida — Configura SMTP",
    content: (
      <>
        <p>Para recibir notificaciones por email configura un servidor SMTP de salida:</p>
        <CodeBlock>{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false       # true para port 465
SMTP_USER=tu@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=tu@gmail.com
SMTP_DEFAULT_TO=tu@gmail.com`}</CodeBlock>
        <EnvNote vars={["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_DEFAULT_TO"]} />
      </>
    ),
  },
];

// ─── Webhooks steps ───────────────────────────────────────────────────────────

const webhookSteps: Step[] = [
  {
    number: 1,
    title: "Genera un token para webhooks",
    content: (
      <>
        <p>Naberza acepta webhooks en <code>POST /webhooks/api/&lt;token&gt;</code>. Genera un token seguro:</p>
        <CodeBlock>{`# En la terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# O con OpenSSL:
openssl rand -hex 32`}</CodeBlock>
      </>
    ),
  },
  {
    number: 2,
    title: "Configura el endpoint en tu servicio externo",
    content: (
      <>
        <p>URL del webhook (reemplaza con tu dominio o IP local):</p>
        <CodeBlock>{`https://tu-dominio.com/webhooks/api/TU_TOKEN_AQUI

# Ejemplo con curl para probar:
curl -X POST https://tu-dominio.com/webhooks/api/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "message": "hola desde webhook"}'`}</CodeBlock>
        <p>El payload se convierte automáticamente en un inbox item con <code>sourceType: API</code>.</p>
      </>
    ),
  },
];

// ─── Section component ────────────────────────────────────────────────────────

function IntegrationSection({ id, icon, title, description, steps }: {
  id: string;
  icon: string;
  title: string;
  description: string;
  steps: Step[];
}): ReactNode {
  return (
    <section className="integration-section" id={id}>
      <div className="integration-section__header">
        <span className="material-symbols-outlined integration-section__icon">{icon}</span>
        <div>
          <h2 className="integration-section__title">{title}</h2>
          <p className="integration-section__desc">{description}</p>
        </div>
      </div>
      <div className="integration-section__steps">
        {steps.map((step) => <StepCard key={step.number} step={step} />)}
      </div>
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function IntegrationsView(): ReactNode {
  return (
    <div className="integrations-guide">
      <div className="integrations-guide__header">
        <h1 className="integrations-guide__title">Guía de configuración</h1>
        <p className="integrations-guide__subtitle">
          Conecta tus herramientas externas a Naberza OS. Cada integración es opcional — usa solo lo que necesites.
        </p>
      </div>

      <nav className="integrations-guide__nav">
        <a href="#paperless" className="int-nav-link">
          <span className="material-symbols-outlined">description</span> Paperless-ngx
        </a>
        <a href="#home-assistant" className="int-nav-link">
          <span className="material-symbols-outlined">home</span> Home Assistant
        </a>
        <a href="#mail" className="int-nav-link">
          <span className="material-symbols-outlined">mail</span> Correo IMAP
        </a>
        <a href="#notifications" className="int-nav-link">
          <span className="material-symbols-outlined">notifications</span> Notificaciones
        </a>
        <a href="#webhooks" className="int-nav-link">
          <span className="material-symbols-outlined">webhook</span> Webhooks
        </a>
      </nav>

      <IntegrationSection
        id="paperless"
        icon="description"
        title="Paperless-ngx"
        description="Sincroniza documentos escaneados y digitales con tu inbox. Naberza puede listar, buscar y traer metadatos de Paperless."
        steps={paperlessSteps}
      />

      <IntegrationSection
        id="home-assistant"
        icon="home"
        title="Home Assistant"
        description="Recibe alertas de dispositivos del hogar como items en tu inbox. Controla el estado de entidades directamente desde Naberza."
        steps={haSteps}
      />

      <IntegrationSection
        id="mail"
        icon="mail"
        title="Correo IMAP"
        description="Lee tu bandeja de entrada y convierte emails importantes en inbox items. Detecta facturas y documentos automáticamente."
        steps={mailSteps}
      />

      <IntegrationSection
        id="notifications"
        icon="notifications"
        title="Notificaciones"
        description="Recibe alertas de automatizaciones por Telegram o email cuando algo requiere tu atención."
        steps={notifSteps}
      />

      <IntegrationSection
        id="webhooks"
        icon="webhook"
        title="Webhooks entrantes"
        description="Acepta eventos de cualquier servicio externo (Zapier, n8n, scripts propios) y conviértelos en inbox items."
        steps={webhookSteps}
      />
    </div>
  );
}

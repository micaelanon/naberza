import { AppShell } from "@/components/ui";
import { analyzeMailInbox } from "@/lib/mail-analysis/mail-analysis";
import "../home.css";

export const dynamic = "force-dynamic";

const Section = ({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) => {
  return (
    <section className="digest-section">
      <h2 className="home-page__section-title">{title}</h2>
      {children || (empty ? <p className="page-empty">{empty}</p> : null)}
    </section>
  );
}

export default async function MailAnalysisPage() {
  const analysis = await analyzeMailInbox();

  return (
    <AppShell title="Análisis de correo">
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">Análisis de correo</h1>
          <p className="home-page__subtitle">
            No te enseño el mail entero, solo señales y sugerencias útiles detectadas sobre lo ya ingerido.
          </p>
        </div>

        <Section title="Sugerencias útiles">
          {analysis.suggestions.length === 0 ? (
            <p className="page-empty">Aún no hay sugerencias suficientes en el correo ingerido.</p>
          ) : (
            <div className="digest-list">
              {analysis.suggestions.map((item) => (
                <a key={item.id} href={item.href} className="digest-card">
                  <div className="digest-card__title">{item.title}</div>
                  <div className="digest-card__detail">{item.detail}</div>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="5 remitentes más repetidos">
          {analysis.topSenders.length === 0 ? (
            <p className="page-empty">No he podido detectar remitentes repetidos con claridad.</p>
          ) : (
            <div className="digest-list">
              {analysis.topSenders.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">{group.count} correos detectados</div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Newsletters candidatas">
          {analysis.newsletters.length === 0 ? (
            <p className="page-empty">No he detectado newsletters repetitivas suficientes.</p>
          ) : (
            <div className="digest-list">
              {analysis.newsletters.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">{group.count} correos detectados</div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Facturas probables detectadas">
          {analysis.probableInvoices.length === 0 ? (
            <p className="page-empty">No he detectado facturas probables ahora mismo.</p>
          ) : (
            <div className="digest-list">
              {analysis.probableInvoices.map((item) => (
                <a key={item.id} href="/inbox/dashboard" className="digest-card digest-card--warning">
                  <div className="digest-card__title">{item.title}</div>
                  <div className="digest-card__detail">Clasificación actual: {item.classification ?? "sin clasificar"}</div>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="Correos que merecen revisión">
          {analysis.reviewQueue.length === 0 ? (
            <p className="page-empty">No he detectado correos de revisión prioritaria.</p>
          ) : (
            <div className="digest-list">
              {analysis.reviewQueue.map((item) => (
                <a key={item.id} href="/inbox/dashboard" className="digest-card digest-card--urgent">
                  <div className="digest-card__title">{item.title}</div>
                  <div className="digest-card__detail">Confianza actual: {item.classificationConfidence ?? "—"}</div>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="Emisores ruidosos o poco útiles">
          {analysis.noisySenders.length === 0 ? (
            <p className="page-empty">No he detectado emisores repetitivos de bajo valor con claridad.</p>
          ) : (
            <div className="digest-list">
              {analysis.noisySenders.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">{group.count} correos repetidos</div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

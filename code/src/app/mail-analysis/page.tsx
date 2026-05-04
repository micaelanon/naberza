import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AppShell } from "@/components/ui";
import { ROUTE_PATHS } from "@/lib/constants";
import { analyzeMailInbox } from "@/lib/mail-analysis/mail-analysis";

import "@/app/home.css";

export const dynamic = "force-dynamic";

const Section = ({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) => (
  <section className="digest-section">
    <h2 className="home-page__section-title">{title}</h2>
    {children || (empty ? <p className="page-empty">{empty}</p> : null)}
  </section>
);

const MailAnalysisPage = async () => {
  const t = await getTranslations({ locale: "es" });
  const analysis = await analyzeMailInbox();

  return (
    <AppShell title={t("app.mailAnalysis.title")}>
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">{t("app.mailAnalysis.title")}</h1>
          <p className="home-page__subtitle">{t("app.mailAnalysis.subtitle")}</p>
          <Link href={ROUTE_PATHS.EMAIL_TRIAGE} className="mail-analysis__triage-cta">
            <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
            {t("app.mailAnalysis.triageCta")}
          </Link>
        </div>

        <Section title={t("app.mailAnalysis.section.newsletters")}>
          {analysis.newsletters.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noNewsletters")}</p>
          ) : (
            <div className="digest-list">
              {analysis.newsletters.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">
                    {t("app.mailAnalysis.repeatedEmails", { count: group.count })}
                  </div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                  {group.unsubscribeUrl && (
                    <a
                      href={group.unsubscribeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="digest-card__action"
                    >
                      {t("app.mailAnalysis.unsubscribeLink")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("app.mailAnalysis.section.senders")}>
          {analysis.topSenders.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noTopSenders")}</p>
          ) : (
            <div className="digest-list">
              {analysis.topSenders.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">
                    {t("app.mailAnalysis.repeatedEmails", { count: group.count })}
                  </div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("app.mailAnalysis.section.noisy")}>
          {analysis.noisySenders.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noNoisySenders")}</p>
          ) : (
            <div className="digest-list">
              {analysis.noisySenders.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">
                    {t("app.mailAnalysis.repeatedLowValue", { count: group.count })}
                  </div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
};

export default MailAnalysisPage;

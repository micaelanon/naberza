import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/ui";
import { ROUTE_PATHS } from "@/lib/constants";
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
};

const MailAnalysisPage = async () => {
  const t = await getTranslations({ locale: "es" });
  const analysis = await analyzeMailInbox();

  return (
    <AppShell title={t("app.mailAnalysis.title")}>
      <div className="home-page">
        <div className="home-page__welcome">
          <h1 className="home-page__greeting">{t("app.mailAnalysis.title")}</h1>
          <p className="home-page__subtitle">{t("app.mailAnalysis.subtitle")}</p>
        </div>

        <Section title={t("app.mailAnalysis.section.suggestions")}>
          {analysis.suggestions.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noSuggestions")}</p>
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

        <Section title={t("app.mailAnalysis.section.senders")}>
          {analysis.topSenders.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noTopSenders")}</p>
          ) : (
            <div className="digest-list">
              {analysis.topSenders.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">{t("app.mailAnalysis.repeatedEmails", { count: group.count })}</div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("app.mailAnalysis.section.newsletters")}>
          {analysis.newsletters.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noNewsletters")}</p>
          ) : (
            <div className="digest-list">
              {analysis.newsletters.map((group) => (
                <div key={group.sender} className="digest-card">
                  <div className="digest-card__title">{group.sender}</div>
                  <div className="digest-card__detail">{t("app.mailAnalysis.repeatedEmails", { count: group.count })}</div>
                  <div className="digest-card__detail">{group.samples.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("app.mailAnalysis.section.invoices")}>
          {analysis.probableInvoices.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noInvoices")}</p>
          ) : (
            <div className="digest-list">
              {analysis.probableInvoices.map((item) => (
                <a key={item.id} href={ROUTE_PATHS.INBOX} className="digest-card digest-card--warning">
                  <div className="digest-card__title">{item.title}</div>
                  <div className="digest-card__detail">
                    {t("app.mailAnalysis.currentClassification", {
                      value: item.classification ?? t("app.mailAnalysis.noClassification"),
                    })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("app.mailAnalysis.section.review")}>
          {analysis.reviewQueue.length === 0 ? (
            <p className="page-empty">{t("app.mailAnalysis.empty.noReview")}</p>
          ) : (
            <div className="digest-list">
              {analysis.reviewQueue.map((item) => (
                <a key={item.id} href={ROUTE_PATHS.INBOX} className="digest-card digest-card--urgent">
                  <div className="digest-card__title">{item.title}</div>
                  <div className="digest-card__detail">
                    {t("app.mailAnalysis.currentConfidence", { value: item.classificationConfidence ?? "—" })}
                  </div>
                </a>
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
                  <div className="digest-card__detail">{t("app.mailAnalysis.repeatedLowValue", { count: group.count })}</div>
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

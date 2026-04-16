import type { Metadata } from "next";

import LoginForm from "./_components/login-form";
import "./login.css";

export const metadata: Metadata = {
  title: "Entrar — Naberza OS",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="login-page">
      <div className="login-page__card">
        <div className="login-page__header">
          <h1 className="login-page__title">Naberza OS</h1>
          <p className="login-page__subtitle">Accede a tu sistema personal</p>
        </div>

        <LoginForm callbackUrl={callbackUrl} error={error} />
      </div>
    </div>
  );
}

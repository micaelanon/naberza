"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import type { LoginFormProps } from "./utils/types";
import "./login-form.css";

export default function LoginForm({ callbackUrl = "/", error }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const getInitialError = (): string | null => {
    if (!error) return null;
    if (error === "CredentialsSignin") return "Email o contraseña incorrectos.";
    return `Configuration error: ${error}`;
  };
  const [formError, setFormError] = useState<string | null>(getInitialError());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const form = event.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      console.log("[Login] Result:", result);

      if (result?.error) {
        console.error("[Login] SignIn error:", result.error, result);
        setFormError(
          result.error === "CredentialsSignin"
            ? "Email o contraseña incorrectos."
            : `Error de configuración: ${result.error}`
        );
        setIsLoading(false);
        return;
      }

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("[Login] Exception:", err);
      setFormError("Error inesperado. Por favor, intenta de nuevo.");
      setIsLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__field">
        <label className="login-form__label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="login-form__input"
          autoComplete="email"
          required
          disabled={isLoading}
        />
      </div>

      <div className="login-form__field">
        <label className="login-form__label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="login-form__input"
          autoComplete="current-password"
          required
          disabled={isLoading}
        />
      </div>

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        className="login-form__submit"
        disabled={isLoading}
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

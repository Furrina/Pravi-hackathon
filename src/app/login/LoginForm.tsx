"use client";

import { useFormState } from "react-dom";
import { signInAction, type LoginFormState } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/ui";

const initialState: LoginFormState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label htmlFor="email" className="gov-label">
          Official email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="gov-input"
          placeholder="officer@gov.example.in"
        />
      </div>

      <div>
        <label htmlFor="password" className="gov-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="gov-input"
        />
      </div>

      <FormMessage error={state.error} />

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

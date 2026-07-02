import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Shield } from "lucide-react";

import { useLogin } from "../hooks";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export function LoginForm() {
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}

        <div className="mb-10 flex flex-col items-center">

          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Welcome back
          </h1>

          <p className="mt-3 max-w-xs text-center text-sm leading-6 text-text-secondary">
            Sign in to continue monitoring your surveillance dashboard.
          </p>
        </div>

        {/* Card */}

        <div className="rounded-2xl border border-border bg-card p-2 shadow-card backdrop-blur sm:p-4">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Email */}

            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-text-primary"
              >
                Email address
              </label>

              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 mt-2"
              />
            </div>

            {/* Password */}

            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-text-primary"
              >
                Password
              </label>

              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-11 mt-2"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text-primary"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {login.isError && (
              <div
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger animate-fade-in"
              >
                {(login.error as any)?.response?.data?.message ??
                  "Invalid email or password."}
              </div>
            )}

            <div className="mt-2">
              <Button
                type="submit"
                isLoading={login.isPending}
                className="h-11 w-full"
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}

        <p className="mt-8 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary transition hover:text-primary-hover"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
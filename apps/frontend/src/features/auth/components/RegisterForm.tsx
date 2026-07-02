import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRegister } from "../hooks";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export function RegisterForm() {
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    register.mutate({ name, email, password, confirmPassword });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Create an account</h1>
          <p className="mt-2 text-sm text-text-secondary">Setup your enterprise surveillance environment</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-2 sm:p-4 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-2">
            
            <div className="space-y-2">
              <label htmlFor="register-name" className="text-sm font-medium leading-none text-text-primary">
                Full Name
              </label>
              <Input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="register-email" className="text-sm font-medium leading-none text-text-primary">
                Work Email
              </label>
              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="register-password" className="text-sm font-medium leading-none text-text-primary">
                Password
              </label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 mt-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-text-muted">Must contain 8+ characters, 1 uppercase, 1 number, 1 special character.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-confirm" className="text-sm font-medium leading-none text-text-primary">
                Confirm Password
              </label>
              <Input
                id="register-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            {register.isError && (
              <div className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger animate-fade-in">
                {(register.error as any)?.response?.data?.message || "Registration failed. Please try again."}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={register.isPending}
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline focus:outline-none">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

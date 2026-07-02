import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authApi } from "./api";
import type { LoginPayload, RegisterPayload } from "./api";
import { setTokens, clearTokens, getTokens } from "./store";

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      router.navigate({ to: "/" });
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      router.navigate({ to: "/" });
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const tokens = getTokens();
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    },
    onSettled: () => {
      clearTokens();
      router.navigate({ to: "/login" });
    },
  });
}

export function useMe() {
  const tokens = getTokens();
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!tokens,
  });
}

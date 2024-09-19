
import { AuthApi, Configuration } from '@/client';

export function getAuthToken() {
    return sessionStorage.getItem("authToken");
}

export function setAuthToken(token: string) {
    sessionStorage.setItem("authToken", token);
}

export async function login(email: string, password: string) {
    const authApi = new AuthApi(new Configuration({
        basePath: "http://localhost:8080",
    }));

    const response = await authApi.authLoginPost({ email, password });
    if (response.status === 200) {
        return response.data.token_string;
    }

    throw new Error(`Login failed: ${response.status}`);
}

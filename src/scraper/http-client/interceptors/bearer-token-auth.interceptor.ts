import { RequestInterceptor } from "./interfaces";

export const bearerTokenAuthInterceptor = (
  token: string
): RequestInterceptor => {
  const headerValue = `Bearer ${token}`;

  return {
    interceptRequest: async (input) => {
      input.headers["Authorization"] = headerValue;
    },
  };
};

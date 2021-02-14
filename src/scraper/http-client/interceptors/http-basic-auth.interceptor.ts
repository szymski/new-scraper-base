import { RequestInterceptor } from "./interfaces";

export const httpBasicAuthInterceptor = (
  username: string,
  password: string
): RequestInterceptor => {
  const headerValue = `Basic ${Buffer.from(username + ":" + password).toString(
    "base64"
  )}`;

  return {
    interceptRequest: async (input) => {
      input.headers["Authorization"] = headerValue;
    },
  };
};

export const environment = {
  production: true,
  // Empty string = relative URLs; works when API and frontend share the same domain
  // (e.g. Nginx reverse-proxy routes /api/* to the NestJS container).
  // Override with the full API URL when deploying to separate domains:
  //   apiUrl: 'https://api.your-domain.com'
  apiUrl: '',
};

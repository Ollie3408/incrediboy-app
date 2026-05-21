/**
 * Dev diagnostics visibility — on in development builds unless disabled.
 * Set VITE_DEV_DIAGNOSTICS=true in .env to force-enable in production builds.
 */
export const isDevDiagnosticsEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEV_DIAGNOSTICS === 'true'

/**
 * Shared Clerk UI theme aligned with Ghost n Post (teal accent, Fraunces/Figtree).
 * Typed loosely — Clerk theme shapes vary by package version.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#0f7a7a",
    colorText: "#122033",
    colorTextSecondary: "#3a4a5c",
    colorBackground: "#ffffff",
    colorInputBackground: "#f7fafc",
    colorInputText: "#122033",
    colorDanger: "#9b2c2c",
    borderRadius: "2px",
    fontFamily: "var(--font-body), Segoe UI, sans-serif",
    fontFamilyButtons: "var(--font-body), Segoe UI, sans-serif",
  },
  elements: {
    card: {
      boxShadow: "0 18px 50px rgba(18, 32, 51, 0.08)",
      border: "1px solid rgba(18, 32, 51, 0.12)",
    },
    headerTitle: {
      fontFamily: "var(--font-display), Georgia, serif",
      fontWeight: "400",
    },
    formButtonPrimary: {
      backgroundColor: "#0f7a7a",
      fontWeight: "600",
      "&:hover": {
        backgroundColor: "#0a5555",
      },
    },
    footerActionLink: {
      color: "#0a5555",
      fontWeight: "600",
    },
  },
};

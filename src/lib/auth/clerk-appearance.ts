/**
 * Clerk UI theme — tactile brutalism / archival dark.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#e8ff47",
    colorText: "#f2efe6",
    colorTextSecondary: "#8f8a7c",
    colorBackground: "#1a1a16",
    colorInputBackground: "#161613",
    colorInputText: "#f2efe6",
    colorDanger: "#ff6b5a",
    borderRadius: "0px",
    fontFamily: "var(--font-body), Helvetica Neue, sans-serif",
    fontFamilyButtons: "var(--font-mono), ui-monospace, monospace",
  },
  elements: {
    card: {
      boxShadow: "3px 3px 0 #050504",
      border: "1px solid #3d3c35",
      backgroundColor: "#1a1a16",
      borderRadius: "0px",
    },
    headerTitle: {
      fontFamily: "var(--font-display), Helvetica Neue, sans-serif",
      fontWeight: "700",
      textTransform: "uppercase" as const,
      letterSpacing: "-0.04em",
      color: "#f2efe6",
    },
    formButtonPrimary: {
      backgroundColor: "#e8ff47",
      color: "#0e0e0c",
      fontWeight: "600",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      borderRadius: "0px",
      border: "1px solid #f2efe6",
      boxShadow: "2px 2px 0 #f2efe6",
      "&:hover": {
        backgroundColor: "#f2efe6",
      },
    },
    formFieldInput: {
      borderRadius: "0px",
      border: "1px solid #3d3c35",
      backgroundColor: "#161613",
    },
    footerActionLink: {
      color: "#e8ff47",
      fontWeight: "600",
    },
  },
};

import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, 
      },
    },
  },
  
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      
      // Allow defined variables that aren't used yet (ideal for scaffolding)
      "@typescript-eslint/no-unused-vars": "warn", 
      
      // Turn off strict caught error symptoms matching your file uploads
      "preserve-caught-error": "off" 
    }
  }
];

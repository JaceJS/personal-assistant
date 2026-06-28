module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
      rules: { "import/first": "off" },
    },
  ],
  ignorePatterns: ["node_modules/", "src/lib/api/generated.ts"],
};

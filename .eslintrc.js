module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:jest/recommended"],
  plugins: ["jest"],
  env: {
    es6: true,
    node: true,
    "jest/globals": true,
  },
  "parserOptions": {
    "ecmaVersion": 2018
  },
  rules: {
    "arrow-body-style": "error",
    curly: "error",
    "dot-notation": "error",
    "no-var": "error",
    "prefer-const": "error",
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "prefer-arrow-callback": "error",
    "prefer-destructuring": ["error", {
      "VariableDeclarator": {
        "array": false,
        "object": true,
      },
      "AssignmentExpression": {
        "array": false,
        "object": false,
      }
    }],
    "prefer-rest-params": "error",
    "prefer-spread": "error",
    "prefer-template": "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
    strict: "error",
    "jest/no-try-expect": "warn",
  },
};

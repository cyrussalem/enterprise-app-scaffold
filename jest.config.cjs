module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/test/unit/**/*.test.ts"],
      roots: ["<rootDir>/src", "<rootDir>/test"],
      moduleFileExtensions: ["ts", "js"],
      collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"]
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/test/integration/**/*.test.ts"],
      roots: ["<rootDir>/test"],
      moduleFileExtensions: ["ts", "js"]
    }
  ]
};

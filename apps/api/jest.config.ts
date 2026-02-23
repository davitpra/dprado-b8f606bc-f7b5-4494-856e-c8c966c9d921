export default {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@task-management/data/dto$': '<rootDir>/../../libs/data/src/dto.ts',
    '^@task-management/data$': '<rootDir>/../../libs/data/src/index.ts',
    '^@task-management/auth$': '<rootDir>/../../libs/auth/src/index.ts',
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/api',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/test-setup.ts',
    '!<rootDir>/src/test/**',
    '!<rootDir>/src/scripts/**',
  ],
  testTimeout: 30000,
};

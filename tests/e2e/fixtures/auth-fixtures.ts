/**
 * Authentication Fixtures
 * Test data for auth flows
 */

export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    fullName: 'Test User',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword',
  },
  newUser: {
    email: `new-user-${Date.now()}@example.com`,
    password: 'NewUserPassword123!',
    fullName: 'New Test User',
  },
};

export const authErrorMessages = {
  invalidCredentials: 'Invalid login credentials',
  emailTaken: 'Email already registered',
  weakPassword: 'Password should be at least 6 characters',
  invalidEmail: 'Invalid email format',
  requiredField: 'This field is required',
};

export const authRoutes = {
  login: '/auth',
  signup: '/auth',
  workspace: '/workspace/generate',
  landing: '/',
};

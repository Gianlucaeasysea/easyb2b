/** Test data constants used across E2E specs */

export const TEST_DATA = {
  invalidEmail: 'wrong@email.com',
  invalidPassword: 'wrongpassword',
  newLead: {
    companyName: 'E2E Test Company',
    contactName: 'E2E Tester',
    email: 'e2e-test@example.com',
    phone: '+39 000 0000000',
  },
} as const;

/**
 * Test utility for JSON sanitization functions
 */

// Function to sanitize JSON strings (copied from our implementation)
export const sanitizeJsonString = (jsonString: string): string => {
  // Remove any control characters except for \n, \r, \t
  jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Handle escaped quotes that might break parsing
  jsonString = jsonString.replace(/\\"/g, '"');
  
  return jsonString;
};

// Test cases
const testCases = [
  {
    name: "Valid JSON",
    input: '{"test": "value"}',
    expected: true
  },
  {
    name: "JSON with control characters",
    input: '{"test": "val\u0000ue"}',
    expected: true
  },
  {
    name: "JSON with escaped quotes",
    input: '{"test": "val\\"ue"}',
    expected: true
  }
];

// Run tests
testCases.forEach(testCase => {
  try {
    const sanitized = sanitizeJsonString(testCase.input);
    JSON.parse(sanitized);
    console.log(`✅ ${testCase.name}: PASSED`);
  } catch (error) {
    console.log(`❌ ${testCase.name}: FAILED - ${error}`);
  }
});
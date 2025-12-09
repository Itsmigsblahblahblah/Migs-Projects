import { formatAiGuidance } from './aiGuidanceFormatter';

// Test function to demonstrate the formatting
const runTests = () => {
  console.log('=== AI Guidance Formatter Tests ===\n');

  const testCases = [
    {
      name: 'Basic text',
      input: 'This is a simple advice text without any numbers or symbols.',
      expected: 'This is a simple advice text without any numbers or symbols.'
    },
    {
      name: 'Numbered list',
      input: '1. First step\n2. Second step\n3. Third step',
      expected: 'First step Second step Third step'
    },
    {
      name: 'Bullet points',
      input: '• First point\n• Second point\n• Third point',
      expected: 'First point Second point Third point'
    },
    {
      name: 'Mixed formatting',
      input: 'Here are some tips:\n1. Water your plants daily\n2. Check for pests\n• Use organic fertilizer\n• Prune dead leaves',
      expected: 'Here are some tips: Water your plants daily Check for pests Use organic fertilizer Prune dead leaves'
    },
    {
      name: 'Extra whitespace',
      input: '  This   has   extra   spaces   and \n\n newlines.  ',
      expected: 'This has extra spaces and newlines.'
    },
    {
      name: 'Symbols and punctuation',
      input: '**Important:** *Water* your ~plants~ daily!',
      expected: 'Important: Water your plants daily'
    },
    {
      name: 'Empty string',
      input: '',
      expected: ''
    }
  ];

  testCases.forEach((testCase, index) => {
    const result = formatAiGuidance(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: "${testCase.expected}"`);
    console.log(`Actual: "${result}"`);
    console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  });
};

// Run the tests
runTests();
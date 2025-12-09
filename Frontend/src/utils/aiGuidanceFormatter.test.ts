import { formatAiGuidance } from './aiGuidanceFormatter';

// Test cases for the formatAiGuidance function
console.log('Testing formatAiGuidance function...\n');

// Test 1: Basic text with no formatting
const test1 = "This is a simple advice text without any numbers or symbols.";
console.log('Test 1 - Basic text:');
console.log('Input:', test1);
console.log('Output:', formatAiGuidance(test1));
console.log('');

// Test 2: Text with numbered list
const test2 = "1. First step\n2. Second step\n3. Third step";
console.log('Test 2 - Numbered list:');
console.log('Input:', test2);
console.log('Output:', formatAiGuidance(test2));
console.log('');

// Test 3: Text with bullet points
const test3 = "• First point\n• Second point\n• Third point";
console.log('Test 3 - Bullet points:');
console.log('Input:', test3);
console.log('Output:', formatAiGuidance(test3));
console.log('');

// Test 4: Text with mixed symbols and numbers
const test4 = "Here are some tips:\n1. Water your plants daily\n2. Check for pests\n• Use organic fertilizer\n• Prune dead leaves";
console.log('Test 4 - Mixed formatting:');
console.log('Input:', test4);
console.log('Output:', formatAiGuidance(test4));
console.log('');

// Test 5: Text with extra whitespace
const test5 = "  This   has   extra   spaces   and \n\n newlines.  ";
console.log('Test 5 - Extra whitespace:');
console.log('Input:', test5);
console.log('Output:', formatAiGuidance(test5));
console.log('');
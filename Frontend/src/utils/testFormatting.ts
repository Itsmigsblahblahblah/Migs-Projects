import { formatAiGuidance } from './aiGuidanceFormatter';

// Test the specific case mentioned by the user
const testAsteriskCase = () => {
  const input = "*Kalidad ng Buto (Seed Viability):**";
  const output = formatAiGuidance(input);
  
  console.log('Testing asterisk removal:');
  console.log('Input:', input);
  console.log('Output:', output);
  console.log('Expected: Kalidad ng Buto (Seed Viability):');
  console.log('Match:', output === 'Kalidad ng Buto (Seed Viability):');
};

testAsteriskCase();
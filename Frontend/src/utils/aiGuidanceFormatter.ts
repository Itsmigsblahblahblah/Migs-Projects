/**
 * Utility function to format AI guidance text by removing numbers and symbols
 * and making it appear as one clean paragraph
 */

export const formatAiGuidance = (text: string): string => {
  if (!text) return '';
  
  // Remove leading/trailing whitespace
  let formattedText = text.trim();
  
  // Remove markdown-style bold/italic indicators (**text**, *text*)
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove double asterisks
  formattedText = formattedText.replace(/\*(.*?)\*/g, '$1');     // Remove single asterisks
  
  // Remove numbered lists (e.g., "1. ", "2. ", "1) ", "2) ")
  formattedText = formattedText.replace(/^\s*\d+[\.\)]\s*/gm, '');
  
  // Remove bullet points and other list markers
  formattedText = formattedText.replace(/^[\*\-\•\+\~]\s*/gm, '');
  
  // Remove extra whitespace and newlines, replacing with single spaces
  formattedText = formattedText.replace(/\s+/g, ' ');
  
  // Remove extra symbols that might appear at the beginning or end of sentences
  formattedText = formattedText.replace(/^[^\w\d\s]+|[^\w\d\s]+$/g, '');
  
  // Clean up any remaining multiple spaces
  formattedText = formattedText.replace(/\s+/g, ' ');
  
  return formattedText;
};
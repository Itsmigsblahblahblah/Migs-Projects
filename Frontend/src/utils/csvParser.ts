/**
 * Utility functions for parsing CSV files in the frontend
 */

/**
 * Parse a CSV string into an array of objects
 * @param csvString The CSV content as a string
 * @param delimiter The delimiter used in the CSV (default: ',')
 * @returns Array of objects representing the CSV data
 */
export const parseCSV = (csvString: string, delimiter = ','): any[] => {
  const lines = csvString.split('\n').filter(line => line.trim() !== '');

  if (lines.length === 0) return [];

  // Parse headers
  const headers = lines[0].split(delimiter).map(header => header.trim().replace(/"/g, ''));

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(delimiter);
    if (currentLine.length === headers.length) {
      const obj: any = {};
      for (let j = 0; j < headers.length; j++) {
        // Remove quotes and trim whitespace
        let value = currentLine[j].trim().replace(/"/g, '');
        // Convert numeric strings to numbers if possible
        if (!isNaN(Number(value)) && value !== '') {
          obj[headers[j]] = Number(value);
        } else {
          obj[headers[j]] = value;
        }
      }
      data.push(obj);
    }
  }

  return data;
};

/**
 * Load and parse a CSV file from a given path
 * @param filePath Path to the CSV file
 * @returns Promise resolving to parsed CSV data
 */
export const loadCSV = async (filePath: string): Promise<any[]> => {
  try {
    // For frontend, we'll need to fetch the file from the backend
    // In a real implementation, this would be an API endpoint
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    // Remove the extra /api prefix since our endpoints don't use it
    const response = await fetch(`${BACKEND_URL}${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${response.statusText}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
};

/**
 * Find matching records in CSV data based on a field and value
 * @param data Parsed CSV data
 * @param field Field name to search in
 * @param value Value to search for
 * @param caseSensitive Whether the search should be case sensitive (default: false)
 * @returns Array of matching records
 */
export const findMatchingRecords = (
  data: any[],
  field: string,
  value: string,
  caseSensitive = false
): any[] => {
  if (!caseSensitive) {
    return data.filter(record =>
      record[field] &&
      record[field].toString().toLowerCase().includes(value.toLowerCase())
    );
  }
  return data.filter(record =>
    record[field] &&
    record[field].toString().includes(value)
  );
};

/**
 * Get unique values for a specific field in CSV data
 * @param data Parsed CSV data
 * @param field Field name to get unique values for
 * @returns Array of unique values
 */
export const getUniqueValues = (data: any[], field: string): any[] => {
  const uniqueValues = new Set();
  data.forEach(record => {
    if (record[field] !== undefined) {
      uniqueValues.add(record[field]);
    }
  });
  return Array.from(uniqueValues);
};
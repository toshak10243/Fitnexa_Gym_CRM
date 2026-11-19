import { sanitizeCsvCell, generateCsvString } from './security.util';

describe('SecurityUtil - CSV Sanitization (CWE-1236)', () => {
  it('should neutralize formula injection with leading =', () => {
    const malicious = '=cmd|"/C calc"!A0';
    const sanitized = sanitizeCsvCell(malicious);
    expect(sanitized).toBe(`'${malicious}`);
  });

  it('should neutralize formula injection with leading +', () => {
    const malicious = '+1+1';
    const sanitized = sanitizeCsvCell(malicious);
    expect(sanitized).toBe(`'${malicious}`);
  });

  it('should neutralize formula injection with leading -', () => {
    const malicious = '-5+2';
    const sanitized = sanitizeCsvCell(malicious);
    expect(sanitized).toBe(`'${malicious}`);
  });

  it('should neutralize formula injection with leading @', () => {
    const malicious = '@SUM(1,2)';
    const sanitized = sanitizeCsvCell(malicious);
    expect(sanitized).toBe(`'${malicious}`);
  });

  it('should escape double quotes and commas properly', () => {
    const text = 'Fitnexa, "Mumbai"';
    const sanitized = sanitizeCsvCell(text);
    expect(sanitized).toBe('"Fitnexa, ""Mumbai"""');
  });

  it('should handle clean text without alterations', () => {
    const text = 'Rohan Verma';
    const sanitized = sanitizeCsvCell(text);
    expect(sanitized).toBe('Rohan Verma');
  });

  it('should generate valid multi-line sanitized CSV content', () => {
    const headers = ['Name', 'Phone', 'Notes'];
    const rows = [
      ['Rohan Verma', '+919876543210', 'Good progress'],
      ['=Malicious User', '9999999999', '@IMPORTXML(...)'],
    ];
    const csv = generateCsvString(headers, rows);
    expect(csv).toContain('Name,Phone,Notes');
    expect(csv).toContain("'+919876543210");
    expect(csv).toContain("'=Malicious User");
    expect(csv).toContain("'@IMPORTXML(...)");
  });
});

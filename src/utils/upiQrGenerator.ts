/**
 * UPI QR Code Generator Utility
 * Generates UPI payment links and QR codes dynamically based on UPI ID and amount
 */

/**
 * Generates a UPI payment URL that can be used to create a QR code
 * @param upiId - The UPI ID to receive payment (e.g., yourname@upi)
 * @param amount - The payment amount in INR
 * @param payeeName - Name of the payee/merchant (optional)
 * @param transactionNote - Note/description for the transaction (optional)
 * @returns UPI payment URL string
 */
export function generateUpiPaymentUrl(
  upiId: string,
  amount: number,
  payeeName?: string,
  transactionNote?: string
): string {
  // Clean and validate UPI ID
  const cleanUpiId = upiId.trim();
  if (!cleanUpiId) {
    throw new Error('UPI ID is required');
  }

  // Build UPI URL with parameters
  const params = new URLSearchParams();
  params.set('pa', cleanUpiId); // Payee VPA (UPI ID)
  
  if (payeeName) {
    params.set('pn', payeeName); // Payee Name
  }
  
  if (amount > 0) {
    params.set('am', amount.toFixed(2)); // Amount
  }
  
  params.set('cu', 'INR'); // Currency
  
  if (transactionNote) {
    params.set('tn', transactionNote); // Transaction Note
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a QR code image URL using a free QR code API
 * @param data - The data to encode in the QR code
 * @param size - Size of the QR code image (default 300)
 * @returns URL of the generated QR code image
 */
export function generateQrCodeUrl(data: string, size: number = 300): string {
  // Using Google Charts API for QR code generation (free and reliable)
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&color=000000&bgcolor=ffffff&format=png`;
}

/**
 * Generates a complete UPI QR code image URL for a given UPI ID and amount
 * @param upiId - The UPI ID to receive payment
 * @param amount - The payment amount in INR
 * @param payeeName - Name of the payee (optional)
 * @param eventName - Name of the event for transaction note (optional)
 * @param size - Size of the QR code image (default 300)
 * @returns URL of the generated UPI QR code image
 */
export function generateUpiQrCodeUrl(
  upiId: string,
  amount: number,
  payeeName?: string,
  eventName?: string,
  size: number = 300
): string {
  const transactionNote = eventName ? `Payment for ${eventName}` : 'Event Registration Fee';
  const upiUrl = generateUpiPaymentUrl(upiId, amount, payeeName, transactionNote);
  return generateQrCodeUrl(upiUrl, size);
}

/**
 * Validates if a UPI ID format is correct
 * @param upiId - The UPI ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') {
    return false;
  }
  
  // UPI ID format: username@bankhandle
  // Examples: yourname@upi, yourname@paytm, yourname@gpay, 9876543210@ybl
  const upiIdRegex = /^[\w.-]+@[\w]+$/;
  return upiIdRegex.test(upiId.trim());
}

/**
 * Format amount for display in INR
 * @param amount - Amount in number
 * @returns Formatted amount string
 */
export function formatAmountINR(amount: number): string {
  if (amount === 0) {
    return 'FREE';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

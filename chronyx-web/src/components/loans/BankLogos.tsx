// Bank logo configuration for India and USA
export const INDIAN_BANKS = [
  { name: "SBI", fullName: "State Bank of India", color: "#2d60a3" },
  { name: "HDFC", fullName: "HDFC Bank", color: "#004c8f" },
  { name: "ICICI", fullName: "ICICI Bank", color: "#f37020" },
  { name: "Axis", fullName: "Axis Bank", color: "#97144d" },
  { name: "PNB", fullName: "Punjab National Bank", color: "#d32f2f" },
  { name: "Bank of Baroda", fullName: "Bank of Baroda", color: "#f15a22" },
  { name: "Kotak", fullName: "Kotak Mahindra Bank", color: "#ed1c24" },
  { name: "IDFC First", fullName: "IDFC First Bank", color: "#9c1b30" },
  { name: "Yes Bank", fullName: "Yes Bank", color: "#0070c0" },
  { name: "IndusInd", fullName: "IndusInd Bank", color: "#98002e" },
];

export const US_BANKS = [
  { name: "Chase", fullName: "JPMorgan Chase", color: "#117aca" },
  { name: "Bank of America", fullName: "Bank of America", color: "#012169" },
  { name: "Wells Fargo", fullName: "Wells Fargo", color: "#d71e28" },
  { name: "Citi", fullName: "Citibank", color: "#003b70" },
  { name: "Capital One", fullName: "Capital One", color: "#d03027" },
  { name: "US Bank", fullName: "U.S. Bank", color: "#0060a9" },
  { name: "PNC", fullName: "PNC Bank", color: "#ff6200" },
  { name: "TD Bank", fullName: "TD Bank", color: "#34a350" },
];

export const LOAN_TYPES = ["Home", "Personal", "Education", "Auto", "Gold", "Business", "Other"];

export const REPAYMENT_MODES = ["Auto Debit", "eNACH", "UPI", "Bank Transfer", "Cash", "Other"];

export function getBankColor(bankName: string): string {
  const allBanks = [...INDIAN_BANKS, ...US_BANKS];
  const bank = allBanks.find(b => b.name === bankName || b.fullName === bankName);
  return bank?.color || "hsl(var(--muted-foreground))";
}

export function getBankInitials(bankName: string): string {
  if (!bankName) return "?";
  const words = bankName.split(" ");
  if (words.length === 1) return bankName.slice(0, 2).toUpperCase();
  return words.map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

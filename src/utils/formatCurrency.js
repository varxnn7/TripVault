const CURRENCIES = {
  INR: { symbol: "₹", code: "INR", name: "Indian Rupee", locale: "en-IN" },
  USD: { symbol: "$", code: "USD", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", code: "EUR", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", code: "GBP", name: "British Pound", locale: "en-GB" },
  JPY: { symbol: "¥", code: "JPY", name: "Japanese Yen", locale: "ja-JP" },
  AUD: { symbol: "A$", code: "AUD", name: "Australian Dollar", locale: "en-AU" },
  CAD: { symbol: "C$", code: "CAD", name: "Canadian Dollar", locale: "en-CA" },
  THB: { symbol: "฿", code: "THB", name: "Thai Baht", locale: "th-TH" },
  SGD: { symbol: "S$", code: "SGD", name: "Singapore Dollar", locale: "en-SG" },
  AED: { symbol: "د.إ", code: "AED", name: "UAE Dirham", locale: "ar-AE" },
};

export const getCurrencyList = () => Object.values(CURRENCIES);

export const formatCurrency = (amount, currencyCode = "INR") => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.INR;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export const getCurrencySymbol = (currencyCode = "INR") => {
  return CURRENCIES[currencyCode]?.symbol || "₹";
};

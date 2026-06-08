export interface CurrencyConfig {
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  rate: number;
}

const currencyMap: Record<string, CurrencyConfig> = {
  IN: { currencyCode: "INR", currencySymbol: "₹", locale: "en-IN", rate: 1 },
  US: { currencyCode: "USD", currencySymbol: "$", locale: "en-US", rate: 0.012 },
  GB: { currencyCode: "GBP", currencySymbol: "£", locale: "en-GB", rate: 0.009 },
  EU: { currencyCode: "EUR", currencySymbol: "€", locale: "en-IE", rate: 0.011 },
  CA: { currencyCode: "CAD", currencySymbol: "$", locale: "en-CA", rate: 0.016 },
  AU: { currencyCode: "AUD", currencySymbol: "$", locale: "en-AU", rate: 0.018 },
  JP: { currencyCode: "JPY", currencySymbol: "¥", locale: "ja-JP", rate: 1.70 },
  CN: { currencyCode: "CNY", currencySymbol: "¥", locale: "zh-CN", rate: 0.087 },
  SG: { currencyCode: "SGD", currencySymbol: "$", locale: "en-SG", rate: 0.016 },
  AE: { currencyCode: "AED", currencySymbol: "د.إ", locale: "ar-AE", rate: 0.044 },
  SA: { currencyCode: "SAR", currencySymbol: "ر.س", locale: "ar-SA", rate: 0.040 },
  RU: { currencyCode: "RUB", currencySymbol: "₽", locale: "ru-RU", rate: 0.95 },
  BR: { currencyCode: "BRL", currencySymbol: "R$", locale: "pt-BR", rate: 0.056 },
  MX: { currencyCode: "MXN", currencySymbol: "$", locale: "es-MX", rate: 0.22 },
  ZA: { currencyCode: "ZAR", currencySymbol: "R", locale: "en-ZA", rate: 0.21 },
  NG: { currencyCode: "NGN", currencySymbol: "₦", locale: "en-NG", rate: 10 },
  KE: { currencyCode: "KES", currencySymbol: "KSh", locale: "en-KE", rate: 1.60 },
  ID: { currencyCode: "IDR", currencySymbol: "Rp", locale: "id-ID", rate: 182 },
  PH: { currencyCode: "PHP", currencySymbol: "₱", locale: "en-PH", rate: 0.68 },
  NZ: { currencyCode: "NZD", currencySymbol: "$", locale: "en-NZ", rate: 0.019 },
};

const euroCountries = new Set([
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
]);

export const getCurrencyConfig = (countryCode?: string): CurrencyConfig => {
  if (!countryCode) {
    return currencyMap.IN;
  }

  const normalized = countryCode.toUpperCase();
  if (currencyMap[normalized]) {
    return currencyMap[normalized];
  }

  if (euroCountries.has(normalized)) {
    return currencyMap.EU;
  }

  return currencyMap.US;
};

export const convertFromInr = (
  amountInInr: number,
  currencyCode: string
): number => {
  const currency = Object.values(currencyMap).find(
    (config) => config.currencyCode === currencyCode
  );
  return currency ? amountInInr * currency.rate : amountInInr;
};

export const getGatewayCurrency = (
  paymentMethod: "razorpay" | "stripe",
  localCurrency: string
): string => {
  if (paymentMethod === "razorpay") {
    return "INR";
  }

  const supportedStripe = new Set(
    Object.values(currencyMap).map((config) => config.currencyCode.toLowerCase())
  );

  const normalized = localCurrency.toLowerCase();
  return supportedStripe.has(normalized) ? normalized : "usd";
};

export const formatCurrency = (
  amount: number,
  currencyCode: string,
  locale: string
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

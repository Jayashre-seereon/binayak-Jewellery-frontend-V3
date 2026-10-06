const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const convertTwoDigits = (num) => {
  if (num === 0) return "";
  if (num < 20) return ones[num];
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return `${tens[ten]}${one > 0 ? " " + ones[one] : ""}`.trim();
};

const convertThreeDigits = (num) => {
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  let str = "";
  if (hundred > 0) {
    str += `${ones[hundred]} Hundred`;
  }
  if (remainder > 0) {
    str += (str ? " and " : "") + convertTwoDigits(remainder);
  }
  return str.trim();
};

export const numberToWordsIndian = (amount) => {
  const num = Math.round(Number(amount || 0) * 100) / 100;
  if (isNaN(num) || num <= 0) return "Zero Rupees Only.";

  const integerPart = Math.floor(num);
  const paisePart = Math.round((num - integerPart) * 100);

  let remaining = integerPart;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  const parts = [];

  if (crore > 0) {
    parts.push(`${convertTwoDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (hundred > 0) {
    parts.push(convertThreeDigits(hundred));
  }

  let words = parts.join(" ").trim();
  if (!words) words = "Zero";

  words += " Rupees";

  if (paisePart > 0) {
    words += ` and ${convertTwoDigits(paisePart)} Paise`;
  }

  words += " Only.";
  return words;
};

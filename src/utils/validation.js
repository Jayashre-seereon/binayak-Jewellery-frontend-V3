export const validationPatterns = {
  alphaSpace: /^[A-Za-z\s.]+$/,
  alphaNumericSpace: /^[A-Za-z0-9\s.-]+$/,
  digitsOnly: /^\d+$/,
  phone10: /^\d{10}$/,
  email:
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const validationMessages = {
  required: (label) => `${label} is required`,
  alphaSpace: (label) => `${label} can contain only letters`,
  alphaNumericSpace: (label) => `${label} can contain only letters and numbers`,
  digitsOnly: (label) => `${label} must contain only numbers`,
  phone10: (label) => `${label} must be 10 digits`,
  email: () => "Invalid email address",
};

export const onlyDigits = (value = "") => String(value).replace(/\D/g, "");
export const onlyDecimal = (value = "") => {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const [wholePartRaw, ...fractionParts] = cleaned.split(".");
  const wholePart = wholePartRaw.replace(/^0+(?=\d)/, "") || "0";

  if (!fractionParts.length) {
    return wholePart;
  }

  const fractionPart = fractionParts.join("").replace(/\./g, "");
  return `${wholePart}.${fractionPart}`;
};
export const onlyLetters = (value = "") => String(value).replace(/[^A-Za-z\s.]/g, "");
export const onlyAlphaNumeric = (value = "") => String(value).replace(/[^A-Za-z0-9\s.-]/g, "");

export const makeTextRules = ({
  label = "Field",
  required = false,
  pattern = null,
  minLength,
  maxLength,
} = {}) => {
  const rules = {};

  if (required) {
    rules.required = typeof required === "string" ? required : validationMessages.required(label);
  }

  if (pattern) {
    rules.pattern = pattern;
  }

  if (minLength !== undefined) {
    rules.minLength = {
      value: minLength,
      message: `${label} must be at least ${minLength} characters`,
    };
  }

  if (maxLength !== undefined) {
    rules.maxLength = {
      value: maxLength,
      message: `${label} must be at most ${maxLength} characters`,
    };
  }

  return rules;
};

export const makeNumericRules = ({
  label = "Field",
  required = false,
  min,
  max,
  integerOnly = false,
} = {}) => {
  const rules = {
    onChange: (e) => {
      e.target.value = onlyDecimal(e.target.value);
    },
  };

  if (required) {
    rules.required = typeof required === "string" ? required : validationMessages.required(label);
  }

  if (integerOnly) {
    rules.pattern = {
      value: validationPatterns.digitsOnly,
      message: validationMessages.digitsOnly(label),
    };
  }

  if (min !== undefined) {
    rules.min = { value: min, message: `${label} must be at least ${min}` };
  }

  if (max !== undefined) {
    rules.max = { value: max, message: `${label} must be at most ${max}` };
  }

  return rules;
};

export const makePhoneRules = (label = "Phone") => ({
  required: validationMessages.required(label),
  pattern: {
    value: validationPatterns.phone10,
    message: validationMessages.phone10(label),
  },
  onChange: (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 10);
  },
});

export const makeEmailRules = (label = "Email") => ({
  required: validationMessages.required(label),
  pattern: {
    value: validationPatterns.email,
    message: validationMessages.email(label),
  },
});

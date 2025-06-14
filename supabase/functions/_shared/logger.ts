
// This logger uses a hardcoded prefix specific to the 'initialize-stripe-billing' function
// as per the original implementation.
const LOG_PREFIX = "INITIALIZE-STRIPE-BILLING";

export const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${LOG_PREFIX}] ${step}${detailsStr}`);
};

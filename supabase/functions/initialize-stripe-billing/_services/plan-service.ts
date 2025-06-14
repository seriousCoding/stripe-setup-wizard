
import Stripe from "https://esm.sh/stripe@14.21.0";
import { logStep } from "../../../_shared/logger.ts";
import { BILLING_PLANS, BillingPlan } from "../_config/plan-configs.ts";

interface PlanProcessingResult {
  product_id?: string;
  price_id?: string;
  additional_prices?: string[];
  tier_id: string;
  name: string;
  subtitle?: string;
  amount?: number;
  type?: string;
  interval?: string;
  status: 'success' | 'error';
  error?: string;
}

export async function processBillingPlans(
  stripe: Stripe,
  stripeMeterIdsMap: { [key: string]: string | undefined }
): Promise<PlanProcessingResult[]> {
  const results: PlanProcessingResult[] = [];
  const transactionMeterId = stripeMeterIdsMap['transaction_usage'];
  const aiProcessingMeterId = stripeMeterIdsMap['ai_processing_usage'];

  for (const plan of BILLING_PLANS) {
    logStep(`Creating billing plan: ${plan.name}`);
    try {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          ...plan.metadata,
          created_via: 'stripe_billing_pilot'
        }
      });
      logStep(`Product created: ${product.id}`, { name: product.name });

      const priceData: Stripe.PriceCreateParams = {
        currency: 'usd',
        product: product.id,
        recurring: {
          interval: plan.interval,
          usage_type: 'licensed'
        },
        unit_amount: plan.price,
        metadata: {
          ...plan.metadata,
          price_type: 'recurring_base'
        }
      };
      const price = await stripe.prices.create(priceData);
      logStep(`Main recurring price created: ${price.id}`, { amount: plan.price });

      const additionalPricesObjects = [];
      if (plan.metadata.overage_rate) {
        if (transactionMeterId) {
          const transactionOveragePrice = await stripe.prices.create({
            currency: 'usd',
            product: product.id,
            billing_scheme: 'tiered',
            tiers_mode: 'graduated',
            recurring: {
              interval: 'month',
              usage_type: 'metered',
              meter: transactionMeterId
            },
            tiers: [
              { up_to: parseInt(plan.metadata.usage_limit_transactions) || 1000, unit_amount: 0, flat_amount: 0 },
              { up_to: null, unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100), flat_amount: 0 }
            ],
            metadata: { ...plan.metadata, price_type: 'overage_transactions', meter_id: transactionMeterId }
          });
          additionalPricesObjects.push(transactionOveragePrice);
          logStep(`Transaction overage price created: ${transactionOveragePrice.id} using meter ${transactionMeterId}`);
        } else {
          logStep(`Skipping transaction overage price for ${plan.name} as transaction meter ID is unavailable.`);
        }

        if (aiProcessingMeterId) {
          const aiOveragePrice = await stripe.prices.create({
            currency: 'usd',
            product: product.id,
            billing_scheme: 'tiered',
            tiers_mode: 'graduated',
            recurring: {
              interval: 'month',
              usage_type: 'metered',
              meter: aiProcessingMeterId
            },
            tiers: [
              { up_to: parseInt(plan.metadata.usage_limit_ai_processing) || 100, unit_amount: 0, flat_amount: 0 },
              { up_to: null, unit_amount: Math.round(parseFloat(plan.metadata.overage_rate) * 100), flat_amount: 0 }
            ],
            metadata: { ...plan.metadata, price_type: 'overage_ai_processing', meter_id: aiProcessingMeterId }
          });
          additionalPricesObjects.push(aiOveragePrice);
          logStep(`AI processing overage price created: ${aiOveragePrice.id} using meter ${aiProcessingMeterId}`);
        } else {
          logStep(`Skipping AI processing overage price for ${plan.name} as AI processing meter ID is unavailable.`);
        }
      }

      await stripe.products.update(product.id, { default_price: price.id });

      results.push({
        product_id: product.id,
        price_id: price.id,
        additional_prices: additionalPricesObjects.map(p => p.id),
        tier_id: plan.id,
        name: plan.name,
        subtitle: plan.subtitle,
        amount: plan.price,
        type: plan.type,
        interval: plan.interval,
        status: 'success'
      });
      logStep(`Billing plan setup complete for ${plan.name}`, { productId: product.id, priceId: price.id, additionalPrices: additionalPricesObjects.length });

    } catch (error: any) {
      logStep(`Error creating billing plan ${plan.name}`, { error: error.message });
      results.push({
        tier_id: plan.id,
        name: plan.name,
        error: error.message,
        status: 'error'
      });
    }
  }
  return results;
}

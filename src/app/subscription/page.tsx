// src/app/subscription/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from '@/lib/state/store';
import type { RootState } from '@/lib/state/store';
import { fetchUserProfile } from '@/lib/state/slices/userSlice';
import axios from 'axios';

// Add type definition for Razorpay on window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

// --- Define Plan Details ---
const PLANS = {
    'free': { id: 'free', tier: 'free', name: 'Free', amountPaisa: 0, description: 'Basic access, pay per use.', features: ['2 Free Transformations / Month', 'Pay-as-you-go: ₹5 / image'] },
    'basic-monthly': { id: 'basic-monthly', tier: 'basic', name: 'Basic Monthly', amountPaisa: 9900, priceString: '₹99', interval: '/ month', description: 'Ideal for regular users.', features: ['100 Transformations / Month', 'Overage Rate: ₹2 / image'] },
    'basic-yearly': { id: 'basic-yearly', tier: 'basic', name: 'Basic Yearly', amountPaisa: 100000, priceString: '₹1,000', interval: '/ year', description: 'Ideal for regular users.', features: ['100 Transformations / Month', 'Overage Rate: ₹2 / image', 'Discounted Annual Rate'] },
    'premium-monthly': { id: 'premium-monthly', tier: 'premium', name: 'Premium Monthly', amountPaisa: 24900, priceString: '₹249', interval: '/ month', description: 'Best value for frequent users.', features: ['300 Transformations / Month', 'Overage Rate: ₹1.50 / image', 'Priority Processing', 'Advanced Customization', 'Higher Resolution Options'] },
    'premium-yearly': { id: 'premium-yearly', tier: 'premium', name: 'Premium Yearly', amountPaisa: 250000, priceString: '₹2,500', interval: '/ year', description: 'Best value for frequent users.', features: ['300 Transformations / Month', 'Overage Rate: ₹1.50 / image', 'Priority Processing', 'Advanced Customization', 'Higher Resolution Options', 'Discounted Annual Rate'] },
};

// --- Types ---
type PlanTier = 'free' | 'basic' | 'premium';
type PlanInterval = 'monthly' | 'yearly';

type BasePlan = {
  id: string;
  tier: PlanTier;
  name: string;
  amountPaisa: number;
  description: string;
  features: string[];
};

type PaidPlan = BasePlan & {
  tier: 'basic' | 'premium';
  priceString: string;
  interval: string;
};

type FreePlan = BasePlan & {
  tier: 'free';
};

type Plan = PaidPlan | FreePlan;

// --- Backend Endpoint URL ---
const CREATE_RAZORPAY_ORDER_URL = 'https://tyxvavusnmcxqsvgfktm.supabase.co/functions/v1/create-razorpay-order';

// --- Helper: Checkmark SVG ---
const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
  </svg>
);

export default function SubscriptionPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile: userProfile } = useSelector((state: RootState) => state.user);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Determine the active plan ID
  const getActivePlanId = () => {
    if (userProfile?.subscription_status === 'active' && userProfile.plan_type && userProfile.plan_interval) {
      return `${userProfile.plan_type}-${userProfile.plan_interval}`;
    }
    return 'free';
  };
  const activePlanId = getActivePlanId();

  // --- Load Razorpay Script ---
  useEffect(() => {
    const scriptId = 'razorpay-checkout-js';
    if (document.getElementById(scriptId)) {
      setIsRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { console.log('Razorpay script loaded.'); setIsRazorpayLoaded(true); };
    script.onerror = () => { console.error('Failed to load Razorpay script.'); alert('Error: Could not load payment gateway.'); setIsRazorpayLoaded(false); };
    document.body.appendChild(script);
  }, []);

  // --- Razorpay Payment Handler ---
  const handleSelectPlanRazorpay = async (planId: string) => {
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan || plan.tier === 'free') return;

    console.log(`Processing Razorpay for planId: ${planId}, amount: ${plan.amountPaisa}`);

    if (!isRazorpayLoaded || typeof window.Razorpay === 'undefined') {
      alert("Error: Payment gateway not loaded."); return;
    }
    if (!user?.id || !user.email) {
      alert("Error: User not logged in or email missing."); return;
    }
    if (!CREATE_RAZORPAY_ORDER_URL) {
      alert("Configuration Error: Payment endpoint missing."); return;
    }

    setProcessingPlanId(planId);
    try {
      const receiptId = `${planId}-${Date.now()}`;
      const response = await axios.post(CREATE_RAZORPAY_ORDER_URL, {
        amount: plan.amountPaisa, currency: 'INR', receipt: receiptId, userId: user.id, planId: planId
      });
      const { orderId, amount, currency, razorpayKeyId } = response.data;

      if (!orderId || !razorpayKeyId) throw new Error("Failed to retrieve order details.");

      const options = {
        key: razorpayKeyId, amount, currency, name: "Ghibli App", description: plan.description, order_id: orderId,
        handler: (response: any) => {
          console.log("Razorpay Success:", response);
          alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
          if (user?.id) dispatch(fetchUserProfile(user.id));
        },
        prefill: { email: user.email },
        notes: { userId: user.id, planId },
        theme: { color: "#4f46e5" }, // Indigo
        modal: { ondismiss: () => console.log('Razorpay dismissed.') }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
          console.error("Razorpay Failed:", response);
          alert(`Payment Failed: ${response.error.description} (Code: ${response.error.code})`);
      });
      rzp.open();
    } catch (error: any) {
      let msg = 'Could not initiate payment.';
      if (axios.isAxiosError(error) && error.response?.data?.error) msg = error.response.data.error;
      else if (error instanceof Error) msg = error.message;
      console.error("Payment Initiation Error:", error);
      alert(`Error: ${msg}`);
    } finally {
      setProcessingPlanId(null);
    }
  };

  // --- Filter plans based on selected interval ---
  const displayPlans = {
      basic: PLANS[`basic-${selectedInterval}` as keyof typeof PLANS] as PaidPlan,
      premium: PLANS[`premium-${selectedInterval}` as keyof typeof PLANS] as PaidPlan,
  };

  // --- Enhanced Tailwind Classes ---
  const cardBaseClasses = "rounded-2xl transition-all duration-300 ease-in-out shadow-md border flex flex-col relative pt-6"; // Added relative and pt-6 for badge space
  const cardHoverClasses = "hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1";
  const standardCardClasses = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  const premiumCardClasses = "bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-400 dark:from-yellow-600 dark:via-amber-600 dark:to-orange-700 border-amber-400 dark:border-amber-500 text-gray-900 dark:text-white"; // Golden background for Premium
  const activeCardHighlightClasses = "border-2 border-indigo-500 dark:border-indigo-400 scale-[1.02] shadow-lg ring-4 ring-indigo-500/20 dark:ring-indigo-400/20"; // Highlight for the active plan
  const buttonBaseClasses = "w-full text-center rounded-lg px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.03] hover:-translate-y-0.5";
  const primaryButtonClasses = `${buttonBaseClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md hover:shadow-lg`;
  const secondaryButtonClasses = `${buttonBaseClasses} bg-white text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50 focus:ring-indigo-500 dark:bg-gray-700 dark:text-indigo-300 dark:ring-gray-600 dark:hover:bg-gray-600 shadow-sm hover:shadow-md`;
  const premiumButtonClasses = `${buttonBaseClasses} bg-gray-900 text-white hover:bg-black focus:ring-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:focus:ring-gray-300 shadow-md hover:shadow-lg`; // Button style for Premium card
  const disabledButtonClasses = `${buttonBaseClasses} bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400`;
  const activeBadgeClasses = "absolute top-4 right-4 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 px-2.5 py-0.5 rounded-full shadow z-10"; // Added z-10
  // Adjusted Recommended badge positioning
  const recommendedBadgeClasses = "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold bg-amber-400 text-amber-900 dark:bg-amber-500 dark:text-amber-900 px-3 py-1 rounded-full shadow z-20"; // Centered on top edge

  // Toggle Button Classes
  const toggleBase = "px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-black";
  const toggleActive = "bg-indigo-600 text-white shadow-sm";
  const toggleInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";


  return (
    // Enhanced background and overall padding for both light and dark modes
    <div className="min-h-screen p-6 sm:p-12 bg-gradient-radial from-blue-50 to-indigo-100 text-gray-800 dark:text-white dark:bg-gradient-radial dark:from-gray-900 dark:to-black">
      <div className="max-w-6xl mx-auto"> {/* Increased max-width */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">Pricing</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 text-center">Choose the plan that fits your creative needs.</p>

        {/* Interval Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg space-x-1 shadow-inner">
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`${toggleBase} ${selectedInterval === 'monthly' ? toggleActive : toggleInactive}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('yearly')}
              className={`${toggleBase} ${selectedInterval === 'yearly' ? toggleActive : toggleInactive}`}
            >
              Yearly <span className="ml-1 text-xs opacity-80">(Save ~15%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Grid with Animation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 items-stretch">

          {/* Free Tier Card */}
          <div
            className={`${cardBaseClasses} ${activePlanId === 'free' ? activeCardHighlightClasses : standardCardClasses} card-animate`}
            style={{ animationDelay: '0.1s' }} // Staggered animation delay
          >
            {activePlanId === 'free' && <span className={activeBadgeClasses}>Active</span>}
            <div className="flex-grow p-6 md:p-8">
              <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">{PLANS.free.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{PLANS.free.description}</p>
              <p className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Free</p>
              <ul className="space-y-3 text-sm mb-8">
                {PLANS.free.features.map(feature => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 md:p-8 mt-auto bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
               <button disabled className={disabledButtonClasses}>Current Plan</button>
            </div>
          </div>

          {/* Basic Tier Card */}
          {displayPlans.basic && (
            <div
              className={`${cardBaseClasses} ${activePlanId === displayPlans.basic.id ? activeCardHighlightClasses : standardCardClasses} ${cardHoverClasses} card-animate`}
              style={{ animationDelay: '0.2s' }} // Staggered animation delay
            >
              {activePlanId === displayPlans.basic.id && <span className={activeBadgeClasses}>Active</span>}
              <div className="flex-grow p-6 md:p-8">
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">{displayPlans.basic.tier.charAt(0).toUpperCase() + displayPlans.basic.tier.slice(1)}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{displayPlans.basic.description}</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{displayPlans.basic.priceString}<span className="text-base font-normal text-gray-500 dark:text-gray-400">{displayPlans.basic.interval}</span></p>
                {selectedInterval === 'yearly' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-8">Billed annually</p>}
                {selectedInterval === 'monthly' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-8 invisible">Placeholder</p>}

                <ul className="space-y-3 text-sm mb-8">
                  {displayPlans.basic.features.map(feature => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 md:p-8 mt-auto bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                <button
                  onClick={() => handleSelectPlanRazorpay(displayPlans.basic.id)}
                  disabled={!isRazorpayLoaded || !!processingPlanId || activePlanId === displayPlans.basic.id}
                  className={activePlanId === displayPlans.basic.id ? disabledButtonClasses : secondaryButtonClasses}
                >
                  {processingPlanId === displayPlans.basic.id ? 'Processing...' : (activePlanId === displayPlans.basic.id ? 'Current Plan' : 'Choose Basic')}
                </button>
              </div>
            </div>
          )}

          {/* Premium Tier Card */}
          {displayPlans.premium && (
            <div
              // Apply golden background, active highlight if needed, hover effects
              className={`${cardBaseClasses} ${premiumCardClasses} ${activePlanId === displayPlans.premium.id ? activeCardHighlightClasses : ''} ${cardHoverClasses} card-animate`}
              style={{ animationDelay: '0.3s' }} // Staggered animation delay
            >
              {/* Add Recommended Badge - positioned on top edge */}
              <span className={recommendedBadgeClasses}>Recommended</span>
              {/* Conditionally show Active Badge if this is the active plan */}
              {activePlanId === displayPlans.premium.id && <span className={activeBadgeClasses}>Active</span>}

              <div className="flex-grow p-6 md:p-8">
                {/* Ensure text contrasts with golden background */}
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">{displayPlans.premium.tier.charAt(0).toUpperCase() + displayPlans.premium.tier.slice(1)}</h3>
                <p className="text-amber-900/80 dark:text-amber-100/80 text-sm mb-6">{displayPlans.premium.description}</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{displayPlans.premium.priceString}<span className="text-base font-normal text-amber-900/70 dark:text-amber-100/70">{displayPlans.premium.interval}</span></p>
                 {selectedInterval === 'yearly' && <p className="text-xs text-amber-900/70 dark:text-amber-100/70 mt-1 mb-8">Billed annually</p>}
                 {selectedInterval === 'monthly' && <p className="text-xs text-amber-900/70 dark:text-amber-100/70 mt-1 mb-8 invisible">Placeholder</p>}

                <ul className="space-y-3 text-sm mb-8">
                  {displayPlans.premium.features.map(feature => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon />
                      {/* Ensure feature text contrasts */}
                      <span className="text-gray-800 dark:text-gray-100">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 md:p-8 mt-auto bg-black/10 dark:bg-black/20 rounded-b-2xl">
                <button
                  onClick={() => handleSelectPlanRazorpay(displayPlans.premium.id)}
                  disabled={!isRazorpayLoaded || !!processingPlanId || activePlanId === displayPlans.premium.id}
                  // Use specific premium button style unless disabled
                  className={activePlanId === displayPlans.premium.id ? disabledButtonClasses : premiumButtonClasses}
                >
                  {processingPlanId === displayPlans.premium.id ? 'Processing...' : (activePlanId === displayPlans.premium.id ? 'Current Plan' : 'Choose Premium')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      {/* Keyframes for Animation */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .card-animate {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0; /* Start hidden */
        }
        /* Custom radial gradient */
        .bg-gradient-radial {
          background-image: radial-gradient(circle at top, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}